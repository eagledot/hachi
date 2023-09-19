# imports

import os
import hashlib
from threading import RLock
from typing import Optional, Union, Iterable
from queue import Queue
import pickle
import random
import time

from exif import Image

from fuzzy_search import FuzzySearch
from reverse_geocode import GeocodeIndex
import get_image_size

ALLOWED_RESOURCES = {       
    "audio": set([".mp3", ".aac"]),                              # TODO:
    "video": set([".mp4", ".avi", ".mkv"]),                     # opencv should allow to read almost all type of video containers and codecs
    "image": set([".jpg", ".jpeg", ".png", ".tiff", ".raw"]),   # opencv is being used to read raw-data, so almost all extensions are generally supported.
    "text":  set([".pdf", ".txt", ".epub"])                     # TODO:
}

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
META_DATA_INDEX_DIRECTORY = "./meta_indices"
