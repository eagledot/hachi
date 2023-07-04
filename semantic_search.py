SHARD_SIZE = 4000
MAX_FACES_COUNT = 10
FACE_MATCHING_THRESHOLD = 1.32
SEMANTIC_MATCHING_PROBABILITY = 0.0001
FACE_EMBEDDING_SIZE = 512
CLIP_EMBEDDING_SIZE = 512
IMAGE_HASH_SIZE = 8
SHARD_PREFIX = "IMG_SHARD"
IMAGE_INDEX_DIRECTORY = "./image_indices"
ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".png", ".jpeg"]

VIDEO_INDEX_DIRECTORY = "./video_indices"
ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mkv", ".avi"]
MAX_FRAMES_INDEXED = 20000

YOUTUBE_VIDEOS_DIRECTORY = "./youtube_videos"
PIXEL_VARIANCE_THRESHOLD = 60
USE_YOUTUBE_AS_PLAYBACK_SOURCE = False

DIR_SCANNING_DEPTH = 4                         # recursive depth upto a which a directory can be scanned, to collect images/videos. 1 means only current directory.

import os
import base64
import binascii
import time
from typing import List, Optional, Union
from collections import OrderedDict
import pickle
import imghdr
from queue import Queue
from threading import Thread
import threading
import uuid
import datetime
import random
import sys

from flask import Flask, session
import flask
import numpy as np
import cv2

import clip_python_module as clip
from utils import create_video_hash, softmax_np, VideoCaptureBasic, get_frame_variance, ImageDataCache

DEBUG = True
EXTRA_FEATURES = False
if EXTRA_FEATURES:
    from utils_extra import (
        generate_new_prompt,
        deduplicate,
        get_face_embedding,
        get_frame_types,
        get_most_similiar_indices_scores,
        update_blur_scores,
        get_corrupt_photo_features,
    )


# index_progress_queue = Queue(maxsize=50)
# global_mapping = {}
# GLOBAL_MAPPING_MAX_SIZE = 400
global_thread_status = {}

indexStatusDict = {}   # global dict, mapping an endpoint to videoIndexing progress.
indexStatusDictLock = threading.RLock()  # https://docs.python.org/3/library/threading.html#rlock-objects

def scan_dir_recursively(root:str, depth:int, start_count:int = 0, file_extensions:list[str] = ALLOWED_IMAGE_EXTENSIONS):
    """ Scans the directory recursively upto depth argument."""
    ## Inputs:
        # root: root path to the directory.
        # depth: adjustable depth, default 1, i.e only current directory, with no sub-directories scanning.
        # start_count: to keep track of current depth.
    
    root = os.path.abspath(root)
    result = []
    if not os.path.exists(root):
        print("{} Path doesn't exist on this SYSTEM".format({}))
        return result
        
    try:
        for item in os.scandir(root):
            if os.path.isfile(item) and  os.path.splitext(item)[1].lower() in file_extensions:
                result = result + [os.path.join(root, item)]
            if os.path.isdir(item):
                if (start_count + 1) >= depth:
                    continue
                else:
                    result = result + scan_dir_recursively(root = os.path.join(root, item), depth = depth, start_count = start_count + 1, file_extensions= file_extensions)
    except:
        print("Error occured while scanning: {}".format(root))
    return result

def scan_dir(dirpath:str, recursive:bool = False, file_extensions: list[str] = ALLOWED_IMAGE_EXTENSIONS) -> List[str]:
    # scan the given dirpath, to look for images files.
    # returns the list of image paths, that can be scanned.
    depth = 1
    if recursive:
        depth = DIR_SCANNING_DEPTH
    return scan_dir_recursively(root = dirpath, depth = depth, start_count= 0, file_extensions=file_extensions)


def check_image_data(image_path: str) -> bool:

    if imghdr.what(image_path) is None:
        return False
    else:
        return True


def generate_hash(image_path: str) -> Optional[str]:

    if check_image_data(image_path):
        return create_video_hash(image_path)
    else:
        print("Corrupt data for: {}".format(image_path))
        return None


def hash_2_nparray(hash_hex: str):
    assert len(hash_hex) == 64
    hash_bytes = binascii.a2b_hex(hash_hex)
    assert len(hash_bytes) == 32
    arr = np.frombuffer(hash_bytes, dtype=np.float32)
    return arr


def nparray_2_hash(arr):
    assert arr.shape == (8,)
    hex_digest = arr.tobytes().hex()
    assert len(hex_digest) == 64
    return hex_digest


def parse_query(query: str):

    query_data = query.strip().lower().split(";")

    def parse_faceids(data: str):
        face_ids = []

        temp_ids = data.strip().replace(",", " ").split(" ")
        for temp_id in temp_ids:
            if "@" in temp_id:
                face_ids.append(str(temp_id.split("@")[1]))

        if len(face_ids) == 0:
            return None
        else:
            return face_ids

    def parse_semantic_query(data: str):
        if "@" in data:
            return None
        else:
            return data

    if len(query_data) == 1:

        if "@" in query_data[0]:
            semantic_query = None
            face_ids = parse_faceids(query_data[0])
        else:
            semantic_query = parse_semantic_query(query_data[0])
            face_ids = None
    elif len(query_data) == 2:
        if "@" in query_data[0]:
            semantic_query = parse_semantic_query(query_data[1])
            face_ids = parse_faceids(query_data[0])
        else:
            semantic_query = parse_semantic_query(query_data[0])
            face_ids = parse_faceids(query_data[1])
    else:
        if DEBUG:
            print("Could not parse query properly, assuming semantic query.")
        semantic_query = query
        face_ids = None

    return (semantic_query, face_ids)


class ImageIndex(object):
    """Encapsulates the full Image index"""

    def __init__(
        self,
        index_path: str = IMAGE_INDEX_DIRECTORY,
        shard_size: int = SHARD_SIZE,
        clip_embedding_size: int = CLIP_EMBEDDING_SIZE,
        face_embedding_size: int = FACE_EMBEDDING_SIZE,
    ):

        if os.path.exists(IMAGE_INDEX_DIRECTORY) == False:
            if DEBUG:
                print(
                    "[DEBUG]: Creating a directory to store IMAGES' indices aka .idx files"
                )
            os.mkdir(IMAGE_INDEX_DIRECTORY)

        assert os.path.exists(index_path)
        self.index_directory = index_path
        self.shard_size = SHARD_SIZE
        self.clip_embedding_size = clip_embedding_size
        self.face_embedding_size = face_embedding_size
        self.face_database = {}

        self.hash2path = {}
        if os.path.exists(os.path.join(index_path, "hash2path.pkl")):
            with open(os.path.join(index_path, "hash2path.pkl"), "rb") as f:
                self.hash2path = pickle.load(f)

        temp_shard_files_prefix = []
        for item in os.listdir(IMAGE_INDEX_DIRECTORY):
            if ".idx" in item:
                temp_shard_files_prefix.append(os.path.splitext(item)[0])

        if len(temp_shard_files_prefix) > 0:
            curr_shard_suffix = int(
                (
                    sorted(
                        temp_shard_files_prefix,
                        key=lambda x: int(x.strip().split("_")[-1]),
                    )[-1]
                ).split("_")[-1]
            )
            curr_shard_idx = self.hash2path["CURR_SHARD_IDX"]
            if DEBUG:
                print("Initialized shard: ")
        else:
            curr_shard_suffix = 0
            curr_shard_idx = 0
            self.hash2path["CURR_SHARD_IDX"] = 0

        self.current_shard_path = os.path.join(
            IMAGE_INDEX_DIRECTORY, "{}_{}.idx".format(SHARD_PREFIX, curr_shard_suffix)
        )
        self.current_shard_suffix = curr_shard_suffix

        if curr_shard_idx == 0:
            self.current_shard = np.empty(
                (
                    self.shard_size,
                    self.clip_embedding_size
                    + IMAGE_HASH_SIZE
                    + 1
                    + (MAX_FACES_COUNT * self.face_embedding_size),
                ),
                dtype=np.float32,
            )
        else:
            with open(self.current_shard_path, "rb") as f:
                self.current_shard = np.load(f)

        if os.path.exists(os.path.join(IMAGE_INDEX_DIRECTORY, "face_database.pkl")):
            with open(
                os.path.join(IMAGE_INDEX_DIRECTORY, "face_database.pkl"), "rb"
            ) as f:
                self.face_database = pickle.load(f)
        print("[DEBUG]: {} Images processed upto now.".format(len(self.hash2path) - 1))

    def update_face_database(self, id: int, embedding):

        if self.face_database.get(id):
            print("Overwriting the existing id: {}".format(id))
        self.face_database[id] = embedding

    def query_face_embeddings(self, face_embeddings, face_ids: List[str]):

        reference_embeddings = np.concatenate(
            [self.face_database[i].reshape((1, -1)) for i in face_ids], axis=0
        )
        N = face_embeddings.shape[0]
        temp_output = np.ones([N, 2 * MAX_FACES_COUNT], dtype=np.float32) * 9
        for i in range(N):
            face_count = int(face_embeddings[i, 0])

            for j in range(face_count):

                t1 = face_embeddings[
                    i : i + 1,
                    1
                    + (j * self.face_embedding_size) : 1
                    + (j + 1) * self.face_embedding_size,
                ]
                temp_comparison = np.sum(np.square(reference_embeddings - t1), axis=-1)

                temp_score = np.min(temp_comparison)
                temp_index = np.argmin(temp_comparison)

                temp_output[i, j] = temp_score
                temp_output[i, MAX_FACES_COUNT + j] = temp_index

        return temp_output

    def append_embedding(
        self, image_hash: str, semantic_embedding, face_embeddings=None
    ):
        temp_idx = self.hash2path["CURR_SHARD_IDX"]
        self.current_shard[temp_idx, : self.clip_embedding_size] = semantic_embedding
        self.current_shard[
            temp_idx,
            self.clip_embedding_size : (self.clip_embedding_size + IMAGE_HASH_SIZE),
        ] = hash_2_nparray(image_hash)

        array_ix = self.clip_embedding_size + IMAGE_HASH_SIZE
        if face_embeddings is not None:
            self.current_shard[temp_idx, array_ix] = face_embeddings.shape[0]
            array_ix += 1
            for i, embedding in enumerate(face_embeddings):
                self.current_shard[
                    temp_idx, array_ix : array_ix + self.face_embedding_size
                ] = embedding
                array_ix += self.face_embedding_size
        else:
            self.current_shard[temp_idx, array_ix] = 0

        temp_idx += 1
        if temp_idx >= self.shard_size:
            if DEBUG:
                print("Saving current shard: {}".format(self.current_shard_path))
            with open(self.current_shard_path, "wb") as f:
                np.save(f, self.current_shard)

            self.current_shard_suffix += 1
            self.current_shard = np.empty(
                (
                    self.shard_size,
                    self.clip_embedding_size
                    + IMAGE_HASH_SIZE
                    + 1
                    + (MAX_FACES_COUNT * self.face_embedding_size),
                ),
                dtype=np.float32,
            )
            self.current_shard_path = os.path.join(
                IMAGE_INDEX_DIRECTORY,
                "{}_{}.idx".format(SHARD_PREFIX, self.current_shard_suffix),
            )

            with open(self.current_shard_path, "wb") as f:
                np.save(f, self.current_shard)
            if DEBUG:
                print("Created new shard: {}".format(self.current_shard_path))

        self.hash2path["CURR_SHARD_IDX"] = temp_idx % SHARD_SIZE

    def query(
        self,
        semantic_query: Optional[str],
        shard_suffix: int,
        shard_idx: int,
        top_k: int,
        ids: Optional[List[int]] = None,
    ):

        if shard_suffix == self.current_shard_suffix:
            temp_data = self.current_shard[:shard_idx, :]
        else:
            with open(
                os.path.join(
                    IMAGE_INDEX_DIRECTORY,
                    "{}_{}.idx".format(SHARD_PREFIX, shard_suffix),
                ),
                "rb",
            ) as f:
                temp_data = np.load(f)[:shard_idx, :]

        temp_hash2score = OrderedDict()
        if semantic_query is not None:
            text_features = clip.encode_text(semantic_query)
            image_features = temp_data[:, : self.clip_embedding_size]
            similiarity = np.matmul(image_features, text_features.transpose()).ravel()
            semantic_indices = np.argsort(similiarity, axis=0)[::-1][:top_k]
            semantic_scores = similiarity[semantic_indices]
            semantic_probs = softmax_np(semantic_scores, axis=0)

            image_hashes = [
                nparray_2_hash(
                    temp_data[
                        ix,
                        self.clip_embedding_size : (
                            self.clip_embedding_size + IMAGE_HASH_SIZE
                        ),
                    ]
                )
                for ix in semantic_indices
            ]

            for h, s, p in zip(image_hashes, semantic_scores, semantic_probs):
                if p > SEMANTIC_MATCHING_PROBABILITY:

                    temp_hash2score[h] = s

            del semantic_indices
            del semantic_probs
            del similiarity

        if ids is not None:

            face_ids = list(
                filter(lambda x: True if x in self.face_database else False, ids)
            )

            if len(face_ids) > 0:

                indices = np.array(
                    [i for i in range(temp_data.shape[0])], dtype=np.int64
                )
                face_features = temp_data[
                    :, self.clip_embedding_size + IMAGE_HASH_SIZE :
                ][indices]
                temp_output = self.query_face_embeddings(
                    face_embeddings=face_features, face_ids=face_ids
                )
                face_scores = np.min(temp_output[:, :MAX_FACES_COUNT], axis=-1)
                face_indices = indices[face_scores < FACE_MATCHING_THRESHOLD]
                face_scores = face_scores[face_indices]
                face_image_hashes = [
                    nparray_2_hash(
                        temp_data[
                            ix,
                            self.clip_embedding_size : (
                                self.clip_embedding_size + IMAGE_HASH_SIZE
                            ),
                        ]
                    )
                    for ix in face_indices
                ]

                for h, s in zip(face_image_hashes, face_scores):
                    if temp_hash2score.get(h):

                        temp_hash2score[h] += 1.5 - s
                    else:

                        temp_hash2score[h] = 1.5 - s

                del indices
                del face_indices
                del face_scores
                del temp_data

        scores = [temp_hash2score[k] for k in temp_hash2score.keys()]
        image_hashes = [k for k in temp_hash2score.keys()]

        return (scores, image_hashes)

    def process_dir(self, dirpath: str, statusEndpoint:str, recursive:bool = True):

        image_files = scan_dir(dirpath, recursive = recursive, file_extensions=ALLOWED_IMAGE_EXTENSIONS)
        image_total_count = len(image_files)
        image_curr_count = 0

        for image_file in image_files:

            # indicate progress/eta syncing with a common index dictionary.
            progress = str((image_curr_count / (image_total_count + 1e-5)))
            eta = "unknown"  # TODO: later calculate it too...
            with indexStatusDictLock:  # acquire and release the lock based on the context.
                if indexStatusDict.get(statusEndpoint):
                    indexStatusDict[statusEndpoint]["eta"] = eta
                    indexStatusDict[statusEndpoint]["progress"] = progress
            
            temp_hash = generate_hash(os.path.join(dirpath, image_file))
            if temp_hash is None:
                image_curr_count += 1
                continue
            else:
                if self.hash2path.get(temp_hash):
                    image_curr_count += 1
                    continue

                temp_path = os.path.abspath(os.path.join(dirpath, image_file))
                self.hash2path[temp_hash] = temp_path

                image_data = cv2.imread(temp_path)
                image_features = clip.encode_image(
                    image_data, is_bgr=True, center_crop=False
                )
                if EXTRA_FEATURES:
                    face_features = get_face_embedding(
                        image_data,
                        is_bgr=True,
                        conf_threshold=0.85,
                        embedding_dim=FACE_EMBEDDING_SIZE,
                    )
                    face_features = face_features[:MAX_FACES_COUNT, :]
                else:
                    face_features = None
                image_index.append_embedding(
                    image_hash=temp_hash,
                    semantic_embedding=image_features,
                    face_embeddings=face_features,
                )
                image_curr_count += 1

        with open(os.path.join(IMAGE_INDEX_DIRECTORY, "hash2path.pkl"), "wb") as f:
            pickle.dump(self.hash2path, f)

        with open(image_index.current_shard_path, "wb") as f:
            np.save(f, image_index.current_shard)

        # Indexing done.
        with indexStatusDictLock:  # acquire and release the lock based on the context.
            if indexStatusDict.get(statusEndpoint):
                indexStatusDict[statusEndpoint]["done"] = True
                indexStatusDict[statusEndpoint]["eta"] = str(int(0))
                indexStatusDict[statusEndpoint]["progress"] = str(int(1))
        
    def faceIds(self):
        return list(self.face_database.keys())


class VideoIndex:
    """Encapsulates the Full Video Index. Allowing easy querying, and update the database/Index."""

    def __init__(self, embedding_size: int = CLIP_EMBEDDING_SIZE) -> None:

        if os.path.exists(VIDEO_INDEX_DIRECTORY) == False:
            if DEBUG:
                print(
                    "[DEBUG]: Creating a directory to store IMAGES' indices aka .idx files"
                )
            os.mkdir(VIDEO_INDEX_DIRECTORY)

        self.hash2path = {}
        temp_path = os.path.join(VIDEO_INDEX_DIRECTORY, "hash2path.pkl")
        if os.path.exists(temp_path):
            with open(temp_path, "rb") as f:
                self.hash2path = pickle.load(f)
        self.embedding_size = embedding_size

        print("{} Videos Indexed So far.".format(len(self.hash2path)))

        if EXTRA_FEATURES:
            self.corrupt_photo_features = get_corrupt_photo_features()

    def query(
        self,
        query: str,
        video_hash: str,
        top_k: int,
        use_augmented_prompt: bool = True,
        context: int = 1,
    ):

        idx_file_path = "{}.idx".format(video_hash)
        with open(os.path.join(VIDEO_INDEX_DIRECTORY, idx_file_path), "rb") as f:
            idx_data = np.load(f)

        text_features = clip.encode_text(query)
        if EXTRA_FEATURES and use_augmented_prompt:
            augmented_prompt = generate_new_prompt(query)
            text_features_augmented = clip.encode_text(augmented_prompt)

        scores_0 = np.matmul(
            idx_data[:, : self.embedding_size], text_features.transpose()
        ).ravel()
        if EXTRA_FEATURES:
            indices, scores_0 = get_most_similiar_indices_scores(
                scores_0, top_k=top_k, context=context
            )
        else:
            indices = np.argsort(scores_0)[::-1][:top_k]
            scores_0 = scores_0[indices]
        scores_0_orig = scores_0

        scores_0 = softmax_np(scores_0, axis=0)
        frame_indices_0 = idx_data[:, -3][indices].ravel()
        playback_pos_0 = idx_data[:, -2][indices].ravel()

        if EXTRA_FEATURES:
            blur_scores_0 = idx_data[:, -1][indices].ravel()
            scores_0_orig = scores_0_orig * blur_scores_0

        if EXTRA_FEATURES and use_augmented_prompt:
            scores_1 = np.matmul(
                idx_data[:, : self.embedding_size], text_features_augmented.transpose()
            ).ravel()
            indices, scores_1 = get_most_similiar_indices_scores(
                scores_1, top_k=top_k, context=context
            )
            scores_1_orig = scores_1

            scores_1 = softmax_np(scores_1, axis=0)
            frame_indices_1 = idx_data[:, -3][indices].ravel()
            playback_pos_1 = idx_data[:, -2][indices].ravel()
            blur_scores_1 = idx_data[:, -1][indices].ravel()

            blur_scores_1 = idx_data[:, -1][indices].ravel()
            scores_1_orig = scores_1_orig * blur_scores_1

            scores = np.concatenate([scores_0, scores_1], axis=0)
            scores_orig = np.concatenate([scores_0_orig, scores_1_orig], axis=0)

            sorted_indices = np.argsort(scores)[::-1]

            scores = scores[sorted_indices]
            scores_orig = scores_orig[sorted_indices]

            frame_indices = np.concatenate([frame_indices_0, frame_indices_1], axis=0)[
                sorted_indices
            ]
            playback_pos = np.concatenate([playback_pos_0, playback_pos_1], axis=0)[
                sorted_indices
            ]
            new_indices = np.array(
                deduplicate(list(frame_indices.ravel())), dtype=np.int64
            )
        else:
            scores = scores_0
            scores_orig = scores_0_orig
            sorted_indices = np.argsort(scores)[::-1]
            scores_orig = scores[sorted_indices]
            frame_indices = (frame_indices_0)[sorted_indices]
            playback_pos = (playback_pos_0)[sorted_indices]
            new_indices = np.arange(start=0, stop=len(frame_indices), step=1)

        del idx_data

        scores = scores_orig[new_indices][:top_k]
        playback_pos = playback_pos[new_indices][:top_k]
        frame_indices = frame_indices[new_indices][:top_k]

        return (scores, frame_indices, playback_pos)

    def process_video(
        self,
        video_hash: str,
        video_absolute_path: str,
        frames_to_skip: int,
        statusEndpoint: str
    ):
        
        tempEndpoint = statusEndpoint
        index_array = np.empty(
            (MAX_FRAMES_INDEXED, self.embedding_size + 3), dtype=np.float32
        )
        cap = VideoCaptureBasic(
            video_path=video_absolute_path, frames_to_skip=frames_to_skip
        )
        image_features_count = 0

        tic = time.time()
        
        while True:
            ret, frame, frame_num, playback_pos = cap.read(bgr = True)
            if ret == True:
                image_features = clip.encode_image(
                    frame, is_bgr=True, center_crop=False
                )
                index_array[
                    image_features_count, : self.embedding_size
                ] = image_features
                

                index_array[
                    image_features_count,
                    self.embedding_size : self.embedding_size + 2,
                ] = np.array([frame_num, playback_pos]).astype("float32")

                image_features_count += 1

                if image_features_count >= MAX_FRAMES_INDEXED:
                    reason = "Index database limit reached."
                    break

                eta = ((time.time() - tic) / image_features_count) * (
                    min(cap.num_frames / frames_to_skip, MAX_FRAMES_INDEXED)
                    - image_features_count
                )
                eta = str(datetime.timedelta(seconds=eta))
                progress = str(frame_num / cap.num_frames)
                
                with indexStatusDictLock:  # acquire and release the lock based on the context.
                    if indexStatusDict.get(tempEndpoint):
                        indexStatusDict[tempEndpoint]["eta"] = eta
                        indexStatusDict[tempEndpoint]["progress"] = progress
                    else:
                        indexStatusDict[tempEndpoint] = {"eta":eta, "progress":progress}

            else:
                break

        if EXTRA_FEATURES:
            update_blur_scores(
                index_array[:image_features_count, :], self.corrupt_photo_features
            )

        with open(
            os.path.join(VIDEO_INDEX_DIRECTORY, "{}.idx".format(video_hash)), "wb"
        ) as f:
            np.save(f, index_array[:image_features_count, :])

        self.hash2path[video_hash] = video_absolute_path
        with open(os.path.join(VIDEO_INDEX_DIRECTORY, "hash2path.pkl"), "wb") as f:
            pickle.dump(self.hash2path, f)

        with indexStatusDictLock:  # acquire and release the lock based on the context.
            indexStatusDict[tempEndpoint] = {"done":True, "eta":str(int(0)), "progress":str(int(1))}

        print("[DEBUG]: {} Index created successfully".format(video_hash))


def get_video_data(
    query: str,
    status_queue,
    data_queue,
    client_id,
    top_k: int = 3,
    context_window: int = 1,
):

    query, _ = parse_query(query)

    stop_thread = False
    video_hashes = video_index.hash2path.keys()
    for video_hash in video_hashes:
        if stop_thread:
            break

        frame_scores, frame_indices, _ = video_index.query(
            query, video_hash, top_k, context=context_window
        )

        video_path = video_index.hash2path[video_hash]
        if os.path.exists(video_path):

            cap = VideoCaptureBasic(video_path)
            for i, ix in enumerate(frame_indices):
                if status_queue.empty() == False:
                    if status_queue.get() == "STOP_THREAD":
                        stop_thread = True
                        break
                frame = cap.read_specific_frame(ix, bgr=True)

                temp_std = get_frame_variance(frame)
                if temp_std < PIXEL_VARIANCE_THRESHOLD:
                    continue

                img_data = cv2.imencode(".jpg", frame)[1].tobytes()
                img_data = "data:image/jpg;base64, {}".format(
                    base64.b64encode(img_data).decode("utf-8")
                )

                if data_queue.qsize() == (data_queue.maxsize - 1):
                    print(
                        "[DEBUG]: Data queue is full, breaking and aborting this thread. One way to mitigate this to increase the size of queue."
                    )
                    stop_thread = True
                    break
                data_queue.put(
                    (
                        False,
                        frame_scores[i],
                        img_data,
                        "{}_{}".format(video_hash, int(ix)),
                    )
                )
        else:
            continue

    data_queue.put((True, None, None, None))
    global_thread_status[client_id] = None
    if DEBUG:
        print("Video Thread DONE.")


app = Flask(__name__, static_folder=None, static_url_path=None, template_folder=None)
app.secret_key = "erasdfgaodfwopaspgglphngdhgpsw"


@app.route("/getIndexCount/<media>")
def getIndexCount(media):
    if media.strip() == "video":
        return flask.jsonify({"index_count": "{}".format(len(video_index.hash2path))})
    else:
        return flask.jsonify(
            {"index_count": "{}".format(max(0, len(image_index.hash2path) - 1))}
        )

@app.route("/indexStatus/<endpoint>")
def indexStatus(endpoint):
    # a route to allow a client to check for indexing status, conditioned on the endpoint. Endpoint may simple by a video/image hash.
    # it works by reading from indexStatusDict, a shared dictionary. with endpoint as key.
    # NOTE: we don't pop endpoint key from indexStatusDict, because client may reload, or need to call multiple times this endpoint.
    # NOTE: it is valid for a SERVER SESSION.

    global indexStatusDict
    result = {"status_available":False, "done":False, "eta":"unknown", "progress":"0"} # read active state on the client side.
    with indexStatusDictLock: # acquire and release based on the context.
        if indexStatusDict.get(endpoint, False):   # it would be available if indexing has started for this endpoint in current session.            
            result["status_available"] = True
            result["done"] = indexStatusDict[endpoint]["done"]
            result["eta"] = indexStatusDict[endpoint]["eta"]
            result["progress"] = indexStatusDict[endpoint]["progress"]
    return flask.jsonify(result)


@app.route("/indexImageDir", methods=["POST"])
def indexImageDir():
    """
    Start indexing all the images in an image directory, based on the POST arguments.
    By default, it would index the subdirectories too, upto MAX_DEPTH.
    Indexing status can be checked based on a specific endpoint generated for this directory.
    """
    global indexStatusDict, indexStatusDictLock

    status = {"success": False, "reason": "unknown"}
    if flask.request.form.get("image_directory_path"):
        temp_path = flask.request.form.get("image_directory_path")
        temp_path = os.path.abspath(temp_path)
        
        if os.path.exists(temp_path):
            # statusEndpoint = generate_hash(temp_path) # generate endpoint for this directory.
            statusEndpoint = temp_path.replace("/", "-")
            statusEndpoint = statusEndpoint.replace('\\',"-")
           
            index_done_or_active = False
            with indexStatusDictLock:
                if indexStatusDict.get(statusEndpoint, False):
                    index_done_or_active = True  #either is active, and was indexed during this sesssion. both are valid states for client to call to endpoint.

            if not index_done_or_active:
                # run the process of indexing image directory in the separate thread.
                def something(image_dir_path:str, statusEndpoint:str):
                    image_index.process_dir(image_dir_path, statusEndpoint = statusEndpoint)
                Thread(target= something, args = (temp_path, statusEndpoint)).start()
                with indexStatusDictLock:
                    indexStatusDict[statusEndpoint] = {"done":False,"eta":"unknown","progress":str(int(0))}  

                status["success"] = True
                status["statusEndpoint"] = statusEndpoint # this can be queried by client.
        else:
            status["reason"] = "{} path doesnot exist on server side".format(temp_path)
    
    return status   


@app.route("/updateDatabase", methods=["POST"])
def updateDatabase():

    face_id = flask.request.form.get("id")
    image_type = flask.request.form.get("mimetype").split("/")[1]
    image_data_files = flask.request.files

    if EXTRA_FEATURES:
        result = {"success": False, "reason": "unknown"}
        for key in image_data_files.keys():
            buffer = image_data_files[key].read()
            img_arr = cv2.imdecode(
                np.frombuffer(buffer, dtype=np.uint8), cv2.IMREAD_COLOR
            )
            del buffer

            if img_arr is not None and img_arr.shape[2] == 3:

                face_embedding = get_face_embedding(
                    img_arr,
                    is_bgr=True,
                    conf_threshold=0.85,
                    embedding_dim=FACE_EMBEDDING_SIZE,
                )
                if face_embedding.shape[0] > 0:

                    image_index.face_database[face_id] = face_embedding[0]

                    with open(
                        os.path.join(IMAGE_INDEX_DIRECTORY, "face_database.pkl"), "wb"
                    ) as f:
                        pickle.dump(image_index.face_database, f)
                    result["success"] = True
                    result[
                        "reason"
                    ] = "database updated successfully for face_id: {}".format(face_id)
                else:
                    result["reason"] = "Could not detect any face"
            else:
                result[
                    "reason"
                ] = "Could not decode image data, make sure valid colored image."
    else:
        result = {"success": False, "reason": "Face Recognition not available"}
    return result


@app.route("/faceIds", methods=["GET"])
def get_faceIds():
    return flask.jsonify({"face_ids": image_index.faceIds()})

client_2_imageDataCache = {}  # global shared dictionary. should be accessed using locks.
client_2_imageDataCacheLock = threading.RLock()  # for now used only be getimagebinary data.

def get_the_data(query:str, top_k:int, cache_generation_id:str):
    """query the imageIndex based on the query arguments and return top-k best matching results.
    #Inputs:
        # query: string
        # top_k:int  
    """


    # this would be a generator
    shard_idx = image_index.hash2path["CURR_SHARD_IDX"]
    shard_suffix = image_index.current_shard_suffix
    semantic_query, face_ids = parse_query(query)

    temp_cache = ImageDataCache() # a threadsafe cache, generated for each new generator. 
    with client_2_imageDataCacheLock:
        client_2_imageDataCache[cache_generation_id] = temp_cache

    for i in range(shard_suffix + 1):

        if (i != shard_suffix):
            meta_data = image_index.query(semantic_query = semantic_query, shard_suffix = i, shard_idx = image_index.shard_size, top_k = top_k, ids = face_ids)
        else:
            meta_data = image_index.query(semantic_query = semantic_query, shard_suffix = i, shard_idx = shard_idx, top_k = top_k, ids = face_ids)
        
        scores, image_hashes = meta_data
        absolute_paths = [image_index.hash2path[x] for x in image_hashes]
        
        temp_cache.put(hashes = image_hashes, absolute_paths = absolute_paths)

        yield (scores, image_hashes)
        
@app.route("/imageBinaryData/<image_hash>/<data_generation_id>")
def imageBinaryData(image_hash:str, data_generation_id:str):

    with client_2_imageDataCacheLock:
        tempCache = client_2_imageDataCache[data_generation_id]
    data, data_type = tempCache.get(image_hash)
    return flask.Response(data , mimetype= "image/{}".format(data_type))


@app.route("/search/<media>", methods = ["POST"])
def search_new(media:str, top_k:int = 3):
    
    if media.strip() not in ["video","image"]:
        return "Bad request"
    
    # create a new generator, for this specific request and for this client.
    top_k_temp = flask.request.form.get("topk")
    if top_k_temp != None:
        top_k = int(top_k_temp)
 
    text_query = flask.request.form.get("text_query").strip().lower()

    if not flask.request.form.get("data_generation_id", False):
        data_generation_id = uuid.uuid4().hex  # client is requesting a fresh request !!
        with client_2_dataGeneratorLock:
            # atomic transaction, one iteration of generator would be done completely.
            assert data_generation_id not in client_2_dataGenerator
            client_2_dataGenerator[data_generation_id] = get_the_data(query = text_query, top_k= top_k, cache_generation_id = data_generation_id)
            result = next(client_2_dataGenerator[data_generation_id], ())
            if len(result) == 0:
                #send a flag to not to continue, Done with this request.
                temp = client_2_dataGenerator.pop(data_generation_id)
                del temp
    else:
        data_generation_id = flask.request.form.get("data_generation_id")
        with client_2_dataGeneratorLock:
            # should be atomic transactions !! (getting and updating generator without any interruption, once acquire the lock)
            if client_2_dataGenerator.get(data_generation_id, False):
                result = next(client_2_dataGenerator[data_generation_id], ()) 
                if len(result) == 0:
                    #send a flag to not to continue, Done with this request.
                    temp = client_2_dataGenerator.pop(data_generation_id)
                    del temp
    
    if len(result) == 0:
        return flask.jsonify({
            "scores":None,
            "local_hashes":None,
            "query_completed": True
        })
                
    else:
        scores, hashes = result
        return flask.jsonify({
            "scores":[str(x) for x in scores],
            "local_hashes":hashes,
            "data_generation_id":data_generation_id,
            "query_completed": False
        })


@app.route("/get_full_image/<local_hash>", methods=["GET"])
def get_full_image(local_hash):
    if "_" in local_hash:

        frame_index = int(local_hash.split("_")[1])
        video_hash = local_hash.split("_")[0]

        video_path = video_index.hash2path.get(video_hash)
        if video_path and os.path.exists(video_path):
            temp_cap = VideoCaptureBasic(video_path)
            frame = temp_cap.read_specific_frame(frame_index, bgr=True)
            img_data = cv2.imencode(".jpg", frame)[1].tobytes()
            return flask.Response(img_data, mimetype="image/jpg")
        else:
            return "Not found"
    else:
        temp_path = image_index.hash2path.get(local_hash, False)
        if temp_path and os.path.exists(temp_path):
            image_data = open(temp_path, "rb").read()
            return flask.Response(
                image_data, mimetype="image/{}".format(imghdr.what(temp_path))
            )
        else:
            print("[debug]: Could not locate {}".format(local_hash))
            return "not found"

@app.route("/get_bboxes/<local_hash>",methods = ["GET"])
def get_bboxes(local_hash):
    result = "to be implemented.."
    return result

@app.route("/tag_face/<local_hash>/<index>/<face_id>")
def tag_face(local_hash, index, face_id):
    result = "To be implemented..."
    return result

@app.route("/get_full_path/<local_hash>")
def get_full_image_path(local_hash):
    if "_" not in local_hash:
        temp_path = image_index.hash2path.get(local_hash, False)
        if temp_path and os.path.exists(temp_path):
            return temp_path
        else:
            print("[debug]: Could not locate {}".format(local_hash))
            return "not found"


TEMPORARY_HASH_2_PATH = {}
client_2_dataGenerator = {}     # shared dict mapping a client to dataGenerator to allow data streaming.
client_2_dataGeneratorLock = threading.RLock() # a lock, to allow clean access from multiple threads.

def generate_metadata_videos(video_directory:str, recursive:bool):
    """ A generator to generate  meta-data for videos,  one generator is mapped to an id in a shared dictionary.
        Can be called from multiple threads, hence equivalent to streaming this meta-data.
    """

    temp = {}
    for item in scan_dir(dirpath= video_directory, recursive= recursive, file_extensions= ALLOWED_VIDEO_EXTENSIONS):
        video_directory = os.path.dirname(item)
        temp_path = os.path.abspath(os.path.join(video_directory, item))
        # extra code to make sure that file being read is a valid video file.
        temp_cap = VideoCaptureBasic(video_path = temp_path)
        temp_frame_count = temp_cap.num_frames
        if int(temp_frame_count) == 0:
            print("[Debug]: {} Doesnot seem like a valid video file".format(temp_path))
            del temp_cap
            continue
        
        temp_hash = create_video_hash(temp_path)
        if temp_hash is None:
            continue
        
        TEMPORARY_HASH_2_PATH[temp_hash] = temp_path

        index_available = False
        if video_index.hash2path.get(temp_hash, False):
            index_available = True
        
        # TODO: check this code later to make sure this works as intended !!
        youtube_id = None
        if USE_YOUTUBE_AS_PLAYBACK_SOURCE == True:
            # if video_directory provided is the YOUTUBE_VIDEOS directory... return the corresponding youtube_id as well.
            if video_directory == os.path.abspath(YOUTUBE_VIDEOS_DIRECTORY):
                with open(os.path.join(YOUTUBE_VIDEOS_DIRECTORY, "hash2youtubeId.pkl"), "rb") as f:
                    temp_dict = pickle.load(f)
                    if temp_dict.get(temp_hash, False):
                        youtube_id = temp_dict[temp_hash]

        temp = {
                    "video_hash":temp_hash, 
                    "index_available": index_available,
                    "video_title": os.path.basename(item),
                    "video_absolute_path":temp_path,
                    "video_directory":video_directory, # os specific path...to resolve any os PATH conflicts..
                    "youtube_id":youtube_id,
                    "status_endpoint":temp_hash        # for now using video_hash as a valid endpoint. (assuming single client, may collision if multiple clients has a same video)
                    }
        yield temp

@app.route("/videos", methods=["POST"])
def videos():
    """
    Returns meta-data for each of the video , based on video_directory received in the Post request.
    NOTE: For now, response is not streamed, and client has to wait until all of the meta-data is collected.
    """

    result = []
    video_directory = flask.request.form.get("video_directory")
    video_directory = os.path.abspath(video_directory)
    recursive = False
    if flask.request.form.get("include_subdirectories", False):
        if flask.request.form["include_subdirectories"].strip().lower() == "true":
            recursive = True
    if os.path.exists(video_directory):
        
        if not flask.request.form.get("data_generation_id", False):
            data_generation_id = uuid.uuid4().hex  # client is requesting a fresh request !!
            with client_2_dataGeneratorLock:
                client_2_dataGenerator[data_generation_id] = generate_metadata_videos(video_directory=video_directory, recursive=recursive)
                result = next(client_2_dataGenerator[data_generation_id], -1)
        else:
            data_generation_id = flask.request.form.get("data_generation_id")
            with client_2_dataGeneratorLock:
                result = next(client_2_dataGenerator[data_generation_id], {}) 
        
        if len(result) == 0:
            #send a flag to not to continue, Done with this request.
            result["flag"] = False
            with client_2_dataGeneratorLock:
                temp = client_2_dataGenerator.pop(data_generation_id)
                del temp
        else:
            result["data_generation_id"] = data_generation_id
            result["flag"] = True
    
    return flask.jsonify(result)


@app.route("/videoIndex", methods=["POST"])
def videoIndex(frames_to_skip: int = 10):
    """
    Creates a new <video_hash.idx> file in VIDEO_INDEX_DIRECTORY, if not already indexed.
    NOTE: this would take some time(minutes) to create the index, depending upon the video length.
    Since flask routes are threaded, this should not block other threads.
    Also progress topic is supposed to be subscribed by client to show an index progress.
    """

    reason = ""
    video_absolute_path = flask.request.form.get("video_absolute_path").strip()

    if not os.path.exists(video_absolute_path):
        return flask.jsonify({"success"})  #TODO: better debugging response.

    video_hash = create_video_hash(video_absolute_path)
    if video_hash is None:
        return flask.jsonify(
            {
                "success": False,
                "reason": "Could not create hash, probably invalid video data or file too short for indexing",
            }
        )

    statusEndpoint = "{}".format(video_hash)  # just using a video-hash is enough for index checking endpoint !

    if video_index.hash2path.get(video_hash, False):
        return flask.jsonify(
            {
            "success":"true",
            "reason":"already indexed",
            "video_hash":video_hash,
            "statusEndpoint":statusEndpoint # so that client can request this endpoint to know its indexing status.
            })

    def something(video_hash, video_absolute_path, frames_to_skip, endpoint):
        video_index.process_video(video_hash, video_absolute_path = video_absolute_path, frames_to_skip = frames_to_skip, statusEndpoint = endpoint)
    
    index_done_or_active = False
    with indexStatusDictLock:
        if indexStatusDict.get(statusEndpoint, False):
            index_done_or_active = True
    
    if not index_done_or_active:
        # push video_indexing process to a different thread.
        temp_thread  = Thread(target = something, args = (video_hash, video_absolute_path, frames_to_skip, statusEndpoint))
        temp_thread.start()
        with indexStatusDictLock:  # this can be polled to check
            indexStatusDict[statusEndpoint] = {"active":True, "eta":"unknown","progress":str(int(0))}

    return flask.jsonify(
            {
            "success":"true",
            "reason":reason,
            "video_hash":video_hash,
            "statusEndpoint":statusEndpoint # so that client can request this endpoint to know its indexing status.
            })


@app.route("/videoPoster/<video_hash>.jpg")
def videoPoster(video_hash):

    temp_path = None
    if TEMPORARY_HASH_2_PATH.get(video_hash, False):
        temp_path = TEMPORARY_HASH_2_PATH[video_hash]

    if temp_path and os.path.exists(temp_path):

        temp_cap = VideoCaptureBasic(video_path=temp_path)
        frame = temp_cap.read_specific_frame(
            frame_num=int(temp_cap.num_frames * (random.randint(20, 80) / 100)),
            bgr=True,
        )
        img_byte = cv2.imencode(".jpg", frame)[1].tobytes()
        del temp_cap
        return flask.Response(img_byte, mimetype="image/jpg")
    else:
        return "No data"


def readFrame(cap, frame_count):

    frame = cap.read_specific_frame(frame_num=int(frame_count), bgr=True)

    img_byte = cv2.imencode(".jpg", frame)[1].tobytes()
    return base64.b64encode(img_byte).decode("utf-8")


@app.route("/queryVideo", methods=["POST"])
def queryVideo(top_k: int = 3):
    """Given a text query by client, return the corresponding video frames and playback positions."""
    meta_data = {}
    video_hash = flask.request.form.get("video_hash").strip()
    query = flask.request.form.get("query_text").strip()

    aug_prompt = False
    if flask.request.form.get("aug_prompt").strip().lower() == "true":
        aug_prompt = True

    if video_index.hash2path.get(video_hash, False):
        temp_cap = VideoCaptureBasic(video_index.hash2path[video_hash])
        scores, frame_indices, playback_pos = video_index.query(
            query, video_hash, top_k, use_augmented_prompt=aug_prompt
        )
        meta_data["score"] = [str(x) for x in list(scores.ravel())]
        meta_data["playback_pos"] = [str(x) for x in list(playback_pos.ravel())]
        meta_data["frames"] = [str(x) for x in list(frame_indices.ravel())]
        meta_data["data"] = [
            readFrame(temp_cap, x) for x in list(frame_indices.ravel())
        ]
    else:
        print(
            "[DEBUG]: Could not find video_path for video_hash: {} Probably a bug".format(
                video_hash
            )
        )

    return flask.jsonify({"meta_data": meta_data})


print("[Debug]: Loading Model, may take a few seconds.")
clip.load_text_transformer("./data/ClipTextTransformer.bin")
# TODO: On Linux, for now quantized model is not being Used, due to 2 different version of ONEDNN are needed.
# TODO: open an Issue with detailed instructions to download and put both v2 and v2 in LDD PATH. and then use Quantized module.
clip.load_vit_b32Q("./data/ClipViTB32.bin")


print("[DEBUG]: Loading Image index")
image_index = ImageIndex()
print("face ids: ", image_index.faceIds())

print("[DEBUG]: Loading Video Index")
video_index = VideoIndex()

if __name__ == "__main__":
    port = 8200

    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=False)
    args = parser.parse_args()

    if args.port is not None:
        port = args.port

    app.run(host="127.0.0.1", port=port)
