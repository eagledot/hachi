# Wraps the Nim (backend) Meta Index.
# TODO: improvements could be made in backend like a `replace` routine, better `batching`... start collecting latencies!

import os
import copy
import hashlib
from threading import RLock
from typing import Optional, Union, Iterable, List, Dict, Any, Generator
import sys
import json

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "./nim"))
import meta_index_new_python as mBackend

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
from .metadata import ImageMetaAttributes, MainAttributes, UserAttributes, ImageExifAttributes, MLAttributes

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
        
        # initialize the index directory .
        self.index_directory = os.path.abspath(index_directory)
        if not os.path.exists(self.index_directory):
            os.mkdir(self.index_directory)

        # meta index full path.
        self.meta_index_path = os.path.join(self.index_directory, "meta_data.json")

        # initialize the nim backend.
        if os.path.exists(self.meta_index_path):
            mBackend.load(self.meta_index_path)
            self.column_labels = json.loads(mBackend.get_column_labels())
            self.column_types = json.loads(mBackend.get_column_types())
            self.backend_is_initialized = True
        else:
            # lazy when first time update/put is called. we can have the column_labels and column_types available then..
            pass

        # resources:
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
            # query = json.dumps({"resource_hash":resource_hash})
            query = '{"resource_hash": "' + resource_hash + '"}' # generate expected json faster.
            
            # may load json a bit faster, parse bytes directly, as we just have to check if how many rows returned!
            attr_2_rowIndices = json.loads(mBackend.query(query)) # first get the desired row_index that we need to update.
            assert len(attr_2_rowIndices["resource_hash"]) == 0 or len(attr_2_rowIndices["resource_hash"]) == 1, "data-hash is supposed to be primary-key, so must correspond to a single row?"
            return len(attr_2_rowIndices["resource_hash"]) == 1

    def suggest(self, attribute:str, query:str):
        """for now we just search substrings in the string, which a column of colString does by default!
        later when fuzzy search is embedded, then can use that!

        NOTE: for now must be a valid attribute and of type string, if any condition fails we return empty list
        """ 
        result = []
        if self.backend_is_initialized == False:
            return result

        with self.lock:
            attr_2_type = self.get_attribute_2_type() # TODO: create a mapping as field rather than function call!
            if attribute in attr_2_type and attr_2_type[attribute] == "string":
                # prepare query
                query_json = json.dumps({attribute:query})
                row_indices = json.loads(mBackend.query(query_json, exact_string = False, top_k = 20, unique_only = True))[attribute] # get the rows, for which column/attribute has query as substring in it.

                # collect rows, TODO: should be able to just ask for a single attribute too..but still ok, since we select row_indices for desired attribute.
                rows = json.loads(mBackend.collect_rows(row_indices))
                temp_result = set()
                for r in rows:
                    temp_value = r[attribute]

                    # flatten and de-duplicate
                    if not isinstance(temp_value, list):
                        temp_result.add(temp_value)
                    else:
                        for x in temp_value:
                            if query in x:   # current logic return the full original array stored along with the query matched, so we want the relevant element/elements only.
                                # for example ["cluster_xx", "<queryxx>"], we want queryxx only!
                                temp_result.add(x)
                
                return list(temp_result)                        
            else:
                print("[WARNING]: attribute {} should have been a valid attribute and should be of type string for now!".format(attribute))
            return result

    # @profile
    def query(self, resource_hashes:Optional[Union[str, Iterable[str]]] = None, attribute:Optional[str] = None, attribute_value:Optional[str] = None,  latest_version:bool = True) -> Dict[str, Dict]:
        """ Queries the meta index based on either resource_hashes or given a fuzzy attribute/value pair.
        
        latest_version: bool, can be set to false to collect original version, 
        NOTE: we still match with the latest version to get matching indices, but can choose to collect original version of data!
        # useful when match againt user provided data, but may need original version to query some auxiliary data like face clusters (which have no info about user updates)
        
        NOTE: current meta-index treat resource_hash as just another field.. so i func signature can be simplified.. TODO
        """
        # we want to return the rows/meta-data associated with resource_hashes or from a specific column/attribute matching.
        # for example user may search for "place"[attribute]  for value "norway", 
        # then first collect the rows matching this pair.

        # flow:  querying for now is allowed for one attribute/value pair.. (on python side we can do a for loop for resource_hashes!)
        # we find first the relevant row_indices for an attribute/value pair. since resource_hash/resource_hash is just another column.
        # in case of resource_hash, we collect row_index for each such resource_hash.
        # once we row_indices, we can collect corresponding rows.
        if self.backend_is_initialized == False:
            return {}

        if resource_hashes is None:
            # create the query
            query = {attribute:attribute_value}
            
            json_query = json.dumps(query)
            result_json  = mBackend.query(json_query)
            # get the meta-data/rows
            attr_2_rowIndices = json.loads(result_json)
            del result_json

            assert len(attr_2_rowIndices) == 1 , "expected only a single key: {}".format(attribute)
            row_indices = attr_2_rowIndices[attribute]
            
            result = {}
            meta_array = json.loads(mBackend.collect_rows(attr_2_rowIndices[attribute], latest_version = latest_version))
            for meta in meta_array:
                result[meta["resource_hash"]] = meta
            del meta_array
            return result
        
        else:
            if isinstance(resource_hashes, str):
                resource_hashes = [resource_hashes]

            row_indices = []
            for resource_hash in resource_hashes:
                # collect all possible row indices.
                attribute = "resource_hash"
                query = {attribute:resource_hash}
                result_json = mBackend.query(json.dumps(query))
                attr_2_rowIndices = json.loads(result_json)
                del result_json
                row_indices = row_indices + attr_2_rowIndices[attribute]
            

            result = {}  # hash to metaData as have been doing in initial version!
            # get the meta-data/rows
            meta_array = json.loads(mBackend.collect_rows(row_indices, latest_version = latest_version))
            for meta in meta_array:
                result[meta["resource_hash"]] = meta

            return result

    # TODO: name it append/put instead of update!
    def update(self,
               meta_data:ImageMetaAttributes
               ):

        # print("[TODO]: rename `update` to `append`")
        with self.lock:
            assert not (meta_data["resource_hash"] is None)
            
            # NOTE: have to flatten the meta-data for backend, (as supports primitve-data types and array for strings for now!)
            flatten_dict = {}
            # Only at-max a single level of dict nesting is expected!
            for parent_key, parent_v in meta_data.items():           
                if isinstance(parent_v, dict):
                    for k,v in parent_v.items(): # no-more nesting!
                        if v is None:                        
                            flatten_dict[k] = "UNK"
                        else:
                            flatten_dict[k] = v
                else:
                    if isinstance(parent_v, str):
                        flatten_dict[parent_key] = parent_v
                    else:
                        # handle None, as currently we don't allow None/Null in the backend.
                        # Its a bare-bone from scratch database, give it time !
                        assert parent_v is None
                        flatten_dict[parent_key] = "UNK"
            
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
                        self.column_types.append("string")
                    else:
                        assert 1 == 0, "not expected type: {}".format(type(v))

                mBackend.init(
                    name = self.name,
                    column_labels = self.column_labels,
                    column_types = self.column_types,
                    capacity = self.capacity,
                )
                self.backend_is_initialized = True
            else:
                if self.is_indexed(
                    meta_data["resource_hash"]
                ):
                    print("[WARNING]: Don't call metaIndex update/append, when already indexed\nCheck `if_indexed` first")
                    return
            
            # TODO: set resource_hash column to be immutable (kind of primary key..)
            json_meta = json.dumps(flatten_dict) # serialize !
            mBackend.put(json_meta)
            
            del json_meta
    
    def modify_meta_ml(self, 
                        resource_hash:str,
                        meta_data:MLAttributes,
                        force:bool = False):
        
        """
        Modify existing ML attributes for a resource, like when clusters have been finalized!
        NOTE: it is called internally only , and should never be called based on some client/user event.
        For now only being called to modify/update cluster-ids for a resource !
        
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

            # update it.
            query = json.dumps({"resource_hash":resource_hash})  
            attr_2_rowIndices = json.loads(mBackend.query(query)) # first get the desired row_index that we need to update.
            assert len(attr_2_rowIndices["resource_hash"]) == 1, "expected only 1 row as resource_hash acts like a primary key!"
            row_indices = attr_2_rowIndices["resource_hash"]
            mBackend.modify(row_indices[0], json.dumps(meta_data), force = force)

            # -----------------------------------------
            # By default, if there is a matching `attribute` with ML for `user` also, fill the ML information.
            # Later, user can amend/update that info, UserAttributes are supposed to be writable by users/external-events!
            user_meta = {}
            for k in meta_data.keys():
                # for example: personML, person for UserAttributes!
                if k.replace("ML", "") in UserAttributes.__annotations__.keys():
                    user_meta[k.replace("ML","")] = meta_data[k]

            if len(user_meta) > 0:
                mBackend.modify(row_indices[0], json.dumps(user_meta), force = force)
            del user_meta
            #----------------------------------------------

    def modify_meta_user(self, 
                        resource_hash:str,
                        meta_data:UserAttributes, # or a subset!
                        force:bool = False):
        
        """
        modify existing User attributes for a resource, like when clusters have been finalized!
        I think distinction b/w attributes' types, make it easier to track bugs when modifications occur!
        """
        with self.lock:
            if self.backend_is_initialized == False:
                print("[WARNING]: calling Modify_meta_data without initIalized, should be an error")
                return 

            assert self.is_indexed(resource_hash)
            
            # update it.
            query = json.dumps({"resource_hash":resource_hash})  
            attr_2_rowIndices = json.loads(mBackend.query(query)) # first get the desired row_index that we need to update.
            assert len(attr_2_rowIndices["resource_hash"]) == 1, "expected only 1 row as resource_hash acts like a primary key!"
            row_indices = attr_2_rowIndices["resource_hash"]
            mBackend.modify(row_indices[0], json.dumps(meta_data), force = force)


    def save(self):
        with self.lock:
            assert self.backend_is_initialized == True
            # if no resource on python side just calling save on backend is enough i guess!
            mBackend.save(self.meta_index_path)
    
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

    def get_unique(self, attribute:str) -> Iterable[Any]:
        if self.backend_is_initialized == False:
            return set()

        data_all =  json.loads(mBackend.get_all_elements(attribute))
        return set(data_all)

    def get_attribute_2_type(self):
        return {self.column_labels[i]:self.column_types[i] for i in range(len(self.column_labels))}


    def get_stats(self):
        """
        Some stats about the amount and type of data indexed, add more information in the future if needed.
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
                result["image"]["count"] = len(self.get_unique("resource_hash"))
                result["image"]["unique_people_count"] = len(self.get_unique("personML"))
                result["image"]["unique_place_count"] = len(self.get_unique("place"))
                result["image"]["unique_resource_directories_count"] = len(self.get_unique("resource_directory"))

        return result

if __name__ == "__main__":
    pass

    