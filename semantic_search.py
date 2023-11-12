# imports
import os
from typing import Optional, Union, Tuple, List, Iterable, Dict
from threading import RLock
import threading
import time
from collections import OrderedDict
import sys
import uuid
import traceback

import cv2
from flask import Flask
import flask
import numpy as np

from config import appConfig

# config:
IMAGE_PERSON_PREVIEW_DATA_PATH = appConfig["image_person_preview_data_path"]
IMAGE_PREVIEW_DATA_PATH = appConfig["image_preview_data_path"]
IMAGE_INDEX_SHARD_SIZE = appConfig["image_index_shard_size"]
TOP_K_SHARD = appConfig["topK_per_shard"]

sys.path.insert(0,"./index")
from image_index import ImageIndex
from face_index import compare_face_embeddings
from meta_index import MetaIndex, collect_resources
from global_data_cache import GlobalDataCache

sys.path.insert(0,"./ml")
import clip_python_module as clip
import faceEmbeddings_python_module as pipeline

def generate_endpoint(directory_path) -> str:
    assert os.path.exists(directory_path)
    statusEndpoint = os.path.abspath(directory_path).replace("/", "-")
    statusEndpoint = statusEndpoint.replace('\\',"-")
    return statusEndpoint

def parse_query(query:str) -> Dict[str, List[str]]:
    """ parse a query.
        a mapping from an image-attribute to a list with possible values.
        "person" -> [x,y,z]
    """
    
    or_character = "?"     # assuming multiple values for an attribute.
    and_character = "&"    # assuming mutliple attributes are separated by this character.
    separator_character = "="

    temp_query = query.strip().lower().split(and_character)
    imageAttributes_2_values = {}
    for x in temp_query:
        temp_x = x.strip().split(separator_character)
        attribute = temp_x[0].strip()

        values = []
        for v in temp_x[1].strip().split(or_character):
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
                "details": "",
                "progress":str(int(0)), 
                "should_cancel":False
            } 
    def set_done(self, endpoint,message:Optional[str] = None):
        # This is only supposed to be called by the indexing thread.
        with self.lock:
            self.status_dict[endpoint]["done"] = True
            if message:
                self.status_dict[endpoint]["details"] = "{}".format(message)
    
    def update_status(self, endpoint:str, current_directory:str, progress:float, eta:Optional[str] = None, details = ""):
        with self.lock:
            self.status_dict[endpoint]["current_directory"] = current_directory  # current directory being scanned.
            self.status_dict[endpoint]["progress"] = str(progress)
            self.status_dict[endpoint]["eta"] = eta
            self.status_dict[endpoint]["details"] = details

    def get_status(self, endpoint:str):
        result = {}
        result["is_active"] = self.is_active(endpoint)

        with self.lock:
            result["done"] = self.status_dict[endpoint]["done"]
            result["current_directory"] = self.status_dict[endpoint]["current_directory"]
            result["eta"] = self.status_dict[endpoint]["eta"]
            result["progress"] = self.status_dict[endpoint]["progress"]
            result["details"] = self.status_dict[endpoint]["details"]
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

imageIndex = ImageIndex(shard_size = IMAGE_INDEX_SHARD_SIZE, embedding_size = IMAGE_EMBEDDING_SIZE)
print("Created Image index")

metaIndex = MetaIndex()
print("Created meta Index")

indexStatus = IndexStatus()

dataCache = GlobalDataCache()   # a global data cache to serve raw-data.


# config/data-structures
sessionId_to_config = {}      # a mapping to save some user specific settings for a session.
personId_to_avgEmbedding = {} # we seek to create average embedding for a group/id a face can belong to, only for a single session.
global_lock = threading.RLock()

def generate_image_preview(data_hash, absolute_path:Optional[str], face_bboxes:Optional[List[List[int]]], person_ids:List[str]):

    preview_max_width = 640
    if absolute_path is None:
        raw_data = np.zeros((480,640), dtype = np.uint8)
        print("No original resource path found!!, so creating a black image resource..")
    else:
        raw_data = cv2.imread(absolute_path)
    
    h,w,c = raw_data.shape
    ratio = h/w

    margin = 60
    if face_bboxes is not None:
        for i, bbox in enumerate(face_bboxes):

            temp_person_id = person_ids[i]
            temp_path = os.path.join(IMAGE_PERSON_PREVIEW_DATA_PATH,"{}.jpg".format(temp_person_id))
            if os.path.exists(temp_path):
                continue

            x1 = int(bbox[0])
            y1 = int(bbox[1])
            x2 = int(bbox[2])
            y2 = int(bbox[3])

            # apply some margin as well. 
            x1 = max(0, x1 - margin)
            x2 = min(w-1, x2 + margin)
            y1 = max(0, y1 - margin)
            y2 = min(h-1, y2 + margin)

            raw_data_face = raw_data[y1:y2, x1:x2, :]
            cv2.imwrite(temp_path, raw_data_face)
    
    # calculate new height, width keep aspect ratio fixed.
    new_width = min(w, preview_max_width)
    new_height = int(ratio * new_width)

    # resize, and save to disk in compressed jpeg format.
    raw_data_resized = cv2.resize(raw_data, (new_width, new_height))
    cv2.imwrite(os.path.join(IMAGE_PREVIEW_DATA_PATH,"{}.jpg".format(data_hash)), raw_data_resized)

def index_image_resources(resources_batch:List[os.PathLike], prefix_personId:str, generate_preview_data:bool = True, remote_protocol:Optional[str] = None):
    hash_2_metaData = metaIndex.extract_image_metaData(resources_batch)       # extra meta data
    for data_hash, meta_data in hash_2_metaData.items():
        assert data_hash is not None
        absolute_path = meta_data["absolute_path"]
        is_indexed = meta_data["is_indexed"]
        if is_indexed:
            continue
        
        # generate image embeddings
        image_embedding = generate_image_embedding(image_path=absolute_path, center_crop=False)
        if image_embedding is None:
            print("Invalid data for {}".format(absolute_path))
            continue

        face_bboxes, face_embeddings = generate_face_embedding(image_path=absolute_path)
        if face_bboxes.shape[0] > 0:
            meta_data["face_bboxes"] = []
            for bbox in face_bboxes:
                x1 = str(int(bbox[0]))
                y1 = str(int(bbox[1]))
                x2 = str(int(bbox[2]))
                y2 = str(int(bbox[3]))
                meta_data["face_bboxes"].append([x1, y1, x2, y2])

            with global_lock:
                # assign each face_embedding to a group.
                for temp_embedding in face_embeddings:
                    id_2_assign = None

                    worst_score = 10
                    for id in personId_to_avgEmbedding:
                        avg_embedding = personId_to_avgEmbedding[id]
                        _, temp_scores = compare_face_embeddings(temp_embedding, avg_embedding.reshape(1, -1))
                        score = temp_scores.ravel().item()
                        if score <= 1.12:    # be conservative.. (for now no reliable way to detect sunglasses, that harms the average embedding if included..)
                            if (score < worst_score):
                                worst_score = score
                                id_2_assign = id
                                                
                    if id_2_assign is None:
                        # if no match is found, we create a new id.
                        id_2_assign = "{}_{}".format(prefix_personId, len(personId_to_avgEmbedding) + 1)
                        personId_to_avgEmbedding[id_2_assign] = temp_embedding
                    else:
                        personId_to_avgEmbedding[id_2_assign] = np.concatenate([personId_to_avgEmbedding[id_2_assign].reshape(1,-1), temp_embedding.reshape(1,-1)], axis = 0).mean(axis = 0)

                    if meta_data["person"] is not None:
                        meta_data["person"].append(id_2_assign)
                    else:
                        meta_data["person"] = [id_2_assign]
        else:
            meta_data["person"] = ["no person detected"]

        # sync/update both the indices.
        meta_data["is_indexed"] = True
        metaIndex.update(data_hash, meta_data)
        imageIndex.update(data_hash, data_embedding = image_embedding)
        if generate_preview_data:
            if face_bboxes.shape[0] > 0:
                generate_image_preview(data_hash, absolute_path, meta_data["face_bboxes"], person_ids=meta_data["person"])
            else:
                generate_image_preview(data_hash, absolute_path, None, person_ids=[])
                
def indexing_thread(index_directory:str, client_id:str, complete_rescan:bool = False, include_subdirectories:bool = True, batch_size = 10, generate_preview_data:bool = True):

    try:
        if complete_rescan == True:
            indexStatus.update_status(client_id, current_directory="", progress = 0, eta = "unknown", details = "Removing person previews..")
            
            # delete person previews.
            preview_data =  os.listdir(IMAGE_PERSON_PREVIEW_DATA_PATH)
            for i, preview_person in enumerate(preview_data):
                try:
                    os.remove(os.path.join(IMAGE_PERSON_PREVIEW_DATA_PATH, preview_person))
                except:
                    print("Error deleting: {}".format(preview_data))
                
                if (i % 20) == 0:
                    indexStatus.update_status(client_id, current_directory="", progress = (i+1) / len(preview_data), eta = "unknown", details = "Removing person previews..")

            # reset/remove old indices data.
            indexStatus.update_status(client_id, current_directory="", progress = 0, eta = "unknown", details = "Removing Old indices..")
            imageIndex.reset()
            metaIndex.reset()


        error_trace = None              # To indicate an un-recoverable or un-assumed error during indexing.
        
        # check remote protocol status
        remote_protocol = None
        if index_directory in appConfig["supported_remote_protocols"]:
            remote_protocol = index_directory

        prefix_personId =  "Id{}".format(str(time.time()).split(".")[0]).lower()   # a prefix to be used while assigning ids to unknown persons.( supposed to be unique enough)
        
        exit_thread = False
        resource_mapping_generator = collect_resources(index_directory, include_subdirectories)
        
        while True:
            if exit_thread:
                print("Finishing index on cancellation request from user")
                break
            
            indexStatus.update_status(client_id, current_directory=index_directory, progress = 0, eta = "unknown", details = "Scanning...")

            resource_mapping = next(resource_mapping_generator)
            if (resource_mapping["finished"] == True):
                del resource_mapping_generator
                break
            else:
                image_resources = resource_mapping["image"]
                if len(image_resources) == 0:
                    continue
                resource_directory = list(image_resources.keys())[0]
                contents = image_resources[resource_directory]
            
            # process the contents in batches.
            count = 0
            eta = "unknown"
            while True:
                contents_batch =  contents[count: count + batch_size]  # extract a batch
                contents_batch = [os.path.join(resource_directory, x) for x in contents_batch]

                if (len(contents_batch) == 0):    # should mean this directory has been 
                    break
                
                if indexStatus.is_cancel_request_active(client_id):
                    print("yes cancel request is active...")
                    exit_thread = True
                    break

                # before each batch send the status to client
                indexStatus.update_status(client_id, current_directory=resource_directory, progress = (count / len(contents) ), eta = eta, details = "{}/{}".format(count, len(contents)))

                tic = time.time()         # start timing for this batch.
                index_image_resources(resources_batch = contents_batch,
                                      prefix_personId = prefix_personId,
                                      generate_preview_data = True)
                                
                count += len(contents_batch)

                # calculate eta..
                dt_dc = (time.time() - tic) / (len(contents_batch) + 1e-5)    # dt/dc
                eta_in_seconds = dt_dc * (len(contents) - count)                  # eta (rate * remaining images to be indexed.)
                eta_hrs = eta_in_seconds // 3600
                eta_minutes = ((eta_in_seconds) - (eta_hrs)*3600 ) // 60
                eta_seconds = (eta_in_seconds) - (eta_hrs)*3600 - (eta_minutes)*60
                eta = "{}:{:02}:{:02}".format(int(eta_hrs), int(eta_minutes), int(eta_seconds))

    except Exception:
        error_trace = traceback.format_exc() # uses sys.exception() as the exception
    finally:
        # finally save the index/db to disk.
        metaIndex.save()
        imageIndex.save()
        indexStatus.set_done(client_id, error_trace)
        # imageIndex.sanity_check()

############
## FLASK APP
############
app = Flask(__name__, static_folder = None, static_url_path= None)
app.secret_key = "Fdfasfdasdfasfasdfas"

@app.route("/indexStart", methods = ["POST"])        
def indexStart(batch_size = 1):

    index_root_dir = flask.request.form.get("image_directory_path")
    complete_rescan = flask.request.form.get("complete_rescan").strip().lower()
    complete_rescan_arg = False
    if complete_rescan == "true":
        complete_rescan_arg = True
    
    if os.path.exists(index_root_dir) and not os.path.isdir(index_root_dir):
        index_root_dir = os.path.dirname(index_root_dir)     # extract the directory name, if it a valid file path on server.
    if os.path.exists(index_root_dir) or index_root_dir in appConfig["supported_remote_protocols"]:
        client_id = generate_endpoint(index_root_dir)    # NOTE: client_id, would be equivalent to indexing directory, since there is ONE 2 ONE mapping is expected for client and indexing directory at any time.

        indexing_active = indexStatus.is_active(client_id)
        if indexing_active:
            return flask.jsonify({"success":False, "reason":"Already being indexed, Wait for it to complete or Cancel"})

        indexStatus.add_endpoint_for_indexing(client_id)
        threading.Thread(target = indexing_thread, args = (index_root_dir, client_id, complete_rescan_arg) ).start()
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
   
    top_k = TOP_K_SHARD
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

    if flag == False:    
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

    if flag == False:
        for k in final_result_attributes:
            if k not in final_result:
                final_result[k] = 10
            else:
                final_result[k] += 10  # boost the score for common.
          
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
def getSuggestion() -> Dict[str, List[str]]:

    attribute = flask.request.form.get("attribute")
    query = flask.request.form.get("query")
    result = {}
    if attribute in metaIndex.fuzzy_search_attributes:
        result[attribute] = metaIndex.suggest(attribute, query)
    return flask.jsonify(result)

@app.route("/getRawData/<data_hash>", methods = ["GET"])
def getRawData(data_hash:str, use_preview_data:bool = True) -> any:
    
    hash_2_metaData = metaIndex.query(data_hashes = data_hash)
    temp_meta = hash_2_metaData[data_hash]
    resource_type = temp_meta["resource_type"]
    if use_preview_data:
        resource_extension = ".jpg"
        absolute_path = os.path.join(IMAGE_PREVIEW_DATA_PATH, "{}.jpg".format(data_hash))
    else:
        resource_extension = temp_meta["resource_extension"]
        absolute_path = temp_meta["absolute_path"] # replace it with the "preview folder", so that data is instead read from preview
    
    #NOTE: use resource
    raw_data = dataCache.get(data_hash, absolute_path)
    return flask.Response(raw_data, mimetype = "{}/{}".format(resource_type, resource_extension[1:]))

@app.route("/getRawDataFull/<data_hash>", methods = ["GET"])
def getRawDataFull(data_hash:str) -> any:
    hash_2_metaData = metaIndex.query(data_hashes = data_hash)
    temp_meta = hash_2_metaData[data_hash]
    resource_type = temp_meta["resource_type"]
    resource_extension = temp_meta["resource_extension"]
    absolute_path = temp_meta["absolute_path"]

    with open(absolute_path, "rb") as f:
        raw_data = f.read()
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

        temp_person_preview_path = os.path.join(IMAGE_PERSON_PREVIEW_DATA_PATH, "{}.jpg".format(old_person_id))
        if os.path.exists(temp_person_preview_path):
            new_path =  os.path.join(IMAGE_PERSON_PREVIEW_DATA_PATH, "{}.jpg".format(new_person_id))
            if not os.path.exists(new_path): 
                os.rename(temp_person_preview_path, new_path)
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

@app.route("/getPreviewPerson/<person_id>", methods = ["GET"])
def getPreviewPerson(person_id):
    temp_path = os.path.join(IMAGE_PERSON_PREVIEW_DATA_PATH, "{}.jpg".format(person_id))
    if os.path.exists(temp_path):
        with open(temp_path, "rb")  as f:
            temp_raw_data = f.read()
        return flask.Response(temp_raw_data, mimetype = "{}/{}".format("image", "jpg"))
    else:
        #TODO:
        return "some other poster..."       

if __name__ == "__main__":

    port = 8200

    import argparse
    parser = argparse.ArgumentParser()# Add an argument
    parser.add_argument('--port', type=int, required=False)
    args = parser.parse_args()

    if args.port is not None:
        port = args.port
    
    app.run(host = "127.0.0.1",  port = port)
