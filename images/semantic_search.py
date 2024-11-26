# maybe we can use relative imports to make it work with LSP and easier to read.
# also just later change the workingdirectory "." in-place for "./images", that should be enough !

import sys
import os

PYTHON_MODULES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "python_modules")
IMAGE_APP_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".")
IMAGE_APP_INDEX_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".", "index")
IMAGE_APP_ML_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".", "ml")

sys.path.insert(0, IMAGE_APP_PATH)
sys.path.insert(0, IMAGE_APP_INDEX_PATH)
sys.path.insert(0, IMAGE_APP_ML_PATH)
sys.path.insert(0, PYTHON_MODULES_PATH)

# imports
from typing import Optional, Union, Tuple, List, Iterable, Dict, Any
from threading import RLock
import threading
import time
from collections import OrderedDict
import uuid
import base64
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

from image_index import ImageIndex
from face_clustering import FaceIndex
# from meta_index import MetaIndex, collect_resources
from meta_indexV2 import MetaIndex, collect_resources

from global_data_cache import GlobalDataCache

import clip_python_module as clip
#import faceEmbeddings_python_module as pipeline

USER_CLUSTER_ID_2_ORIGINAL = {} # a session cache to help ..

def generate_endpoint(directory_path:str) -> str:
    statusEndpoint = directory_path.replace("/", "-")
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

    temp_query = query.strip().lower().split(and_character) # TODO: may be make decision for lowering.. in the app config. later.. for now case insenstive meta-data is stored!
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
    """ A dedicated Class to implement indexing  book-keeping.
    TODO: not good enough abstraction.. would update this later as current abstraction is based on client ids and much stable. 
    """

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
            else:
                self.status_dict[endpoint]["details"] = "SUCCESS"
    
    def update_status(self, endpoint:str, current_directory:str, progress:float, eta:Optional[str] = None, details = ""):
        with self.lock:
            self.status_dict[endpoint]["current_directory"] = current_directory  # current directory being scanned.
            self.status_dict[endpoint]["progress"] = str(progress)
            self.status_dict[endpoint]["eta"] = eta
            self.status_dict[endpoint]["details"] = details

    def get_status(self, endpoint:str):
        result = {}
        result["is_active"] = self.is_active(endpoint)  # i think not used anymore on the client side.. USE NEWER VERSION of status class.

        with self.lock:
            if self.status_dict.get(endpoint,False) == False:
                # sometimes when client dies without clearing localstorage, then we indicate last indexing done!)
                result["done"] = True
                result["details"] = "SUCCESS"
                print("[WARNING]: seems like server has no information for: {}, may application stopped before clearning local storage".format(endpoint))
            else:
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
            if self.status_dict.get(endpoint,False) == False:
                # phantom request.. possibly due to client-side syncing issues..not clearing of local storage.
                pass
            else:
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

def generate_image_embedding(image:Union[str, np.ndarray], is_bgr:bool = True, center_crop = False) -> Optional[np.ndarray]:
    # for simulating, (TODO: better simulation setup, if get time) 
    # return np.random.uniform(size = (1, IMAGE_EMBEDDING_SIZE)).astype(np.float32)

    if isinstance(image,str):
        assert os.path.exists(image)
        image_data = cv2.imread(image)
        is_bgr = True # "If using opencv, is_bgr would be true."
    else:
        image_data = image
    
    if image_data is None:
        return None

    image_features = clip.encode_image(image_data, is_bgr = is_bgr, center_crop = center_crop)
    assert image_features.size == IMAGE_EMBEDDING_SIZE
    return image_features

def generate_text_embedding(query:str):
    # return np.random.uniform(size = (1, TEXT_EMBEDDING_SIZE)).astype(np.float32)

    text_features = clip.encode_text(query)
    assert text_features.size == TEXT_EMBEDDING_SIZE
    return text_features


print("[Debug]: Loading Model, may take a few seconds.")
clip.load_text_transformer(os.path.join(IMAGE_APP_PATH, "data", "ClipTextTransformerV2.bin"))
clip.load_vit_b32Q(os.path.join(IMAGE_APP_PATH, "data", "ClipViTB32V2.bin"))

imageIndex = ImageIndex(shard_size = IMAGE_INDEX_SHARD_SIZE, embedding_size = IMAGE_EMBEDDING_SIZE)
print("Created Image index")

metaIndex = MetaIndex()
print("Created meta Index")
# all_filename = metaIndex.get_unique("filename")
# print(len(all_filename))
# print(metaIndex.query(attribute = "filename", attribute_value = "insta_bk0s3j5hejj_0.jpg"))
# assert "insta_bk0s3j5hejj_0.jpg" in all_filename

faceIndex = FaceIndex(embedding_size = FACE_EMBEDDING_SIZE)
print("Created Face Index")

indexStatus = IndexStatus()

# TODO: better to do everything through cache or caches..
dataCache = GlobalDataCache()   # a global data cache to serve raw-data for previews.
# dataCacheFull = GlobalDataCache()   # a global data cache to serve raw-data for original resources!

# config/data-structures
sessionId_to_config = {}      # a mapping to save some user specific settings for a session.
personId_to_avgEmbedding = {} # we seek to create average embedding for a group/id a face can belong to, only for a single session.
global_lock = threading.RLock()

def generate_image_preview(data_hash, image:Union[str, np.ndarray], face_bboxes:Optional[List[List[int]]], person_ids:List[str]):
    """ Generate image previews and face-previews
    NOTE: it does take up space and create previews, but it is optional but on by default.
    SSDs may be fast enough to serve data directly from  disk.. but for HDDs it reduces the latency quite a bit
    """
    if isinstance(image, str):
        assert os.path.exists(image), "Doesn't make sense, atleast if indexed, absolute path must exist!"
        raw_data = cv2.imread(image)
    else:
        raw_data = image
    del image
    
    preview_max_width = 640
    h,w,c = raw_data.shape
    ratio = h/w

    # calculate new height, width keep aspect ratio fixed.
    new_width = min(w, preview_max_width)
    new_height = int(ratio * new_width)

    # resize, and save to disk in compressed jpeg format.
    raw_data_resized = cv2.resize(raw_data, (new_width, new_height))
    quality = 90
    cv2.imwrite(os.path.join(IMAGE_PREVIEW_DATA_PATH,"{}.webp".format(data_hash)), raw_data_resized,[int(cv2.IMWRITE_WEBP_QUALITY),quality])

def index_image_resources(resources_batch:List[os.PathLike], prefix_personId:str, generate_preview_data:bool = True, remote_protocol:Optional[str] = None):
    hash_2_metaData = metaIndex.extract_image_metaData(resources_batch)       # extra meta data
    for data_hash, meta_data in hash_2_metaData.items():
        assert data_hash is not None
        absolute_path = meta_data["absolute_path"]
        is_indexed = meta_data["is_indexed"]
        if is_indexed:
            continue
        
        # read raw-data only once.. and share it for image-clip,face and previews
        frame = cv2.imread(absolute_path)
        if frame is None:
            print("[WARNING]: Invalid data for {}".format(absolute_path))
            continue
        is_bgr = True

        # generate image embeddings
        image_embedding = generate_image_embedding(image = frame, is_bgr = is_bgr, center_crop=False)
        if image_embedding is None:
            print("Invalid data for {}".format(absolute_path))
            continue
        
        meta_data["person"] = ["no_person_detected"] # it is supposed to be updated, after clusters finalizing.
        # sync/update both the indices.
        meta_data["is_indexed"] = True

        # merge remote meta-data too if allowed remoted protocol.
        if remote_protocol == "google_photos":
            remote_meta_data = googlePhotos.get_remote_meta(data_hash)
            meta_data["remote"] = remote_meta_data  
            meta_data["resource_directory"] = "google_photos"
            meta_data["absolute_path"] = "remote"
        
        metaIndex.update(data_hash, meta_data) # TODO: append instead of update for clearer semantics!
        imageIndex.update(data_hash, data_embedding = image_embedding)
        faceIndex.update(
            frame = frame,
            absolute_path = absolute_path,
            resource_hash = data_hash,
            is_bgr = True)
        
        generate_image_preview(data_hash, image = frame, face_bboxes = None, person_ids=[])                

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
            faceIndex.reset()
            imageIndex.reset()
            metaIndex.reset()


        error_trace = None              # To indicate an un-recoverable or un-assumed error during indexing.
        
        # check remote protocol status
        remote_protocol = None
        if index_directory in appConfig["supported_remote_protocols"]:
            remote_protocol = index_directory

        # instruct the extension to download, if a remote protocol is requested.
        if index_directory in appConfig["supported_remote_protocols"]:
            if index_directory.lower().strip() == "google_photos":
                index_directory = googlePhotos.get_temp_resource_directory() # directory where data is being downloaded..
                status = googlePhotos.start_download()
                if status == False:
                    error_trace = "Failed to start downloading for {}".format(remote_protocol)
                    return 
                while True:
                    if indexStatus.is_cancel_request_active(client_id):
                        status = googlePhotos.stop_download()
                        if status == False:
                            error_trace = "Couldnot stopped downloading. POTENTIAL BUG"
                        else:
                            error_trace = "Downloading stopped on user request"
                        return
                           
                    download_status = googlePhotos.get_downloading_status()
                    if download_status["finished"] == True:
                        if not (download_status["message"].strip().lower() == "success"):
                            error_trace =  download_status["message"]
                            return  # finished but not fully/successfully.
                        else:
                            break
                    else:
                        if download_status.get("available"):
                            progress = download_status["downloaded"] / download_status["available"]
                        else:
                            progress = 0
                        indexStatus.update_status(
                            endpoint = client_id,
                            current_directory = "google_photos",
                            progress = progress,
                            eta = "unknown",
                            details = download_status["details"]
                        )
                    
                    time.sleep(1)
            else:
                error_trace = "not a supported protocol"
                return  # nothing left to be done, just return.

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
                                      generate_preview_data = True,
                                      remote_protocol = remote_protocol)
                                
                count += len(contents_batch)

                # calculate eta..
                dt_dc = (time.time() - tic) / (len(contents_batch) + 1e-5)    # dt/dc
                eta_in_seconds = dt_dc * (len(contents) - count)                  # eta (rate * remaining images to be indexed.)
                eta_hrs = eta_in_seconds // 3600
                eta_minutes = ((eta_in_seconds) - (eta_hrs)*3600 ) // 60
                eta_seconds = (eta_in_seconds) - (eta_hrs)*3600 - (eta_minutes)*60
                eta = "{}:{:02}:{:02}".format(int(eta_hrs), int(eta_minutes), int(eta_seconds))

        # Since info is available on finalizing..we now update this info in meta-index!
        indexStatus.update_status(client_id, current_directory="", progress = 0, eta = "unknown", details = "Finalizing Clusters..")
        cluster_meta_info = faceIndex.save() # TODO: actually implement save and load on the disk..
        indexStatus.update_status(client_id, current_directory="", progress = 0, eta = "unknown", details = "updating metaIndex...")
        for resource_hash, cluster_ids in cluster_meta_info.items():
            metaIndex.modify_meta_data(resource_hash, {"person": list(cluster_ids)}, force = True)
        
    except Exception:
        error_trace = traceback.format_exc() # uses sys.exception() as the exception
    finally:
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
        
        # check if extension is ready!
        if index_root_dir in appConfig["supported_remote_protocols"]:
            status, reason = check_extension_status(index_root_dir)
            if status == False:
                return flask.jsonify({"success":False, "reason": reason})

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

@app.route("/getSuggestion", methods = ["POST"])
def getSuggestion() -> Dict[str, List[str]]:

    query = flask.request.form.get("query")
    result = {}
    attribute = flask.request.form.get("attribute")
    result[attribute] = metaIndex.suggest(attribute, query)

    # query = flask.request.form.get("query")
    # result = {}
    # attr_2_type = metaIndex.get_attribute_2_type()
    # if attribute in attr_2_type:
    #     result[attribute] = metaIndex.suggest(attribute, query)
    return flask.jsonify(result)

##########################################
@app.route("/query", methods = ["POST"])
def query():
    """
    Main routine to return query results.
    Multiple attributes are allowed in the query to make it possible to match-and-mix queries.
    This version of query is simpler than older one.f/
    In case a deterministic/meta attribute is provided, "Semantic query" acts as a re-ranker only.
    Otherwise only non-deterministic streaming "semantic search" is done. 
    """
    # TODO: append the hashes to dataCache to start loading in the background!

    flag = False
    top_k = TOP_K_SHARD
    query_start = flask.request.form["query_start"].strip().lower()
    query = flask.request.form["query"]

    # NOTE: client_id must be sent back to the client, DONOT forget!
    # used by the imageIndex to send streaming results to the correct client!
    if query_start == "true":
        client_id = uuid.uuid4().hex           # must be unique for each query request.
    else:
        client_id = flask.request.form["client_id"]

    # except "query" all are meta-attributes ..for now!
    image_attributes = parse_query(query)
    meta_attributes_list = [x for x in image_attributes if x != "query"]
    rerank_approach = len(meta_attributes_list) > 0

    # data to be sent back to client.  #TOOD: proper define interface/contract . So (poor man grpc like approach!)
    query_completed = True  # by default.
    temp = {}                                   
    temp["meta_data"] = []
    temp["data_hash"] = []
    temp["score"] = []
    if not rerank_approach:
        # This means semantic query. (without any meta-attributes.)
        current_query = image_attributes["query"][0]  # NOTE: only a single query is allowed at one time. Enforce it on client side.
        text_embedding = generate_text_embedding(current_query)
        flag, image_hash2scores = imageIndex.query(text_embedding, client_key = client_id)
        
        # limit to top_k results. (Already sorted) # TODO: may be possible to provide top_k as an argument to metaIndex/imageIndex itself!!!
        top_keys = []
        for i,k in enumerate(image_hash2scores):
            top_keys.append(k)
            del k
            if i == top_k:
                break
        
        temp_something = metaIndex.query(data_hashes= top_keys) # hash to metaData
        del top_keys
        for k,v in temp_something.items():
            temp["meta_data"].append(v)
            temp["data_hash"].append(k)
            score = max(image_hash2scores[k])
            temp["score"].append(str(score))
        
        query_completed = (not flag)

        # NOTE: start background loading of resources,(for now not being used)
        # NOTE: since we create a preview anyway..(and python is not pure multi-threaded), so even without start loading in background it works fast enough!
        # NOTE: we cache some recent resources anyway.. HAVE TO BENCHMARK the effect of background loading.
        # note: better to move towards a system-language cache i think!
        # dataCache.append(data_hash = temp["data_hash"], absolute_path = temp_absolute_paths)

    else:
        and_keys = set()
        key_score = dict()        
        # process/collect the keys/resource-hashes for all the meta-attributes.
        for i,attribute in enumerate(meta_attributes_list):        
            or_keys = set()  # OR operation like collection
            for value in image_attributes[attribute]:
                print("searching in {}  for {}".format(attribute,value))

                # collect all possible hashes. (that could satisfy the user supplied meta-attributes)
                hashes_2_metaData = metaIndex.query(attribute = attribute, attribute_value = value)                
                
                for hash in hashes_2_metaData:
                    or_keys.add(hash)

                    # collect scores too.. for all possible keys/hashes
                    if not (hash in key_score):
                        key_score[hash] = 1
                    else:
                        key_score[hash] += 1

            # AND operation. (among independent attributes)!
            if i == 0:        
                and_keys = or_keys
                if len(and_keys) == 0:
                    break  # shouldn't any more.. since one CRITERIA fully failed.. so more intersection would also be empty!
            else:
                and_keys = and_keys & or_keys
            del or_keys

        # TODO: isn't and keys is a subset of or keys, we already have meta-data, do away with this another query call !
        temp_something = metaIndex.query(data_hashes = and_keys)
        for k,v in temp_something.items():
            temp["meta_data"].append(v)
            temp["data_hash"].append(k)
            temp["score"].append(key_score[k])
        
        if "query" in image_attributes:
            # here we just re-rank based on the semantic query thats it.
            current_query = image_attributes["query"][0]  # NOTE: only a single query is allowed at one time. Enforce it on client side.
            text_embedding = generate_text_embedding(current_query) # TODO: save it some how.. if cheaper, it takes around 18 ms i guess!
            flag, image_hash2scores = imageIndex.query(
                    text_embedding,
                    key = and_keys,
                    client_key = client_id)
            assert flag == False # it is weird i guess. to use False to indicate completion .. should be otherwise!

            # update the scores.
            assert len(image_hash2scores) == len(temp["data_hash"]), "it should be as image index must have same number of unique resource hashes as in meta-index"
            for i in range(len(temp["data_hash"])):
                temp_hash = temp["data_hash"][i]
                # TODO: ensure that an array instead of a single score is  being returned because of earlier face-embeddings.
                # where for a data-hash multiple scores could be returned..
                temp["score"][i] = str(temp["score"][i] * max(image_hash2scores[temp_hash]))
                del temp_hash

    assert len(temp["meta_data"]) == len(temp["data_hash"]) == len(temp["score"])
    temp["query_completed"] = query_completed
    temp["client_id"] = client_id
    return flask.jsonify(temp)

##############

@app.route("/getRawData/<data_hash>", methods = ["GET"])
def getRawData(data_hash:str) -> any:
    
    hash_2_metaData = metaIndex.query(data_hashes = data_hash)
    temp_meta = hash_2_metaData[data_hash]
    resource_type = temp_meta["resource_type"]

    #leverage preview data if possible by default:
    preview_path = os.path.join(IMAGE_PREVIEW_DATA_PATH, "{}.webp".format(data_hash)) 
    if os.path.exists(preview_path):
        resource_extension = ".webp"
        absolute_path = preview_path
    else:
        print("[WARNING xxxxxxxxxxxx]: no preview_path for {} {}".format(absolute_path, data_hash))
        resource_extension = temp_meta["resource_extension"]
        absolute_path = temp_meta["absolute_path"]
  
    raw_data = dataCache.get(data_hash, absolute_path)
    del absolute_path
    return flask.Response(raw_data, mimetype = "{}/{}".format(resource_type, resource_extension[1:]))

@app.route("/getRawDataFull/<data_hash>", methods = ["GET"])
def getRawDataFull(data_hash:str) -> flask.Response:
    hash_2_metaData = metaIndex.query(data_hashes = data_hash)
    temp_meta = hash_2_metaData[data_hash]
    resource_type = temp_meta["resource_type"]
    resource_extension = temp_meta["resource_extension"]
    resource_directory = temp_meta["resource_directory"]
    absolute_path = temp_meta["absolute_path"]

    raw_data = None
    if absolute_path.strip().lower() == "remote":
        remote_meta = temp_meta["remote"]
        if resource_directory == "google_photos":
            raw_data = googlePhotos.get_raw_data(remote_meta)
        del remote_meta
    else:
        with open(absolute_path, "rb") as f:
            raw_data = f.read()
    return flask.Response(raw_data, mimetype = "{}/{}".format(resource_type, resource_extension[1:]))

@app.route("/tagPerson", methods = ["POST"])
def tagPerson():
    """
    tag a person. (update cluster id  with a user provided label.)
    It cannot be modelled cleanly, as lots of images may have that cluster/person (along with other persons/clusters) so we go through all of those image and replace old id with new id with correct index!
    current logic seems sound and working as intended!
    """
    new_person_id = flask.request.form["new_person_id"].strip()
    old_person_id = flask.request.form["old_person_id"].strip()
    # we make sure new tag/cluster is not already present, so there is never some ambiguity.
    if new_person_id in metaIndex.get_unique(attribute = "person"):
        return flask.jsonify({"success":False, "reason":"{} already present, choose a different tag".format(new_person_id)})

    # we find all the rows/resource where old person id is present.
    # we replace old person id with new person_id for each such resource !
    hash_2_metaData = metaIndex.query(attribute = "person", attribute_value = old_person_id)
    for hash, meta_data in hash_2_metaData.items():
        old_array = meta_data["person"]
        new_person_meta = {"person":[]}
        for p in (old_array):
            if p == old_person_id:
                new_person_meta["person"].append(new_person_id)
            else:
                new_person_meta["person"].append(p)
        metaIndex.modify_meta_data(data_hash = hash, meta_data = new_person_meta)
    
    result = {"success":True, "reason":""}
    metaIndex.save() # write to disk too..
    return flask.jsonify(result)
   
@app.route("/editMetaData", methods = ["POST"])
def editMetaData():
    """ Supposed to update/modify meta-index upon an user request"""
    
    temp_meta_data = {}
    for k,v in flask.request.form.items():
        # collect key/attribute, value pairs to be updated..
        if "data_hash" not in k.lower():
            temp_meta_data[k] = v

    data_hash = flask.request.form["data_hash"]
    metaIndex.modify_meta_data(data_hash, temp_meta_data)
    metaIndex.save()
    return flask.jsonify({"success":True})

@app.route("/getGroup/<attribute>", methods = ["GET"])
def getGroup(attribute:str):
    # get the unique/all possible values for an attribute!
    result = metaIndex.get_unique(attribute)
    return flask.jsonify(list(result))

@app.route("/getMeta/<attribute>/<value>", methods = ["GET"])
def getMeta(attribute:str, value:Any):

    # TODO: for now force value to be of string type.. or convert into expected type.. for backend.
    result = metaIndex.query(attribute = attribute, attribute_value = value) # exact make sure we match full string rather than substring.
    temp = {}
    temp["data_hash"]= list(result.keys())
    temp["meta_data"] = [result[k] for k in temp["data_hash"]]
    temp["score"] = [1 for _ in range(len(result))]
    return temp

@app.route("/getMetaStats", methods = ["GET"])
def getMetaStats():
    """Supposed to return some stats about meta-data indexed, like number of images/text etc."""
    result = metaIndex.get_stats()
    return flask.jsonify(result)

def get_original_cluster_id(cluster_id):
    """
    Given a cluster id get the corresponding original cluster id
    """
    if ("cluster_" in cluster_id.lower()):
       return cluster_id
      
    # first get the original data even user changed it.
    original_hash_2_metadata = metaIndex.query(attribute = "person", attribute_value = cluster_id, latest_version = False)
    new_hash_2_metadata = metaIndex.query(attribute = "person", attribute_value = cluster_id, latest_version = True)
    # note we have to do extra work, we try to reason which original cluster id was mapped to new one.
    # i donot want to save extra info.. so we figure out at first try we save it for this session..
    # for further tries!
    # try to find mapping.
    # first find ix.

    print("got: {}\n".format(cluster_id))

    desired_ix = None
    desired_hash = None
    for hash, new_meta in new_hash_2_metadata.items():
        for i,p in enumerate(new_meta["person"]):
            if p == cluster_id:
                desired_ix = i
                desired_hash = hash
                break
        del new_meta
        break
    assert desired_ix is not None, "should have found it!"

    # find the original...
    original_cluster_id = original_hash_2_metadata[desired_hash]["person"][desired_ix]
    print("found original cluster_id {}".format(original_cluster_id))
    return original_cluster_id

@app.route("/getPreviewPerson/<cluster_id>", methods = ["GET"])
def getPreviewCluster(cluster_id):
    if cluster_id not in USER_CLUSTER_ID_2_ORIGINAL:
        original_cluster_id = get_original_cluster_id(cluster_id)
        # update session mappping for future reference
        USER_CLUSTER_ID_2_ORIGINAL[cluster_id] = original_cluster_id
    else:
        original_cluster_id = USER_CLUSTER_ID_2_ORIGINAL[cluster_id]

    # TODO: have to add a cluster for no detection too... not a priority(i think have added just to incorporate)
    if original_cluster_id.lower() == "no_person_detected":
        flag, poster = cv2.imencode(".png", np.array([[0,0], [0,0]], dtype = np.uint8))
        raw_data = poster.tobytes()
        del flag, poster
        return flask.Response(raw_data, mimetype = "{}/{}".format("image", "png"))
    else:
        c = faceIndex.get(original_cluster_id)
        png_data = c.preview_data
        del c
        raw_data= base64.b64decode(png_data)
        return flask.Response(raw_data, mimetype = "{}/{}".format("image", "png"))

@app.route("/getfaceBboxIdMapping/<resource_hash>", methods = ["POST"])
def getfaceBboxIdMapping(resource_hash:str):
    """
    generate/calculate a mapping from bbox to person_ids, for a given resource.
    Returns an array of object/dicts . (with x1,y1,x2,y2, person_id) fields to easily plot bboxes with corresponding person id.
    
    Inputs:
    resource_hash:
    cluster_ids/person_ids:  already assigned during indexing. (client has this information already) 
    """
    
    cluster_ids = flask.request.form.get("cluster_ids").strip("| ").split("|")
    orig_cluster_ids = []    
    for c_id in cluster_ids:
        orig_cluster_ids.append(get_original_cluster_id(c_id))

    # TODO: reading full image data from cache if possible !
    temp_meta = metaIndex.query(data_hashes = resource_hash)[resource_hash]
    absolute_path = temp_meta["absolute_path"]
    frame = cv2.imread(absolute_path) # bit costly, should come from cache if possible.
    if frame is None:
        return flask.jsonify([])
    else:
        # NOTE: bbox_ids preserves the order for provided cluster_ids, hence can easily to get the newest persond id in cluster_ids list provided as argument.
        bbox_ids = faceIndex.get_face_id_mapping(
            image = frame,
            is_bgr = True,
            cluster_ids = orig_cluster_ids
        )
        assert len(bbox_ids) == len(cluster_ids)
        result = []
        for ix, (bbox, id) in enumerate(bbox_ids):            
            result.append({
                "x1":bbox[0],
                "y1":bbox[1],
                "x2":bbox[2],
                "y2":bbox[3],
                "person_id": cluster_ids[ix]   # if order was same from get_face_id function.
            })
    return flask.jsonify(result) 

@app.route("/ping", methods = ["GET"])
def ping():
    """To check the python app/server liveness!"""
    return "ok"

################
# Extension specific routes
##################
import requests
import webbrowser
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "./extensions/google_photos"))
from gphotos import GooglePhotos, read_gClient_secret, write_gClient_credentials

googlePhotos = GooglePhotos() #in case not client_secret/credentials, would be equivalent to a dummy initialization.
GAuthFlowStatus = {
    "status":"not active",
    "finished":True,
}

@app.route("/gClientInfo")
def gClientInfo():
    return flask.jsonify(googlePhotos.get_client_info()) 

@app.route("/uploadClientData", methods = ["POST"])
def uploadClientData():
    client_data = flask.request.form.get("client_data")
    client_data = json.loads(client_data)
    googlePhotos.add_new_client(client_data)
    return flask.jsonify({"success":True})

@app.route("/beginGAuthFlow")
def beginGAuthflow():
    # TODO: later provide password..

    client_data = read_gClient_secret(password=None)
    client_id = client_data["client_id"]
    redirect_uri = client_data["redirect_uris"][0]
    auth_uri = client_data["auth_uri"]
    SCOPE = "https://www.googleapis.com/auth/photoslibrary"   # TODO: for now hard-code it.
    webbrowser.get(using = None).open('{}?response_type=code'
                '&client_id={}&redirect_uri={}&scope={}&access_type=offline'.format(auth_uri, client_id, redirect_uri, SCOPE), new=1, autoraise=True)
    
    with global_lock:
        GAuthFlowStatus["status"] =  "in progress" 
        GAuthFlowStatus["finished"] = False
    
    return "ok"

@app.route("/OAuthCallback")
def oAuthCallback():
    # TODO: error checking, like failed or user not consent.
    global googlePhotos

    # TODO: exchange the code to by making a request to OAUTH server. 
    client_data = read_gClient_secret()
    token_uri = client_data["token_uri"]
    
    try:
        response = requests.post(token_uri, data={
        
            # data to exchange code with 
            'client_id': client_data["client_id"],
            'client_secret': client_data["client_secret"],
            'grant_type': 'authorization_code',
            'redirect_uri': client_data["redirect_uris"][0],  # just provide this. and make sure match with one on google console. (not being used..)
            'code':flask.request.args["code"]
        })
    except ConnectionError:
        with global_lock:
            GAuthFlowStatus["status"] =  "Connection Error" 
            GAuthFlowStatus["finished"] = True
        return "Ok"
    
    write_gClient_credentials(response.json(), password = None)

    googlePhotos = GooglePhotos()
    with global_lock:
        GAuthFlowStatus["status"] =  "Success" 
        GAuthFlowStatus["finished"] = True

    return "Ok"

@app.route("/statusGAuthFlow")
def statusGAuthFlow():
    with global_lock:
        return flask.jsonify(GAuthFlowStatus)

############################################################################
def check_extension_status(remote_protocol:str) -> Tuple[bool, str]:
    if remote_protocol not in appConfig["supported_remote_protocols"]:
        return (False, "Not a supported protocol")
    else:
        if remote_protocol == "google_photos":
            status = googlePhotos.get_client_info()
            if "is_activated" in status:
                if status["is_activated"] == True:
                    return (True, "")
                else:
                    return (False, "Not activated yet. Please link a google account first.")
            else:
                return (False, "Not activated yet. Please link a google account first.")
        else:
            return (False, "Not a supported protocol")

#######################################

if __name__ == "__main__":

    port = 8200

    import argparse
    parser = argparse.ArgumentParser()# Add an argument
    parser.add_argument('--port', type=int, required=False)
    args = parser.parse_args()

    if args.port is not None:
        port = args.port
    
    app.run(host = "127.0.0.1",  port = port)
