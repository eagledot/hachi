# imports

import os
import copy
import hashlib
from threading import RLock
from typing import Optional, Union, Iterable, List
from queue import Queue
import pickle
import random
import time
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../exif"))
from exif import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../fuzzy_search"))
from fuzzy_search import FuzzySearch

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../geocoding"))
from reverse_geocode import GeocodeIndex

import get_image_size

ALLOWED_RESOURCES = {       
    "audio": set([".mp3", ".aac"]),                              # TODO:
    "video": set([".mp4", ".avi", ".mkv"]),                     # opencv should allow to read almost all type of video containers and codecs
    "image": set([".jpg", ".jpeg", ".png", ".tiff", ".raw"]),   # opencv is being used to read raw-data, so almost all extensions are generally supported.
    "text":  set([".pdf", ".txt", ".epub"])                     # TODO:
}
TO_SKIP_PATHS = [os.path.dirname(os.path.abspath(__file__))]                      # skip application root directory, children would also be excluded from indexing..

def should_skip_indexing(resource_directory:os.PathLike, to_skip:List[os.PathLike] = TO_SKIP_PATHS) ->bool:
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

def collect_resources(root_path:os.PathLike, include_subdirectories:bool = True) -> dict[os.PathLike, str]:

    resources_queue = Queue()
    resources_queue.put(os.path.abspath(root_path))
    
    while True:
        result = {}
        for k in ALLOWED_RESOURCES:
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
    for k,v in ALLOWED_RESOURCES.items():
        if resource_extension.lower() in v:
            return k
    return None

geoCodeIndex = GeocodeIndex()                                    # initialize our geocoding database/index.

def get_exif_data(resource_path:str, resource_type:str) -> dict:
    
    result_exif_data = {}
    if resource_type == "image":
        __allowed_image_fields = [
            
            # device specific information
            "make",        
            "model",
            "device",

            "taken_at",         # Date / timestamp. (original)   --> DateTimeOriginal.
            "gps_latitude",     # gps latitude (if available else value would be None)
            "gps_longitude"     # gps longitude (if available else would be None)
        ]

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

class MetaIndex(object):

    def __init__(self, index_directory:str = META_DATA_INDEX_DIRECTORY) -> None:
        self.index_directory = os.path.abspath(index_directory)
        if not os.path.exists(self.index_directory):
            os.mkdir(self.index_directory)        

        self.fuzzy_search_attributes = ["person", "place", "filename"]  # TODO: add more fuzzy search attributes, must be a subset of fields from self._meta_data_template.

        # resources.
        if not hasattr(self, "lock"):        # would not want to recursively override an existing lock.
            self.lock = RLock()
        self.hash_2_metaData = self.load()   # for each data_hash, corresponding dict of meta-data.
        self.fuzzy_search = self.load_fuzzy_search()                 #a collection  of fuzzyIndices.

    def _meta_data_template(self, absolute_path = None, resource_extension = None, resource_type = None, place = None, person = None, face_embeddings = None, face_bboxes = None, is_indexed = False):
        temp = {}
        temp["is_indexed"] = is_indexed

        temp["absolute_path"] = absolute_path
        temp["resource_extension"] = resource_extension
        temp["resource_type"] = resource_type

        temp["place"] = place
        temp["face_bboxes"] = face_bboxes
        
        temp["person"] = person # supposed to be of same length as face_bboxes.
        
        temp["is_favourite"] = False
        temp["filename"] = os.path.basename(absolute_path)
        temp["modified_at"] = time.ctime(os.path.getmtime(absolute_path))
        
        temp["description"] = ""
        temp["albums"] = []
        temp["tags"] = []
        
        return temp

    def load_fuzzy_search(self, attributes_list:Optional[list[str]] = "__all__") -> dict:
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

    def update_fuzzy_search(self, data_hashes: Iterable[str] | str) -> dict:
    
        assert hasattr(self, "fuzzy_search")
        if isinstance(data_hashes, str):
            data_hashes = [data_hashes]
        with self.lock:
            
            temp = self.fuzzy_search
            for data_hash in data_hashes:
                hash_2_metaData = self.query(data_hashes = data_hash)
                for attribute in self.fuzzy_search_attributes:
                    assert attribute in temp
                    
                    data = hash_2_metaData[data_hash][attribute]
                    if data is not None:
                        if isinstance(data, str):
                            temp[attribute].add(data, auxiliaryData = data_hash)
                        else:
                            # since using for loop, and a set, allows "many to many" modelling.
                            for d in data:
                                temp[attribute].add(d, auxiliaryData = data_hash)
    
    def extract_image_metaData(self, resources:Iterable[os.PathLike]) -> dict[str,dict]:
        """Routine to extract valid metaData for image resource type.
        """
        result = {}
        for resource_path in resources:
            assert os.path.isfile(resource_path), "{} ".format(resource_path)
            data_hash  = generate_data_hash(resource_path)
            if data_hash is None:
                continue
            
            try:
                (_, type, file_size, width, height) = get_image_size.get_image_metadata(resource_path)
            except:
                print("Invalid data possibly for {}".format(resource_path))
                continue

            if data_hash in self.hash_2_metaData:
                temp = self.hash_2_metaData[data_hash]
            else:
                # common meta-data attributes.
                temp = self._meta_data_template(
                    is_indexed= False,
                    absolute_path = resource_path,
                    resource_extension = "." + type.lower().strip().strip("."),
                    resource_type = "image"
                )

                # resource specific meta-data attributes.
                temp_exif_data = get_exif_data(resource_path=resource_path, resource_type = "image")
                for k,v in temp_exif_data.items():
                    temp[k] = v
                                        
                result[data_hash] = temp
        return result

    
    def get_original_data(self, attribute:str) -> Optional[Iterable[str]]:
        
        result = None
        with self.lock:
            if attribute in self.fuzzy_search_attributes:
                temp_index = self.fuzzy_search[attribute]
                result = temp_index.get_original_data()
        return result

    def get_fuzzy_data(self, attribute:str, attribute_value:str) -> Optional[Iterable[str]]:

        result = None
        with self.lock:
            if attribute in self.fuzzy_search_attributes:
                temp_index = self.fuzzy_search[attribute]
                result = temp_index.get_auxiliary_data(attribute_value)
        return result

    def suggest(self, fuzzy_attribute:str, fuzzy_query:str):
        """ Supposed to provide suggestion for a given fuzzy attribute"""
        result = []
        if fuzzy_attribute in self.fuzzy_search_attributes:
            temp_index = self.fuzzy_search[fuzzy_attribute]
            temp_result = temp_index.query(fuzzy_query)
            result = list(temp_result)
        return result

    def _apply_filter(self, attribute:str, value:str) -> dict[str, dict[str]]:

        result = {}
        with self.lock:
            assert isinstance(attribute, str) and isinstance(value, str)
            temp_hashes = self.get_fuzzy_data(attribute, value)
            if temp_hashes is not None:
                for temp_hash in temp_hashes:
                    result[temp_hash] = copy.deepcopy(self.hash_2_metaData[temp_hash])
        return result    

    def query(self, data_hashes:Optional[str | Iterable[str]] = None, attribute:Optional[str] = None, attribute_value:Optional[str] = None) -> dict[str, dict]:
        """ Queries the meta index based on either data_hashes or given a fuzzy attribute/value pair.
        """
        result = {}
        if data_hashes is None:
            # return the auxilary data associated with an fuzzyIndex.
            assert attribute is not None and attribute_value is not None
            result = self._apply_filter(attribute=attribute, value =attribute_value)
        else:
            assert attribute is None and attribute_value is None
            if isinstance(data_hashes, str):
                data_hashes = [data_hashes]
            
            with self.lock:
                for h in data_hashes:
                    result[h] = copy.deepcopy(self.hash_2_metaData[h])

        return result

    def update(self, data_hash:str, meta_data:dict):
        with self.lock:
            assert data_hash is not None
            self.hash_2_metaData[data_hash] = meta_data

            self.update_fuzzy_search(data_hash)    # update rather than create new..
            # self.fuzzy_search = self.load_fuzzy_search()

    def modify_meta_data(self, data_hash:str, meta_data:dict):
        
        updated_fuzzy_attributes = []
        with self.lock:
            old_meta_data = self.hash_2_metaData[data_hash]

            for attribute in meta_data:
                if attribute in self.fuzzy_search_attributes:
                    if meta_data[attribute] != old_meta_data[attribute]:
                        updated_fuzzy_attributes.append(attribute)
            
            # update old_meta data based on the modified attributes.
            for k,v in meta_data.items():
                assert k in old_meta_data, """ this is supposed to just update existing information based on an user request """
                old_meta_data[k] = v
            self.hash_2_metaData[data_hash] = old_meta_data  # i guess not needed, old_meta_data is a reference !!

            # also update the corresponding fuzzy-search/index
            self.fuzzy_search =  self.load_fuzzy_search(attributes_list = updated_fuzzy_attributes)
    
    def save(self):
        with self.lock:
            with open(os.path.join(self.index_directory, "./meta_data.pkl"), "wb") as f:
                pickle.dump(self.hash_2_metaData, f)
    
    def load(self):
        meta_data_dict_path = os.path.join(self.index_directory, "./meta_data.pkl")
        temp = {}
        if os.path.exists(meta_data_dict_path):
            with open(meta_data_dict_path, "rb") as f:
                temp = pickle.load(f)
        return temp
    
    def reset(self):
        """ Basically delete all the indexed data, in-situ. (without rebooting the server. (should be used cautiously))"""

        with self.lock:
            # delete meta-data resources.
            meta_data_dict_path = os.path.join(self.index_directory, "./meta_data.pkl")
            if os.path.exists(meta_data_dict_path):
                os.remove(meta_data_dict_path)
            
            # call init again.
            self.__init__(self.index_directory)
        

    def get_stats(self):
        """Some stats about the amount and type of data indexed, add more information in the future if needed."""
        result = {}
        for k in ALLOWED_RESOURCES:
            result[k] = {"count":0}  # add more fields in the future if needed.
        
        with self.lock:
            # update the count for each of the resource type.
            for meta_data in self.hash_2_metaData.values():
                if(meta_data["is_indexed"] == True):                           # if in this dict, is_indexed is supposed to be true ??
                    result[meta_data["resource_type"]]["count"] += 1

            temp_count_person = self.get_original_data("person")
            result["image"]["unique_people_count"] = 0 if temp_count_person is None else len(temp_count_person)

            temp_count_place = self.get_original_data("place")
            result["image"]["unique_place_count"] = 0 if temp_count_place is None else len(temp_count_place)
        
        return result
