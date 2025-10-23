# maybe we can use relative imports to make it work with LSP and easier to read.
# also just later change the workingdirectory "." in-place for "./images", that should be enough !

import sys
import os
import time
import json

# -----------------------------------------------------
# First party modules path configuration, could be better!
# --------------------------------------------------
PYTHON_MODULES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "python_modules")
IMAGE_APP_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".")
sys.path.insert(0, IMAGE_APP_PATH)
# --------------------------------------------

# --------------------------------
# 3rd party Path Handling
# -------------------------------------
sys.path.insert(0, PYTHON_MODULES_PATH) # We keep it at first!
# Order matters, make sure `lib/site-packages` is at-least appended (if exists), for given executable!
# TODO: But then don't duplicate the packages in `python_modules` only pure 3rd party, python packages should be there, independent of python versions mess! 
executable_dir = os.path.dirname(sys.executable)
site_packages_path = os.path.join(executable_dir, "Lib", "site-packages")
if os.path.exists(site_packages_path):
    print("[DEBUG]: Python packages Path Added: {}".format(site_packages_path))
    sys.path.append(site_packages_path)
# --------------------------------------------------

# imports, after setting python_modules_path, (so that self-contained)
# import psutil
# p = psutil.Process()
# print("[PID]: {}".format(p))

from typing import Optional, Union, TypedDict, NamedTuple, Tuple, List, Iterable, Dict, Any
from threading import RLock
import threading
import base64

import cv2
# from flask import Flask
# import flask
from werkzeug import Request, Response
import numpy as np

# --------------------------------
# configuration:
IMAGE_PREVIEW_DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index","preview_image")
IMAGE_INDEX_SHARD_SIZE = 10_000    # Good default!
TOP_K_EACH_SHARD =  5      # iN PERCENT !
IMAGE_PREVIEW_DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "./static", "preview_image") # letting frontend proxy like caddy, serve the previews instead...
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

def jsonify(data:object):
    # generating Json and wrapping into a Response object. (something like flask.jsonify)
    return Response(json.dumps(data), mimetype = "application/json")
# --------------------------------
# TODO: is there a better way to load `relative paths from a script when called from other location!`
try:
    from .index.image_index import ImageIndex
    from .index.face_clustering import FaceIndex
    from .index.meta_indexV2 import MetaIndex, mBackend
    from .index.global_data_cache import GlobalDataCache
    from .index.indexing_local import IndexingLocal, IndexingInfo, generate_text_embedding, ReturnInfo
    from .index.pagination import PaginationCache, PaginationInfo
except:
    from index.image_index import ImageIndex
    from index.face_clustering import FaceIndex
    from index.meta_indexV2 import MetaIndex, mBackend
    from index.global_data_cache import GlobalDataCache
    from index.indexing_local import IndexingLocal, IndexingInfo, generate_text_embedding, ReturnInfo
    from index.pagination import PaginationCache, PaginationInfo


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

    temp_query = query.lower().strip().split(and_character) # TODO: may be make decision for lowering.. in the app config. later.. for now case insenstive meta-data is stored!
    imageAttributes_2_values = {}
    for x in temp_query:
        temp_x = x.strip().split(separator_character)
        attribute = temp_x[0]

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
        uri:list[str]    # like [abc, movies,] , without any delimiters like // or \
    ) -> os.PathLike:
    
    if os.sys.platform == "win32":
        identifier = "{}\\".format(identifier)
    return os.path.join(
        identifier,
        *uri
    )

# Globals
index_obj:None | IndexingLocal = None
REGISTERED_EXTENSIONS = {}     # can be populated, if extensions' code is available

class IndexBeginAttribute(TypedDict):
    location:str    # TODO: better constraint it to Location Enum!
    identifier:str  # C:, D: or google_photos, google_drive etc!
    uri:list[str]   # could be empty too!
    complete_rescan:bool
    simulate_indexing:bool     # to simulate some parts like image-embedding generation to speed up indexing !
    remote_client_id:str       # in case `identifier` referes to an extension/remote protocol!

##app.route("/indexStart", methods = ["POST"])        
def indexStart(request:Request) -> ReturnInfo:
    with global_lock: # To serialize access in case of multiple-users. (For future scenarios!)
        global index_obj, REGISTERED_EXTENSIONS

        # (try to) type-match the POST data.
        post_attributes:IndexBeginAttribute
        if isinstance(request.json, str):
            post_attributes = json.loads(request.json)
        else:
            post_attributes = request.json
        print(post_attributes)
        

        # ---------------------------------------------------
        root_dir = None
        remote_extension = None
        if post_attributes["location"] == "LOCAL":
        # if False: # TODO:
            # Re-create the path.
            root_dir = recreate_local_path(
                post_attributes["identifier"], 
                uri = post_attributes["uri"]
            )
            print("Root dir: {}".format(root_dir))
            if not(os.path.exists(root_dir)):
                return jsonify(ReturnInfo(error = True, details = "{} Doesn't exist on the server side!".format(root_dir)))
        else:
            # Indexing for data not available on `local` host.
            # It could be referrring to an extension which stored data in Cloud like google drive, or some connected MTP device, all are considered REMOTE!
            # and will require dedicated code to support each of such device.
            assert post_attributes["location"] == "REMOTE"
            extension_identifier = post_attributes["identifier"]
            if (extension_identifier in REGISTERED_EXTENSIONS):
                remote_extension = REGISTERED_EXTENSIONS[post_attributes["identifier"]]
                remote_client_id = post_attributes["remote_client_id"]
                if remote_extension.ping(r = None, id = remote_client_id) != "ok":
                    return jsonify(ReturnInfo(error = True, details = "{} has not setup yet!\nVisit Extensions Interface to configure the {}".format(extension_identifier, extension_identifier)))
            else:
                return jsonify(ReturnInfo(error = True, details = "{} Doesn't exist on the server side!".format(post_attributes["identifier"])))

            print("[Indexing]: {}".format(remote_extension.get_name()))    
            # TODO: For now manually set device for testing.
            # later client will provide inputs to select a device and finish setup!
            # remote_extension.beginSetup(r = None)
            # remote_extension.finishSetup(r = None, chosen_device_index = 0)
        #  -----------------------------------------------------------------------
    
    
        # Either index_obj is None (client knows Done ) or if client didn't read, and was done!
        prev_index_status = False
        if not(index_obj is None):
            # Read `getStatus` comments, if we get Done as true, we start a new indexing!
            prev_index_status = index_obj.getStatus()["done"]

        if index_obj is None or prev_index_status == True:
            index_obj = IndexingLocal(
                root_dir = root_dir,
                image_preview_data_path = IMAGE_PREVIEW_DATA_PATH,
                meta_index = metaIndex,
                face_index = faceIndex,
                semantic_index = imageIndex,
                complete_rescan = post_attributes["complete_rescan"],
                simulate = post_attributes["simulate_indexing"],
                remote_extension = remote_extension,
                remote_client_id = post_attributes.get("remote_client_id",None)
            )

            # start the indexing, it return after starting a background-thread!
            return jsonify(index_obj.begin())
        else:
            return jsonify(ReturnInfo(error = True, details = "Wait for ongoing indexing to finish!"))

##app.route("/indexCancel", methods = ["GET"])
def indexCancel(r:Request) -> ReturnInfo:
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
                return jsonify(index_obj.cancel())
        else:
            result["details"] = "No ongoing indexing..."
            result["error"] = True # terminating response !
    return jsonify(result)


##app.route("/getIndexStatus", methods = ["GET"])
def getIndexStatus(r:Request) -> IndexingInfo:
    global index_obj

    result:IndexingInfo = {}
    with global_lock:
        if not (index_obj is None):
            # NOTE: it is conditioned on being called by client, if client dies (very rare), then in `indexBegin` by another client,  may return True for `getStatus`!
            # In that case, if True, then we assume client died, and schedule/start a new indexing for newer client!
            result = index_obj.getStatus()
            if (result["done"] == True): # client must not request any more status for this indexing!
                index_obj = None
        else:
            result["done"] = True     # Terminating response!
            result["details"] = "Either indexing finished or no ongoing indexing!"
    
    return jsonify(
        result
    )

##app.route("/getSuggestion", methods = ["POST"])
def getSuggestion(request:Request) -> Dict[str, List[str]]:
    # NOTE: could get bit costly, for very large datasets if called on every keystore, but client only call this, after sensing a delay.
    # Should be very useful and fast for our desired local app even for larger datasets!, but when demoing on a remote server, may get costly!!
    # TODO: maintain a cache.. to speed up checking in that cache first.. that substring!
    allowed_attributes = [
        "person",
        "filename",
        "resource_directory",
        "place"
    ]

    query = request.form.get("query")

    result = {}
    for attribute in allowed_attributes:
        result[attribute] = []
        if len(query) >= 3: # to much wasted cpus cycles otherwise. without enough info!
            result[attribute] = metaIndex.suggest(attribute, query) # at-max 20 are being returned i guess!
    # return flask.jsonify(result)
    return jsonify(result)

##########################################

# --------------------------
pagination_cache = PaginationCache() # for each (new) query, certain pagination info is cache, to be used for collect/filter conditioned on that query.
# ---------------------------


# --------------------
# Collect 
# ----------------------
##app.route("/collectQueryMeta/<token>/<page_id>")
def collect_query_meta(request:Request, token:str, page_id:int) -> Dict:   
    page_id = int(page_id)
    # (row_indices, resource_hashes, scores) = pagination_cache.get(token, page_id)
    (row_indices, resource_hashes, scores) = pagination_cache.get(token, page_id)
    
    if row_indices is None:
        # For semantic query!!
        # since all shards are queried for `resource_hashes`, and are sorted.
        # we only collect the required meta-data conditoned on those hashes, on demand!
        row_indices = metaIndex.query_generic(
                    attribute = "resource_hash",
                    query = resource_hashes # for this particular page!
                )

    temp:MetaInfo = {}
    temp["data_hash"] = resource_hashes
    temp["score"] = scores    
    temp["meta_data"] = metaIndex.collect_meta_rows(row_indices)
    del scores, resource_hashes
    return jsonify(temp)

# ------------------
# Querying
# -------------------
from queue import Queue
class QueryInfo(TypedDict):
    """
    Return type for a Q aka query function call in pagination pipeline!
    """
    query_token:str   # required for `collect/filter` routes, must be random enough to not be guessed, even for authenticated users (when exposed to cloud)
    n_pages:int  # n pages possible as the result of a query.
    n_matches:int   # this represents max possible matches, for a Q , so a clien create pagination interface just after querying, without calling collect/filter.

class MetaInfo(TypedDict):
    """
    Return type for the `collect` or `filter` calls, after `querying` aka Q call in pagination pipeline.
    This is result type for transformation aka T function call!
    """
    data_hash:list[str]
    meta_data:list[dict] # each element would contain all meta-attributes.
    score:list[float] # corresponding score for each data/resource hash, (Generally) in orderded!

# Inits.
# For now client has started sending session-key, so used only for testing/legacy code!
query_token_counter = 1  # NOTE TODO: make it random enough to not be guessed even by authenticated (only authorized) but later, if exposing as a Cloud service!

def query_func(
        query:str,
        page_size:int,
        # all filtering would be conditioned on this query (query_token).
        query_token:str  # for each query, supposed to get a token, mapping it to a client.(if not one we keep generating new ones, but it will grow the pagination cache!)
):
    """
    Main routine to return query results.
    Multiple attributes are allowed in the query to make it possible to match-and-mix queries.
    This version of query is simpler than older one.f/
    In case a deterministic/meta attribute is provided, "Semantic query" acts as a re-ranker only.
    Otherwise only non-deterministic streaming "semantic search" is done. 
    """
    # TODO: append the hashes to dataCache to start loading in the background!
    # mem_start = p.memory_info()[0] # residential (non-swapped physical memory)
    # print("mem start: {}".format(mem_start))

    flag = False
     
    # NOTE: doesn't matter much, since we would be querying all shards in one go.. not in streaming manner, for new `pagination-pipeline`!
    client_id = query_token

    # except "query" all are meta-attributes ..for now!
    image_attributes = parse_query(query)
    meta_attributes_list = [x for x in image_attributes if x != "query"]
    rerank_approach = len(meta_attributes_list) > 0

    benchmarking = {}
    if not rerank_approach:
        # i.e only semantic query, without NO meta attributes!
        
        current_query = image_attributes["query"][0]  # NOTE: only a single query is allowed at one time. Enforce it on client side.

        ##--------------------------------------------
        # pagination sequence query + collect. (query part must be as fast as possible!)
        # -------------------------------------------
        # text_embedding = np.random.uniform(size = (1, 512)).astype(np.float32)
        s = time.time_ns()
        text_embedding = generate_text_embedding(current_query)
        benchmarking["embedding"] = (time.time_ns() - s) / 1e6

        s = time.time_ns()
        image_hash2scores = imageIndex.query_all_shards(
            text_embedding, 
            client_key = client_id,
            top_k_each_shard = TOP_K_EACH_SHARD
        )
        benchmarking["shard-querying"] = (time.time_ns() - s) / 1e6
        
        # Sorting, as each shard is queried independently, so GLOBAL sorting required!
        top_keys = sorted(
            image_hash2scores.keys(),
            key = lambda x: max(image_hash2scores[x]),
            reverse = True
        )

        # NOTE: For now, Q routine(s) we can estimate max possible matches as `len(top_keys)`.
        # NOTE: since `sorted resource hashes`, we collect only corresponding `meta-data` in `collect_query_meta` for a page, hence very very fast!

        # -------------------------------------
        # Generate Pagination info..
        # ------------------------------------
        s = time.time_ns()
        info:PaginationInfo = {}
        n_pages = len(top_keys) // page_size + 1 # should be ok, when fully divisible, as empty list should be collected!
        page_meta = []
        for i in range(n_pages):
            # generate relevant meta-data for each page! TODO: check this logic!
            page_meta.append(
                (
                    None,        # we get corrsponding row_indices on demand for that page, based on top-keys
                    top_keys[i*page_size: (i+1)*page_size],
                    [float(max(image_hash2scores[k])) for k in top_keys[i*page_size: (i+1)*page_size]]  # why i am not sending `float` values in json??
                )
            )
        benchmarking["pageinfo-generation"] = (time.time_ns() - s) / 1e6
        print(benchmarking)
        # ----------------------------------------------

        info["token"] = query_token
        info["page_meta"] = page_meta
        del page_meta
        pagination_cache.add(info)
        del info

        q_info:QueryInfo = {}
        q_info["n_matches"] = len(top_keys)
        q_info["n_pages"] = n_pages
        q_info["query_token"] = query_token
        return q_info
    else:
        #-----------------
        # We generate Q (query) given meta-attribute (and semantic-attribute) info to generate Page meta-data.
        # and return Q info back to the clien.t
        # First we collect all the ANDed row_indices, based on multiple attributes.
        # Then corresponding `resource_hashes` are collected if semantic query is also present 
        # Then if semantic info/query is also provided, we re-rank/update-scores depending upon semantic information.
        # NOTE: only semantic info is just used to re-rank/update scores. Not any any more resource-hashes!
        # we update the pagination cache, and return the Q info back to the client, to later collect using `collectQueryMeta` on demand for a page!
        # ---------------

        and_keys = set()
        key_score = dict()        
        
        # process/collect the keys/resource-hashes for all the meta-attributes.
        s = time.time_ns()
        for i,attribute in enumerate(meta_attributes_list):        
            or_keys = set()  # OR operation like collection

            # collect indices for each matching rows, for current attribute! 
            assert isinstance(image_attributes[attribute], list), image_attributes[attribute]
            # return corresponding unique row_indices

            # TODO: speed up this, particulary for colArrayString types!
            or_keys = metaIndex.query_generic(
                    attribute = attribute,
                    query = image_attributes[attribute],
                    unique_only = False   # Meaning any row index, matching one of values!
                )
            or_keys = set(or_keys) # TODO: remove this!

            # AND operation. (among independent attributes)!
            if i == 0:        
                and_keys = or_keys
                if len(and_keys) == 0:
                    break  # shouldn't any more.. since one CRITERIA fully failed.. so more intersection would also be empty!
            else:
                and_keys = and_keys & (or_keys)
            del or_keys
        benchmarking["and-keys-collection"] = (time.time_ns() - s) / 1e6

        # Since we have the `desired` `row_indices`. We will need the primary-key aka resource_hash!
        s = time.time_ns()
        and_row_indices = list(and_keys)
        del and_keys

        n_matches = len(and_row_indices)
        # collect only from a single column/attribute!
        unsorted_resource_hashes =  json.loads(mBackend.collect_rows(
                attribute = "resource_hash",
                indices = and_row_indices
            ))
        assert n_matches == len(unsorted_resource_hashes)
        benchmarking["resources-collection"] = (time.time_ns() - s) / 1e6

        # --------------------------------------------
        # If semantic query, get the new (sorted) scores and sort other data too!
        has_semantic_query = "query" in image_attributes
        if has_semantic_query:
            # sorted!
            scores = []
            resource_hashes = []
            final_row_indices = []

            s = time.time_ns()
            semantic_query = image_attributes["query"][0]  # NOTE: only a single query is allowed at one time. Enforce it on client side.
            text_embedding = generate_text_embedding(semantic_query) # TODO: save it some how.. if cheaper, it takes around 18 ms i guess!
            benchmarking["text-embedding-generation"] = (time.time_ns() - s) / 1e6

            # NOTE: we get the sorted hash 2 scores mapping. (based on score!)
            s = time.time_ns()
            image_hash2scores = imageIndex.query_all_shards(
                    text_embedding,
                    client_key = client_id)
            assert flag == False # it is weird i guess. to use False to indicate completion .. should be otherwise!
            benchmarking["image-index-query"] = (time.time_ns() - s) / 1e6

            s = time.time_ns()
            # NOTE: we collect scores for only `and-keys/unsorted-resource-hashes`
            unsorted_scores = [float(max(image_hash2scores[x])) for x in unsorted_resource_hashes]
            new_indices = sorted([i for i in range(n_matches)], key = lambda x: unsorted_scores[x], reverse = True)
            for ix in new_indices:
                final_row_indices.append(and_row_indices[ix])
                scores.append(unsorted_scores[ix])
                resource_hashes.append(unsorted_resource_hashes[ix])
            benchmarking["misc"] = (time.time_ns() - s) / 1e6
        else:
            final_row_indices = and_row_indices
            scores = [1.0 for i in range(len(and_row_indices))]
            resource_hashes = unsorted_resource_hashes
        # ----------------------------------------------------------
        
        # -----------------------------------
        # Generate Pagination Info
        # ------------------------
        s = time.time_ns()
        info:PaginationInfo = {}
        n_pages = len(final_row_indices) // page_size + 1 # should be ok, when fully divisible, as empty list should be collected!
        page_meta = []
        for i in range(n_pages):
            # generate relevant meta-data for each page! TODO: check this logic!
            page_meta.append(
                (
                    final_row_indices[i*page_size: (i+1)*page_size],
                    resource_hashes[i*page_size: (i+1)*page_size],
                    scores[i*page_size: (i+1)*page_size]
                )
            )
        benchmarking["pageinfo-generation"] = (time.time_ns() - s)

        info["token"] = query_token
        info["page_meta"] = page_meta
        del page_meta
        pagination_cache.add(info)
        del info

        q_info:QueryInfo = {}
        q_info["n_matches"] = len(final_row_indices)
        q_info["n_pages"] = n_pages
        q_info["query_token"] = query_token
        print(benchmarking)
        return q_info



##app.route("/query", methods = ["POST"])
def query(request:Request,page_size:int = 200) -> QueryInfo:
    """
    Main routine to return query results.
    Multiple attributes are allowed in the query to make it possible to match-and-mix queries.
    This version of query is simpler than older one.f/
    In case a deterministic/meta attribute is provided, "Semantic query" acts as a re-ranker only.
    Otherwise only non-deterministic streaming "semantic search" is done. 
    """
    # TODO: append the hashes to dataCache to start loading in the background!
    # mem_start = p.memory_info()[0] # residential (non-swapped physical memory)
    # print("mem start: {}".format(mem_start))

    global query_token_counter
    # TODO: we don't need query_start, as scan all the shards in one Go, a bit costly, but aligned with `pagination-pipeline`.
    # also keeps complexity on the client-side low as well. (earlier we were trying to hide latency! but end results were about the same..as images were being rendered on new shard if better score!)
    # query_start = flask.request.form["query_start"].strip().lower()
    query = request.form["query"]
    page_size = int(request.form["page_size"])

    if "X-Session-Key" in request.headers:
        query_token = request.headers["X-Session-Key"]
    else:
        query_token = "notRandomEnoughToken_{}".format(query_token_counter)
        query_token_counter += 1  # don't matter the order, GIL atleast protects concurrent write atleast!
        print("[WARNING]: Pagination Cache will keep growing, need a way to distinguish client to discard older pagination infos! ")

    # remove older pagination data for this client.
    # NOTE: it will invalidate all filter-routines too, as fresh query is assumed. It is in accordance all filter-data is conditioned on the original query!
    pagination_cache.remove(
        query_token,
        only_if_exists = True
        )
    
    tic = time.time_ns()
    q_info = query_func(
        query = query,
        page_size = page_size,
        query_token = query_token
    )
    toc = time.time_ns()
    q_info["latency"] = int((toc - tic) / 1e6)  # in milliseconds
    return jsonify(q_info)

##############

##app.route("/getRawData/<resource_hash>", methods = ["GET"])
def getRawData(resource_hash:str) -> any:
    # TODO: deprecate it, use caddy/or fast static serve to serve these!
    resource_type = "image"

    #leverage preview data if possiblde by default:
    preview_path = os.path.join(IMAGE_PREVIEW_DATA_PATH, "{}.webp".format(resource_hash)) 
    assert os.path.exists(preview_path)
    resource_extension = ".webp"
    absolute_path = preview_path
  
    raw_data = dataCache.get(resource_hash, absolute_path)
    # raw_compressed_data = gzip.compress(raw_data)
    del absolute_path
    return Response(raw_data, mimetype = "{}/{}".format(resource_type, resource_extension[1:]))

##app.route("/getRawDataFull/<resource_hash>", methods = ["GET"])
def getRawDataFull(request:Request, resource_hash:str) -> bytes:
    row_indices = metaIndex.query_generic(
        attribute = "resource_hash",
        query = [resource_hash]
    )
    assert len(row_indices) == 1, "Resource_hashes are unique!"
    meta_data = metaIndex.collect_meta_rows(
        row_indices
    )[0]

    # TODO: directly read from `absolute_path`, to do-away with case sensitive path on *Nix !
    absolute_path = os.path.join(meta_data["resource_directory"], meta_data["filename"])
    resource_type = "image" # TODO: get it from meta-data?
    resource_extension = meta_data["resource_extension"]

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
    return Response(raw_data, mimetype = "{}/{}".format(resource_type, resource_extension[1:]))

##app.route("/tagPerson", methods = ["POST"])
def tagPerson(request:Request):
    """
    Tag a person, by replacing the old `person` attribute with newer.
    It does all the stuff for finding all resources with that `old id` and replaces correctly and save the db too!
    
    TODO: do a `replace` routine in backend, to speed such operations!
    
    """
    new_person_id = request.form["new_person_id"].strip().lower()
    old_person_id = request.form["old_person_id"].strip()

    if "cluster" in new_person_id: 
        return jsonify({"success":False, "reason":"`cluster` is reserved, choose a different tag"})
    
    # we make sure new tag/cluster is not already present, so there is never some ambiguity.
    persons =  mBackend.get_unique_str(
        attribute = "person",       # `person` initially/just-indexed is a copy of `personML``, but all user-changes are done for `person` only!
        count_only = False
    )

    # NOTE: assuming `persons` array would have a limited size, even for around a million photos. so following operations are fast enough.
    # Also this route would relatively be very-rare!
    assert old_person_id in persons, "Expected {} to be in persons !!".format(old_person_id)
    if new_person_id in persons:
        return jsonify(
            {"success":False, 
             "reason":"{} already present, choose a different tag".format(new_person_id)}
        )
    
    # We need to replace each of the `occurence` of `older person id` with `new person id`.
    row_indices = metaIndex.query_generic(
        attribute = "person",
        query = [old_person_id],
        unique_only = False      # match any row containing old_person_id!
    )

    # collect corresponding persons-arr!
    persons_arr = json.loads(mBackend.collect_rows(
        attribute = "person",
        indices = row_indices,
        ))
    assert len(row_indices) == len(persons_arr)
    for (row_idx, old_person_arr) in zip(row_indices,persons_arr):
        
        # find the `old_person_id` and replace it with `new_person_id`. 
        count = 0
        idx = None
        for i,d in enumerate(old_person_arr):
            if old_person_id == d:
                count += 1
                idx =  i # count must be 1, then only one (desired) idx would be returned, 
        assert count == 1, "{} Must have been found in: {}".format(old_person_id, old_array)
        old_person_arr[idx] = new_person_id  # modifying while iterating, ok, since one read only! and then discarding it!

        mBackend.modify(
            row_idx = row_idx, 
            meta_data = json.dumps({"person":old_person_arr})
        )
        del old_person_arr
    
    # Modifying the session-cache to reflect this update! Code is correct, may look a bit messy!
    with global_lock:
        if old_person_id in Cluster_alias:
            assert "cluster" in Cluster_alias[old_person_id], Cluster_alias[old_person_id]
            Cluster_alias[new_person_id] = Cluster_alias[old_person_id]
        
            # New keys are added in `getPreviewCluster` routine. Here we just replace 
            _ = Cluster_alias.pop(old_person_id) # like if was `shelly` --> cluster_123, replaced `shelly` -> `rafa`, so we `pop` `shelly`, now `rafa` --> `cluster_123`

    result = {"success":True, "reason":""}
    metaIndex.save() # write to disk too..
    return jsonify(result)
   
##app.route("/editMetaData", methods = ["POST"])
def editMetaData(request:Request):
    """ 
    TODO: only user Attributes are supposed to be updated/edited.
    just call `modify_meta_user`,
    TODO: complete it! 
    """
    
    temp_meta_data = {}
    for k,v in request.form.items():
        # collect key/attribute, value pairs to be updated..
        if "data_hash" not in k.lower():
            temp_meta_data[k] = v

    data_hash = request.form["data_hash"]
    metaIndex.modify_user_data(data_hash, temp_meta_data)
    metaIndex.save()
    return jsonify({"success":True})

##app.route("/getGroup/<attribute>", methods = ["GET"])
def getGroup(request:Request, attribute:str) -> list[str]:
    # get the unique/all-possible values for an attribute!
    # NOTE: CLIENT SIDE pagination is pending ..
    # NOTE: It is still quite fast, will get to it if starts to feel slow!
    # LATER in the end, pagination would be added for this too
        
    attribute_py_type = metaIndex.get_attribute_type(attribute) 
    assert attribute_py_type == "string" or attribute_py_type == "arrayString" , "For now.. TODO..."
    # TODO: extend this for every type when get some free time or required!
    raw_json = mBackend.get_unique_str(
        attribute, 
        count_only = False
    )
    return Response(raw_json, mimetype = "application/json")

# --------------------------------
# Filtering (conditioned on query token/pagination)
# Given the query-token (and return results for that), we can support filtering .
# NOTE: works for all pages (not a single page..) 
# Its convenient, as sometimes, user may not know one attribute, but using another known attribute. and then filtering can quickly get the desired result.
# Search-engine is supposed to assist in search with whatever information use may have.
# -------------------------
##app.route("/filterPopulateQuery/<query_token>/<attribute>", methods = ["GET"])
def filterPopulateQuery(request:Request, query_token:str,  attribute:str) -> list[str]:
    # first may need to populate a filter with possible values to choose a value to filter !

    # Handling the `year` attribute, as we store the `YYYY-mm--dd` created date!
    # Later can modify the backend to handle data-time formats.
    if attribute == "year":
        attribute = "resource_created"
    
    attribute_type = metaIndex.get_attribute_type(attribute)
    assert attribute_type == "string" or attribute_type == "arrayString", "For now !"   
    
    final_row_indices = []
    n_pages = pagination_cache.get_pages_count(query_token)
    for page_id in range(n_pages):
        (row_indices, resource_hashes, scores) = pagination_cache.get(query_token, page_id)
        assert not (resource_hashes is None)
        if row_indices is None:
            # means it was a pure semantic-query , without any meta-attributes was done!
            # so collect row indices first!
            row_indices = metaIndex.query_generic(
                    attribute = "resource_hash",
                    query = resource_hashes # for this particular page!
                )
            
            # Commit it to page-cache too, now this info is available for this page, to speed up subsequent calls!
            pagination_cache.overwrite(
                token = query_token,
                page_id = page_id,
                page_meta = (row_indices, resource_hashes, scores)  # Exact same except row_indices part!
            )

            final_row_indices.extend(row_indices)
        else:
            final_row_indices.extend(row_indices)
        del row_indices, resource_hashes

    if attribute == "resource_created":
        raw_json = mBackend.get_unique_str(
                attribute,
                count_only = False,        
                row_indices = final_row_indices
        )
        # TODO: may be shift this to client.. as we are generating better resolution, (month and date as well!)
        # For now only sending the set of years for this query!
        year_set = set()
        for x in json.loads(raw_json):
            # x would be in format "yyyy-mm-dd"
            year_set.add(x.split("-")[0] + "-" + x.split("-")[1])
        
        # create a json repr from set TOdO:
        # temp_str = str(year_set)
        # temp_str = temp_str.replace("{", "[", 1)
        # temp_str = temp_str.replace("}", "]", 1)
        raw_json = json.dumps(list(year_set)) # BOxing again to create a list :)

    else:
        raw_json = mBackend.get_unique_str(
                    attribute,
                    count_only = False,        
                    row_indices = final_row_indices
            )
    return Response(raw_json, mimetype="application/json")

##app.route("/filterQueryMeta/<query_token>/<attribute>/<value>", methods = ["GET"])
def filterQueryMeta(request:Request, query_token:str, attribute:str, value:Any) -> list[Dict]:
    # NOTE: filter-state must only be valid on client-side until user doesn't do a new `SEARCH`. (after that client must assume it is invalid to call the filter api with older token!)
    # TODO: add date filtering support!

    # Returns a list of filtered Dict/meta-data. Each element would be a dict representing meta-data!
    # No scores or resource_hashes key. (Client can extract `resource_hash` as needed!)

    print("Got request {} {}".format(attribute, value))

    if attribute == "year":
        attribute = "resource_created"
    attribute_type = metaIndex.get_attribute_type(attribute)
    assert attribute_type == "string" or attribute_type == "arrayString", "For now !"   
    final_row_indices = [] # collect all possible!
    
    n_pages = pagination_cache.get_pages_count(query_token)
    for page_id in range(n_pages):
        (row_indices, resource_hashes, scores) = pagination_cache.get(query_token, page_id)
        assert not (resource_hashes is None)
        if row_indices is None:
            #  meaning semantic-query , without any meta-attributes was done!
            # so collect row indices first!
            row_indices = metaIndex.query_generic(
                    attribute = "resource_hash",
                    query = resource_hashes # for this particular page!
                )
            final_row_indices.extend(row_indices)
        else:
            final_row_indices.extend(row_indices)
        del row_indices, resource_hashes

    # collect all rows/elements for that attribute!    
    results = json.loads(
        mBackend.collect_rows(
        attribute,
        final_row_indices
    ))
    assert len(results) == len(final_row_indices)

    # Do filtering!
    filtered_row_indices = []
    if attribute_type == "arrayString":
        for ix,arr in enumerate(results):
            if value in arr:
                row_idx = final_row_indices[ix]
                filtered_row_indices.append(row_idx)
    else:
        if attribute == "resource_created":
            # For now just comparing `year` (client is providing this)
            # @Akshay, Let's also compare year-month for better filtering!
            for ix, x in enumerate(results):
                if value in x: # year in string of format "yyyy-mm-dd" 
                    row_idx = final_row_indices[ix]
                    filtered_row_indices.append(row_idx)
        else:
            for ix, x in enumerate(results):
                if value == x:
                    row_idx = final_row_indices[ix]
                    filtered_row_indices.append(row_idx)

    # Now we have filtered row indices, collect all meta-rows.
    # NOTE: no pagination for now.. for filtered row_indices.. JUST 1000 for now!
    return jsonify(metaIndex.collect_meta_rows(filtered_row_indices[:1000]))

##app.route("/getMetaStats", methods = ["GET"])
def getMetaStats(request:Request) -> dict:
    """Supposed to return some stats about meta-data indexed, like number of images/text etc."""
    result = metaIndex.get_stats()
    return jsonify(result)

def get_original_cluster_id(person_id):
    """
    Given user provided person_id, we get the corresponding `original_cluster_id`.
    Should be fast enough for most cases, using a cache/dict to speed-up subsequent requests! 
    """
    if ("cluster" in person_id.lower()):
       # cluster is reserved for ML original clusters, so `person_id` is returned as it is.
       return person_id

    assert metaIndex.backend_is_initialized == True

    # TODO: here top-k argument would be useful, since we would looking for only first match for this attribute, value pair.
    # Or can i model such cases more efficiently in the future?
    row_indices = metaIndex.query_generic(
        attribute = "person",
        query = [person_id],
        unique_only = True,
        exact_string_match = True
    )
    
    # user provided data.
    person_user_arr = json.loads(
        mBackend.collect_rows(
            attribute = "person",
            indices = row_indices
        )
    )
    # Ml generated cluster-ids.
    person_ml_arr = json.loads(
        mBackend.collect_rows(
            attribute = "personML",
            indices = row_indices
        )
    )
    # find the corresponding index. and return ML data. (as preview clusters are indexed based on original cluster id)
    assert len(person_ml_arr) == len(person_user_arr)

    idx_i = None
    idx_j = None
    for i,arr in enumerate(person_user_arr):
        for j,x in enumerate(arr):
            if x == person_id:
                idx_i = i
                idx_j = j
                # break on any first match.. as we just needed the `original cluster id`!
                break
    assert not(idx_i is None) and (not idx_j is None)
    return person_ml_arr[idx_i][idx_j]
      
##app.route("/getPreviewPerson/<person_id>", methods = ["GET"])
def getPreviewCluster(r:Request, person_id:str) -> bytes:
    # TODO: have to add a cluster for no detection too... not a priority(i think have added just to incorporate)
    if person_id.lower() == "no_person_detected":
        # TODO: just return a fixed set of bytes like a black image.
        flag, poster = cv2.imencode(".png", np.array([[0,0], [0,0]], dtype = np.uint8))
        raw_data = poster.tobytes()
        del flag, poster
        return Response(raw_data, mimetype = "{}/{}".format("image", "png"))
    else:
        # Do the dance of getting original `corresponding` cluster_id, so that we can retrive the `face preview`
        with global_lock:
            if not(person_id in Cluster_alias):
                original_cluster_id = get_original_cluster_id(person_id)
                Cluster_alias[person_id] = original_cluster_id # for faster subsequent access!
            else:
                original_cluster_id = Cluster_alias[person_id]


            # if Cluster_alias.get(person_id, False):
            #     original_cluster_id = Cluster_alias[person_id]
            # else:
            #     original_cluster_id = get_original_cluster_id(person_id)
            #     Cluster_alias[person_id] = original_cluster_id

        c = faceIndex.get(original_cluster_id)
        png_data = c.preview_data
        del c
        raw_data= base64.b64decode(png_data)
        return Response(raw_data, mimetype = "{}/{}".format("image", "png"))

##app.route("/getfaceBboxIdMapping/<resource_hash>", methods = ["POST"])
def getfaceBboxIdMapping(request:Request, resource_hash:str):
    """
    TODO: its just do much work, to get corresponding face-bbox, by generating bboxes and using the order to much info to sync!
    # TODO map it during the face-indexing itself.. 
    generate/calculate a mapping from bbox to person_ids, for a given resource.
    Returns an array of object/dicts . (with x1,y1,x2,y2, person_id) fields to easily plot bboxes with corresponding person id.
    
    Inputs:
    resource_hash:
    cluster_ids/person_ids:  already assigned during indexing. (client has this information already) 
    """
    
    cluster_ids = request.form.get("cluster_ids").strip("| ").split("|")
    orig_cluster_ids = []    
    for c_id in cluster_ids:
        orig_cluster_ids.append(get_original_cluster_id(c_id))

    # TODO: reading full image data from cache if possible !
    temp_meta = metaIndex.query(resource_hashes = resource_hash)[resource_hash]
    absolute_path = temp_meta["absolute_path"]
    frame = cv2.imread(absolute_path) # bit costly, should come from cache if possible.
    if frame is None:
        return jsonify([])
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
    return jsonify(result) 

##app.route("/ping", methods = ["GET"])
def ping(r:Request) -> bytes:
    """To check the python app/server liveness mainly in an app ecosystem!"""
    return Response("ok", status=200)

##app.route("/getPartitions", methods = ["GET"])
def getPartitions(r:Request) -> Dict[str, str]:
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
            {"location": "LOCAL", "identifier": identifier}
            for identifier in get_drives()
        ]
    else:
        # TODO: test, only a single `/` (root) for Linux should be enough!
        response_data = [
            {"location": "LOCAL", "identifier": "/"}
            ]
    return jsonify(response_data)

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

##app.route("/getSuggestionPath", methods = ["POST"])
def getSuggestionPath(request:Request) -> List[str]:
    """
    To provide suggestions for `local/server`, (generally) during selection of a directory/folder to index!
    NOTE: client must set the `header` as `application/json`, as it expects json-encoded data! 
    """
    post_data:SuggestionPathAttributes
    if isinstance(request.json, str):
        post_data = json.loads(request.json)
    else:
        post_data = request.json

    result:List[str] = []
    if post_data["location"].lower() == "local":
        recreated_path = recreate_local_path(
            post_data["identifier"],
            uri = post_data["uri"]
        )
        # print("Recreated path: ", recreated_path)
        if os.path.exists(recreated_path):
            result = os.listdir(recreated_path)
    return jsonify(result)

def getAllPhotos(request: Request, page_size: int) -> QueryInfo:
    """
    Get all photos in the system with pagination.
    This is the Q (query) part of the pagination pipeline.

    # NOTE: This could be better modelled as a function of `page id`, during `collection/ T ` part of pagination pipeline.
    # But may minor add some `code` in `collect_query_meta` or client should call a different route/function later on!
    # As we would just be sequentially, getting coresponding row_hashes, (i.e no query to condition on!).
    # have to write a minimal T function like `collect_query_meta` which could serve `resource_hashes` and `scores` sequentially through the whole database give a page_id.
    @Akshay finds it cool to be cruising through all the photos, It indeed it cool but it is not yet optimal , but wouldn't matter for local host!

    """
    page_size = int(page_size)
    global query_token_counter
    
    if "X-Session-Key" in request.headers:
        query_token = request.headers["X-Session-Key"]
    else:
        query_token = "notRandomEnoughToken_{}".format(query_token_counter)
        query_token_counter += 1  # don't matter the order, GIL atleast protects concurrent write atleast!
        print("[WARNING]: Pagination Cache will keep growing, need a way to distinguish client to discard older pagination infos! ")

    # remove older pagination data for this client.
    # NOTE: it will invalidate all filter-routines too, as fresh query is assumed. It is in accordance all filter-data is conditioned on the original query!
    pagination_cache.remove(
        query_token,
        only_if_exists = True
        )
       
    if not metaIndex.backend_is_initialized:
        return jsonify({
            "error": True, 
            "details": "Meta index not initialized"
        })
    
    # Get all row indices (all photos in the system)
    # TODO: NOTE: (it is not a solid assumption, as i have to still write a routine to handle wild-card, to return all valid hashes!)
    all_row_indices = list(range(metaIndex.rows_count))
    
    # NOTE: This could be better modelled as a function of `page id`, during `collection/ T ` part of pagination pipeline.
    # As we would just be sequentially, getting coresponding row_hashes, (i.e no query to condition on!).
    s = time.time_ns()
    all_resource_hashes = json.loads(mBackend.collect_rows(
        attribute = "resource_hash",
        indices = all_row_indices
    ))
    print("[getAllPhotos]: Resource hash collection: {} ms".format((time.time_ns() - s) / 1e6))
    
    # Get date fields for sorting
    taken_at_data = json.loads(mBackend.collect_rows(
        attribute = "taken_at",
        indices = all_row_indices
    ))
    
    resource_created_data = json.loads(mBackend.collect_rows(
        attribute = "resource_created", 
        indices = all_row_indices
    ))
    
    # Create sortable tuples: (datetime_obj, row_index, resource_hash)
    sortable_items = []
    for i, (row_idx, hash_val, taken_at, created) in enumerate(
        zip(all_row_indices, all_resource_hashes, taken_at_data, resource_created_data)
    ):
        # Try to parse taken_at first (EXIF datetime)
        photo_date = None
        # Both taken_at and resource_created are simply strings. taken_at is in format "YYYY:MM:DD HH:MM:SS" and resource_created is "YYYY-MM-DD"
        # We can select whichever is available and try to sort by string. We might not need to convert to datetime object.
        if taken_at and taken_at != "null":
            # Get only the date part
            photo_date = taken_at.split(" ")[0]
            time_part = taken_at.split(" ")[1]
            photo_date = photo_date.replace(":", "-", 2)  # Convert "YYYY:MM:DD" to "YYYY-MM-DD"
        elif created and created != "null":
            photo_date = created
        else:
            photo_date = "0000-00-00"  # Fallback for missing dates
            
        # Now change from YYYY-MM-DD to DD-MM-YYYY for correct lexicographical sorting
        y, m, d = photo_date.split("-")
        # Also, let's make sure they are zero-padded
        d = d.zfill(2)
        m = m.zfill(2)
        # photo_date = f"{d}-{m}-{y}"
        photo_date = f"{y}-{m}-{d}"  # Keep in YYYY-MM-DD for correct sorting
        # Let's print for debugging
        # print(f"Photo date for hash {hash_val}: {photo_date}")
        # Let's add time part to ensure correct ordering within the same day
        if taken_at and taken_at != "null":
            photo_date += " " + time_part
        else:
            photo_date += " 00:00:00"
            
        sortable_items.append((photo_date, row_idx, hash_val))
        
    # Sort by date descending (newest first)
    s = time.time_ns()
    sortable_items.sort(key=lambda x: x[0], reverse=True)
    print(f"[getAllPhotos] Sorting: {(time.time_ns() - s) / 1e6} ms")
    
    # Extract sorted data
    sorted_row_indices = [item[1] for item in sortable_items]
    sorted_resource_hashes = [item[2] for item in sortable_items]
    
    
    # Generate pagination info with the correct tuple structure
    n_pages = len(sorted_row_indices) // page_size + (1 if len(sorted_row_indices) % page_size > 0 else 0)
    page_meta = []
    
    # TODO: read description, no need to add resource_hashes in one go for page_meta!!
    for i in range(n_pages):
        start_idx = i * page_size
        end_idx = (i + 1) * page_size
        
        # Follow the same tuple pattern as query_func:
        # (row_indices, resource_hashes, scores)
        page_meta.append(
            (
                sorted_row_indices[start_idx:end_idx],      # row_indices for this page
                sorted_resource_hashes[start_idx:end_idx],  # resource_hashes for this page
                [1.0] * len(sorted_row_indices[start_idx:end_idx])  # scores (all 1.0 since no ranking)
            )
        )
    
    # Store pagination info in cache
    info: PaginationInfo = {
        "token": query_token,
        "page_meta": page_meta
    }
    pagination_cache.add(info)
    
    # Return query info to client
    q_info: QueryInfo = {
        "n_matches": len(sorted_row_indices),
        "n_pages": n_pages,
        "query_token": query_token
    }
    
    return jsonify(q_info)

# -----------------------------
# Extension specific routes/functions!
# ---------------------------
def get_remote_clients(request:Request) -> list[dict]:
    # Get registered clients info for each of the Protocol from corresponding Extension!
    # Should be called to get updated info by the frontend!
    result = []
    for ext in REGISTERED_EXTENSIONS.values():
        result.extend(
            ext.get_registered_clients()
        )
    return jsonify(result)

# ---------------------------------------------

############################################################################

if __name__ == "__main__":
    # want to able to create a sample app here..
    from werkzeug_app import SimpleApp
    from werkzeug.serving import run_simple
    import argparse    
    
    port = 8200
    parser = argparse.ArgumentParser()# Add an argument
    parser.add_argument('--port', type=int, required=False)
    args = parser.parse_args()

    if not(args.port is None):
        port = args.port
    
    # Create a python Object emulating  WSGI app!
    # NOTE: this is just a python object, can  be easily move around, flexible that `flask App` system, which require extra work to split routes into multiple files !! 
    app = SimpleApp(allow_local_cors = True)

    # Combine URL routing with view/controller routines here!
    # NOTE: app will lazily (re)initialize the routing.MAP instance on adding new url rules!
    app.add_url_rule(rule = "/getSuggestion", view_function= getSuggestion, methods = ["POST"])
    app.add_url_rule(rule = "/getMetaStats", view_function=getMetaStats)
    app.add_url_rule(rule = "/query", view_function = query, methods=["POST"])
    app.add_url_rule(rule = "/collectQueryMeta/<token>/<int:page_id>", view_function=collect_query_meta)
    app.add_url_rule(rule = "/getRawDataFull/<resource_hash>", view_function = getRawDataFull)
    app.add_url_rule(rule = "/filterPopulateQuery/<query_token>/<attribute>", view_function=filterPopulateQuery)
    app.add_url_rule(rule = "/filterQueryMeta/<query_token>/<attribute>/<value>", view_function=filterQueryMeta)
    app.add_url_rule(rule = "/getGroup/<attribute>", view_function=getGroup)
    app.add_url_rule(rule = "/getPreviewPerson/<person_id>", view_function = getPreviewCluster)
    # Indexing..
    app.add_url_rule(rule = "/getIndexStatus", view_function = getIndexStatus)
    app.add_url_rule(rule = "/indexCancel", view_function= indexCancel)
    app.add_url_rule(rule = "/indexStart", view_function = indexStart, methods = ["POST"])
    # misc.
    app.add_url_rule(rule = "/getPartitions", view_function=getPartitions)
    app.add_url_rule(rule = "/getSuggestionPath", view_function=getSuggestionPath, methods=["POST"])
    # editing (over-write existing info.)
    app.add_url_rule(rule = "/tagPerson", view_function = tagPerson, methods = ["POST"])
    app.add_url_rule(rule = "/editMetaData", view_function = editMetaData, methods = ["POST"])
    # ping
    app.add_url_rule(rule = "/ping", view_function = ping)
    app.add_url_rule(rule = "/getAllPhotos/<page_size>", view_function = getAllPhotos)

    # -----------------
    # Register Extensions:
    # -------------------
    # Instead may be we can get the `mapping` directly from some parent class!
    sys.path.insert(0,"D://hachi_extensions/images")
    from mtp_windows.mtp_code import MtpExtension
    from google_drive.drive import GoogleDrive
    
    # collect extension instances!
    mtp_extension = MtpExtension()
    gdr_extension = GoogleDrive()
    # For now do it manually!
    # gdr_extension.begin_setup(r = None) # We already have a `token.json`, so it will not start consent process!
    # gdr_extension.finish_setup(r = None)

    # UPDATE THE GLOBAL MAPPING!
    REGISTERED_EXTENSIONS = {
        mtp_extension.get_name(): mtp_extension,
        gdr_extension.get_name(): gdr_extension,
    }
    print("[REGISTERED]: {}".format(REGISTERED_EXTENSIONS))

    # Collect remote clients info , for all protocols!
    app.add_url_rule(
        rule = "/getRemoteClients", 
        view_function = get_remote_clients
    )
    app.register(
        mtp_extension.get_wsgi_app(),
        name = mtp_extension.get_name()
    )
    app.register(
        gdr_extension.get_wsgi_app(),
        name = gdr_extension.get_name()
    )

    # Run the WSGI server, with `app` as underlying WSGI application!
    run_simple(
        hostname = "127.0.0.1",
        port = int(port),
        application = app, # pass our app instance!,
        threaded = True    # handle each request in a new thread or one of the pool threads!
    )