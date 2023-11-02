import os
import json
from typing import Dict, Optional
from copy import deepcopy
import hashlib

# json config
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "./hachiConfig.json")

IMAGE_PREVIEW_DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "./preview_image")
if not os.path.exists(IMAGE_PREVIEW_DATA_PATH):
    os.mkdir(IMAGE_PREVIEW_DATA_PATH)

IMAGE_PERSON_PREVIEW_DATA_PATH = os.path.join(IMAGE_PREVIEW_DATA_PATH, "preview_person")
if not os.path.exists(IMAGE_PERSON_PREVIEW_DATA_PATH):
    os.mkdir(IMAGE_PERSON_PREVIEW_DATA_PATH)

IMAGE_INDEX_SHARD_SIZE = 1000
TOP_K_SHARD =   int(3 * IMAGE_INDEX_SHARD_SIZE / 100)    # at max 3% top results from each shard are considered for semantic query.  

# allowed resources.
ALLOWED_RESOURCES = {       
    "audio": [".mp3", ".aac"],                              # TODO:
    "video": [".mp4", ".avi", ".mkv"],                     # opencv should allow to read almost all type of video containers and codecs
    "image": [".jpg", ".jpeg", ".png", ".tiff", ".raw"],   # opencv is being used to read raw-data, so almost all extensions are generally supported.
    "text":  [".pdf", ".txt", ".epub"]                     # TODO:
}

TO_SKIP_PATHS = [os.path.dirname(os.path.abspath(__file__))]

# meta Index properties.
IMAGE_META_DATA_ATTRIBUTES =      {
    "is_indexed",                 # bool
    "is_favourite",
    "filename",
    "modified_at",
    "absolute_path",
    "resource_directory",
    "resource_extension",         
    "resource_type",
    "place",                     
    # "place_alt" ,             
    "face_bboxes",               
    "person",                    
    # "person_alt",              
    "description",
    "albums",
    "tags"
}

# only string data.
IMAGE_FUZZY_ATTRIBUTES =          {
    "person",
    "place",
    "filename",
    "resource_directory"
}# must be a subset of meta data attributes

IMAGE_EXIF_ATTRIBUTES =           {
            "make",        
            "model",
            "device",
            "taken_at",         
            "gps_latitude",     
            "gps_longitude"     
        }


class Config(object):
    def __init__(self) -> None:
        
        self.app = {}
        self.app["image_preview_data_path"] = IMAGE_PREVIEW_DATA_PATH
        self.app["image_person_preview_data_path"] = IMAGE_PERSON_PREVIEW_DATA_PATH
        self.app["image_index_shard_size"] = IMAGE_INDEX_SHARD_SIZE
        self.app["topK_per_shard"]   = TOP_K_SHARD
        self.app["allowed_resources"] = ALLOWED_RESOURCES
        self.app["to_skip_paths"] = TO_SKIP_PATHS
        self.app["do_sanity_check"] = False        # this field would be read before starting server.
        self.app["config_hash"] = hashlib.md5(open(os.path.abspath(__file__), "rb").read()).hexdigest()
        
        for resource in ALLOWED_RESOURCES:
            self.app[resource] = {}
            self.app[resource]["meta_attributes"] = []
            self.app[resource]["fuzzy_attributes"] = []
            self.app[resource]["exif_attributes"] = []
        
            if resource == "image":
                for attr in IMAGE_META_DATA_ATTRIBUTES:
                    self.app[resource]["meta_attributes"].append(attr)
                for attr in IMAGE_FUZZY_ATTRIBUTES:
                    self.app[resource]["fuzzy_attributes"].append(attr)
                for attr in IMAGE_EXIF_ATTRIBUTES:
                    self.app[resource]["exif_attributes"].append(attr)

        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, "r") as f:
                user_config = json.load(f)
            user_config_hash = user_config["config_hash"]

            # a sanity check is recommended in case hash doesnot match. otherwise use user configuration.
            if user_config_hash == self.app["config_hash"]:
                self.app = user_config         # if a match, then just load user configuration.
                self.app["do_sanity_check"] = False
            else:
                self.app["do_sanity_check"] = True
        
        self.config_path = CONFIG_PATH
        with open(CONFIG_PATH, "w") as f:
            json.dump(self.app, f)

appConfig = Config().app  # refer this everywhere