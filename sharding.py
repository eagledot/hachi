# imports
from threading import RLock
import os
import threading
import queue
import pickle
from collections import OrderedDict
from typing import Optional

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

    def update(self, idx:int, embeddings:np.array) -> tuple[int, int, int, bool]:
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
