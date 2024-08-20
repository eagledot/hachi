# imports
from threading import RLock
import os
import threading
import queue
import pickle
from collections import OrderedDict
from typing import Optional, Tuple, Dict, List

import numpy as np

# Config.
N_ROWS_SHARD_META_DATA =  1   # top row, reserved for shard meta-data, like current filled rows in a shard etc.

######### SHARDING ###################################################################
#######################################################################################
def load_shard_from_disk_preload(preload_queue:queue.Queue, command_queue:queue.Queue, index_directory:os.path, shard_prefix:str):
    while True:
        idx_to_preload = command_queue.get()            # waiting which index to preload, HENCE ONE preload at a time.
        if idx_to_preload == -1:
            break
        
        shard_path =  os.path.join(index_directory,"{}_{}.idx".format(shard_prefix, idx_to_preload))
        if not os.path.exists(shard_path):
            preload_queue.put((False, None, None))
        else:
            with open(shard_path, "rb") as f:
                preload_queue.put((True, idx_to_preload, np.load(f)))

class ShardCache(object):
    """ Supposed to be used by caller, along with Locks if necessary. It itself doesn't enforce any shared/thread-safe access.
    """

    def __init__(self, shard_size:int, embedding_size:int, index_directory:os.path, shard_prefix:str, preload:bool = False) -> None:
        
        assert shard_size > (N_ROWS_SHARD_META_DATA + 1)
        self.shard_size = shard_size
        self.embedding_size = embedding_size
        self.index_directory = index_directory
        self.shard_prefix = shard_prefix

        # load a shard during initialization.
        self.current_shard_loaded =  None
        self.current_shard_loaded_idx = None
        
        self.preload = preload        # this is set/unset for update/query. (allowed only for query routine.)
        if self.preload:
            self.command_queue = queue.Queue(maxsize = 1)   # to communicate with thread
            self.preload_queue = queue.Queue(maxsize = 1)   # to allow preloading of next index.
            self.command_queue.put((0))                     # which index to preload. 
            threading.Thread(target = load_shard_from_disk_preload, args = (self.preload_queue, self.command_queue, self.index_directory, self.shard_prefix)).start()

    def initialize_shard(self) -> np.array:
        shard = np.zeros((self.shard_size , self.embedding_size), dtype = np.float32) * 9  # just for making sure that data is being fullfilled. 
        shard[0,0] = 0   # set number of rows to zero, # add some data to zeroth row, meta-data, like version number.
        return shard

    def load_shard_from_disk(self, idx:int) -> np.array:
        shard_path =  os.path.join(self.index_directory,"{}_{}.idx".format(self.shard_prefix, idx))
        if os.path.exists(shard_path) == False:
            temp_shard = self.initialize_shard()
            with open(shard_path,"wb") as f:
                np.save(f, temp_shard, allow_pickle= False)
            return temp_shard
        else:
            with open(shard_path, "rb") as f:
                return np.load(f)
    
    def save_shard_to_disk(self, idx:int, shard:np.array):
        shard_path = os.path.join(self.index_directory,"{}_{}.idx".format(self.shard_prefix, idx))
        with open(shard_path, "wb") as f:
            np.save(f,shard, allow_pickle = False)
    
    def __getitem__(self, key:int):

        if (key == self.current_shard_loaded_idx):  # return already loaded shard.
            pass
        elif (self.preload):                       # try to use preload.
            flag, preloaded_idx, shard = self.preload_queue.get()
            if (flag == True) and (preloaded_idx == key):
                self.current_shard_loaded = shard
            else:
                del shard                
                self.current_shard_loaded = self.load_shard_from_disk(key)
            self.command_queue.put(key + 1) #ask it to preload next shard from disk.
        else:
            self.current_shard_loaded = self.load_shard_from_disk(key)

        # update/sync the state.
        self.current_shard_loaded_idx = key
        return self.current_shard_loaded

    def get_embedding(self, idx:int):
        """Return embeddings, sliced if necessary, based on the valid rows in the shard."""
        temp_shard = self[idx]
        n_rows = int(temp_shard[0,0])
        return temp_shard[N_ROWS_SHARD_META_DATA : N_ROWS_SHARD_META_DATA+n_rows]

    def update(self, idx:int, embeddings:np.array) -> Tuple[int, int, int, bool]:
        assert len(embeddings.shape) == 2  # rank

        temp_key = idx
        temp_data = []
        offset_embeddings = 0

        while True:
            current_shard = self[temp_key]

            n_rows_filled = N_ROWS_SHARD_META_DATA + int(current_shard[0,0])
            n_rows_available = current_shard.shape[0] - n_rows_filled
            n_rows_would_be_filled = min(n_rows_available, embeddings[offset_embeddings: , :].shape[0])

            if (n_rows_would_be_filled == 0) or (embeddings[offset_embeddings: , :].shape[0] == 0):
                temp_data.append((temp_key, n_rows_filled, n_rows_filled + n_rows_would_be_filled, False))
                break
            else:
                current_shard[n_rows_filled:(n_rows_filled + n_rows_would_be_filled), :] = embeddings[offset_embeddings : offset_embeddings +  n_rows_would_be_filled, :]
                offset_embeddings += n_rows_would_be_filled
                current_shard[0,0] += (n_rows_would_be_filled)

                if (n_rows_available == n_rows_would_be_filled):
                    self.save_shard_to_disk(temp_key, current_shard)  # it means current shard has been fully written, save it.
                    temp_data.append((temp_key, n_rows_filled, n_rows_filled + n_rows_would_be_filled, True))
                    temp_key += 1
                else:
                    temp_data.append((temp_key, n_rows_filled, n_rows_filled + n_rows_would_be_filled, False))
        
        return temp_data

class CommonIndex(object):
    # supposed to used as parent class.
    def __init__(self, shard_size:int, embedding_size:int, index_directory:str, shard_prefix:str, preload:bool) -> None:
        self.index_directory = os.path.abspath(index_directory)
        if not os.path.exists(self.index_directory):
            os.mkdir(self.index_directory)  
        else:
            # for now only checking a "<prefix>_0.idx", not all .idx to detect invalid indices. 
            shard_0_path = os.path.join(self.index_directory, "{}_0.idx".format(shard_prefix))
            if os.path.exists(shard_0_path):
                temp_size, temp_embedding_size = np.load(shard_0_path).shape
                if (temp_size != shard_size) or (temp_embedding_size != embedding_size):
                    print("Invalid Index!! EXPECTED: {}  Got: {}".format((shard_size, embedding_size), (temp_size, temp_embedding_size)))
                    exit(-1)
           
        self.shard_idx_update = max(sum([1 if ".idx" in x  else 0 for x in os.listdir(index_directory) ]) - 1, 0)     
        self.shard_size = shard_size
        self.embedding_size = embedding_size
        self.key_2_shardIdx = {}  # mapping a key/UID to a specific shard, equivalent to encoding CALLER state in key.
        self.shard_prefix = shard_prefix
        self.preload = preload        

        # Resources (properly manage, for case of index/db resetting)
        if not hasattr(self, "lock"):    # only if there is alreay no lock.
            self.lock = RLock()       # use this lock to sync access, writing can be slow but reading must be fast.
        
        self.shard_cache = ShardCache(
            shard_prefix=shard_prefix,
            shard_size=shard_size,
            index_directory=index_directory,
            embedding_size=embedding_size,
            preload=preload
        )
        self.idx_2_hash = self.load_index() # Absolute indices to Hash mapping.
    
    def get_index_path(self):
        return  os.path.join(self.index_directory, "{}_{}.pkl".format(self.shard_prefix,"INDEX"))
    
    def load_index(self):
        # This returns a dict, mapping absolute shard indices to HASH (image/media)
        temp_path = self.get_index_path()
        if os.path.exists(temp_path):
            with open(temp_path, "rb") as f:
                return pickle.load(f)
        else:
            return {}
        
    def save_index(self):
        temp_path = self.get_index_path()
        with open(temp_path, "wb") as f:
            pickle.dump(self.idx_2_hash, f)

    def update_index(self, data_hash:str, update_status:Tuple[int, int, int, bool]):
        # also updates the corresponding idx_2_hash mapping.
        for ix, start_idx, end_idx, shard_saved in update_status:
            for j in range(start_idx, end_idx):
                self.idx_2_hash[(ix * self.shard_size) + j] = data_hash
        
            if shard_saved:
                self.save_index()

    def compare(self, query:np.array, data_embeddings:np.array) -> Tuple[np.array, np.array]:
        raise NotImplementedError

    def get_shard_row(self, data_hashes:List[str]) -> Dict[str, Dict[int, List[int]]]:

        data_hashes = set(data_hashes)
        hash_2_idx = {}
        for k,v in self.idx_2_hash.items():
            if v in hash_2_idx:
                hash_2_idx[v] += [k]
            else:
                hash_2_idx[v] = [k]

        absolute_indices = set()
        for data_hash in data_hashes:
            for ix in hash_2_idx[data_hash]:
                absolute_indices.add((data_hash, ix))
        absolute_indices = sorted(absolute_indices, key = lambda x: x[1], reverse = False)  # sorting would help in preloading as preloading supposed to load next in sequence.

        result = OrderedDict()
        for temp_hash, ix in absolute_indices:
            shard_idx = ix // self.shard_size
            row_idx = ix % self.shard_size
            
            if temp_hash not in result:
                result[temp_hash] = {}
            
            if shard_idx in result[temp_hash]:
                result[temp_hash][shard_idx] += [row_idx]
            else:
                result[temp_hash][shard_idx] = [row_idx]
        return result        
    
    def query_base(self, query:np.array, client_key:str, key:Optional[List[str]] = None) -> Dict[str, List[float]]:

        query = query.reshape((-1, self.embedding_size))
        with self.lock:

            if key is not None:
                result = {}
                hash_2_shard_rows = self.get_shard_row(data_hashes=key)
                for data_hash in hash_2_shard_rows:
                    for shard_idx, row_indices in hash_2_shard_rows[data_hash].items():         # NOTE: row_indices are absolute indices.    

                        temp_shard = self.shard_cache[shard_idx]  # load the shard, shard_idx are sorted, so helps in preloading.
                        stored_embeddings = temp_shard[row_indices] # get corresponding embeddings.
                        _, temp_scores = self.compare(query, data_embeddings=stored_embeddings)

                        if data_hash not in result:
                            result[data_hash] = []
                        result[data_hash] += list(temp_scores.ravel())
                return False, result

            else:
                if client_key not in self.key_2_shardIdx:
                    self.key_2_shardIdx[client_key] = 0
                shard_idx_query = self.key_2_shardIdx[client_key]
                assert shard_idx_query <= self.shard_idx_update


                data_embeddings = self.shard_cache.get_embedding(shard_idx_query)
                result = OrderedDict()
                
                for x in query:
                    sorted_indices, sorted_scores = self.compare(x, data_embeddings = data_embeddings) # NOTE: sorted indices are relative indices, so we convert them to absolute indices.
                    for score, ix in zip(sorted_scores, sorted_indices):
                        idx_hash = ix + (self.shard_size * shard_idx_query) + N_ROWS_SHARD_META_DATA # absolute index to get correponding hash.
                        data_hash = self.idx_2_hash[idx_hash]
                        if data_hash not in result:
                            result[data_hash] = []
                        result[data_hash] += [score]

                if shard_idx_query == self.shard_idx_update:       # meaning all shards have been queried for given key/id.
                    _ = self.key_2_shardIdx.pop(client_key)
                    return (False, result)
                else:
                    self.key_2_shardIdx[client_key] += 1
                    return (True, result)
    
    def query_all(self, query:np.array, client_key:str) -> Dict:

        final_result = {}
        while True:
            flag, hash_2_scores = self.query(query, client_key = client_key) # result hash to scores list mapping.
            for k,v in hash_2_scores.items():
                if k in final_result:
                    final_result[k] += v
                else:
                    final_result[k] = v
            if flag == False:
                break
        
        return False, final_result
    
    def update_base(self, data_hash:str, data_embedding:np.array) -> Tuple[int, int, int]:        
        with self.lock:
            update_status = self.shard_cache.update(self.shard_idx_update, data_embedding)  # update shard.
            self.shard_idx_update = update_status[-1][0]  # update current index for update.
            self.update_index(data_hash, update_status=update_status)       # update corresponding absolute shard index to hash mapping.
    
    def save(self):
        with self.lock:
            self.shard_cache.save_shard_to_disk(idx = self.shard_idx_update, shard = self.shard_cache[self.shard_idx_update])
            self.save_index()
    
    def end_preloading_thread(self):
        with self.lock:
            self.shard_cache.command_queue.put(-1)
            self.preload = False

    def sanity_check(self):
        # a very naive routine to do a sanity check. To elaborate on this in future to have stronger guarantees
        observed_count = 0
        for x in os.listdir(self.index_directory):
            if ".idx" in x:
                shard_path = os.path.join(self.index_directory, x)
                with open(shard_path, "rb") as f:
                    shard = np.load(f)
                    observed_count += int(shard[0,0])  # how many rows have been updated in a given shard.
        
        temp_dict = self.load_index()
        assert observed_count == len(temp_dict) # for each row in the SHARDS, there is a corresponding entry in META_DATA dict. (idx to hash)

    def reset(self):    
        """ For now resetting involves deleting all the .idx and .pkl(index) files, hence equivalent to generate a fresh index without rebooting the server.
        NOTE: This would delete all the corresponding data with no way to recover. 
        """        
        with self.lock:

            # deallocate shard resources.
            store_preload_value = self.preload
            if store_preload_value:
                self.end_preloading_thread()
            del self.shard_cache

            # delete all shards/.idx files
            for data_file in os.listdir(self.index_directory):
                if ".idx" in data_file.lower() and self.shard_prefix.lower() in data_file.lower():        # this should be enough to check..
                    path_to_remove = os.path.join(self.index_directory, data_file)
                    os.remove(path_to_remove)

            # delete the index
            temp_path = self.get_index_path()
            if os.path.exists(temp_path):
                os.remove(temp_path)

            # now call the self.__init__  to initiate a reset.
            self.__init__(
                shard_prefix=self.shard_prefix,
                shard_size=self.shard_size,
                embedding_size=self.embedding_size,
                index_directory=self.index_directory,
                preload = store_preload_value
            )
