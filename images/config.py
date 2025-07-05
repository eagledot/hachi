# TODO: better wrap this configuration... 
# TODO: make it (static) easier to parse.. (no evaluations should be here!!)
import os
# import json
# from copy import deepcopy
# import hashlib

# json config
# CONFIG_PATH = os.path.join(os.path.dirname(__file__), "hachiConfig.json")

# IMAGE_PREVIEW_DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "preview_image")
# if not os.path.exists(IMAGE_PREVIEW_DATA_PATH):
#     os.mkdir(IMAGE_PREVIEW_DATA_PATH)

# IMAGE_PERSON_PREVIEW_DATA_PATH = os.path.join(IMAGE_PREVIEW_DATA_PATH, "preview_person")
# if not os.path.exists(IMAGE_PERSON_PREVIEW_DATA_PATH):
#     os.mkdir(IMAGE_PERSON_PREVIEW_DATA_PATH)

# TODO: to incorporate changed shard size even some images are indexed... in future.. would need to remember what i did!
# IMAGE_INDEX_SHARD_SIZE = 1200  # should be around 10_000, for dataset with around 50k or more images !
# TOP_K_SHARD =   int(3 * IMAGE_INDEX_SHARD_SIZE / 100)    # at max 3% top results from each shard are considered for semantic query.  

# # allowed resources.
# ALLOWED_RESOURCES = {       
#     "audio": [".mp3", ".aac"],                              # TODO:
#     "video": [".mp4", ".avi", ".mkv"],                     # opencv should allow to read almost all type of video containers and codecs
#     "image": [".jpg", ".jpeg", ".png", ".tiff", ".raw"],   # opencv is being used to read raw-data, so almost all extensions are generally supported.
#     "text":  [".pdf", ".txt", ".epub"]                     # TODO:
# }

# supported Remote Directories/protocols.
SUPPORTED_REMOTE_PROTOCOLS = [
    "google_photos"
]

TO_SKIP_PATHS = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "preview_image")]  # Children would also be excluded from indexing.


from collections import namedtuple
from typing import NamedTuple
from enum import Enum
class Location(Enum):
    LOCAL = 0
    REMOTE = 1

class Partition(NamedTuple):
    location:Location
    identifier:str   # C:, D: for local drives, for remote like googlePhotos/googleDrive like this!


import string
from ctypes import windll

def get_drives():
    """ Courtesy of SO, but simple to understand!
    we call the loaded kernel32 dll and then go through possible One character volume Names! Not exhaustive, but for now !
    """
    drives = []
    bitmask = windll.kernel32.GetLogicalDrives()
    for letter in string.ascii_uppercase:
        if bitmask & 1:
            drives.append("{}:".format(letter))
        bitmask >>= 1

    return drives

class Config(object):
    def __init__(self) -> None:
        
        self.app = {}
        self.app["partitions"] = []
        # # Trying to get partitions/volume-labels, to later send it to client to reduce friction when adding directories for indexing!
        # if os.sys.platform == "win32":
        #     labels = get_drives()
            # labels = []
            # try:
            #     # courtesy of SO.
            #     import win32api # either import this or get the data from `loaded` kernel32.dll by getting corresponding `symbol` address!
            #     drives = win32api.GetLogicalDriveStrings()
            #     labels = drives.split('\000')[:-1]
            # except:
            #     print("[WARNING]: Failed to import win32api, Not installed!")
            #     try:
            #         # for python >= 3.12, which we are using for our app!
            #         labels = os.listdrives() # note it doesn't check for `access` and stuff, just enough for most of use cases!
            #     except:
            #         print("[WARNING]: 'os.listdrives' routine is not available!")
            #         labels = []
            
            # for label in labels:
            #     self.app["partitions"].append(
            #         Partition(location = Location.LOCAL.name, identifier = label.strip("\\"))
            #     )
        # else:
            # TODO: For linux, we hope to get one level below `root`, TEST IT!
            # for x in os.listdir("/"):
            #     self.app["partitions"].append(
            #         Partition(location = Location.LOCAL.name, identifier = os.path.join("/", x))
            #     )

            # only a single `/` (root) for linux !
            # self.app["partitions"] = Partition(location = Location.LOCAL.name, identifier = "/")

        
        # self.app["image_preview_data_path"] = IMAGE_PREVIEW_DATA_PATH
        # self.app["image_person_preview_data_path"] = IMAGE_PERSON_PREVIEW_DATA_PATH
        # self.app["image_index_shard_size"] = IMAGE_INDEX_SHARD_SIZE
        # self.app["topK_per_shard"]   = TOP_K_SHARD
        # self.app["allowed_resources"] = ALLOWED_RESOURCES
        # self.app["supported_remote_protocols"] = SUPPORTED_REMOTE_PROTOCOLS
        # self.app["to_skip_paths"] = TO_SKIP_PATHS
        # self.app["do_sanity_check"] = False        # this field would be read before starting server.
        # self.app["config_hash"] = hashlib.md5(open(os.path.abspath(__file__), "rb").read()).hexdigest()
        
        # for resource in ALLOWED_RESOURCES:
        #     self.app[resource] = {}
        #     self.app[resource]["meta_attributes"] = []
        #     self.app[resource]["fuzzy_attributes"] = []
        #     self.app[resource]["exif_attributes"] = []
        
        #     if resource == "image":
        #         for attr in IMAGE_META_DATA_ATTRIBUTES:
        #             self.app[resource]["meta_attributes"].append(attr)
        #         for attr in IMAGE_FUZZY_ATTRIBUTES:
        #             self.app[resource]["fuzzy_attributes"].append(attr)
        #         for attr in IMAGE_EXIF_ATTRIBUTES:
        #             self.app[resource]["exif_attributes"].append(attr)

        # if os.path.exists(CONFIG_PATH):
        #     try:
        #         with open(CONFIG_PATH, "r") as f:
        #             user_config = json.load(f)
        #         user_config_hash = user_config["config_hash"]
        #     except:
        #         user_config_hash = None
        #         print("[WARNING]: Failed to parse Configuration, may a corrupted write resulted from interpretor error during modification of this file!")

        #     # a sanity check is recommended in case hash doesnot match. otherwise use user configuration.
        #     if user_config_hash == self.app["config_hash"]:
        #         self.app = user_config         # if a match, then just load user configuration.
        #         self.app["do_sanity_check"] = False
        #     else:
        #         self.app["do_sanity_check"] = True

        
        # self.config_path = CONFIG_PATH
        # with open(CONFIG_PATH, "w") as f:
        #     json.dump(self.app, f)

# appConfig = Config().app  # refer this everywhere, MAKE SURE IT IS INITALIZED
