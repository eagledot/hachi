# imports

import os
import copy
import hashlib
from threading import RLock
from typing import Optional, Union, Iterable, List, Dict, Any
from queue import Queue
import pickle
import random
import time
import sys
import json

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../"))
from config import appConfig

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../exif"))
from exif import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../fuzzy_search"))
from fuzzy_search import FuzzySearch

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../geocoding"))
from reverse_geocode import GeocodeIndex

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "./nim"))
import meta_index_new_python as mBackend

import get_image_size

CASE_INSENSITIVE = True  # later make decision in app_config

ALLOWED_RESOURCES = {       
    "audio": set([".mp3", ".aac"]),                              # TODO:
    "video": set([".mp4", ".avi", ".mkv"]),                     # opencv should allow to read almost all type of video containers and codecs
    "image": set([".jpg", ".jpeg", ".png", ".tiff", ".raw"]),   # opencv is being used to read raw-data, so almost all extensions are generally supported.
    "text":  set([".pdf", ".txt", ".epub"])                     # TODO:
}

def should_skip_indexing(resource_directory:os.PathLike, to_skip:List[os.PathLike] = appConfig["to_skip_paths"]) ->bool:
    """Supposed to tell if a resource directory is contained in the to_skip directories
    """

    # NOTE: i think good enough!! (should work on all Os)
    temp_resource = os.path.abspath(resource_directory)
    result = False
    for x in to_skip:
        try:
            temp_result = os.path.commonpath([temp_resource, x])
        except:
            continue
        if os.path.normcase(temp_result) == os.path.normcase(x):
            result = True
            break        
    return result

def collect_resources(root_path:os.PathLike, include_subdirectories:bool = True) -> Dict[os.PathLike, str]:

    resources_queue = Queue()
    resources_queue.put(os.path.abspath(root_path))
    
    while True:
        result = {}
        for k in appConfig["allowed_resources"]:
            result[k] = {}
        result["finished"] = False

        if resources_queue.qsize() == 0:     #    "This is ok, since we are putting, and getting inside same iteration of function. So checking length is trustworthy."
            result["finished"] = True
            break
        
        current_directory = resources_queue.get()
        if should_skip_indexing(current_directory):
            continue
        
        try: 
            temp_resources = os.listdir(current_directory)
        except:
            print("Error while listing: {}".format(current_directory))
            continue
        
        
        for temp_resource in temp_resources:
            if os.path.isdir(os.path.join(current_directory, temp_resource)):
                resources_queue.put(os.path.join(current_directory, temp_resource))
            else:
                resource_extension = os.path.splitext(temp_resource)[1]
                temp_resource_type = get_resource_type(resource_extension)
                if temp_resource_type is not None:
                    if result[temp_resource_type].get(current_directory):
                        result[temp_resource_type][current_directory].append(temp_resource)
                    else:
                        result[temp_resource_type][current_directory] = [temp_resource]
        
        yield result
                
        if include_subdirectories == False:
            break
        
    yield result

def get_resource_type(resource_extension:str) -> Optional[str]:
    for k,v in appConfig["allowed_resources"].items():
        if resource_extension.lower() in v:
            return k
    return None

geoCodeIndex = GeocodeIndex()                                    # initialize our geocoding database/index.

def get_exif_data(resource_path:str, resource_type:str) -> Dict:
    
    result_exif_data = {}
    if resource_type == "image":
        __allowed_image_fields = appConfig[resource_type]["exif_attributes"]

        result_exif_data = {k:None for k in __allowed_image_fields}

        result_exif_data["taken_at"] = "unknown"
        result_exif_data["gps_latitude"] = None
        result_exif_data["gps_longitude"] = None
        result_exif_data["make"] = ""
        result_exif_data["model"] = ""
        result_exif_data["device"] = ""
 
        # exif package mapping to result_exif_data fields. 
        exif_package_mapping = {
            "make": "make",
            "model": "model",
            "datetime_original": "taken_at",
            "gps_latitude": "gps_latitude",
            "gps_longitude": "gps_longitude" 
        }

        try:
            # NOTE: lots of edge cases, in extracting exif data, so must be in a try-except block.
            temp_handle = Image(resource_path)
            if temp_handle.has_exif:
                for k,v in exif_package_mapping.items():
                    if "gps" in k:
                        # convert to degrees.. (From degrees, minutes, seconds)
                        temp = str(float(temp_handle[k][0]) + float(temp_handle[k][1])/60 + float(temp_handle[k][2])/3600 )
                        result_exif_data[v] = temp
                    else:
                        result_exif_data[v] = str(temp_handle[k])
        except:
            pass        # some error while extracting exif data.            
        
        # Read image size information. 
        try:
            width,height = get_image_size.get_image_size(resource_path)
        except:
            print("Image size error for: {}".format(resource_path))
            width, height = 1, 1
        result_exif_data["width"] = str(width)
        result_exif_data["height"] = str(height)
        result_exif_data["device"] = "{}".format(result_exif_data["make"].strip() + " " + result_exif_data["model"].strip())  # a single field for device.
        result_exif_data["place"] = str(geoCodeIndex.query((result_exif_data["gps_latitude"], result_exif_data["gps_longitude"]))).lower() # get nearest city/country based on the gps coordinates if available.

    return result_exif_data

def generate_data_hash(resource_path:str, chunk_size:int = 400) -> Optional[str]:
    
    data_hash = None
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
            data_hash =  m.hexdigest()
        except:
            pass
        del(m)
    
    return data_hash


# config
# making sure relativiness of resources is respected.
META_DATA_INDEX_DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "./meta_indices")
META_INDEX_FILE = os.path.join(META_DATA_INDEX_DIRECTORY, "meta_data.json")

class MetaIndex(object):
    # yeah try to work through newer backend for meta index.
    def __init__(self, name:str = "metaIndexV2", capacity:int = 50_000, index_directory:str = META_DATA_INDEX_DIRECTORY) -> None:

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

    def _meta_data_template(self, resource_type:str)-> Dict[str, Any]:
        temp = {}
        assert resource_type in appConfig["allowed_resources"]
        for attribute in appConfig[resource_type]["meta_attributes"]:
            temp[attribute] = None        
        # common attributes for all resources
        temp["is_indexed"] = False
        temp["resource_type"] = resource_type
        return temp
        
    def load_fuzzy_search(self, attributes_list:Optional[List[str]] = "__all__") -> Dict:
        temp = {}
        if hasattr(self, "fuzzy_search"):
            temp = self.fuzzy_search
        
        if attributes_list == "__all__":  # what should i use to indicat something like * ??
            attributes_list = self.fuzzy_search_attributes
        
        for updated_attribute in attributes_list:
            if updated_attribute in self.fuzzy_search_attributes:
                
                temp[updated_attribute] = FuzzySearch()

                for data_hash, meta_data in self.hash_2_metaData.items():
                    data = meta_data[updated_attribute]  # like for place attribute, this would allow fuzzy search across all possible PLACES for images
                    if data is not None:
                        if isinstance(data, str):
                            temp[updated_attribute].add(data, auxiliaryData = data_hash) # auxiliary data is data_hash in this case, since using set, it allows one to many modelling.
                        else:
                            # since using for loop, and a set, allows "many to many" modelling.
                            for d in data:
                                temp[updated_attribute].add(d, auxiliaryData = data_hash)

        return temp

    def extract_image_metaData(self, resources:Iterable[os.PathLike]) -> Dict[str, Dict]:
        """Routine to extract valid metaData for image resource type.

        Returns a resource_hash to meta-data (dict) mapping.
        """
        result = {}
        for resource_path in resources:
            assert os.path.isfile(resource_path), "{} ".format(resource_path)
            data_hash  = generate_data_hash(resource_path)
            if data_hash is None:
                # TODO: warning atleast to indicate invalid hash...
                continue
            
            # check if data_hash already indexed
            if self.backend_is_initialized == True:
                if mBackend.check(json.dumps({"resource_hash":data_hash})):
                    # for now it is bit slower.. we will make later the resource hash the primary key..
                    # print("yes: {} exists already:".format(data_hash))
                    continue

            try:
                (_, type, file_size, width, height) = get_image_size.get_image_metadata(resource_path)
            except:
                print("Invalid data possibly for {}".format(resource_path))
                continue

            # common meta-data attributes.
            temp = self._meta_data_template(resource_type = "image")
            temp["absolute_path"] = resource_path
            temp["resource_directory"] = os.path.dirname(resource_path)
            temp["resource_extension"] = os.path.splitext(resource_path)[1]
            temp["is_favourite"] = False
            temp["filename"] = os.path.basename(resource_path)
            temp["modified_at"] = time.ctime(os.path.getmtime(resource_path))
            temp["description"] = ""
            temp["tags"] = ""

            assert set(temp.keys()) == set(appConfig["image"]["meta_attributes"]), "Config meta-attributes must match"

            # resource specific meta-data attributes.
            temp_exif_data = get_exif_data(resource_path=resource_path, resource_type = "image")
            for k,v in temp_exif_data.items():
                temp[k] = v

            new_temp = temp
            if CASE_INSENSITIVE:
                # by default we do this... atleast it would match.. rather than providing no results due to case mismatching.
                for k,v in temp.items():  # forgot if allowed to write while reading from a dict/list!
                    if isinstance(v, str):
                        new_temp[k.lower()] = v.lower()
            del temp
            result[data_hash] = new_temp
        return result

    
    # def get_original_data(self, attribute:str) -> Optional[Iterable[str]]:
    #     # TODO: do away with this..
        
    #     result = None
    #     with self.lock:
    #         if attribute in self.fuzzy_search_attributes:
    #             temp_index = self.fuzzy_search[attribute]
    #             result = temp_index.get_original_data()
    #     return result

    def suggest(self, attribute:str, query:str):
        """for now we just search substrings in the string, which a column of colString does by default!
        later when fuzzy search is embedded, then can use that!

        NOTE: for now must be a valid attribute and of type string, if any condition fails we return empty list
        """ 
        result = []
        with self.lock:
            attr_2_type = self.get_attribute_2_type()
            if attribute in attr_2_type and attr_2_type[attribute] == "string":
                # prepare query
                query_json = json.dumps({attribute:query})
                row_indices = json.loads(mBackend.query(query_json))[attribute] # get the rows, for which column/attribute has query as substring in it.

                # collect rows
                rows = json.loads(mBackend.collect_rows(row_indices))
                for r in rows:
                    result.append(r[attribute])
            else:
                print("[WARNING]: attribute {} should have been a valid attribute and should be of type string for now!".format(attribute))
            return result

    def query(self, data_hashes:Optional[Union[str, Iterable[str]]] = None, attribute:Optional[str] = None, attribute_value:Optional[str] = None, exact_string:bool = False) -> Dict[str, Dict]:
        """ Queries the meta index based on either data_hashes or given a fuzzy attribute/value pair.
        NOTE: current meta-index treat data_hash as just another field.. so i func signature can be simplified.. TODO
        """
        # we want to return the rows/meta-data associated with data_hashes or from a specific column/attribute matching.
        # for example user may search for "place"[attribute]  for value "norway", 
        # then first collect the rows matching this pair.

        # flow:  querying for now is allowed for one attribute/value pair.. (on python side we can do a for loop for data_hashes!)
        # we find first the relevant row_indices for an attribute/value pair. since data_hash/resource_hash is just another column.
        # in case of data_hash, we collect row_index for each such data_hash.
        # once we row_indices, we can collect corresponding rows.

        if data_hashes is None:
            # create the query
            query = {attribute:attribute_value}
            result_json = mBackend.query(json.dumps(query), exact_string = exact_string) # get corresponding row_indices.
            # get the meta-data/rows
            attr_2_rowIndices = json.loads(result_json)
            del result_json

            assert len(attr_2_rowIndices) == 1 , "expected only a single key: {}".format(attribute)
            row_indices = attr_2_rowIndices[attribute]

            meta_array = json.loads(mBackend.collect_rows(attr_2_rowIndices[attribute]))
            result = {}
            for meta in meta_array:
                result[meta["resource_hash"]] = meta
            del meta_array
            return result

        else:
            if isinstance(data_hashes, str):
                data_hashes = [data_hashes]

            row_indices = []
            for data_hash in data_hashes:
                # collect all possible row indices.
                attribute = "resource_hash"
                query = {attribute:data_hash}
                result_json = mBackend.query(json.dumps(query), exact_string = exact_string)
                attr_2_rowIndices = json.loads(result_json)
                del result_json
                row_indices = row_indices + attr_2_rowIndices[attribute]
            
            # get the meta-data/rows
            meta_array = json.loads(mBackend.collect_rows(row_indices))

            result = {}  # hash to metaData as have been doing in initial version!
            for meta in meta_array:
                result[meta["resource_hash"]] = meta
            return result

    # TODO: name it append/put instead of update!
    def update(self, data_hash:str, meta_data:dict):
        # TODO: make the decision of lowering...
        assert data_hash is not None

        with self.lock:
            assert ("resource_hash" in meta_data) == False, meta_data["resource_hash"]
            meta_data["resource_hash"] = data_hash # we save resource_hash just as another field.
            
            # handle None..
            for k,v in meta_data.items():
                if v is None:
                    # TODO: warning converting None to string type, as we donot allow null values in backend for now.
                    meta_data[k] = "unknown"
            
            if self.backend_is_initialized == False:
                # lazy initialization on first time update...
                assert self.column_types == []
                assert self.column_labels == []
                for k,v in meta_data.items():
                    assert isinstance(k, str)
                    self.column_labels.append(k)
                    
                    if isinstance(v, str):
                        self.column_types.append("string")
                    elif isinstance(v, bool):  # order matters.. otherwise int can be matched!
                        self.column_types.append("bool")
                    elif isinstance(v, int):
                        self.column_types.append("int32")
                    elif isinstance(v, float):
                        self.column_types.append("float32")
                    elif isinstance(v, Iterable):
                        for elem in v:
                            assert isinstance(elem, str), "only an iterable of strings is allowed currently"
                        self.column_types.append("string")
                    else:
                        assert 1 == 0, "not expected type: {}".format(type(v))

                # print(column_labels)
                # print(column_types)
                    
                mBackend.init(
                    name = self.name,
                    column_labels = self.column_labels,
                    column_types = self.column_types,
                    capacity = self.capacity,
                )
                self.backend_is_initialized = True
            
            # TODO: set resource_hash column to be immutable (kind of primary key..)
            json_meta = json.dumps(meta_data) # serialize !
            mBackend.put(json_meta)
            del json_meta
    
    def modify_meta_data(self, data_hash:str, meta_data:Dict):
        with self.lock:
            # create a query. using this first we get the desired row_indices.
            # TODO: it can be speed up storing a mapping from resource_hash to row but extra work. (but donot want to create new resources either ! first benchmark this !)
            
            new_meta = meta_data
            if CASE_INSENSITIVE:
                for k, v in meta_data.items():
                    assert v is not None
                    if isinstance(v, str):
                        new_meta[k.lower()] = v.lower()
            del meta_data

            query = json.dumps({"resource_hash":data_hash})  
            attr_2_rowIndices = json.loads(mBackend.query(query)) # first get the desired row_index that we need to update.
            assert len(attr_2_rowIndices) == 1, "expected only 1 but got: {} for {}".format(attr_2_rowIndices, data_hash)

            # update it.
            row_indices = attr_2_rowIndices["resource_hash"]
            mBackend.modify(row_indices[0], json.dumps(new_meta))
    
    def save(self):
        with self.lock:
            # if no resource on python side just calling save on backend is enough i guess!
            mBackend.save(self.meta_index_path)
    
    def reset(self):
        with self.lock:
            if os.path.exists(self.meta_index_path):
                os.remove(self.meta_index_path)
            
            # enough i guess and powerful, in process update the schema... so good for software updates!
            self.column_labels = []
            self.column_types = []
            self.backend_is_initialized = False  # so when next time update is called... we will initialize it.
            mBackend.reset()

    
    def get_unique(self, attribute:str) -> Iterable[Any]:
        data_all =  json.loads(mBackend.get_all_elements(attribute))
        return set(data_all)

    def get_attribute_2_type(self):
        return {self.column_labels[i]:self.column_types[i] for i in range(len(self.column_labels))}


    def get_stats(self):
        """
        TODO: based on the new backend!
        
        Some stats about the amount and type of data indexed, add more information in the future if needed.
        NOTE: for now just using the dummy value until port it to newer version!
        
        """
        result = {}
        for k in appConfig["allowed_resources"]:
            result[k] = {"count":0}  # add more fields in the future if needed.
            result["available_resource_attributes"] = ["person", "place", "filename", "resource_directory"]


        with self.lock:
            # update the count for each of the resource type.
            # for meta_data in self.hash_2_metaData.values():
            #     if(True):                           # if in this dict, is_indexed is supposed to be true ??
            #         result[meta_data["resource_type"]]["count"] = 10

            # NOTE: dummy values for now..
            result["image"]["count"] = 100
            result["image"]["unique_people_count"] = 10
            result["image"]["unique_place_count"] = 10
            result["image"]["unique_resource_directories_count"] = 10

        return result

if __name__ == "__main__":
    import pickle

    test = MetaIndex()
    # with open("./meta_indices/meta_data_old.pkl", "rb") as f:
    #     stored_meta_data = pickle.load(f)
    
    # print("done..")

    # # it seems to work.. 
    # count = 0
    # for data_hash, meta_data in stored_meta_data.items():
    #     test.update(data_hash, meta_data)
    #     if count == 0:
    #         print(data_hash)
    #     count += 1
    #     if count % 100 == 0:
    #         print(count)
    # test.save() # this also...

    # then query.. ?
    # result = test.query(data_hashes = "38920e82fb39811f56b2478a37508ce42a954709bff1e58ca7c70b94678ae18f")
    
    result = test.query(attribute = "filename", attribute_value = "insta_bk0S3J5hejJ_0.jpg", exact_string=True)
    # temp = test.get_unique("filename")
    # print(len(temp))
    # result = test.query(attribute = "filename", attribute_value = "insta_0")
    for hash, meta in result.items():
        print(meta["filename"])
    #     print(meta["absolute_path"])

    # modify say filename attribute for a given hash..
    # test.modify_meta_data(
    #     data_hash = "38920e82fb39811f56b2478a37508ce42a954709bff1e58ca7c70b94678ae18f",
    #     meta_data = {"filename": "random file name"})
    
    # result = test.query(data_hashes="38920e82fb39811f56b2478a37508ce42a954709bff1e58ca7c70b94678ae18f")
    # for hash, meta in result.items():
    #     print(meta["filename"])

    test.save()

    print(test.column_types)
    print(test.column_labels)
    
    # print(test.get_unique("resource_extension"))


    # Testing, there seemed a bug, where single "no_person_detected" was returned, instead of a list!
    # may be parsing bug on browser side or server side.. couldn't ascertain, couldn't reproduce!
    # just in case.. documenting here!
    # test = MetaIndex()
    # print(test.hash_2_metaData["2c3e0c137dda126466dcf909a130c5fd8c8e84902eda99b72a2675dec1e77f18"])
    # print(test.query(data_hashes=["2c3e0c137dda126466dcf909a130c5fd8c8e84902eda99b72a2675dec1e77f18"]))
