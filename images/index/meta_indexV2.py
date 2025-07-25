# Wraps the Nim (backend) Meta Index.
# TODO: improvements could be made in backend like a `replace` routine, better `batching`... start collecting latencies!

import os
import copy
import hashlib
from threading import RLock
from typing import NamedTuple, Optional, Union, Iterable, List, Dict, Any, Generator
from typing import Callable
import sys
import json
import time

query_token_counter = 0      # NOTE: TODO: make it random enough if exposing .. (any logged-in must not be able to guess!)

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "./nim"))
import meta_index_new_python as mBackend

try:
    from .pagination import PaginationCache, PaginationInfo
except:
    from pagination import PaginationCache, PaginationInfo
    
CASE_INSENSITIVE = True  # DO IT on `request`, when updating/receiving user-data , otherwise generating info also keep it in lower.
def generate_resource_hash(resource_path:str, chunk_size:int = 400) -> Optional[str]:
    
    resource_hash = None
    if os.path.exists(resource_path):
        f = open(resource_path, "rb")
        file_size = os.stat(resource_path).st_size
        start_offset = int(0.1 * file_size)
        m = hashlib.sha256()

        try:
            f.seek(start_offset, 0)
            start_bytes = f.read(chunk_size)
            m.update(start_bytes)
            
            end_offset = int(0.1 * file_size)
            f.seek(-end_offset, 2)
            end_bytes = f.read(chunk_size)
            m.update(end_bytes)

            m.update(str(file_size).encode("utf8"))
            resource_hash =  m.hexdigest()
        except:
            pass
        del(m)
    
    return resource_hash
# --------------------------------------------------------------------
try:
    from .metadata import ImageMetaAttributes, MainAttributes, UserAttributes, ImageExifAttributes, MLAttributes, flatten_the_metadata
except:
    from metadata import ImageMetaAttributes, MainAttributes, UserAttributes, ImageExifAttributes, MLAttributes, flatten_the_metadata

# making sure relativiness of resources is respected.
META_DATA_INDEX_DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "./meta_indices")
META_INDEX_FILE = os.path.join(META_DATA_INDEX_DIRECTORY, "meta_data.json")

class MetaIndex(object):
    # yeah try to work through newer backend for meta index.
    def __init__(self, name:str = "metaIndexV2", capacity:int = 120_000, index_directory:str = META_DATA_INDEX_DIRECTORY) -> None:

        self.backend_is_initialized = False
        self.capacity = capacity
        self.name = name

        # resources to be freed on reseting..
        self.column_labels = []
        self.column_types = []
        self.column_stats = []  # unique elements for each column count!
        
        # initialize the index directory .
        self.index_directory = os.path.abspath(index_directory)
        if not os.path.exists(self.index_directory):
            os.mkdir(self.index_directory)

        # meta index full path.
        self.meta_index_path = os.path.join(self.index_directory, "{}_meta_data.json".format(self.name))

        self.rows_count = 0
        # initialize the nim backend.
        if os.path.exists(self.meta_index_path):
            self.rows_count = mBackend.load(
                name = self.name,
                load_dir = self.index_directory
                )
            self.column_labels = json.loads(mBackend.get_column_labels())
            self.column_types = json.loads(mBackend.get_column_types())
            self.column_stats = [0 for _ in range(len(self.column_labels))]
            self.backend_is_initialized = True
            self.stats_need_update = True    # by default, each call to `update/append` should set it to true!
            print("[MetaIndexV2] Loaded from: {}".format(self.meta_index_path))
        else:
            # lazy when first time update/put is called. we can have the column_labels and column_types available then..
            pass

        # resources:
        self.pagination_cache = PaginationCache()
        self.lock = RLock()

    def is_indexed(self,
                   resource_hash:str) -> bool:
        """
        Given a data-hash, we could check if given data-hash is present.
        If present, then we conclude this resource hash been indexed!
        """
        
        if self.backend_is_initialized == False:
            # for now there is not data-present, not on disk and not from application. so false!
            return False
        else:
            # may load json a bit faster, parse bytes directly, as we just have to check if how many rows returned!
            row_indices = json.loads(
                mBackend.query_column(
                    attribute = "resource_hash",
                    query = json.dumps(resource_hash),
                )) # first get the desired row_index that we need to update.

            assert len(row_indices) == 0 or len(row_indices) == 1, "data-hash is supposed to be primary-key, so must correspond to a single row?"
            return len(row_indices) == 1

    def suggest(self, attribute:str, query:str):
        """for now we just search substrings in the string, which a column of colString does by default!
        later when fuzzy search is embedded, then can use that!

        NOTE: for now must be a valid attribute and of type string, if any condition fails we return empty list
        """ 
        result = []
        if self.backend_is_initialized == False:
            return result

        with self.lock:
            # NOTE: should work with all attributes now!
            # pagination sequence: (query and collect)
            n_suggestions = 20
            (query_token, n_pages) = self.query(attribute = attribute, query = query, page_size = n_suggestions)
            meta_data_array = self.collect(query_token, page_id = 0) # first n suggestions should be enough for now!
            assert n_pages >= 1, "always it should be right!"
            assert len(meta_data_array) <= n_suggestions
            for i in range(len(meta_data_array)):
                result.append(meta_data_array[i][attribute])
            del meta_data_array
            return result
            
    # class QueryInfo(NamedTuple):
    #     query_completed:bool    # if false, client is excepted to call `query` routine until set to true.
    #     n_pages:int     # we should be able to estimate it on first fresh `query`
    #     query_token:str # unique token for a query.. will be kept until all meta-data has been served exactly once!
    #     page_size:int  # reflectance, maximum no of items per-page!

    # # each call to `query` until done for a client, should be able to generate complete meta-data for a single page alteast!
    # # call query.. for streaming..
    # # enough meta for a single page.
    # # if call to a page_id is done.. before meta-data is available then what!
    
    def collect(self,
            query_token:str,
            page_id:int
            ) -> Any:
        
        # generic routine to actually collect the Transformed data, given page_id and a query token.
        (callback, data) = self.pagination_cache.get(query_token, page_id)
        return callback(data)
    
    def __collect_attribute_unique(
            self,
            data:tuple[str, Iterable[int], bool],
    )-> Iterable[Any]:
        """
        NOTE: Internal, supposed to be called by `collect`!
        """
        # given the attribute, and specific row_indices collect unique values for that attribute!        
        (attribute, row_indices, return_json) = data

        result_json = mBackend.collect_rows(
            attribute,
            row_indices   # nimpy handles  the marshalling to seq[natural] !
        )
        if return_json:
            return result_json
        else:
            return json.loads(result_json)
          
    def __collect_meta_rows(
            self,
            row_indices:Iterable[int],   # collect these rows from meta-data backend!
    ):
        """
        NOTE: Internal, supposed to be called by `collect`!
        Given row_indices, we collect corresponding elements `column` by `column` and then re-create the Row(s) on python side.
        """
        assert isinstance(row_indices, Iterable)
        base_time = time.time_ns()
        
        #NOTE: For following loop, most of latency come from Json decoding, even page_size with 1000 is manageable!
        # First we do it column by column, for each column collect all the specified elements.
        temp = {}
        tic = time.time_ns()

        # collect column by column specified by `row_indices`!
        for attribute in self.column_labels:
            temp[attribute] = json.loads(
                mBackend.collect_rows(
                    attribute,
                    indices = row_indices
                )
            )
            assert len(temp[attribute]) == len(row_indices), "Must match, right! if we are valid row_indices!"
        
        print("[NIM + Python] collect rows: {}".format((time.time_ns() - tic) / 1e6))

        # NOTE: without pagination, the following loop could lead to 0.5 M iterations with 10 columns and 50K row_indices, So!
        # then we re-create Rows from previous data, to easily consume later on!
        final_meta_data = []
        for ix in range(len(row_indices)):
            row_temp = {}
            for attribute in self.column_labels:
                row_temp[attribute] = temp[attribute][ix]
            final_meta_data.append(row_temp)
            del row_temp
        del temp
        print("[QUERY]: {}".format((time.time_ns() - base_time) / 1e6))

        return final_meta_data

    def get_attribute_all(
            self,
            attribute:str,
            page_size:int = 200,
            return_json:bool = False):
        
        with self.lock:
            global query_token_counter

            # We collect all the (unique)`row indices` for this attribute.
            # Useful to get all the possible values for an attribute, like how many `people`, `folders` etc! 
            final_row_indices = self.__query_generic(
                attribute = attribute,
                query = "*" # wild-card to return all (unique) rows!
            )

            query_token = "xxxxxxx_{}".format(query_token_counter)
            # -------------------------------------
            # Generate Pagination info..
            # ------------------------------------
            n_pages = len(final_row_indices) // page_size + 1
            page_meta = []
            for i in range(n_pages):
                page_meta.append((attribute, final_row_indices[i*page_size: (i+1)*page_size], return_json))

            info:PaginationInfo = {}
            info["token"] = query_token
            info["callback"] = self.__collect_attribute_unique
            info["page_meta"] = page_meta
            del page_meta

            # add a new entry to the pagination cache for this query!
            self.pagination_cache.add(
                info
            )
            # -------------------------------

        return (query_token, n_pages)

    def query(
            self,
            attribute:str,
            query:Any,
            unique_only:bool = True,
            page_size:int = 200):
        
        with self.lock:
            # NOTE: supports (Pagination) sequence. (call it and then call `collect`)
            global query_token_counter

            # Get all the (unique) values/elements for a attribute!
            final_row_indices = self.__query_generic(
                attribute = attribute,
                query = query,
                unique_only=unique_only
            )
            print(final_row_indices)

            query_token = "xxxxxxx_{}".format(query_token_counter)
            query_token_counter += 1
            # -------------------------------------
            # Generate Pagination info..
            # ------------------------------------
            info:PaginationInfo = {}
            n_pages = len(final_row_indices) // page_size + 1 # should be ok, when fully divisible, as empty list should be collected!
            page_meta = []
            for i in range(n_pages):
                page_meta.append(final_row_indices[i*page_size: (i+1)*page_size])
            info["token"] = query_token
            info["callback"] = self.__collect_meta_rows
            info["page_meta"] = page_meta
            del page_meta

            # add a new entry to the pagination cache for this query!
            self.pagination_cache.add(info)
            # --------------------------------------------

            return (query_token, n_pages)

    def __query_generic(self, 
              attribute:str,      # attribute to query. 
              query:Union[Any, Iterable[Any]], # based on the column type, multiple queries can be supplied for an attribute
              unique_only:bool = True
              ) -> Iterable[int]:
        
        """
        Query: must be fast enough to generate pagination data in <50 ms for say 1 Million Photos!
        Otherwise refactor it to move latency/cost to T (Transformation) function . (to be happened during `collect`)
        """

        if self.backend_is_initialized == False:
            print("[ERROR]: Backend must have been initialized!")
            return {}

        
        # Multiple quertes for a single attribute can be passed for convenience.
        # NOTE: still backend does it 1 by 1, TODO: allow batching in backend!
        
        # -----------------------------------------------
        query_list = query
        if isinstance(query_list, str):
            assert isinstance(query, str)
            query_list = [query]
        del query
        assert isinstance(attribute,str) and isinstance(query_list, list)

        final_row_indices = []
        for query in query_list:
            # TODO: can share the python memory to write row_indices directly to it but later!
            # But with `unique` returns by default, this should be around a couple of thousand, matching indices only for a query!
            row_indices_json = mBackend.query_column(
                attribute = attribute,
                query = json.dumps(query), # backend consumes in json, to handle multiple column types!
                unique_only = unique_only
            )
            for row_idx in json.loads(row_indices_json):
                final_row_indices.append(row_idx)
        return final_row_indices 
    
    def __get_index(self, attribute) ->int:
        idx = None
        for i,x in enumerate(self.column_labels):
            if attribute == x:
                idx = i
                break
        assert not (idx is None)
        return idx
    
    def __count_unique(self, attribute:str) ->int:
            if self.stats_need_update == False:
                return self.column_stats[self.__get_index(attribute)]

            row_indices = self.__query_generic(
                attribute = attribute,
                query = "*"
            )
            print("stats: {} {}".format(len(row_indices), attribute))

            result  = None
            if self.get_attribute_type(attribute) == "arrayString":
                # then de-duplicate too, as we only got the `uniqueness about array representation not individual elements!`
                temp = set()
                result_json = mBackend.collect_rows(
                    attribute,
                    row_indices   # nimpy handles  the marshalling to seq[natural] !
                )
                for arr in json.loads(result_json):
                    for x in arr:
                        temp.add(x)
                result = len(temp)
            else:
                result =  len(row_indices)

            self.column_stats[self.__get_index(attribute)] = result
            return result

    # TODO: name it append/put instead of update!
    def update(self,
               meta_data:ImageMetaAttributes
               ):

        # print("[TODO]: rename `update` to `append`")
        with self.lock:
            self.stats_need_update = True
            assert len(meta_data["resource_hash"]) > 10 # (assuming atleast 10 chars), proper hash was supposed to be generated!
            flatten_dict = flatten_the_metadata(meta_data)
            
            if self.backend_is_initialized == False:
                # lazy initialization on first time update, this helps decoupling MetaIndex from application flow!
                assert self.column_types == []
                assert self.column_labels == []
                for k,v in flatten_dict.items():
                    assert isinstance(k, str)
                    self.column_labels.append(k)
                    
                    if isinstance(v, str):
                        self.column_types.append("string")
                    elif isinstance(v, bool):  # order matters.. otherwise int can be matched first!
                        self.column_types.append("bool")
                    elif isinstance(v, int):
                        assert v >= (-2**31) and v <= (2**31 - 1) 
                        self.column_types.append("int32")
                    elif isinstance(v, float):
                        self.column_types.append("float32")
                    elif isinstance(v, Iterable):
                        for elem in v:
                            assert isinstance(elem, str), "only an iterable of strings is allowed currently"
                        self.column_types.append("arrayString")
                    else:
                        assert 1 == 0, "not expected type: {}".format(type(v))

                mBackend.init(
                    name = self.name,
                    column_labels = self.column_labels,
                    column_types = self.column_types,
                    capacity = self.capacity,
                )
                self.backend_is_initialized = True
                self.rows_count = 0
            else:
                if self.is_indexed(
                    meta_data["resource_hash"]
                ):
                    print("[WARNING]: Don't call metaIndex update/append, when already indexed\nCheck `if_indexed` first")
                    return
            
            # TODO: set resource_hash column to be immutable (kind of primary key..)
            json_meta = json.dumps(flatten_dict) # serialize !
            mBackend.append(
                json_meta
                )
            
            del json_meta
            self.rows_count += 1
    
    def modify_meta_ml(self, 
                        resource_hash:str,
                        meta_data:MLAttributes,
                        ):
        
        """
        Modify existing ML attributes for a resource, like when clusters have been finalized!
        NOTE: it is called internally only , and should never be called based on some client/user event.
        For now only being called to modify/update cluster-ids for a resource !
        For now it also updates, correspoding `user` counterparts too, we do it during indexing so as initially ML info matches with User ones. later user can modify/update that if wrong! 

        For user-specific events `modify_meta_user` should be called! 
        
        I think could also be useful, in case user later wants to test with Multiple ML models.. 
        I think distinction b/w attributes' types, make it easier to track bugs when modifications occur!
        """
        with self.lock:
            if self.backend_is_initialized == False:
                print("[WARNING]: calling Modify_meta_data without initIalized, should be an error")
                return 

            assert self.is_indexed(resource_hash)
            
            # more assertion, only ML attributes are expected!
            temp_keys = MLAttributes.__annotations__.keys()
            for k in meta_data:
                assert k in temp_keys
            del temp_keys

            # get indices to update!
            row_indices = self.__query_generic(
                attribute = "resource_hash",
                query = resource_hash
            )
            assert len(row_indices) == 1, "expected only 1 row as resource_hash acts like a primary key!"

            mBackend.modify(
                row_idx = row_indices[0], 
                meta_data = json.dumps(meta_data), 
            )
            
            # -----------------------------------------
            # By default, if there is a matching `attribute` with ML for `user` also, fill the ML information.
            # Later, user can amend/update that info, UserAttributes are supposed to be writable by users/external-events!
            user_meta = {}
            for k in meta_data.keys():
                # for example: personML, person for UserAttributes!
                if k.replace("ML", "") in UserAttributes.__annotations__.keys():
                    user_meta[k.replace("ML","")] = meta_data[k]

            if len(user_meta) > 0:
                mBackend.modify(
                    row_idx = row_indices[0], 
                    meta_data = json.dumps(user_meta), 
                    )
            del user_meta
            #----------------------------------------------

    def modify_meta_user(self, 
                        resource_hash:str,
                        meta_data:UserAttributes
                        ):
        
        """
        modify existing User attributes for a resource, like when clusters have been finalized!
        I think distinction b/w attributes' types, make it easier to track bugs when modifications occur!
        """
        with self.lock:
            if self.backend_is_initialized == False:
                print("[WARNING]: calling Modify_meta_data without initIalized, should be an error")
                return 

            assert self.is_indexed(resource_hash)
            
            # get indices to modify!
            row_indices = self.__query_generic(
                attribute = "resource_hash",
                query = resource_hash
            )
            assert len(row_indices) == 1, "expected only 1 row as resource_hash acts like a primary key!"
            mBackend.modify(
                row_index = row_indices[0], 
                meta_datat = 
                json.dumps(meta_data)
                )

    def remove_pagination_token(
            self,
            query_token:str,
    ):
        # generally if can prove some query_token during pagination sequence, generated can no longer is used.
        # or forcefully need to be removed to limit pagination cache, we `pop` it from pagination cache!
        with self.lock:
            self.pagination_cache.remove(query_token)
    
    def save(self):
        with self.lock:
            if self.backend_is_initialized == False:
                # It is possible.. that sometimes an update/append may not occur, before calling `save`, we ignore this.
                print("[WARNING]: Not enough data to save in MetaIndex!")
                return 
            # if no resource on python side just calling save on backend is enough i guess!
            mBackend.save(
                save_dir = self.index_directory
                )
    
    def reset(self):
        with self.lock:
            if self.backend_is_initialized == False:
                return
            
            if os.path.exists(self.meta_index_path):
                os.remove(self.meta_index_path)
            
            # enough i guess and powerful, in process update the schema... so good for software updates!
            self.column_labels = []
            self.column_types = []
            self.backend_is_initialized = False  # so when next time update is called... we will initialize it.
            mBackend.reset()

    def get_attribute_type(self, attribute) -> str:
        # Return `type` for an attributes!
        attr_type = None
        for i,label in enumerate(self.column_labels):
            if label == attribute:
                attr_type = self.column_types[i]
                break
        assert not (attr_type is None)
        return attr_type                

    def get_stats(self):
        """
        Some stats about the amount and type of data indexed, add more information in the future if needed.
        # TODO: (Nim) backend should only be queried, if any of `updates` has happened, otherwise return from cache or something!
        """
        result = {}
        # for k in appConfig["allowed_resources"]:
        for k in ["image"]:  # TODO: use ALLOWED_RESOURCES from metadata.py
            result[k] = {"count":0}  # add more fields in the future if needed.
            result["available_resource_attributes"] = ["personML", "place", "filename", "resource_directory"]

        with self.lock:
            if self.backend_is_initialized == False:
                result["image"]["count"] = 0
                result["image"]["unique_people_count"] = 0
                result["image"]["unique_place_count"] = 0
                result["image"]["unique_resource_directories_count"] = 0
            else:
                result["image"]["count"] = self.__count_unique(attribute = "resource_hash")
                result["image"]["unique_people_count"] = self.__count_unique("personML")
                result["image"]["unique_place_count"] = self.__count_unique("place")
                result["image"]["unique_resource_directories_count"] = self.__count_unique("resource_directory")

        self.stats_need_update = False
        return result

if __name__ == "__main__":
    from metadata import extract_image_metaData, generate_dummy_string
    sample_index = MetaIndex(
        name = "test",
        index_directory = "."
    )
    GENERATE_FRESH = False
    
    if GENERATE_FRESH:
        sample_index.reset()
        n_iterations = 1000
        
        tic = time.time()
        for i in range(n_iterations):    
            if (i % 10_000) == 0:
                print("[TIME]: {} seconds".format(time.time() - tic))
                tic = time.time()
            
            sample_meta_data = extract_image_metaData(
                resource_path = "D://dummy.xyz",
                dummy_data = True
            )
            sample_meta_data["resource_hash"] = generate_dummy_string(size = 32)
            sample_meta_data["main_attributes"]["resource_directory"] = "D:/dummy"

            # update..
            sample_index.update(
                sample_meta_data
            )
            del sample_meta_data
        
        sample_meta_data = extract_image_metaData(
                resource_path = "D://xyz/test",
                dummy_data = True
            )
        sample_meta_data["resource_hash"] = generate_dummy_string(size = 32)
        sample_meta_data["main_attributes"]["resource_directory"] = "D:/xyz/test"
        
        # update..
        sample_index.update(
            sample_meta_data
        )
        
        sample_index.save()
        print("Saved..")  

    
    sample_hash = "dvoicbhpisrvidupsnovuycjblupaszd"
    print(sample_index.get_stats())
    (query_token, n_pages) = sample_index.query(
        attribute = "resource_hash",
        query = sample_hash,
        page_size = 200
    )

    meta_data = sample_index.collect(
        query_token = query_token,
        page_id = 0
    )
    print(meta_data[0]["personML"])

    new_ml:MLAttributes = {}
    new_ml["personML"] = ["sanePerson", "xperson"]
    new_ml["tagsML"] = ["newTag"]
    new_ml["descriptionML"] = "I created this !"

    print(meta_data[0]["person"])
    sample_index.modify_meta_ml(
        resource_hash=sample_hash,
        meta_data = new_ml
    )

    meta_data = sample_index.collect(
        query_token = query_token,
        page_id = 0
    )
    print(meta_data[0]["person"])
    print(meta_data[0]["personML"])
    print(meta_data[0]["descriptionML"])





     