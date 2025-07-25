# Code related to extraction of meta-data for resources. (for now image only!)
# Should be self-contained to be able to test and quickly access possible meta-data for a resource.
# NOTE: to not duplicate, should also accept the `raw-data` along with `resource-path` to do away with costly Disk IO if data has already been somewhere!
# NOTE: trying to define a lot of constants/info directly in CODE, rather than in Config, Config can ask for it (in read-only mode) to define all the Info in one-place though! 
# NOTE: may be could reuse it for documents too in the future..

"""
Main primitive is a generator returning all the files from a particular directory, 
grouped by `resource-type`. It does it so recursively, once provided a root-directory if we ask to include subdirectories too
"""


from typing import TypedDict, List, Generator, Iterable, Any
import os
import traceback

from exif import Image as ImageExif

# sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../exif"))


# ----------------------------------------------
# Allowed Resources 
# ---------------------------------------------
from enum import Enum
class Audio(Enum):
    MP3 = 0
    AAC = 1
class Video(Enum):
    MP4 = 0
    AVI = 1
    MKV = 2
class Image(Enum):
    JPG = 0
    JPEG = 1
    PNG = 2
    TIFF = 3
    RAW = 4
class Text(Enum):
    PDF = 0
    HTML = 1
    EPUB = 2
    TXT = 3

ALLOWED_RESOURCES = [
    Audio,
    Video,
    Image,
    Text
]
# Generate from previous information.
# keys would be  : ["Image", "Video", "Text", ...] mimicing ALLOWED_RESOURCES items! 
ALLOWED_RESOURCES_MAPPING = {
    k.__name__ : [".{}".format(x._name_.lower()) for x in k] for k in ALLOWED_RESOURCES
    }

# we skip everything inside the APP folder. (for example D://hachi)
TO_SKIP_PATHS = [
    os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
]  # Children would also be excluded from indexing.
print("PATHs to SKIP: {}",TO_SKIP_PATHS)

def should_skip_indexing(resource_directory:os.PathLike, to_skip:List[os.PathLike] = TO_SKIP_PATHS) -> bool:
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

class ResourceGenerator(TypedDict):
    directory_processed:os.PathLike  # results of which directory!
    Audio:List[os.PathLike]
    Video:List[os.PathLike]
    Text:List[os.PathLike]
    Images:List[os.PathLike]

def get_resource_type(resource_extension:str) -> str|None:
    "Given a resource extension, match it to one of allowed Parent type of resources!"
    temp_extension = resource_extension.lower()
    for k,v in ALLOWED_RESOURCES_MAPPING.items():
        for extension in v:
            if temp_extension == extension:
                return k
    # print("[Warning]: {} Could not matched".format(resource_extension))
    return None

def collect_resources(root_path:os.PathLike, include_subdirectories:bool = True) -> Generator[Any, Any, ResourceGenerator]:
    """
    It is a generator, to output a `directory's` direct `children` at each iteration.
    For each `file` (not a directory), we map it to the correspoding `parent type` of `allowed_resources`,
    So this could be consumed universally depending on the `type` of content we would be indexing, for now `images` only.
    For each output, corresponding `resource_type` can be queried to get Absolute path to index!
    """

    resources_queue:List[os.PathLike] = []
    resources_queue.append(
        os.path.abspath(root_path)
        )
    
    while True:
        # check if resources have been exhausted! (previous iteration would have not been put data if was exhausted!)
        if len(resources_queue) == 0:    
            return
        
        current_directory = resources_queue.pop(0)  # at each return only a single-directory files are returned!
        if should_skip_indexing(current_directory):
            # It works correctly, if this was `root_dir`, then done, otherwise we wouldn't enter!
            print("Skipping: {}".format(current_directory))
            continue    
        try: 
            temp_resources = os.listdir(
                current_directory
                )
        except:
            print("Error while listing: {}".format(current_directory))
            continue
        
        result:ResourceGenerator = {}
        for k in ALLOWED_RESOURCES_MAPPING:
            result[k] = []
        result["directory_processed"] =  current_directory
        
        for temp_resource in temp_resources:
            if os.path.isdir(os.path.join(current_directory, temp_resource)):
                resources_queue.append(
                    os.path.join(current_directory, temp_resource)
                )
            else:
                resource_extension = os.path.splitext(temp_resource)[1]
                temp_resource_type = get_resource_type(resource_extension)
                if temp_resource_type is not None:
                    result[temp_resource_type].append(os.path.join(current_directory, temp_resource))
        yield result
                
        if include_subdirectories == False:
            break
    
    return  # no more (fresh) data can be there in result, right?
# ----------------------------------------------------------------------------

##--------------------------
## Exif data extraction 
# -------------------------------
try:
    from . import get_image_size  # just reading enough headers to get the `image dimensions`.
except:
    import get_image_size  # just reading enough headers to get the `image dimensions`.

try:
    from geocoding.reverse_geocode import GeocodeIndex
except:
    # for running as single script!
    import sys
    sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
    from geocoding.reverse_geocode import GeocodeIndex


geoCodeIndex = GeocodeIndex()    

EXIF_PACKAGE_MAPPING = {
            "make": "make",
            "model": "model",
            "datetime_original": "taken_at",
            "gps_latitude": "gps_latitude",
            "gps_longitude": "gps_longitude",
        }
# --------------------------------------------------------------------------
# NOTE: attributes, grouping is symbolic, must not have a duplicate key among all such attributes!
import random
import string
def generate_dummy_string(size:int = 32) -> str:
    result = ""
    for i in range(size):
        ix = random.randint(a = 0, b = len(string.ascii_uppercase)-1)
        result = result + string.ascii_uppercase[ix]
    return result.lower() 
        
def populate_default_dict(class_typeddict, dummy_data:bool = False):
    """
    Following logic corresponds to constraints in the Nim backend.
    We want to provide valid/default initialized values to backend always even if some attribute is not available for a resource!
    """
    result = {}
    for k,v in class_typeddict.__annotations__.items():
        if v is int:
            if dummy_data == True:
                result[k] = random.randint(a = 0, b = 1000)
            else:
                result[k] = 0
        elif v is float:
            if dummy_data == True:
                result[k] = random.random()
            else:
                result[k] = 0.0
        elif v is bool:
            result[k] = False
        elif v is str:
            if dummy_data == True:
                result[k] = generate_dummy_string(size = 32)
            else:
                result[k] = ""
        elif v is os.PathLike:
            if dummy_data == True:
                result[k] = "D://" + generate_dummy_string(size = 16) + ".xyz"
            else:
                result[k] = ""
        elif "list" in str(v):
            if dummy_data == True:
                result[k] = []
                for _ in range(random.randint(a = 0, b = 4)):
                    result[k].append(generate_dummy_string(size = 32))
            else:
                result[k] = []  #only string of list is supported for now!
        else:
            assert False, "Not supported type in backend: {}".format(v)
    return result

class ImageExifAttributes(TypedDict):
    taken_at:str 
    gps_latitude:float
    gps_longitude:float
    make:str
    model:str
    device:str
    width:int
    height:int
    place:str

class ResourceLocation(TypedDict):
    # enough info to retrive original file/data if required.
    location: str   # local | remote
    identifier: str # like C: D: or dropbox, googlePhotos.. etc . combination should be enough to dispatch a corresponding routine to retrive original data!

class MainAttributes(TypedDict):
    filename:str          # could even include name from a remote directory!
    absolute_path:os.PathLike   # in case on a remote server or something, then custom path should be allowed!
    resource_extension:str
    resource_directory:os.PathLike
    # resource_type:Audio | Video | Text | Image
    resource_type:str

class MLAttributes(TypedDict):
    # resulting from Machine learning processing. (best effort basis)
    personML:list[str]        # generally resulting from a face-recognition!
    descriptionML:str   # may be a model could predict some description of a photo or result of an OCR  operation!
    tagsML:list[str]    #

class UserAttributes(TypedDict):
    # attributes that could be overwritten/modified by user. 
    # only following attributes could be manipulated directly by a user!
    # NOTE: if wants to overwriter `ml` info, provide the `attribute/key` without `ML` part!
    # this way if `user` modifies/amends, we will return `user` amends, rather than ML, but ML data would be preserved too!
    is_favourite:bool
    tags:list[str]
    person:list[str]  # in case user tags them, TODO: if ML predicted, make sure mapping/order matches!       

class ImageMetaAttributes(TypedDict):
    resource_hash:str                # Unique id/hash for each resource. Not supposed to be collided for few-millions atleast!
    location:ResourceLocation
    main_attributes:MainAttributes
    ml_attributes:MLAttributes
    user_attributes:UserAttributes
    exif_attributes:ImageExifAttributes
# ---------------------------------------------------------------------
def populate_image_exif_data(result:ImageExifAttributes, resource_path:str) -> ImageExifAttributes:
    # NOTE: `result` is supposed to contain default values, we overwrite them if and when exif-attributes are available!

    # Get exif data!    
    try:
        # NOTE: lots of edge cases, in extracting exif data, so must be in a try-except block.
        temp_handle = ImageExif(resource_path)
        if temp_handle.has_exif:
            for k,v in EXIF_PACKAGE_MAPPING.items():
                if "gps" in k:
                    # convert to degrees.. (From degrees, minutes, seconds)
                    temp = float(temp_handle[k][0]) + float(temp_handle[k][1])/60 + float(temp_handle[k][2])/3600
                    result[v] = temp
                else:
                    result[v] = str(temp_handle[k])
            result["place"] = str(geoCodeIndex.query((result["gps_latitude"], result["gps_longitude"]))).lower() # get nearest city/country based on the gps coordinates if available.     
            result["device"] = "{}".format(result["make"].strip() + " " + result["model"].strip())  # a single field for device.
    except Exception:
        pass
        # print("[WARNING Exif extraction]: {}".format(traceback.format_exc()))
    try:
        width,height = get_image_size.get_image_size(resource_path)
        result["width"] = int(width)
        result["height"] = int(height)
    except:
        print("Image size error for: {}".format(resource_path))
        # TODO: why 1 , was getting error somewhere, don't remember ?
        result["width"] = 1
        result["height"] = 1

    return result

def normalize_path(resource_path:os.PathLike) -> os.PathLike:
    result = os.path.normpath(resource_path).replace("\\", "/")
    # TODO: for now, until front-end keep storing the `case` properly!
    if os.sys.platform == "win32":
        return result.lower()
    else:
        return result

def extract_image_metaData(resource_path:os.PathLike, dummy_data:bool = False) -> ImageMetaAttributes:
        """
        Extract necessary meta-data for a (local) image file.
        It would be on `callee` to decide when to call this, like if some image is already indexed, avoid calling this.
        Note: no data-hash/id, we just concern ourselves with meta-data assoicated with Image itself!
        """

        # NOTE: fromkeys will share the `value` for all keys, so provide None, or primtive value, not an object like list!!
        result_meta:ImageMetaAttributes = {}.fromkeys(ImageMetaAttributes.__annotations__.keys(), None)

        if dummy_data == False:
            assert os.path.isfile(resource_path), "{} ".format(resource_path)
            try:
                (_, type, file_size, width, height) = get_image_size.get_image_metadata(resource_path)
            except:
                print("Invalid data possibly for {}".format(resource_path))
                return None

        # This gets updated, in the main indexing code! depending on location of data being indexed!        
        l:ResourceLocation = populate_default_dict(ResourceLocation, dummy_data = dummy_data)

        main_attributes:MainAttributes = populate_default_dict(MainAttributes, dummy_data = dummy_data)
        if dummy_data == False:
            main_attributes["resource_path"] = normalize_path(resource_path)
            main_attributes["resource_extension"] = os.path.splitext(resource_path)[1]
            main_attributes["resource_directory"] = normalize_path(os.path.dirname(resource_path))
            main_attributes["filename"] = os.path.basename(resource_path)

        user_attributes:UserAttributes = populate_default_dict(UserAttributes, dummy_data = dummy_data)
        
        ml_attributes:MLAttributes = populate_default_dict(MLAttributes, dummy_data = dummy_data)

        exif_attributes:ImageExifAttributes = populate_default_dict(ImageExifAttributes, dummy_data = dummy_data)
        if dummy_data  == False:
            populate_image_exif_data(exif_attributes, resource_path=resource_path)

        result_meta["location"] = l
        result_meta["exif_attributes"] = exif_attributes
        result_meta["main_attributes"] = main_attributes
        result_meta["ml_attributes"] = ml_attributes
        result_meta["user_attributes"] = user_attributes
        del exif_attributes, ml_attributes, user_attributes, main_attributes
        
        return result_meta

def flatten_the_metadata(meta_data:ImageMetaAttributes) -> dict:
    # -----------------------------------------------------------------------
    # flatten the dictionary to be directly consumed when updating meta-data!
    flatten_dict = {}
    temp_set = set() # Duplicate/same key from same or different type of Attributes, are not allowed!

    # Only at-max a single level of dict nesting is expected!
    for parent_key, parent_v in meta_data.items():
        if isinstance(parent_v, dict):
            for k,v in parent_v.items(): # no-more nesting!
                
                assert not (k in temp_set), "Duplicate key: {} !".format(k)
                temp_set.add(k)
                flatten_dict[k] = v
        else:
            assert not (parent_key in temp_set), "Duplicate key: {} !".format(k)
            temp_set.add(parent_key)
            flatten_dict[parent_key] = parent_v
    
    # Necessary assertions, for Nim backend. (need to be strict).
    # TODO: create a custom dict to model `flatten_dict`, to handle it more cleanly!
    for k,v in flatten_dict.items():
        assert not(v is None), "Cannot be None, instead provide an appropriate default value, like 0.0 for float and stuff!"
        assert isinstance(k, str), "keys are column Labels in the backend, so only string are allowed for now!"           
    # -----------------------------------------------------------------------------------
    return flatten_dict
