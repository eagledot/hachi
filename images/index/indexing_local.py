# It will encapsulate indexing of local resources.
# note that.. even for remote data, we first download it temporary, so it will be used for everytime we will index image resources.

from typing import List, Union, Optional, NamedTuple, Any
from collections import namedtuple
import os
import threading
import time
import sys
import traceback
from copy import deepcopy

try:
    from .meta_indexV2 import MetaIndex
    from .image_index import ImageIndex
    from .face_clustering import FaceIndex
    from .metadata import extract_image_metaData, collect_resources
    from .utils import ChannelConversion, ColorFormat, encode_image, resize
except:
    sys.path.insert(0, "D://hachi/images/index")
    from meta_indexV2 import MetaIndex
    from image_index import ImageIndex
    from face_clustering import FaceIndex
    from metadata import extract_image_metaData, collect_resources, ImageMetaAttributes
    from utils import ChannelConversion, ColorFormat, encode_image, resize

sys.path.insert(0, "./nim")
import utils_nim 

import cv2   # TODO: remove dependence on opencv as we have ported almost all of required functionalities!
import numpy as np

# -----------------
# Ml
# ------------------
IMAGE_APP_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
IMAGE_APP_ML_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ml")
IMAGE_EMBEDDING_SIZE = 512  # depends on the model architecture.
TEXT_EMBEDDING_SIZE = 512  # depends on the model architecture.
FACE_EMBEDDING_SIZE = 512   # depends on the model architecture.
CHECKPOINT_COUNT = 4_000      

sys.path.insert(0, IMAGE_APP_ML_PATH)
import clip_python_module as clip

print("[Debug]: Loading Model, may take a few seconds.")
clip.load_text_transformer(os.path.join(IMAGE_APP_PATH, "data", "ClipTextTransformerV2.bin"))
clip.load_vit_b32Q(os.path.join(IMAGE_APP_PATH, "data", "ClipViTB32V2.bin"))

def generate_image_embedding(image:np.ndarray, is_bgr:bool = True, center_crop = False, simulate = False) -> np.ndarray:
    # for simulating, (TODO: better simulation setup, if get time) 
    if simulate:
        return np.random.uniform(size = (1, IMAGE_EMBEDDING_SIZE)).astype(np.float32)

    assert image.flags.c_contiguous == True
    image_features = clip.encode_image(image, is_bgr = is_bgr, center_crop = center_crop)
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
    # m = hashlib.sha256()
    m = hashlib.md5()
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
        self.start_tic:float = time.time()
        self.last_tic:float = time.time()
        self.container = {}
    def reset(self):
        self.container:dict = {}
        self.last_tic = time.time()
        self.start_tic = time.time()
    def add(self, key:str):
        if len(self.container) == 0:
            # after reset or on init!
            self.start_tic = time.time()
            self.last_tic = self.start_tic

        if key == "total": 
            print("reserved, so that don't get confused later!")
            return
    
        if not(key in self.container):
            self.container[key] = 0.00
        cur_time = time.time()
        self.container[key] += (cur_time - self.last_tic)
        self.last_tic = cur_time
    def get_summary(self) -> dict[str, (int, int)]:
        result = {}
        total = (time.time() - self.start_tic + 1e-7)    
        for k,v  in self.container.items():
            result[k] = (v, int(v/total*100))
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
class QueueData(NamedTuple):  # For preview thread, generating previews!
    resource_hash:str
    image:np.ndarray
    is_thread_done:bool

# ------------------------
# Read data from background, as some I/O is involved threading makes sense upto a point, optimal values could be factor of batch_size, selected, but good enough for our use case!
# ---------------------------------------
# Data being put into resource_queue, by background Thread, which is then read by Indexing thread.
# Idea is to define/get such a type from remote extensions too, by asking, keep it a bit cleaner!
class ResourceInfo(TypedDict):
    path:os.PathLike
    raw_data:bytes

# To be returned by `downloading` (read_from_disk_bg) thread, to indexing_thread!
class DownloadingStats(NamedTuple):
    # It should be named as Info instead.
    details:str   # 
    # current_directory:str
    eta_seconds:int
    progress:int   # [0-100]

# Would be run in a thread for each Batch, and then terminated!
def read_from_disk_bg(
        root_dir:os.PathLike,
        include_subdirectories:bool,

        # generally would have a maxsize of `batch_size`, to block, if indexing code turns out to be slow!
        resources_batch_queue:Queue[ResourceInfo],  # queue being filled by this routine!
        resources_signal_queue:Queue[bool], # can be used to signal some commands, for now just letting us know, if batch done , if false, we return!
        resource_type = "Image",
        batch_size = 36
):  
    
    """
    Based on the provided `root_dir`, we scan all the directories(recursive if indicated) to collect all the `Paths`. This seems to be fast-enough with even if a directory have thousands of files.
    Then We read actual raw-data in chunks (batch_size).
    
    We intend to fill a `queue` with a file's raw-data to be later retrieved by `indexing code`, to actually index.
    But it is bit difficult to settle on an abstraction, which works for remote extensions too!
    
    """

    # Supposed to be used inside a thread, to start reading `raw-data` and producing corresponding `Resource-info`, once given a `root-dir` to index!
    resource_mapping_generator = collect_resources(root_dir, include_subdirectories)
    while True:
        try:
            # NOTE: understand that `directory` is a nice-abstraction, we return/yield all `filepaths` for some directory inside `root_dir` at each call.
            # This way we can know `which directory` is being indexed too, but data-reading is costly,  
            resource_mapping = next(resource_mapping_generator)
            contents = resource_mapping[resource_type] # we select desired resource_tye!
            if len(contents) == 0:
                # meaning didn't have any `resources` for desired resource_type in some directory!
                continue
            current_directory = resource_mapping["directory_processed"]

            # READ raw-data and/or required info and keep putting into the queue to be consumed by main Thread!
            n_batches = (len(contents) - 1) // batch_size + 1 
            # print("n batches : {}".format(n_batches))

            remains = len(contents)
            eta_in_seconds = 12 * 3600  # High initial value!
            for i in range(n_batches):
                temp_container:list[ResourceInfo] = []
                for resource_path in contents[i*batch_size : (i+1)*batch_size]:
                    if (os.path.exists(resource_path)):  # NOTE: shouldn't happen, as generator would be calling `os.listDir`!
                        with open(resource_path, "rb") as f:
                            image_raw_data = f.read()
                    else:
                        image_raw_data = None # We still send it, as indicated above!
                    
                    # fill the queue!
                    temp:ResourceInfo = {}
                    temp["path"] = resource_path
                    temp["raw_data"] = image_raw_data
                    temp_container.append(temp)
                    del temp
                    del image_raw_data

                
                if i > 0:
                    # Even next one is ready! we wait for previous batch to be indexed!
                    signal = resources_signal_queue.get()
                    if signal == False:
                        return
                    # Based on the time after we get signal a batch has been indexed, we can estimate eta!
                    dt_dc = (time.time() - tic) / (older_batch_size + 1e-5)
                    remains = remains - older_batch_size
                    eta_in_seconds = dt_dc * (remains) # eta (rate * remaining images to be indexed.)
                
                temp_stats = DownloadingStats(
                    # current_directory = current_directory,
                    details = "Scanning: {}".format(current_directory),
                    eta_seconds = eta_in_seconds,
                    progress = int((len(contents) - remains) / len(contents) * 100)
                )
                assert resources_batch_queue.maxsize == 1, "It should be expecting 1 batch at a time"
                resources_batch_queue.put((True, temp_stats, temp_container))
                curr_batch_size = len(temp_container)
                del temp_container, temp_stats

                tic = time.time() # keeping track until get signal!
                older_batch_size = curr_batch_size

                # ---------------------------
                # Due to current semantics, and maxsize == 1, callee thread may not able to `put` as i > 0 condition is being used.
                # So we consume that most recent `signal` here when last batch.
                # [DETAILED REASON]: Otherwise when indexing more than 1 directories, `i` would be set to zero and batch is generate, but older `signal` would never be read !!
                #------------------------------ 
                if i == n_batches - 1:
                    signal = resources_signal_queue.get()
                    if signal == False:
                        return
                # ------------------------------------
                                   
        except StopIteration:
            del resource_mapping_generator
            resources_batch_queue.put((False, None, [])) # false should indicate to stop reading from the `queue` and no more data to index!!
            break
# -----------------------------------------------------
        
class IndexingLocal(object):
    def __init__(self,
                 root_dir:os.PathLike,
                 image_preview_data_path:os.PathLike,         
                 meta_index:MetaIndex,  # meta-data index/database
                 face_index:FaceIndex,  # face_index, embeddings and stuff
                 semantic_index:ImageIndex, # semantic information!
                
                 batch_size:int = 36,
                 include_subdirectories:bool = True,
                 generate_preview_data:bool  = True ,
                 complete_rescan:bool = False,
                 simulate:bool = False,   # For now it just speed-up image-embedding generation, by generating random embeddings!
                 
                 remote_extension:Any = None # expects root_dir to be None, if it is valid reference!
    ) -> None:
        
        # Local vs Remote
        self.root_dir = root_dir
        self.remote_extension = remote_extension
        if not (self.root_dir is None):
            assert os.path.exists(root_dir)
        else:
            assert not (self.remote_extension is None)
                
        self.image_preview_data_path = image_preview_data_path
        self.meta_index:MetaIndex = meta_index
        self.face_index:FaceIndex = face_index
        self.semantic_index:ImageIndex = semantic_index
        
        self.batch_size = batch_size
        self.include_subdirectories = include_subdirectories
        self.generate_preview_data = generate_preview_data
        self.complete_rescan = complete_rescan
        self.simulate_indexing = simulate

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
    
    def save_checkpoint(self):
        # It is a bit tricky, as face-index need enough data to generate "good" master-embeddings to create better clusters!
        # Only then we will over-write the meta-index for Person info.

        # Then saving all (almost) independent indices to disk in a sequential manner!
        # TODO: introduce already written sanity check code, to be called at the finish of indexing.. to be sure!

        # TODO: all must be synced/saved or none at all
        # call a sanity check before saving.. to detect unexpected corruptness!
        cluster_meta_info = self.face_index.save()  
        for resource_hash, cluster_ids in cluster_meta_info.items():
            self.meta_index.modify_meta_ml(resource_hash, 
                                            {"personML": list(cluster_ids)}
                                            )
        del cluster_meta_info

        # Write to the disk for meta-index and semantic index!
        self.meta_index.save()
        self.semantic_index.save()

    def __index_batch(
        self,
        resources_info:List[ResourceInfo]
        # resources_batch_queue:Queue[tuple[os.PathLike, bytes]],
        # batch_size:int
    ):
        """Actual logic for indexing. This would need to be speed up or benchmarked if ever!
        Batching mainly provides `breakpoints` to collect the `current state/info` for ongoing indexing. (mainly to send back to client).
        NOTe that it not parallel `batching` per se, that is possible but not without huge efforts, currently not enough time!
        """
        
        counter = 0
        # for resource_path in resources_batch:
        batch_size = len(resources_info)
        for i in range(batch_size): # NOTE: batch_size is used to make sure `queue.get` doesn't get blocked, we would have put that number of data into queue. before calling `__index_batch` routine! 
            self.profile_info.add("misc")

            resource_info = resources_info[i]
            if resource_info["raw_data"] is None:
                print("[WARNING]: Read from disk failed due to Non existent Path for {} . Shouldn't have happened.".format(resource_info["resource_path"]))
            
            # ----------------------------------------------
            # Meta-data extraction 
            if not(self.root_dir is None):
                image_raw_data = resource_info["raw_data"]
                resource_path = resource_info["path"]
                resource_hash = generate_resource_hash(
                    image_raw_data
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

                meta_data:ImageMetaAttributes = extract_image_metaData(
                    resource_path
                )

                meta_data["location"]["identifier"] = "Drive" # TODO: C:, D:
                meta_data["location"]["location"]  = "L"  # local/remote
                
            else: # if indexing remote-data !                
                # TODO: collect/overwrite Main Attributes being produced by Extension!
                image_raw_data = resource_info["raw_data"]
                resource_name = resource_info["name"]
                resource_hash = generate_resource_hash(
                    image_raw_data
                )
                self.profile_info.add("hash-generation")
                if resource_hash is None:
                    print("Possibly Invalid data for: {}".format(resource_name))
                    continue
                
                meta_data:ImageMetaAttributes = extract_image_metaData(
                    image_raw_data, dummy_data = False
                )
                # TODO: Properly manually update Main attributes.
                meta_data["main_attributes"]["filename"] = resource_name.lower()
                meta_data["main_attributes"]["resource_directory"] = resource_info["directory"].lower()
                meta_data["main_attributes"]["resource_path"] = resource_info["path"] # Donot lower it, as Full Path, and we generally don't search for full path anyway.
                meta_data["main_attributes"]["resource_created"] = resource_info["created_at"]

                meta_data["location"]["identifier"] = "mtp" # TODO: get name from extension! 
                meta_data["location"]["location"]  = "R"  # local/remote

            self.profile_info.add("extract-metadata")
            if meta_data is None:
                print("skipping..... because of meta-data ....")
                continue  # TO investigate, get_image_size, sometimes, not able to parse?
            # --------------------------------------------
            # Do remaining, manual updates, as necessary here.
            # it is supposed to be updated, after clusters finalizing.
            meta_data["ml_attributes"]["personML"] = ["no_person_detected"]
            meta_data["user_attributes"]["person"] = ["no_person_detected"] # by default, same value for `user Person` attribute. (ML info should be copied as it is one default, later user can make changes to it!)
            meta_data["resource_hash"] = resource_hash  # presence of this field, should indicate `is_indexed` by default!
            
            orientation_image = meta_data["exif_attributes"]["orientation"] # [1-8] or 0 (if was no information about it!)
            
            # TODO: on downloading of remote data, append to the meta-index.
            # downloading should be equivalent to presence of new images, hence check the hash.
            # if not indexed, append it..
            # # merge remote meta-data too if allowed remoted protocol.
            # if remote_protocol == "google_photos":
            #     remote_meta_data = googlePhotos.get_remote_meta(data_hash)
            #     meta_data["remote"] = remote_meta_data  
            #     meta_data["resource_directory"] = "google_photos"
            #     meta_data["absolute_path"] = "remote"

            # -----------------------------------------------
            

            self.profile_info.add("misc")
            # ----------------------------------------------
            # STB image based imread (minimal library, but may handle stuff like orientation by ourselves!)
            # Our imread from stb_image!
            (flag, h,w,c) = utils_nim.imread_from_memory(
                image_raw_data, 
                self.imread_buffer,  # NOTE: must be used sequentially.. not parallel read from it.. we create a copy!
                leave_alpha = True  # RGB , no alpha
            )
            
            self.profile_info.add("imread")
            if flag == False:
                print("[WARNING]: Invalid data for {}".format("{}/{}".format(resource_info["directory"], resource_name)))
                continue
            if c == 1:                              
                print("[WARNING]: Gray Scale TO BE HANDLED, just update the imread code..!!")
                continue
            frame = self.imread_buffer[:h*w*c].reshape((h,w,c))
            
            # -------------------------------------
            # Orientation handling would just be some composition of flip and transpose is some specific order! Can use `np.rot90` like routine which itself does.
            # NOTE: OPEN-cv handles rotation part too, by parsing exif-data, before returning the frame
            # ------------------------------------
            if orientation_image != 0 and orientation_image != 1:
                # NOTE: this doesn't copy the elements, but we would be calling `copy` anyway, so we get contiguous data for following operations.
                if orientation_image == 6:
                    # handle 90 degree, clockwise orientation!
                    frame = np.rot90(
                        frame,
                        k = 1,     # 1 90 degrees turn,
                        axes = (1,0)  # from 1 to 0, i.e clockwise!
                    )
                elif orientation_image == 8:
                    # handles 270 degrees, clockwise orientation.
                    frame = np.rot90(
                        frame,
                        k = 1,
                        axes = (0,1) # from 0 to 1, i.e counter-clockwise
                    )
                else:
                    print("[WARNING]: Implement a basic rotation procedure. Not rotated: {} Got orientation as {}".format(resource_name, orientation_image))
            # ------------------------------------------------
            
            # Since frame itself refers to a pre-allocated memory/buffer, so DON'T SHARE IT WITH ANOTHER THREAD WITH GIL RELEASED without some sync mechanism or create an isolated copy!
            frame = frame.copy()  # creating a copy before passing it another thread.. so write by `imread` wouldn't affect !
            is_bgr = False  # RGB. # TODO: revisit face indexing, i think with RGB, as input, we are generating better clusters!
            # ------------------------------------------------------

            # ---------------------------------------------
            # Alternative to std_image,  opencv imread! (handles orientation/rotation also!)
            # -----------------------------------------
            # frame = cv2.imread(resource_path)
            # self.profile_info.add("imread")
            # if frame is None:
            #     print("[WARNING]: Invalid data for {}".format(resource_path))
            #     continue
            # is_bgr = True
            # -------------------------------------

            # generate image embeddings
            self.profile_info.add("misc")
            image_embedding = generate_image_embedding(
                image = frame, 
                is_bgr = is_bgr, 
                center_crop=False,
                simulate = self.simulate_indexing
                )
            self.profile_info.add("image-embedding")
            if image_embedding is None: # TODO: it cannot be None, if image-data seemed valid!
                print("Invalid data for {}".format(resource_name))
                continue
                        
            # TODO: either all should complete or no one! must be in sync!
            self.profile_info.add("misc")
            self.meta_index.update(meta_data) # TODO: append instead of update for clearer semantics!
            self.profile_info.add("meta-index-update")
            self.semantic_index.update(resource_hash, data_embedding = image_embedding)
            self.profile_info.add("semantic-index-update")
            self.face_index.update(
                frame = frame,
                absolute_path = "{}/{}".format(meta_data["main_attributes"]["resource_directory"], meta_data["main_attributes"]["filename"]),
                resource_hash = resource_hash,
                is_bgr = is_bgr)
            self.profile_info.add("face-index-update")

            if NEW_THREAD_PREVIEW:
                temp_data = QueueData(
                    resource_hash = resource_hash,
                    image = frame,
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

    def indexing_thread(
            self,
            ):
        
        index_count = 0
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

            # -------------------------
            # Start downloading (in the background prefer-ably)
            # ---------------
            error_trace = None              # To indicate an un-recoverable or un-assumed error during indexing.            
            resources_queue = None
            signal_queue = None
            if not (self.root_dir is None):
                (resources_queue, signal_queue) = self.start_download()
            else:
                (resources_queue, signal_queue) = self.remote_extension.start_download()
            
            count = 0
            while True:
                exit_thread = False
                with self.lock:
                    exit_thread = (self.indexing_status == IndexingStatus.REQUESTED)

                if exit_thread:
                    try:
                        signal_queue.put(False, timeout = 10)
                    except:
                        print("[ERROR]: Timeout occured on signal queue, either busy or some bug!")
                        signal_queue = None
                    print("Finishing index on cancellation request from user")
                    break
                
                # Get downloading Stats, and resources info conditioned on a directory! 
                # print("[DEBUG]: waitiing...")
                (flag, downloading_stats, resources_info) = resources_queue.get()
                if flag == False:
                    # No more data to index, here we assume `downloading thread` exited cleanly, so no more communication should be required with that thread!!
                    break
                some_info, eta_seconds, progress_percentage = downloading_stats
                assert progress_percentage <= 100
                # Based on progress, we can convert it to normalized (count, total stats!)
                count = progress_percentage
                total = 100

                # Process/Index the batch!
                self.__index_batch(
                    resources_info
                )

                # print("[DEBUG]: recent info: {}".format(some_info))
                signal_queue.put(True) # Signal that batch is done, helps generate ETA!
                # print("[DEBUG]: sent signal ")

                eta_hrs = eta_seconds // 3600
                eta_minutes = ((eta_seconds) - (eta_hrs)*3600 ) // 60
                eta_seconds = (eta_seconds) - (eta_hrs)*3600 - (eta_minutes)*60
                eta = "{}:{:02}:{:02}".format(int(eta_hrs), int(eta_minutes), int(eta_seconds))

                # update the info.. client could read it!
                with self.lock:
                    # self.indexing_info["details"] = "Indexing {}".format(current_directory)
                    self.indexing_info["details"] = some_info
                    self.indexing_info["done"] = False
                    self.indexing_info["eta"] = eta
                    self.indexing_info["processed"] = count
                    self.indexing_info["total"] = total
                    del some_info
                
                # Save checkpoints, if makes sense!
                if index_count >= CHECKPOINT_COUNT:
                    self.indexing_info["details"] = "Saving Checkpoint..."
                    self.indexing_info["eta"] = None

                    self.save_checkpoint()
                    index_count = 0
                    print("[DEBUG]: Indexing Count: {}".format(index_count))
                # ----------------------------------------
                
                
                
            # Since info is available on finalizing..we now update this info in meta-index!
            with self.lock:
                # TODO: may be use replace to update required fields only!
                self.indexing_info["details"] = "Finalizing Clusters.."
                self.indexing_info["eta"] = None
                self.indexing_info["processed"] = None
                self.indexing_info["total"] = None
                self.indexing_info["done"] = False
            
        except Exception:
            # TODO: to send signal to terminate preview-thread too,
            # may be a dedicated function to finish cleaning up!
            error_trace = traceback.format_exc() # uses sys.exception() as the exception
            print("Error: {}".format(error_trace))
            if not (signal_queue is None):
                try:
                    # TODO: test it, should work, since maxsize == 1, if somewhere bug, may block!
                    signal_queue.put(False, timeout = 10) # supposed to be read, if bg disk read is running!
                except:
                    print("Signal queue didn't respond, Don't care!")
                finally:
                    signal_queue = None
        finally:
            with self.lock:
                # Clean/close up pending resources.

                # ------------------------------------
                # IF exception occured, we would have send the signal to `downloading thread`,
                # else we assume `downloading thread` exited cleanly, and freed/finished the resources!
                if signal_queue:
                    signal_queue = None
                if resources_queue:
                    resources_queue = None 
                # -------------------------------------------------------------
                    
                # ------------------------------------------------------------------
                # Clean up `preview generation thread`
                if NEW_THREAD_PREVIEW:
                    # signal, that indexing thread is done.. so exit from preview thread.. we wouldn't want zombie thread!
                    print("terminating preview generation thread..")
                    self.profile_info.add("misc")
                    temp_data = QueueData(
                        resource_hash = None,
                        image = None,
                        is_thread_done= True
                    )
                    # send signal to the `preview-generation` thread to terminate after generating remaining previews!
                    self.preview_queue.put(
                        temp_data
                    )
                    while True:
                        if self.preview_done.get() == True: # it can only be true!
                            break
                        else:
                            time.sleep(0.01)
                self.profile_info.add("prev-generate-wait")
                # ----------------------------------------------
                
                # indicate error first, so as client can read that.. before trying to save
                self.indexing_info["eta"] = None
                self.indexing_info["processed"] = None
                self.indexing_info["total"] = None
                self.indexing_info["done"] = False
                
                if error_trace is not None:
                    self.indexing_info["details"] = error_trace
                else:
                    try:
                        self.indexing_info["details"] = "Saving Checkpoints..."
                        self.save_checkpoint() # TODO: may be introduce a sanity_check too! 
                        # # imageIndex.sanity_check()
                        
                        self.meta_index.sync_secondary_index = True  # indicate to sync secondary index, at querying too!

                        self.indexing_info["details"] = "Indexing Completed Successfully!"
                    except Exception:
                        print(traceback.format_exc())
                        self.indexing_info["details"] = traceback.format_exc
            
            print("All done..")
            self.indexing_info["done"] = True  # terminating response, Client should just display the `details` and stop asking status updates!
            self.indexing_status = IndexingStatus.INACTIVE #(global, so lock) this can/will be read by callee.. to get `indexing status`!
            print(self.profile_info)

    def preview_generation_thread(self):
        """
        A thread to generate image previews, (generally batch-by-batch basis!)
        """
        while True:
            (resource_hash, frame, is_indexing_thread_done) = self.preview_queue.get()
            if is_indexing_thread_done == True:
                # This mean indexing thread is done, no more data would be there to generate previews!
                assert resource_hash is None
                break
            else:
                assert not (resource_hash is None)
                generate_image_preview_new(
                    data_hash = resource_hash,
                    image = frame,
                    output_folder = self.image_preview_data_path
                )
        self.preview_done.put(True)
    
    def start_download(self) -> tuple[Queue, Queue]:
        # Supposed to return 2 Queue like interface to `indexing thread/code`!
        # 1. To request new data to index!
        # 2. To communicate with thread by `putting` `commands` from the `indexing thread` and `reading` it in the `downloading` thread!
        
        # Represents Info about a batch of `resources` to be indexed!
        q1:Queue[tuple[bool, DownloadingStats, list[ResourceInfo]]] = Queue(maxsize = 1) # 1 meaning 1 batch at max, batch_size could be set during start!
        # maxsize = 1, this helps us to predict ETA, as `reading` would be blocked!
        q2:Queue[bool] = Queue(maxsize = 1)

        threading.Thread(target = read_from_disk_bg,
            args = (
            self.root_dir,
            self.include_subdirectories,
            q1,
            q2,
            "Image",  # resource-type
            self.batch_size
        )).start()
        return (q1, q2)
    
    def begin(self) -> ReturnInfo:
        """
        Begin the indexing.
        We Start an `indexing thread` and `preview generation thread`.
        """
        
        with self.lock:
            assert (self.indexing_status == IndexingStatus.INACTIVE), "Must have been inactive, callee must make sure!"
            
            threading.Thread(target = self.indexing_thread).start()            
            self.indexing_status = IndexingStatus.ACTIVE

            # TODO: may be let the `indexing_thread` should start it!
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

if __name__ == "__main__":
    pass

    # Running it as a script for quick testing/debugging without calling server.!
    # THIS would be main `indexing code`.
    IMAGE_PREVIEW_DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../static", "preview_image") # letting frontend proxy like caddy, serve the previews instead...
    IMAGE_INDEX_SHARD_SIZE = 10_000    # Good default!
    
    # Note: this also starrs a background thread.. in case you forget (will act as daemon even after provided root directory is finished)!
    imageIndex = ImageIndex(shard_size = IMAGE_INDEX_SHARD_SIZE, embedding_size = IMAGE_EMBEDDING_SIZE)
    print("Created Image index")

    metaIndex = MetaIndex()
    print("Created meta Index")

    faceIndex = FaceIndex(embedding_size = FACE_EMBEDDING_SIZE)
    print("Created Face Index")

    index_obj = IndexingLocal(
                root_dir = "D://akshay/rotated_photos",
                image_preview_data_path = IMAGE_PREVIEW_DATA_PATH,
                meta_index = metaIndex,
                face_index = faceIndex,
                semantic_index = imageIndex,
                complete_rescan = True,
                simulate =True,
                batch_size = 16
            )        
    index_obj.begin()

