# imports
import os
from typing import Optional, Union, Tuple, List
from threading import RLock
import threading
import time
from collections import OrderedDict
import sys
import uuid

import cv2
from flask import Flask
import flask
import numpy as np

sys.path.append("./index")
from image_index import ImageIndex
from face_index import compare_face_embeddings
from meta_index import MetaIndex
from global_data_cache import GlobalDataCache

sys.path.append("./ml")
import clip_python_module as clip
import faceEmbeddings_python_module as pipeline

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
clip.load_text_transformer("./data/ClipTextTransformer.bin")
clip.load_vit_b32Q("./data/ClipViTB32.bin")

print("[Debug]: ")
pipeline.load_model("./data/pipelineRetinaface.bin")

imageIndex = ImageIndex(shard_size = 400, embedding_size = IMAGE_EMBEDDING_SIZE)
print("Created Image index")

metaIndex = MetaIndex()
print("Created meta Index")

indexStatus = IndexStatus()

dataCache = GlobalDataCache()   # a global data cache to serve raw-data.


# config/data-structures
sessionId_to_config = {}      # a mapping to save some user specific settings for a session.
personId_to_avgEmbedding = {} # we seek to create average embedding for a group/id a face can belong to, only for a single session.
prefix_personId =  "Id{}".format(str(time.time()).split(".")[0]).lower()   # a prefix to be used while assigning ids to unknown persons.( supposed to be unique enough)
global_lock = threading.RLock()



############
## FLASK APP
############
app = Flask(__name__, static_folder = None, static_url_path= None)
app.secret_key = "Fdfasfdasdfasfasdfas"

@app.route("/indexStart", methods = ["POST"])        
def indexStart(batch_size = 1):

    index_root_dir = flask.request.form.get("image_directory_path")
    complete_rescan = flask.request.form.get("complete_rescan").strip().lower()
    if complete_rescan == "true":
        imageIndex.reset()
        metaIndex.reset()

    index_root_dir = os.path.abspath(index_root_dir)
    if not os.path.isdir(index_root_dir):
        index_root_dir = os.path.dirname(index_root_dir)     # extract the directory name, even if it not directory.
    if os.path.exists(index_root_dir):

        client_id = generate_endpoint(index_root_dir)    # NOTE: client_id, would be equivalent to indexing directory, since there is ONE 2 ONE mapping is expected for client and indexing directory at any time.

        indexing_active = indexStatus.is_active(client_id)
        if indexing_active:
            return flask.jsonify({"success":False, "reason":"Already being indexed, Wait for it to complete or Cancel"})

        threading.Thread(target = indexing_thread, args = (index_root_dir, client_id) ).start()
        indexStatus.add_endpoint_for_indexing(client_id)
        return flask.jsonify({"success":True, "statusEndpoint":client_id, "reason": "Indexing successfully started at entpoint"})
    else:
        print("{} Doesn't exist on server side".format(index_root_dir))
        return flask.jsonify({"success":False, "reason":"Path {} Doesn't exist of Server side".format(index_root_dir)})

@app.route("/indexCancel/<endpoint>", methods = ["GET"])
def indexCancel(endpoint:str):
    """raise a cancellation request to cancel an ongoing indexing.
    """

    result = indexStatus.indicate_cancellation(endpoint)                     # raise cancellation request, should be read by indexing thread.
    if not result:
        return {"success":False, "reason":"Endpoint {} Doesn't exist on server side"}
    else:
        return {"success":True, "reason":"Endpoint {} cancellation request raised successfully".format(endpoint)}

@app.route("/getIndexStatus/<endpoint>", methods = ["GET", "POST"])
def getIndexStatus(endpoint:str):

    if flask.request.method == "POST":
        ack = flask.request.form.get("ack", None)
        if ack == "true":
            # it should mean that client acknowledged the DONE status for indexing.
            indexStatus.remove_endpoint(endpoint)
        return flask.jsonify({"success":True})
    return flask.jsonify(indexStatus.get_status(endpoint))


@app.route("/query", methods = ["POST"])
def query():
    
    flag = False
   
    top_k = max(int(flask.request.form["topk"]), 16)         # 16 atleast 16 from each shard seems good enough..
    query_start = flask.request.form["query_start"].strip().lower()
    query = flask.request.form["query"]

    if query_start == "true":
        client_id = uuid.uuid4().hex           # must be unique for each query request.
    else:
        client_id = flask.request.form["client_id"]

    image_attributes = parse_query(query)
    final_result = OrderedDict()

    if "query" in image_attributes:
        current_query = image_attributes["query"][0]  # NOTE: only a single query is allowed at one time. Enforce it on client side.
        text_embedding = generate_text_embedding(current_query)
        flag, image_hash2scores = imageIndex.query(text_embedding, client_key = client_id)
        
        temp_count = 0
        for k,v in image_hash2scores.items():
            if temp_count == top_k:
                break
            
            if k not in final_result:
                final_result[k] = max(v)
                temp_count += 1
            else:
                final_result[k] += max(v)
            
        _ = image_attributes.pop("query")
        
    final_result_attributes = {}
    attribute_count = 0
    for attribute in image_attributes:

        temp = {}     # OR operation if more than value for an attribute.
        for value in image_attributes[attribute]:

            hashes_2_metaData = metaIndex.query(attribute = attribute, attribute_value = value)
            for h in hashes_2_metaData:
                temp[h] = 1   # # all have equal importance then !!!
        
        # fill current temp..
        if(attribute_count == 0):
            for k,score in temp.items():
                final_result_attributes[k] = score

        # keep only common keys
        if attribute_count > 0:
            to_be_popped_keys = []
            for k in final_result_attributes:
                if k in temp:  # for these we just keep them as they were.
                    pass
                else:
                    to_be_popped_keys.append(k)
            
            for k in to_be_popped_keys:
                _ = final_result_attributes.pop(k)

        attribute_count += 1

    # it would include all, nothing without included at least once is popped out. (just boosted..., semantic by default have higher scores.)
    for k in final_result:
        if k in final_result_attributes:
            final_result[k] += 4
            final_result_attributes.pop(k)  # i.e this attribute has been included.

    # in the last shard, include remaining final attributes too..
    if flag == False:
        for k in final_result_attributes:
            if k not in final_result:
                final_result[k] = 1
          
    # NOTE: we now append data_hashes and absolute path to globalDatacache to start loading raw-data in the background if not already there.
    temp_dict = OrderedDict()
    for k,meta_data in metaIndex.query(data_hashes= final_result.keys()).items():
        temp_dict[k] = meta_data["absolute_path"]
    dataCache.append(data_hash = temp_dict.keys(), absolute_path = temp_dict.values())

    temp = {}
    temp["meta_data"] = []
    temp["data_hash"] = []
    temp["score"] = []
    temp_something = metaIndex.query(data_hashes= final_result.keys())
    for k,v in temp_something.items():
        temp["meta_data"].append(v)
        temp["data_hash"].append(k)
        temp["score"].append(str(final_result[k]))
    
    temp["query_completed"] = (not flag)
    temp["client_id"] = client_id
    return flask.jsonify(temp) # jsonify it.    

@app.route("/getSuggestion", methods = ["POST"])
def getSuggestion() -> dict[str, list[str]]:

    attribute = flask.request.form.get("attribute")
    query = flask.request.form.get("query")
    result = {}
    if attribute in metaIndex.fuzzy_search_attributes:
        result[attribute] = metaIndex.suggest(attribute, query)
    return flask.jsonify(result)

@app.route("/getRawData/<data_hash>", methods = ["GET"])
def getRawData(data_hash:str) -> any:
    
    hash_2_metaData = metaIndex.query(data_hashes = data_hash)
    temp_meta = hash_2_metaData[data_hash]
    resource_type = temp_meta["resource_type"]
    resource_extension = temp_meta["resource_extension"]
    absolute_path = temp_meta["absolute_path"]

    raw_data = dataCache.get(data_hash, absolute_path)
    return flask.Response(raw_data, mimetype = "{}/{}".format(resource_type, resource_extension[1:]))


@app.route("/tagPerson", methods = ["POST"])
def tagPerson():

    result = {"success":False, "reason":"unknown"}

    new_person_id = flask.request.form["new_person_id"].strip().lower()
    old_person_id = flask.request.form["old_person_id"].strip().lower()

    hash_2_metaData = metaIndex.query(attribute="person", attribute_value=old_person_id)
    for curr_data_hash in hash_2_metaData:
        temp_meta_data = hash_2_metaData[curr_data_hash]

        # if more than one face of same person in an image, replace all of them.
        for i,d in enumerate(temp_meta_data["person"]):
            if d == old_person_id:
                temp_meta_data["person"][i] = new_person_id        
        metaIndex.modify_meta_data(curr_data_hash, temp_meta_data)

    metaIndex.save()
    result["success"] = True
    result["reason"] = "Meta data successfully updated."

    with global_lock:
        # NOTE: this personId to avgEmbedding persists only for a session, for new photos in next session user may have to specify person id once atleast.
        if old_person_id in personId_to_avgEmbedding:
            personId_to_avgEmbedding[new_person_id] = personId_to_avgEmbedding[old_person_id]
            personId_to_avgEmbedding.pop(old_person_id)

    return flask.jsonify(result)

@app.route("/editMetaData", methods = ["POST"])
def editMetaData():
    """ Supposed to update/modify meta-index upon an user request"""

    temp_meta_data = {}
    for k,v in flask.request.form.items():
        if "data_hash" not in k.lower():
            temp_meta_data[k] = v

    data_hash = flask.request.form["data_hash"]

    metaIndex.modify_meta_data(data_hash, temp_meta_data)
    metaIndex.save()

    return flask.jsonify({"success":True})


@app.route("/getGroup/<attribute>", methods = ["GET"])
def getGroup(attribute:str):

    result = {} 
    possible_values =  metaIndex.get_original_data(attribute = attribute)
    for value in possible_values:
        hash_2_metaData = metaIndex.query(attribute = attribute, attribute_value = value)
        for k,v  in hash_2_metaData.items():
            if k is not None:  # it is not supposed to be None!!
                result[k] = v

    temp = {}
    temp["data_hash"]= list(result.keys())
    temp["meta_data"] = [result[k] for k in temp["data_hash"]]
    temp["score"] = [1 for _ in range(len(temp["data_hash"]))]
    temp[attribute] = list(possible_values)

    return flask.jsonify(temp)

@app.route("/getMetaStats", methods = ["GET"])
def getMetaStats():
    """Supposed to return some stats about meta-data indexed, like number of images/text etc."""
    result = metaIndex.get_stats()
    return flask.jsonify(result)

if __name__ == "__main__":

    port = 8200

    import argparse
    parser = argparse.ArgumentParser()# Add an argument
    parser.add_argument('--port', type=int, required=False)
    args = parser.parse_args()

    if args.port is not None:
        port = args.port
    
    app.run(host = "127.0.0.1",  port = port)
