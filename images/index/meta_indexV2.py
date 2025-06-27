# imports
# Trying to refactor this to better type-contraint various attributes.
# Should incorporate `remote` data possibility from beginning.
# Note: we strive to use `previews` locally, even for remote data, so default type will only contain local attributes.
# a separate type should contain meta-data to 

import os
import copy
import hashlib
from threading import RLock
from typing import Optional, Union, Iterable, List, Dict, Any, Generator
from queue import Queue
import pickle
import random
import time
import sys
import json

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../"))
from config import appConfig

# sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../exif"))
# from exif import Image

# sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../geocoding"))
# from reverse_geocode import GeocodeIndex

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "./nim"))
import meta_index_new_python as mBackend

# import get_image_size

CASE_INSENSITIVE = True  # DO IT on `request`, when updating/receiving user-data , otherwise generating info also keep it in lower.
# also can make decision while searching/querying to be case-insensitive! 

# from typing import TypedDict

# ----------------------------------------------
# Allowed Resources 
# ---------------------
# from enum import Enum
# class Audio(Enum):
#     MP3 = 0
#     AAC = 1
# class Video(Enum):
#     MP4 = 0
#     AVI = 1
#     MKV = 2
# class Image(Enum):
#     JPG = 0
#     JPEG = 1
#     PNG = 2
#     TIFF = 3
#     RAW = 4
# class Text(Enum):
#     PDF = 0
#     HTML = 1
#     EPUB = 2
#     TXT = 3

# ALLOWED_RESOURCES = [
#     Audio,
#     Video,
#     Image,
#     Text
# ]
# # Generate from previous information.
# # keys would be  : ["Image", "Video", "Text", ...] mimicing ALLOWED_RESOURCES items! 
# ALLOWED_RESOURCES_MAPPING = {
#     k.__name__ : [".{}".format(x._name_.lower()) for x in k] for k in ALLOWED_RESOURCES
#     }
# print(ALLOWED_RESOURCES_MAPPING)

# def should_skip_indexing(resource_directory:os.PathLike, to_skip:List[os.PathLike] = appConfig["to_skip_paths"]) ->bool:
#     """Supposed to tell if a resource directory is contained in the to_skip directories
#     """

#     # NOTE: i think good enough!! (should work on all Os)
#     temp_resource = os.path.abspath(resource_directory)
#     result = False
#     for x in to_skip:
#         try:
#             temp_result = os.path.commonpath([temp_resource, x])
#         except:
#             continue
#         if os.path.normcase(temp_result) == os.path.normcase(x):
#             result = True
#             break        
#     return result

# class ResourceGenerator(TypedDict):
#     directory_processed:os.PathLike  # results of which directory!
#     Audio:List[os.PathLike]
#     Video:List[os.PathLike]
#     Text:List[os.PathLike]
#     Images:List[os.PathLike]

# def get_resource_type(resource_extension:str) -> str|None:
#     "Given a resource extension, match it to one of allowed Parent type of resources!"
#     temp_extension = resource_extension.lower()
#     for k,v in ALLOWED_RESOURCES_MAPPING.items():
#         for extension in v:
#             if temp_extension == extension:
#                 return k
#     print("[Warning]: {} Could not matched".format(resource_extension))
#     return None

# def collect_resources(root_path:os.PathLike, include_subdirectories:bool = True) -> Generator[Any, Any, ResourceGenerator]:
#     """
#     It is a generator, to output a `directory's` direct `children` at each iteration.
#     For each `file` (not a directory), we map it to the correspoding `parent type` of `allowed_resources`,
#     So this could be consumed universally depending on the `type` of content we would be indexing, for now `images` only.
#     For each output, corresponding `resource_type` can be queried to get Absolute path to index!
#     """

#     resources_queue:List[os.PathLike] = []
#     resources_queue.append(
#         os.path.abspath(root_path)
#         )
    
#     while True:
#         # check if resources have been exhausted! (previous iteration would have not been put data if was exhausted!)
#         if len(resources_queue) == 0:    
#             return
        
#         current_directory = resources_queue.pop(0)  # at each return only a single-directory files are returned!
#         if should_skip_indexing(current_directory):
#             continue    
#         try: 
#             temp_resources = os.listdir(
#                 current_directory
#                 )
#         except:
#             print("Error while listing: {}".format(current_directory))
#             continue
        
#         result:ResourceGenerator = {}
#         for k in ALLOWED_RESOURCES_MAPPING:
#             result[k] = []
        
#         for temp_resource in temp_resources:
#             if os.path.isdir(os.path.join(current_directory, temp_resource)):
#                 resources_queue.append(
#                     os.path.join(current_directory, temp_resource)
#                 )
#             else:
#                 resource_extension = os.path.splitext(temp_resource)[1]
#                 temp_resource_type = get_resource_type(resource_extension)
#                 if temp_resource_type is not None:
#                     result[temp_resource_type].append(os.path.join(current_directory, temp_resource))
#         yield result
                
#         if include_subdirectories == False:
#             break
    
#     return  # no more (fresh) data can be there in result, right?
# # ----------------------------------------------------------------------------

# # ---------------------
# # Geo Code index
# # -------------------------
# geoCodeIndex = GeocodeIndex()                                    # initialize our geocoding database/index.

# # To map primary `exif-tags`, to our Terminology!
# EXIF_PACKAGE_MAPPING = {
#             "make": "make",
#             "model": "model",
#             "datetime_original": "taken_at",
#             "gps_latitude": "gps_latitude",
#             "gps_longitude": "gps_longitude",
#             "device": "device" 
#         }

# class ImageExifAttributes(TypedDict):
#     taken_at:str | None
#     gps_latitude:float | None
#     gps_longitude:float | None
#     make:str | None
#     model:str | None
#     device:str | None

# def get_image_exif_data(resource_path:str, resource_type:str) -> ImageExifAttributes:
#     result:ImageExifAttributes = {}
#     # NOTE: be-careful using `fromKeys` if an object like `list` is provided as value, it will be shared by all `keys`, weird !!
#     result.fromkeys(ImageExifAttributes.__annotations__.keys(), value = None)

#     # Get exif data!    
#     try:
#         # NOTE: lots of edge cases, in extracting exif data, so must be in a try-except block.
#         temp_handle = Image(resource_path)
#         if temp_handle.has_exif:
#             for k,v in exif_package_mapping.items():
#                 if "gps" in k:
#                     # convert to degrees.. (From degrees, minutes, seconds)
#                     temp = float(temp_handle[k][0]) + float(temp_handle[k][1])/60 + float(temp_handle[k][2])/3600
#                     result[v] = temp
#                 else:
#                     result[v] = str(temp_handle[k])
#     except:
#             pass        # some error while extracting exif data.            
    
#     try:
#         width,height = get_image_size.get_image_size(resource_path)
#     except:
#         print("Image size error for: {}".format(resource_path))
#         width, height = 1, 1
#     result["width"] = int(width)
#     result["height"] = int(height)
#     result["device"] = "{}".format(result["make"].strip() + " " + result["model"].strip())  # a single field for device.
#     result["place"] = str(geoCodeIndex.query((result["gps_latitude"], result["gps_longitude"]))).lower() # get nearest city/country based on the gps coordinates if available.
        

#     # result_exif_data = {}


    # if resource_type == "image":
    #     __allowed_image_fields = appConfig[resource_type]["exif_attributes"]

    #     result_exif_data = {k:None for k in __allowed_image_fields}

    #     result_exif_data["taken_at"] = "unknown"
    #     result_exif_data["gps_latitude"] = None
    #     result_exif_data["gps_longitude"] = None
    #     result_exif_data["make"] = ""
    #     result_exif_data["model"] = ""
    #     result_exif_data["device"] = ""
 
    #     # exif package mapping to result_exif_data fields. 
    #     exif_package_mapping = {
    #         "make": "make",
    #         "model": "model",
    #         "datetime_original": "taken_at",
    #         "gps_latitude": "gps_latitude",
    #         "gps_longitude": "gps_longitude" 
    #     }

    #     try:
    #         # NOTE: lots of edge cases, in extracting exif data, so must be in a try-except block.
    #         temp_handle = Image(resource_path)
    #         if temp_handle.has_exif:
    #             for k,v in exif_package_mapping.items():
    #                 if "gps" in k:
    #                     # convert to degrees.. (From degrees, minutes, seconds)
    #                     temp = str(float(temp_handle[k][0]) + float(temp_handle[k][1])/60 + float(temp_handle[k][2])/3600 )
    #                     result_exif_data[v] = temp
    #                 else:
    #                     result_exif_data[v] = str(temp_handle[k])
    #     except:
    #         pass        # some error while extracting exif data.            
        
    #     # Read image size information. 
    #     try:
    #         width,height = get_image_size.get_image_size(resource_path)
    #     except:
    #         print("Image size error for: {}".format(resource_path))
    #         width, height = 1, 1
    #     result_exif_data["width"] = str(width)
    #     result_exif_data["height"] = str(height)
    #     result_exif_data["device"] = "{}".format(result_exif_data["make"].strip() + " " + result_exif_data["model"].strip())  # a single field for device.
    #     result_exif_data["place"] = str(geoCodeIndex.query((result_exif_data["gps_latitude"], result_exif_data["gps_longitude"]))).lower() # get nearest city/country based on the gps coordinates if available.

    # return result_exif_data

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


# TODO: using this type, we will get the actual Raw data for a resource!
# class ResourceLocation(TypedDict):
#     # enough info to retrive original file/data if required.
#     location: str   # local | remote
#     identifier: str # like C: D: or dropbox, googlePhotos.. etc . combination should be enough to dispatch a corresponding routine to retrive original data!

# class MainAttributes(TypedDict):
#     is_indexed:bool
#     filename:str          # could even include name from a remote directory!
#     absolute_path:os.PathLike | str   # in case on a remote server or something, then custom path should be allowed!
#     resource_extension:str
#     resource_directory:os.PathLike | str | None
#     resource_type:Audio | Video | Text | Image

# class MLAttributes(TypedDict):
#     # resulting from Machine learning processing. (best effort basis)
#     personML:list[str]        # generally resulting from a face-recognition!
#     descriptionML:str   # may be a model could predict some description of a photo or result of an OCR  operation!
#     tagsML:list[str]    #

# class UserAttributes(TypedDict):
#     # attributes that could be overwritten/modified by user. 
#     # only following attributes could be manipulated directly by a user!
#     is_favourite:bool
#     tags:list[str]
#     place:str 
#     person:list[str]  # in case user tags them, TODO: if ML predicted, make sure mapping/order matches!       

# class ImageMetaAttributes(TypedDict):
#     location:ResourceLocation
#     main_attributes:MainAttributes
#     ml_attributes:MLAttributes
#     user_attributes:UserAttributes
#     exif_attributes:ImageExifAttributes

# --------------------------------------------------------------------
from metadata import ImageMetaAttributes, MainAttributes, UserAttributes, ImageExifAttributes, MLAttributes

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
        for k in appConfig["allowed_resources"]:
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
    import pickle

    test = MetaIndex()
    # with open("./meta_indices/meta_data_old.pkl", "rb") as f:
    #     stored_meta_data = pickle.load(f)
    
    # print("done..")

    # # it seems to work.. 
    # count = 0
    # for resource_hash, meta_data in stored_meta_data.items():
    #     test.update(resource_hash, meta_data)
    #     if count == 0:
    #         print(resource_hash)
    #     count += 1
    #     if count % 100 == 0:
    #         print(count)
    # test.save() # this also...

    # then query.. ?
    # result = test.query(resource_hashes = "38920e82fb39811f56b2478a37508ce42a954709bff1e58ca7c70b94678ae18f")
    
    # result = test.query(attribute = "filename", attribute_value = "insta_bk0S3J5hejJ_0.jpg", exact_string=True)
    # temp = test.get_unique("filename")
    # print(len(temp))
    # result = test.query(attribute = "filename", attribute_value = "insta_0")
    # for hash, meta in result.items():
    #     print(meta["filename"])
    #     print(meta["absolute_path"])

    # modify say filename attribute for a given hash..
    # test.modify_meta_data(
    #     resource_hash = "38920e82fb39811f56b2478a37508ce42a954709bff1e58ca7c70b94678ae18f",
    #     meta_data = {"filename": "random file name"})
    
    # result = test.query(resource_hashes="38920e82fb39811f56b2478a37508ce42a954709bff1e58ca7c70b94678ae18f")
    # for hash, meta in result.items():
    #     print(meta["filename"])

    # test.save()

    print(test.backend_is_initialized)
    import time
    all_hashes = test.get_unique("resource_hash")


    print(test.suggest(attribute="person", query ="some"))
    print("\n")
    print(test.suggest(attribute="person", query ="bedi"))


    # sample = "38920e82fb39811f56b2478a37508ce42a954709bff1e58ca7c70b94678ae18f"
    # tic = time.time()
    # for i in range(100):
    #     result = test.query(resource_hashes = sample)
    # print("[QUERYING]: {}ms".format((time.time()- tic)*1000))
    # result = test.query(resource_hashes = sample)
    # print(result)
    # print(test.get_unique("resource_extension"))
