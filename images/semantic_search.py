# maybe we can use relative imports to make it work with LSP and easier to read.
# also just later change the workingdirectory "." in-place for "./images", that should be enough !

import sys
import os
import time

PYTHON_MODULES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "python_modules")
IMAGE_APP_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".")
# IMAGE_APP_INDEX_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".", "index")
# IMAGE_APP_ML_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".", "ml")

sys.path.insert(0, IMAGE_APP_PATH)
# sys.path.insert(0, IMAGE_APP_INDEX_PATH)
# sys.path.insert(0, IMAGE_APP_ML_PATH)
sys.path.insert(0, PYTHON_MODULES_PATH)

# imports
from typing import Optional, Union, TypedDict, NamedTuple, Tuple, List, Iterable, Dict, Any
from threading import RLock
import threading
import time
import uuid
import base64

import cv2
from flask import Flask
import flask
import numpy as np

# --------------------------------
# configuration:
IMAGE_PREVIEW_DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index","preview_image")
IMAGE_INDEX_SHARD_SIZE = 1200  # should be around 10_000, for dataset with around 50k or more images !
TOP_K_SHARD =   int(3 * IMAGE_INDEX_SHARD_SIZE / 100)    # at max 3% top results from each shard are considered for semantic query.  
IMAGE_PREVIEW_DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "preview_image")
if not os.path.exists(IMAGE_PREVIEW_DATA_PATH):
    os.mkdir(IMAGE_PREVIEW_DATA_PATH)

def get_drives() -> List[str]:
    """ Courtesy of SO, but simple to understand!
    we call the loaded kernel32 dll and then go through possible One character volume Names! Not exhaustive, but for now !
    """
    from ctypes import windll
    import string
    drives = []
    bitmask = windll.kernel32.GetLogicalDrives()
    for letter in string.ascii_uppercase:
        if bitmask & 1:
            drives.append("{}:".format(letter))
        bitmask >>= 1

    return drives
# --------------------------------

from index.image_index import ImageIndex
from index.face_clustering import FaceIndex
from index.meta_indexV2 import MetaIndex
from index.global_data_cache import GlobalDataCache

# a (session-only)cache, to keep track of `original cluster` mapping to `user aliased tags`, so as to speed up getting previews for a `person`.
Cluster_alias = {}

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
        
########################################################################
IMAGE_EMBEDDING_SIZE = 512  # depends on the model architecture.
# TEXT_EMBEDDING_SIZE = 512  # depends on the model architecture.
FACE_EMBEDDING_SIZE = 512   # depends on the model architecture.

# ----------------------
# Set up databases 
# --------------------
imageIndex = ImageIndex(shard_size = IMAGE_INDEX_SHARD_SIZE, embedding_size = IMAGE_EMBEDDING_SIZE)
print("Created Image index")

metaIndex = MetaIndex()
print("Created meta Index")

faceIndex = FaceIndex(embedding_size = FACE_EMBEDDING_SIZE)
print("Created Face Index")
# --------------------------------------------------------------

# TODO: better to do everything through cache or caches..
dataCache = GlobalDataCache()   # a global data cache to serve raw-data for previews.

# config/data-structures
global_lock = threading.RLock()

def recreate_local_path(
        identifier:str,  # like C:, D:,  Local drives/partitions!
        uri:list[str]   # like [abc, movies,] , without any delimiters like // or \
    ) -> os.PathLike:
    
    if os.sys.platform == "win32":
        identifier = "{}\\".format(identifier)
    return os.path.join(
        identifier,
        *uri
    )

from index.indexing_local import IndexingLocal, IndexingInfo, generate_text_embedding, ReturnInfo
index_obj:None | IndexingLocal = None

############
## FLASK APP
############
app = Flask(__name__, static_folder = None, static_url_path= None)
app.secret_key = "Fdfasfdasdfasfasdfas"
from flask_cors import CORS
CORS(app)

class IndexBeginAttribute(TypedDict):
    location:str    # TODO: better constraint it to Location Enum!
    identifier:str  # C:, D: or google_photos, google_drive etc!
    uri:list[str]   # could be empty too!
    complete_rescan:bool

@app.route("/indexStart", methods = ["POST"])        
def indexStart(batch_size = 1) -> ReturnInfo:
    global index_obj

    # (try to) type-match the POST data.
    post_attributes:IndexBeginAttribute
    if isinstance(flask.request.json, str):
        post_attributes = json.loads(flask.request.json)
    else:
        post_attributes = flask.request.json
    print(post_attributes)

    # Re-create the path. (TODO: handle for remote like googlePhotos)
    root_dir = recreate_local_path(
        post_attributes["identifier"], 
        uri = post_attributes["uri"]
    )

    # print("Root dir: {}".format(root_dir))
    if not(os.path.exists(root_dir)):
        return flask.jsonify(ReturnInfo(error = True, details = "{} Doesn't exist on the server side!".format(root_dir)))

    with global_lock:
        if index_obj is None:
            # TODO: leverage the `location` attribute to select appropriate Class!
            index_obj = IndexingLocal(
                root_dir = root_dir,
                image_preview_data_path = IMAGE_PREVIEW_DATA_PATH,
                meta_index = metaIndex,
                face_index = faceIndex,
                semantic_index = imageIndex,
                complete_rescan = post_attributes["complete_rescan"]
            )        
            
            # start the indexing, it return after starting a background-thread!
            return flask.jsonify(index_obj.begin())
        else:
            temp_status = index_obj.getStatus() # we call it, in case client was not calling `getStatus` route
            if temp_status["done"] == True:
                # Client may not have read the `done` status. (shouldn't happen though, but we will schedule next one!)
                index_obj = IndexingLocal(
                root_dir = root_dir,
                image_preview_data_path = IMAGE_PREVIEW_DATA_PATH,
                meta_index = metaIndex,
                face_index = faceIndex,
                semantic_index = imageIndex,
                complete_rescan = post_attributes["complete_rescan"]
                )
                return flask.jsonify(index_obj.begin())           
            else:
                return flask.jsonify(ReturnInfo(error = True, details = "Wait for ongoing indexing to finish!"))

@app.route("/indexCancel", methods = ["GET"])
def indexCancel() -> ReturnInfo:
    """raise a cancellation request to cancel an ongoing indexing.
    Should also handle cases where indexing just finished !!
    """
    global index_obj
    result:ReturnInfo = {}
    with global_lock:
        if not (index_obj is None):
            temp_status = index_obj.getStatus()  # always safe/convenient to call `getStatus`
            if temp_status["done"] == True:
                result["details"] = "Finished already!" 
                result["error"] = False # client next call to `getIndexStatus` will suggest this!
                index_obj = None       # it is ok.. on first confirmation of `done`, anywhere we do this.
            else:
                return index_obj.cancel()
        else:
            result["details"] = "No ongoing indexing..."
            result["error"] = True # terminating response !
    return result


@app.route("/getIndexStatus", methods = ["GET"])
def getIndexStatus() -> IndexingInfo:
    global index_obj

    result:IndexingInfo = {}
    with global_lock:
        if not (index_obj is None):
            result = index_obj.getStatus()
            if (result["done"] == True): # client must not request any more status for this indexing!
                index_obj = None
        else:
            result["done"] = True     # Terminating response!
            result["details"] = "Either indexing finished or no ongoing indexing!"
    
    return flask.jsonify(
        result
    )

@app.route("/getSuggestion", methods = ["POST"])
def getSuggestion() -> Dict[str, List[str]]:

    query = flask.request.form.get("query")
    result = {}
    attribute = flask.request.form.get("attribute")
    result[attribute] = metaIndex.suggest(attribute, query)
    
    return flask.jsonify(result)

##########################################

experiment_cache = {} # some data to store over a single query, (like text-embeddings). Later hold image-embeddings when able to do re-ranking also!
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
    temp["data_hash"] = []       # TODO: may rename it `resource_hash` on client side!
    temp["score"] = []
    if not rerank_approach:
        # This means semantic query. (without any meta-attributes.)
        current_query = image_attributes["query"][0]  # NOTE: only a single query is allowed at one time. Enforce it on client side.
        
        if client_id not in experiment_cache:
            text_embedding = generate_text_embedding(current_query)
            experiment_cache[client_id] = {"text-embeddings": text_embedding}
        else:
            text_embedding = experiment_cache[client_id]["text-embeddings"]
        
        flag, image_hash2scores = imageIndex.query(text_embedding, client_key = client_id)
        
        # limit to top_k results. (Already sorted) # TODO: may be possible to provide top_k as an argument to metaIndex/imageIndex itself!!!
        top_keys = []
        for i,k in enumerate(image_hash2scores):
            top_keys.append(k)
            del k
            if i == top_k:
                break
                
        temp_something = metaIndex.query(resource_hashes = top_keys) # hash to metaData
        
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
        temp_something = metaIndex.query(resource_hashes = and_keys)
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

    if query_completed == True and client_id in experiment_cache:
        _ = experiment_cache.pop(client_id)
    return flask.jsonify(temp)

##############

@app.route("/getRawData/<resource_hash>", methods = ["GET"])
def getRawData(resource_hash:str) -> any:
    
    hash_2_metaData = metaIndex.query(resource_hashes = resource_hash)
    temp_meta = hash_2_metaData[resource_hash]
    resource_type = "image"

    #leverage preview data if possiblde by default:
    preview_path = os.path.join(IMAGE_PREVIEW_DATA_PATH, "{}.webp".format(resource_hash)) 
    if os.path.exists(preview_path):
        resource_extension = ".webp"
        absolute_path = preview_path
    else:
        print("[WARNING xxxxxxxxxxxx]: no preview_path for {} {}".format(absolute_path, resource_hash))
        resource_extension = temp_meta["resource_extension"]
        absolute_path = temp_meta["absolute_path"]
  
    raw_data = dataCache.get(resource_hash, absolute_path)
    del absolute_path
    return flask.Response(raw_data, mimetype = "{}/{}".format(resource_type, resource_extension[1:]))

@app.route("/getRawDataFull/<resource_hash>", methods = ["GET"])
def getRawDataFull(resource_hash:str) -> flask.Response:
    hash_2_metaData = metaIndex.query(resource_hashes = resource_hash)
    temp_meta = hash_2_metaData[resource_hash]
    resource_type = "image" # TODO: get it from meta-data?
    resource_extension = temp_meta["resource_extension"]
    resource_directory = temp_meta["resource_directory"]
    absolute_path = temp_meta["resource_path"]

    raw_data = None
    # TODO: handle remote data!
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
    Tag a person, by replacing the old `person` attribute with newer.
    It does all the stuff for finding all resources with that `old id` and replaces correctly and save the db too!
    
    TODO: do a `replace` routine in backend, to speed such operations!
    
    """
    new_person_id = flask.request.form["new_person_id"].strip()
    old_person_id = flask.request.form["old_person_id"].strip()

    if "cluster" in new_person_id: 
        return flask.jsonify({"success":False, "reason":"`cluster` is reserved, choose a different tag"})
    
    # we make sure new tag/cluster is not already present, so there is never some ambiguity.
    if new_person_id in metaIndex.get_unique(attribute = "personML"):
        return flask.jsonify({"success":False, "reason":"{} already present, choose a different tag".format(new_person_id)})
    
    hash_2_metaData = metaIndex.query(attribute = "person", attribute_value = old_person_id)
    for hash, meta_data in hash_2_metaData.items():
        old_array = meta_data["person"]  # an array of strings is expected!
        count = 0
        idx = None
        for i,d in enumerate(old_array):
            if old_person_id == d:
                count += 1
                idx =  i # count must be 1, then only one (desired) idx would be returned, 
        assert count == 1, "{} Must have been found in: {}".format(old_person_id, old_array)
        old_array[idx] = new_person_id

        # modify it, for each `resource` indicating presence of that `person`
        metaIndex.modify_meta_user(
            resource_hash = hash, 
            meta_data = {"person":old_array},
            force = True        # as we would be overwriting it!
            )
    
    with global_lock:
        if old_person_id in Cluster_alias:
            assert "cluster" in Cluster_alias[old_person_id], Cluster_alias[old_person_id]
            Cluster_alias[new_person_id] = Cluster_alias[old_person_id]
        
            # any new key is added in `getPreviewCluster`
            _ = Cluster_alias.pop(old_person_id) # like if was `shelly` --> cluster_xx, replaced `shelly` -> `rafa`, so we `pop` `shelly`

    result = {"success":True, "reason":""}
    metaIndex.save() # write to disk too..
    return flask.jsonify(result)
   
@app.route("/editMetaData", methods = ["POST"])
def editMetaData():
    """ 
    TODO: only user Attributes are supposed to be updated/edited.
    just call `modify_meta_user`,
    TODO: complete it! 
    """
    
    temp_meta_data = {}
    for k,v in flask.request.form.items():
        # collect key/attribute, value pairs to be updated..
        if "data_hash" not in k.lower():
            temp_meta_data[k] = v

    data_hash = flask.request.form["data_hash"]
    metaIndex.modify_user_data(data_hash, temp_meta_data)
    metaIndex.save()
    return flask.jsonify({"success":True})

@app.route("/getGroup/<attribute>", methods = ["GET"])
def getGroup(attribute:str):
    # get the unique/all possible values for an attribute!
    # TODO: if `resource directory`, send as form of `identifier` and an array of uris, so as to get `case-sensitive-path` back!

    if attribute == "resource_directory":
        new_result = []
        for x in metaIndex.get_unique(attribute):
            new_result.append(x.replace("\\","/"))  # its a mess handling on js side for me atleast!
        return flask.jsonify(new_result)
    
    result = metaIndex.get_unique(attribute)
    return flask.jsonify(list(result))

@app.route("/getMeta/<attribute>/<value>", methods = ["GET"])
def getMeta(attribute:str, value:Any):
    
    # NOTE: we use a single `forward` slash while saving `meta-data` for paths. Should work well on `linux`, TODO: test it.
    if attribute == "resource_directory":
        value = value.replace("|", "/")
        assert os.path.exists(os.path.normpath(value))

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
    Given some cluster_id or user provided person_id, we get the corresponding `original_cluster_id`.
    Should be fast enough for most cases, using a cache/dict to speed-up subsequent requests! 
    """
    if ("cluster" in cluster_id.lower()):
       return cluster_id

    assert metaIndex.backend_is_initialized == True
    from index.meta_indexV2 import mBackend    

    attr_2_rowIndices = json.loads(
        mBackend.query(
        json.dumps({"person":cluster_id})
        ))
    # We need only 1 row, to get the corresponding Original Meta-data!
    row_idx = attr_2_rowIndices["person"][0]
    idx = None
    meta_array = json.loads(mBackend.collect_rows([row_idx], latest_version = True))[0]
    person_user_arr = meta_array["person"]
    person_ml_arr = meta_array["personML"]
    assert len(person_ml_arr) == len(person_user_arr), "Expected to be same, only content may differ"
    for i in range(len(person_user_arr)):
        if person_user_arr[i] == cluster_id:
            idx = i 
            break
    assert not(idx is None)
    return person_ml_arr[idx]
      
@app.route("/getPreviewPerson/<person_id>", methods = ["GET"])
def getPreviewCluster(person_id):
    # TODO: have to add a cluster for no detection too... not a priority(i think have added just to incorporate)
    if person_id.lower() == "no_person_detected":
        flag, poster = cv2.imencode(".png", np.array([[0,0], [0,0]], dtype = np.uint8))
        raw_data = poster.tobytes()
        del flag, poster
        return flask.Response(raw_data, mimetype = "{}/{}".format("image", "png"))
    else:
        # Do the dance of getting original `corresponding` cluster_id, so that we can retrive the `face preview`
        with global_lock:            
            if Cluster_alias.get(person_id, False):
                original_cluster_id = Cluster_alias[person_id]
            else:
                original_cluster_id = get_original_cluster_id(person_id)
                Cluster_alias[person_id] = original_cluster_id

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
    temp_meta = metaIndex.query(resource_hashes = resource_hash)[resource_hash]
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

@app.route("/getPartitions", methods = ["GET"])
def getPartitions() -> Dict[str, str]:
    """
    It returns a list of tuple containing `location` and an `identifier` for partitions available to index from:
    ("LOCAL", "C:"),
    ("LOCAL", "D:"),
    ("REMOTE", "googlePhotos) 
    ...
    """
    # TODO: handle `remote extensions` too, somewhere `register them` to be read here!
    if sys.platform == "win32":
        response_data = [
            {"location": "local", "identifier": identifier}
            for identifier in get_drives()
        ]
    else:
        # TODO: test, only a single `/` (root) for Linux should be enough!
        response_data = [
            {"location": "local", "identifier": "/"}
            for identifier in get_drives()
            ]
    return flask.jsonify(response_data)

from typing import TypedDict
class SuggestionPathAttributes(TypedDict):
    """
    Post data sent by client to get suggestions based on the data entered by used so far!
    NOTE: we do away with any `slashes`, For a path like `D://movies/abc` being entered.
    We will expect:
    * location as "local"   # this would have been sent earlier to client!
    * identifier as "D:"    # This would have been sent earlier to client! 
    * uri as ["movies", "abc"] # either entered by user, or chosen one of the suggestions!
    This should also help handle case sensitive paths for Linux too!
    """
    location:str
    identifier:str # remove any `backward` slashes, not expected in identifier. For `linux` it is supposed to be `/` always!
    uri:list[str]

@app.route("/getSuggestionPath", methods = ["POST"])
def getSuggestionPath() -> List[str]:
    """
    To provide suggestions for `local/server`, (generally) during selection of a directory/folder to index!
    NOTE: client must set the `header` as `application/json`, as it expects json-encoded data! 
    """
    post_data:SuggestionPathAttributes
    if isinstance(flask.request.json, str):
        post_data = json.loads(flask.request.json)
    else:
        post_data = flask.request.json

    result:List[str] = []
    if post_data["location"].lower() == "local":
        recreated_path = recreate_local_path(
            post_data["identifier"],
            uri = post_data["uri"]
        )
        # print("Recreated path: ", recreated_path)
        if os.path.exists(recreated_path):
            result = os.listdir(recreated_path)
    return flask.jsonify(result)


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
    # TODO: deprecated, would be handled with other extension code!
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

    if not(args.port is None):
        port = args.port
    
    app.run(host = "127.0.0.1",  port = port)
