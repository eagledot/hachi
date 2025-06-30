# It will encapsulate indexing of local resources.
# note that.. even for remote data, we first download it temporary, so it will be used for everytime we will index image resources.

from typing import List, Union, Optional
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
def generate_data_hash(resource_path:str, chunk_size:int = 400) -> str | None:
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

def generate_image_preview(
    data_hash:str, 
    image:Union[str, np.ndarray], 
    face_bboxes:Optional[List[List[int]]], 
    person_ids:List[str],
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
        if not(key in self.container):
            self.container[key] = 0.00
        cur_time = time.time()
        self.container[key] += (cur_time - self.last_tic)
        self.last_tic = cur_time
    
    def __str__(self) -> str:
        result = ""
        total = 1e-7
        for v in self.container.values():
            total += v
        for k,v  in self.container.items():
            result = result + ("{}:\t{}\t{}%\n".format(k,int(v), int(v/total * 100)))
        return result
    
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
        
        for resource_path in resources_batch:
            self.profile_info.add("misc")
            resource_hash = generate_data_hash(
                resource_path
            )
            self.profile_info.add("hash-generation")
            if resource_hash is None:
                print("Possibly Invalid data for: {}".format(resource_path))
                continue
            
            if self.meta_index.is_indexed(resource_hash):
                return

            # read raw-data only once.. and share it for image-clip,face and previews
            self.profile_info.add("misc") # dummy
            frame = cv2.imread(resource_path)
            self.profile_info.add("imread")
            if frame is None:
                print("[WARNING]: Invalid data for {}".format(resource_path))
                continue
            is_bgr = True

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
            self.profile_info.add("extra-metadata")
            if meta_data is None:
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
                is_bgr = True)
            self.profile_info.add("face-index-update")           
            generate_image_preview(resource_hash, 
                                image = frame, 
                                face_bboxes = None, 
                                person_ids=[],
                                output_folder = self.image_preview_data_path)                
            self.profile_info.add("image-preview-generate")           

        
    def indexing_thread(
            self,
            ):
        
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
                    self.__index_batch(
                        resources_batch = contents_batch,
                        )
                                    
                    count += len(contents_batch)

                    # calculate eta..
                    dt_dc = (time.time() - tic) / (len(contents_batch) + 1e-5)    # dt/dc
                    eta_in_seconds = dt_dc * (len(contents) - count)                  # eta (rate * remaining images to be indexed.)
                    eta_hrs = eta_in_seconds // 3600
                    eta_minutes = ((eta_in_seconds) - (eta_hrs)*3600 ) // 60
                    eta_seconds = (eta_in_seconds) - (eta_hrs)*3600 - (eta_minutes)*60
                    eta = "{}:{:02}:{:02}".format(int(eta_hrs), int(eta_minutes), int(eta_seconds))
                    print(eta)


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
                                                {"personML": list(cluster_ids)}, 
                                                force = True)
            
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
                    self.indexing_info["done"] = True  # terminating response, Client should just display the `details` and stop asking status updates!
                    self.indexing_status = IndexingStatus.INACTIVE
                    
                else:
                    try:
                        self.meta_index.save()
                        self.semantic_index.save()
                        # imageIndex.sanity_check()
                        self.indexing_info["details"] = "Indexing Completed Successfully!"
                    except Exception:
                        print(traceback.format_exc())
                        self.indexing_info["details"] = traceback.format_exc
                    finally:
                        self.indexing_info["done"] = True  # terminating response, Client should just display the `details` and stop asking status updates!
                        self.indexing_status = IndexingStatus.INACTIVE
                        print("All done..")
            print(self.profile_info)

    def begin(self) -> ReturnInfo:
        """
        Begin the indexing..
        """
        
        with self.lock:
            assert (self.indexing_status == IndexingStatus.INACTIVE), "Must have been inactive, callee must make sure!"
        
            threading.Thread(target = self.indexing_thread).start()            
            self.indexing_status = IndexingStatus.ACTIVE
            
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