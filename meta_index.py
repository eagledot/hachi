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