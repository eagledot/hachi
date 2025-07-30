# It will encapsulate indexing of local resources.
# note that.. even for remote data, we first download it temporary, so it will be used for everytime we will index image resources.

from typing import List, Union, Optional, NamedTuple
from collections import namedtuple
import os
import threading
import time
import sys
import traceback
from copy import deepcopy

from .meta_indexV2 import MetaIndex
from .image_index import ImageIndex
from .face_clustering import FaceIndex
from .metadata import extract_image_metaData, collect_resources
from .utils import ChannelConversion, ColorFormat, encode_image, resize

import utils_nim 

import cv2
import numpy as np

# -----------------
# Ml
# ------------------
IMAGE_APP_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
IMAGE_APP_ML_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ml")
IMAGE_EMBEDDING_SIZE = 512  # depends on the model architecture.
TEXT_EMBEDDING_SIZE = 512  # depends on the model architecture.
FACE_EMBEDDING_SIZE = 512   # depends on the model architecture.

sys.path.insert(0, IMAGE_APP_ML_PATH)
import clip_python_module as clip

print("[Debug]: Loading Model, may take a few seconds.")
clip.load_text_transformer(os.path.join(IMAGE_APP_PATH, "data", "ClipTextTransformerV2.bin"))
clip.load_vit_b32Q(os.path.join(IMAGE_APP_PATH, "data", "ClipViTB32V2.bin"))

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
# -------------------------------------------------------------------------------

import hashlib
def generate_resource_hash(resource_data:bytes, chunk_size:int = 400) -> Optional[str]:
    resource_hash = None
    resource_size = len(resource_data)
    if resource_size < chunk_size:
        print("[WARNING]: not enough data to generate hash.. ")
        return None
    m = hashlib.sha256()
    start_bytes = resource_data[:chunk_size]
    end_bytes = resource_data[-1 * int(0.1*resource_size) : ]

    try:
        m.update(start_bytes)
        m.update(end_bytes)
        m.update(str(resource_size).encode("ascii"))
        resource_hash =  m.hexdigest()
    except Exception:
        print("[WARNING]: {}".format(traceback.format_exc()))
    del m
    return resource_hash

def generate_resource_hash_file(resource_path:str, chunk_size:int = 400) ->Optional[str]:
    resource_hash = None
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
            resource_hash =  m.hexdigest()
        except Exception:
            print("[WARNING]: {}".format(traceback.format_exc()))
            pass
        del(m)
    
    return resource_hash
# --------------------------------------------------------------------

# ---------------------
# Databases
# ------------------------
# imageIndex = ImageIndex(shard_size = IMAGE_INDEX_SHARD_SIZE, embedding_size = IMAGE_EMBEDDING_SIZE)
# print("Created Image index")

# metaIndex = MetaIndex()
# print("Created meta Index")

# faceIndex = FaceIndex(embedding_size = FACE_EMBEDDING_SIZE)
# print("Created Face Index")

# -------------------------------------------------------------

def generate_image_preview_new(
    data_hash:str,
    image:np.ndarray,                            # we assume RGB or RGBA data , [H,W,C] format!
    output_folder:os.PathLike,
    tile_size:int = 8   # not more than 16 for now.. we use it also to decide new resize size
    ):

    # NOTE: we expecting data to either in RGB format or RGBA format, TODO: use is_bgr or something like that!
    (height, width, channels) = image.shape
    if channels == 4:
        channel_conversion_info = ChannelConversion.RGBA2BGRA  # RGBA2BGRA
    else:  # or 3
        channel_conversion_info = ChannelConversion.RGB2BGRA

    # Resize
    ratio = height / width
    preview_max_width = 640
    # new_width = min(width, preview_max_width)
    new_width = preview_max_width   # to be divisible by tile_size mostly!
    new_height = int(ratio * new_width)
    new_height = new_height + (tile_size - (new_height % tile_size))  # For now tiling tail logic has not been written, so we make it divisible in the first place!
    # new_height = 480 

    resized_image = resize(
        image,
        new_height = new_height,
        new_width = new_width,
        channel_conversion_info = channel_conversion_info,
        tile_size = tile_size
    )

    # get encoded .webp data!
    encoded_image = encode_image(
        resized_image,
        color_format = ColorFormat.BGRA,
        quality = 90,
        lossless = False,
        meth = 2,         # faster, but with 4-5 % extra size.., thats ok with us! 
    )

    # finally write to disk!
    with open(os.path.join(output_folder, "{}.webp".format(data_hash)), "wb", buffering= 1024 * 1024) as f:
        f.write(encoded_image)
    

def generate_image_preview(
    data_hash:str, 
    image:Union[str, np.ndarray],
    output_folder:os.PathLike):
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
    cv2.imwrite(os.path.join(output_folder,"{}.webp".format(data_hash)), raw_data_resized,[int(cv2.IMWRITE_WEBP_QUALITY),quality])

from enum import Enum
class IndexingStatus(Enum):
    INACTIVE = 0  # no indexing thread active!
    ACTIVE   = 1  # indexing thread is active !
    REQUESTED = 2 # cancellation request has been raised!

from typing import TypedDict
class IndexingInfo(TypedDict):
    done:bool        # if true, client should stop asking status updates, it would mean previous indexing is done.
    processed:Optional[int]  # how many of items for current event has been processed!
    total:Optional[int]      # how many total items for current event has been estimated! 
    eta:Optional[int]  # estimated time for current event. (like indexing a particular directory.. may be not the whole of index!)
    details:str     # latest details if any!

class ReturnInfo(TypedDict):
    error:bool    # If true, then terminating response, use the `details` field to communicate to the user/client !
    details:str

class ProfileInfoNaive(object):
    def __init__(self) -> None:
        self.last_tic:float = time.time()
        self.container = {}
    def reset(self):
        self.container:dict = {}
        self.last_tic = time.time()
    def add(self, key:str):
        assert key != "total", "reserved, so that don't get confused later!"
        if not(key in self.container):
            self.container[key] = 0.00
        cur_time = time.time()
        self.container[key] += (cur_time - self.last_tic)
        self.last_tic = cur_time
    def get_summary(self) -> dict[str, (int, int)]:
        result = {}
        total = 1e-7
        for v in self.container.values():
            total += v
        for k,v  in self.container.items():
            result[k] = (v, int(v/total)*100)
        result["total"] = (total, 100)
        return result

    def __str__(self) -> str:
        result = ""
        summary = self.get_summary()
        for k, (time_taken, percentage) in summary.items():
           result = result + ("{}  |  {}  | {}\n".format(k, time_taken, percentage))  
        return result
    
from queue import Queue
NEW_THREAD_PREVIEW  = True
class QueueData(NamedTuple):
    resource_hash:str
    image:np.ndarray
    is_batch_done:bool
    is_thread_done:bool

class IndexingLocal(object):
    def __init__(self,
                 root_dir:os.PathLike,
                 image_preview_data_path:os.PathLike,         
                 meta_index:MetaIndex,  # meta-data index/database
                 face_index:FaceIndex,  # face_index, embeddings and stuff
                 semantic_index:ImageIndex, # semantic information!

                 batch_size:int = 20,
                 include_subdirectories:bool = True,
                 generate_preview_data:bool  = True ,
                 complete_rescan:bool = False
    
    ) -> None:
        
        assert os.path.exists(root_dir)
        self.root_dir = root_dir        
        self.image_preview_data_path = image_preview_data_path
        self.meta_index:MetaIndex = meta_index
        self.face_index:FaceIndex = face_index
        self.semantic_index:ImageIndex = semantic_index
        
        self.batch_size = batch_size
        self.include_subdirectories = include_subdirectories
        self.generate_preview_data = generate_preview_data
        self.complete_rescan = complete_rescan

        self.lock = threading.RLock()
        self.indexing_status = IndexingStatus.INACTIVE # default

        # private, return a deep-copy when asked for status!
        self.indexing_info = IndexingInfo(
                done = False,
                processed=None,
                total = None,
                eta = None,
                details = "No info.."
                )
        
        self.profile_info = ProfileInfoNaive()
        self.preview_queue = Queue[QueueData](maxsize = 50)  # shouldn't be case of being blocked, due to not being read.. we monitor the progress anyway!
        self.preview_done = Queue[bool](maxsize = 1)

        self.max_image_dimension = 16384
        # NOTE: for now we are bit extra-careful, since this buffer is being written to and read in different threads.. so we are making `copy` before passing to other thread!
        self.imread_buffer = np.empty((self.max_image_dimension * self.max_image_dimension * 4), dtype = np.uint8)
        
    def cancel(self) -> ReturnInfo:
        """Cancel an ongoing indexing,
        If not ongoing, assertion error.
        """
        with self.lock:  # better to use lock, since not atomic and being read by indexing thread!
            assert self.indexing_status == IndexingStatus.ACTIVE, "Must have been called only if indexing was active!, callee must make sure of that."
            self.indexing_status = IndexingStatus.REQUESTED
        
        result:ReturnInfo = {}
        result["details"] = "Cancellation request raised!"
        result["error"] = False
        return result
    
    def __index_batch(
        self,
        resources_batch:List[os.PathLike] # Absolute path!
    ):
        """Actual logic for indexing. This would need to be speed up or benchmarked if ever!
        Batching mainly provides `breakpoints` to collect the `current state/info` for ongoing indexing. (mainly to send back to client).
        NOTe that it not parallel `batching` per se, that is possible but not without huge efforts, currently not enough time!
        """
        
        counter = 0
        for resource_path in resources_batch:
            self.profile_info.add("misc")

            with open(resource_path, "rb") as f:
                image_encoded_data = f.read()
            
            resource_hash = generate_resource_hash(
                image_encoded_data
            )
            self.profile_info.add("hash-generation")
            if resource_hash is None:
                print("Possibly Invalid data for: {}".format(resource_path))
                continue
            
            if self.meta_index.is_indexed(resource_hash):
                print("[Already indexed]: {}".format(resource_path))
                continue

            # read raw-data only once.. and share it for image-clip,face and previews
            self.profile_info.add("misc") # dummy

            # Our imread from stb_image!
            # (flag, (h,w,c)) = utils_nim.imread(resource_path, self.imread_buffer, leave_alpha = True) # RGB , no alpha
            (flag, (h,w,c)) = utils_nim.imread_from_memory(
                image_encoded_data, 
                self.imread_buffer,  # NOTE: must be used sequentially.. not parallel read from it.. we create a copy!
                leave_alpha = True) # RGB , no alpha
            
            self.profile_info.add("imread")
            if flag == False:
                print("[WARNING]: Invalid data for {}".format(resource_path))
                continue
            if c == 1:
                print("[WARNING]: Gray Scale TO BE HANDLED, just update the imread code..!!")
                continue
            frame = self.imread_buffer[:h*w*c].reshape((h,w,c))
            # Since frame itself refers to a pre-allocated memory/buffer, so DON'T SHARE IT WITH ANOTHER THREAD WITH GIL RELEASED without some sync mechanism or create an isolated copy!
            frame = frame.copy()  # creating a copy before passing it another thread.. so write by `imread` wouldn't affect !
            is_bgr = False  # RGB. # TODO: revisit face indexing, i think with RGB, as input, we are generating better clusters!

            # opencv imread!
            # frame = cv2.imread(resource_path)
            # self.profile_info.add("imread")
            # if frame is None:
            #     print("[WARNING]: Invalid data for {}".format(resource_path))
            #     continue
            # is_bgr = True

            # generate image embeddings
            self.profile_info.add("misc")
            image_embedding = generate_image_embedding(image = frame, is_bgr = is_bgr, center_crop=False)
            self.profile_info.add("image-embedding")
            if image_embedding is None: # TODO: it cannot be None, if image-data seemed valid!
                print("Invalid data for {}".format(resource_path))
                continue
            
            self.profile_info.add("misc")
            meta_data = extract_image_metaData(
                resource_path # TODO: even though few bytes are read, get_image_size routine, we can share the 
            )
            self.profile_info.add("extract-metadata")
            if meta_data is None:
                print("skipping..... because of meta-data ....")
                continue  # TO investigate, get_image_size, sometimes, not able to parse?
            # --------------------------------------------
            # Do manual updates, as necessary here.
            meta_data["location"]["identifier"] = "Drive" # TODO: C:, D:
            meta_data["location"]["location"]  = "L"  # local/remote

            # it is supposed to be updated, after clusters finalizing.
            meta_data["ml_attributes"]["personML"] = ["no_person_detected"]
            meta_data["user_attributes"]["person"] = ["no_person_detected"] # by default, same value for `user Person` attribute. (ML info should be copied as it is one default, later user can make changes to it!)
            meta_data["resource_hash"] = resource_hash  # presence of this field, should indicate `is_indexed` by default!
            # -----------------------------------------------

            # TODO: on downloading of remote data, append to the meta-index.
            # downloading should be equivalent to presence of new images, hence check the hash.
            # if not indexed, append it..
            # # merge remote meta-data too if allowed remoted protocol.
            # if remote_protocol == "google_photos":
            #     remote_meta_data = googlePhotos.get_remote_meta(data_hash)
            #     meta_data["remote"] = remote_meta_data  
            #     meta_data["resource_directory"] = "google_photos"
            #     meta_data["absolute_path"] = "remote"
            
            # TODO: either all should complete or no one! must be in sync!
            self.profile_info.add("misc")
            self.meta_index.update(meta_data) # TODO: append instead of update for clearer semantics!
            self.profile_info.add("meta-index-update")
            self.semantic_index.update(resource_hash, data_embedding = image_embedding)
            self.profile_info.add("semantic-index-update")
            self.face_index.update(
                frame = frame,
                absolute_path = resource_path,
                resource_hash = resource_hash,
                is_bgr = is_bgr)
            self.profile_info.add("face-index-update")

            if NEW_THREAD_PREVIEW:
                temp_data = QueueData(
                    resource_hash = resource_hash,
                    image = frame,
                    is_batch_done = False,
                    is_thread_done= False
                )
                self.preview_queue.put(temp_data)
                del temp_data
            else:
                # generate_image_preview(resource_hash, 
                #                     image = frame, 
                #                     output_folder = self.image_preview_data_path)                
                generate_image_preview_new(
                    data_hash = resource_hash,
                    image = frame,
                    output_folder = self.image_preview_data_path
                )
                self.profile_info.add("image-preview-generate")
            counter += 1

        return counter           
        
        # --------------------------------------------------------
        # since batch done, we wait for preview generation to be completed!
        
        # Ok, even if batch is Done.. let's not wait.. to see if preview generation is done or what..
        # instead, just go to the next batch..
        
        # if NEW_THREAD_PREVIEW:
        #     temp_data = QueueData(
        #         resource_hash = None,
        #         image = None,
        #         is_batch_done = True,
        #         is_thread_done= False
        #         )
        #     self.preview_queue.put(temp_data)
        #     del temp_data
        #     while True:
        #         if self.preview_done.get() == True: # we get the signal that previews for this batch are completed!
        #             break
        #         else:
        #             time.sleep(0.02) # 20 ms wait!
        # -------------------------------------------
        
    def indexing_thread(
            self,
            ):
        
        test_count = 0
        self.profile_info.reset()
        try:
            if self.complete_rescan == True:
                # reset/remove old indices data.
                # indexStatus.update_status(client_id, current_directory="", progress = 0, eta = "unknown", details = "Removing Old indices..")
                with self.lock:
                    self.indexing_info["details"] = "Resetting indices.."
                    self.indexing_info["done"] = False
                    self.indexing_info["eta"] = None
                    self.indexing_info["processed"] = None
                    self.indexing_info["total"] = None
                
                # Reset all the indices!
                self.face_index.reset()
                self.semantic_index.reset()
                self.meta_index.reset()

            error_trace = None              # To indicate an un-recoverable or un-assumed error during indexing.            
            exit_parent_loop = False
            resource_mapping_generator = collect_resources(self.root_dir, self.include_subdirectories)
            
            while True:
                current_directory = self.root_dir
                if exit_parent_loop:
                    break
                
                exit_thread = False
                with self.lock:
                    exit_thread = (self.indexing_status == IndexingStatus.REQUESTED)

                if exit_thread:
                    print("Finishing index on cancellation request from user")
                    break
                
                with self.lock:
                    self.indexing_info["details"] = "Scanning: {}".format(current_directory),
                    self.indexing_info["done"] = False
                    self.indexing_info["eta"] = None
                    self.indexing_info["processed"] = None
                    self.indexing_info["total"] = None

                try:
                    resource_mapping = next(resource_mapping_generator)
                    contents = resource_mapping["Image"]
                    if len(contents) == 0:
                        continue
                    current_directory = resource_mapping["directory_processed"]
                except StopIteration:
                    del resource_mapping_generator
                    break

                # process the contents in batches.
                # print("processing: {}".format(current_directory))
                count = 0
                eta = None # unknown!
                while True:
                    contents_batch =  contents[count: count + self.batch_size]  # extract a batch
                    test_count += (len(contents_batch))
                    # contents_batch = [os.path.join(current_directory, x) for x in contents_batch]

                    if (len(contents_batch) == 0):    # should mean this directory has been 
                        break
                    
                    exit_thread = False
                    with self.lock:
                        exit_thread = (self.indexing_status == IndexingStatus.REQUESTED)
                    
                    if exit_thread:
                        # print("yes cancel request is active...")
                        exit_parent_loop = True
                        break

                    # before each batch send the status to client
                    with self.lock:
                        self.indexing_info["details"] = "Indexing {}".format(current_directory)
                        self.indexing_info["done"] = False
                        self.indexing_info["eta"] = eta
                        self.indexing_info["processed"] = count
                        self.indexing_info["total"] = len(contents)
                        
                    tic = time.time()         # start timing for this batch.
                    observed_counter = self.__index_batch(
                        resources_batch = contents_batch,
                        )
                    if observed_counter != len(contents_batch):
                        print("Differnce for: {}".format(len(contents_batch) - observed_counter))
                                    
                    count += len(contents_batch)

                    # calculate eta..
                    dt_dc = (time.time() - tic) / (len(contents_batch) + 1e-5)    # dt/dc
                    eta_in_seconds = dt_dc * (len(contents) - count)                  # eta (rate * remaining images to be indexed.)
                    eta_hrs = eta_in_seconds // 3600
                    eta_minutes = ((eta_in_seconds) - (eta_hrs)*3600 ) // 60
                    eta_seconds = (eta_in_seconds) - (eta_hrs)*3600 - (eta_minutes)*60
                    eta = "{}:{:02}:{:02}".format(int(eta_hrs), int(eta_minutes), int(eta_seconds))

            # Since info is available on finalizing..we now update this info in meta-index!
            with self.lock:
                # TODO: may be use replace to update required fields only!
                self.indexing_info["details"] = "Finalizing Clusters.."
                self.indexing_info["eta"] = None
                self.indexing_info["processed"] = None
                self.indexing_info["total"] = None
                self.indexing_info["done"] = False
                    
            cluster_meta_info = self.face_index.save() # TODO: actually implement save and load on the disk..
            with self.lock:
                self.indexing_info["details"] = "Updating Meta Index .."
                self.indexing_info["eta"] = None
                self.indexing_info["processed"] = None
                self.indexing_info["total"] = None
                self.indexing_info["done"] = False
            
            for resource_hash, cluster_ids in cluster_meta_info.items():
                self.meta_index.modify_meta_ml(resource_hash, 
                                                {"personML": list(cluster_ids)}
                                                )
            
        except Exception:
            error_trace = traceback.format_exc() # uses sys.exception() as the exception
            print("Error: {}".format(error_trace))
        finally:
            with self.lock:
                # indicate error first, so as client can read that.. before trying to save
                self.indexing_info["eta"] = None
                self.indexing_info["processed"] = None
                self.indexing_info["total"] = None
                self.indexing_info["done"] = False
                
                if error_trace is not None:
                    self.indexing_info["details"] = error_trace
                else:
                    try:
                        self.meta_index.save()
                        self.semantic_index.save()
                        # imageIndex.sanity_check()
                        self.indexing_info["details"] = "Indexing Completed Successfully!"
                    except Exception:
                        print(traceback.format_exc())
                        self.indexing_info["details"] = traceback.format_exc
            
            # -------------
            if NEW_THREAD_PREVIEW:
                # signal, that indexing thread is done.. so exit from preview thread.. we wouldn't want zombie thread!
                print("terminating preview generation thread..")
                self.profile_info.add("misc")
                temp_data = QueueData(
                    resource_hash = None,
                    image = None,
                    is_batch_done = True, # don't matter true/false!, thread flag would be read first!
                    is_thread_done= True
                )
                # send signal, to exit the thread, whenever remaining resource-hashes are done!
                self.preview_queue.put(
                    temp_data
                )
                while True:
                    if self.preview_done.get() == True: # it can only be true!
                        break
                    else:
                        time.sleep(0.01)
                # -------------------------------
            self.profile_info.add("prev-generate-wait")

            print("All done..")
            print("Processed estimated: {}".format(test_count))
            self.indexing_info["done"] = True  # terminating response, Client should just display the `details` and stop asking status updates!
            self.indexing_status = IndexingStatus.INACTIVE #(global, so lock) this can/will be read by callee.. to get `indexing status`!
            print(self.profile_info)

    def preview_generation_thread(self):
        """
        A thread to generate image previews, (generally batch-by-batch basis!)
        """
        while True:
            (resource_hash, frame, is_batch_done, is_indexing_thread_done) = self.preview_queue.get()
            if is_indexing_thread_done == True:
                # When parent indexing thread is done.. we will exit out of this thread too!
                assert resource_hash is None
                break
            # elif is_batch_done == True:
            #     assert resource_hash is None
            #     self.preview_done.put(True)  # indicate previews are finished..
            else:
                # generate_image_preview(
                #     data_hash = resource_hash,
                #     image = frame,
                #     output_folder = self.image_preview_data_path
                # )
                assert not (resource_hash is None)
                generate_image_preview_new(
                    data_hash = resource_hash,
                    image = frame,
                    output_folder = self.image_preview_data_path
                )
        self.preview_done.put(True)

    def begin(self) -> ReturnInfo:
        """
        Begin the indexing..
        """
        
        with self.lock:
            assert (self.indexing_status == IndexingStatus.INACTIVE), "Must have been inactive, callee must make sure!"
        
            threading.Thread(target = self.indexing_thread).start()            
            self.indexing_status = IndexingStatus.ACTIVE

            if NEW_THREAD_PREVIEW:
                threading.Thread(target = self.preview_generation_thread).start()
            
        result:ReturnInfo = {}
        result["error"] = False
        result["details"] =  "Indexing started successfully!"
        return result

    def getStatus(self) -> IndexingInfo:
        """
        Get status for an indexing, should also account for cases, where indexing is not currently going.
        In case client loose connection or reload, we should be able to tell more info about on-going indexing!
        Calling this should always return useful info and not panic!
        """
        
        result = None
        with self.lock:
            indexing_status = self.indexing_status
            if (indexing_status == IndexingStatus.INACTIVE):
                return IndexingInfo(
                    done = True,  # terminating response!
                    eta = None,
                    processed = None,
                    total = None,
                    details = self.indexing_info["details"] # read the most-recent details, whatever it was!
                )

            if indexing_status == IndexingStatus.REQUESTED:            
                # details as cancellation has been requested!
                result = IndexingInfo(
                                    details = "Cancellation has been requested by user.. wait for it to complete!",                
                                    eta = None,
                                    processed = None,
                                    total = None,
                                    done = False
                                )
            else:
                # Active indexing, return the `latest` status info!
                result = deepcopy(self.indexing_info) #Even though tuple prevent mutation. (but still keep self private!)
        
        assert result is not None
        return result   

class IndexGooglePhotos(IndexingLocal):
    # TODO:
    def __init__(self, drive: str, uri: List[str], meta_index: MetaIndex, face_index: FaceIndex, semantic_index: ImageIndex) -> None:
        super().__init__(drive, uri, meta_index, face_index, semantic_index)
        # other stuff, i guess!
        self.data_being_downloaded:bool = False

    def beginDownload(self):
        pass

    def cancelDownload(self):
        pass
    
    def cancel(self):
        # TODO: either i make it blocking, hence risk running the timeout.
        # or non-blocking, then client would have to call it again, to be sure if cancellation was successful in the first place!
        # or i provide an id to some `place` where client can keep checking..
        # 
        if self.data_being_downloaded:
            self.cancelDownload()
        else:
            super().cancel()