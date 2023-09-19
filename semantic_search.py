# imports
import os
from typing import Optional, Union, Tuple, List
from threading import RLock
import threading
import time


import cv2

from image_index import ImageIndex

from meta_index import MetaIndex

import clip_python_module as clip


def generate_endpoint(directory_path) -> str:
    assert os.path.exists(directory_path)
    statusEndpoint = os.path.abspath(directory_path).replace("/", "-")
    statusEndpoint = statusEndpoint.replace('\\',"-")
    return statusEndpoint

def parse_query(query:str) -> dict[str, list[str]]:
    """ parse a query.
        a mapping from an image-attribute to a list with possible values.
        "person" -> [x,y,z]
    """
    
    temp_query = query.strip().lower().split(",")
    imageAttributes_2_values = {}
    for x in temp_query:
        temp_x = x.strip().split(":")
        attribute = temp_x[0].strip()

        values = []
        for v in temp_x[1].strip().split("-"):
            if len(v.strip()) > 0:
                values.append(v.strip())

        if len(attribute) == 0 or len(values) == 0:
            continue

        imageAttributes_2_values[attribute] = values
    return imageAttributes_2_values


class IndexStatus(object):
    """ A dedicated Class to implement indexing  book-keeping."""

    def __init__(self) -> None:
        self.status_dict = dict()
        self.lock = RLock()
    def is_done(self, endpoint) -> bool:
        with self.lock:
            return self.status_dict[endpoint]["done"]
    def add_endpoint_for_indexing(self, endpoint):
        with self.lock:
            assert endpoint not in self.status_dict
            self.status_dict[endpoint] = {
                "done":False,
                "current_directory":"unknown",
                "eta":"unknown",
                "progress":str(int(0)), 
                "should_cancel":False
            } 
    def set_done(self, endpoint):
        # This is only supposed to be called by the indexing thread.
        with self.lock:
            self.status_dict[endpoint]["done"] = True
    
    def update_status(self, endpoint:str, current_directory:str, progress:float, eta:Optional[str] = None):
        with self.lock:
            self.status_dict[endpoint]["current_directory"] = current_directory  # current directory being scanned.
            self.status_dict[endpoint]["progress"] = str(progress)
            self.status_dict[endpoint]["eta"] = eta

    def get_status(self, endpoint:str):
        result = {}
        result["is_active"] = self.is_active(endpoint)

        with self.lock:
            result["done"] = self.status_dict[endpoint]["done"]
            result["current_directory"] = self.status_dict[endpoint]["current_directory"]
            result["eta"] = self.status_dict[endpoint]["eta"]
            result["progress"] = self.status_dict[endpoint]["progress"]
        return result
    
    def is_active(self, endpoint:str):
        with self.lock:
            return endpoint in self.status_dict

    def remove_endpoint(self, endpoint):
        with self.lock:
            assert self.status_dict[endpoint]["done"] == True
            self.status_dict.pop(endpoint)
    
    def indicate_cancellation(self, endpoint)->  bool:
        with self.lock:
            if endpoint in self.status_dict:
                self.status_dict[endpoint]["should_cancel"] = True
                return True
            else:
                return False
    
    def is_cancel_request_active(self, endpoint):
        with self.lock:
            return self.status_dict[endpoint]["should_cancel"]
        
########################################################################
IMAGE_EMBEDDING_SIZE = 512  # depends on the model architecture.
TEXT_EMBEDDING_SIZE = 512  # depends on the model architecture.
FACE_EMBEDDING_SIZE = 512   # depends on the model architecture.

def generate_image_embedding(image_path:str, is_bgr:bool = True, center_crop = False) -> Optional[np.array]:
    # return np.random.uniform(size = (1, IMAGE_EMBEDDING_SIZE)).astype(np.float32)

    image_data = cv2.imread(image_path)
    if image_data is None:
        return None
    
    assert is_bgr == True, "If using opencv, is_bgr would be true."
    image_features = clip.encode_image(image_data, is_bgr = True, center_crop = False)
    assert image_features.size == IMAGE_EMBEDDING_SIZE
    return image_features

def generate_face_embedding(image_path:str, is_bgr:bool = True, conf_threshold:float = 0.85) -> Optional[np.array]:
    # TODO: call actual model.
    # return np.random.uniform(size = (1, FACE_EMBEDDING_SIZE)).astype(np.float32)

    image_data = cv2.imread(image_path)
    if image_data is None:
        return None
    
    assert is_bgr == True, "If using opencv, is_bgr would be true."
    face_bboxes, face_embeddings =  pipeline.detect_embedding(image_data, is_bgr = is_bgr, conf_threshold = conf_threshold)
    assert face_embeddings.shape[1] == FACE_EMBEDDING_SIZE
    return face_bboxes, face_embeddings

def generate_text_embedding(query:str):
    # return np.random.uniform(size = (1, TEXT_EMBEDDING_SIZE)).astype(np.float32)

    text_features = clip.encode_text(query)
    assert text_features.size == TEXT_EMBEDDING_SIZE
    return text_features


print("[Debug]: Loading Model, may take a few seconds.")
clip.load_text_transformer("../data/ClipTextTransformer.bin")
clip.load_vit_b32Q("../data/ClipViTB32.bin")

print("[Debug]: ")
import faceEmbeddings_python_module as pipeline
pipeline.load_model("../data_extra/pipelineRetinaface.bin")

imageIndex = ImageIndex(shard_size = 400, embedding_size = IMAGE_EMBEDDING_SIZE)
print("Created Image index")

faceIndex = FaceIndex(shard_size = 400, embedding_size = FACE_EMBEDDING_SIZE)
print("Created face index")

metaIndex = MetaIndex()
print("Created meta Index")

indexStatus = IndexStatus()

# config/data-structures
sessionId_to_config = {}      # a mapping to save some user specific settings for a session.
personId_to_avgEmbedding = {} # we seek to create average embedding for a group/id a face can belong to, only for a single session.
prefix_personId =  "Id{}".format(str(time.time()).split(".")[0]).lower()   # a prefix to be used while assigning ids to unknown persons.( supposed to be unique enough)
global_lock = threading.RLock()