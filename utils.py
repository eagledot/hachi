import numpy as np
from typing import List, Union
import os
import hashlib
from queue import Queue

import cv2

PIXEL_VARIANCE_THRESHOLD = 60  # < 255, higher value would lead to agressive filtering.

def softmax_np(arr, axis: int):
    max_arr = np.max(arr, axis=axis, keepdims=True)
    temp = np.exp(arr - max_arr)
    sum_temp = np.sum(temp, axis=axis, keepdims=True)
    return temp / (1e-5 + sum_temp)


def create_video_hash(video_path: str, chunk_size: int = 400) -> Union[None, str]:

    video_hash = None
    if os.path.exists(video_path):
        f = open(video_path, "rb")
        file_size = os.stat(video_path).st_size
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

            video_hash = m.hexdigest()
        except:
            pass
        del m

    return video_hash


class VideoCaptureBasic(object):
    fps = 0
    num_frames = 0

    def __init__(self: int, video_path: str, frames_to_skip: int = 0):
        self.cap = cv2.VideoCapture(video_path)
        self.num_frames = self.cap.get(cv2.CAP_PROP_FRAME_COUNT)
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        self.current_frame_idx = 0
        self.frames_to_skip = frames_to_skip
        fps = self.fps
        num_frames = self.num_frames

    def read(self, bgr=True):
        """Supposed to be compatible with opencv VideoCapture.read(), but can skip frames based on self.frames_to_skip value.

        Returns: a tuple with 4 values (ret), where first argument indicates, if a frame has been read successfully or not.
        """
        
        for _ in range(self.frames_to_skip):
            ret = self.cap.grab()         # just grab the raw-encoded data, donot decode the frame. i.e cap.retrieve()
            if ret == False:
                return (False, None, None, None)  # (ret, frame, frame_index, pos_seconds)
            else:
                self.current_frame_idx += 1
        
        ret, frame = self.cap.read()
        self.current_frame_idx += 1
        pos_seconds = self.cap.get(cv2.CAP_PROP_POS_MSEC) / 1000

        if ret and not bgr:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        return (ret, frame, self.current_frame_idx, pos_seconds)

    def read_specific_frame(self, frame_num: int, bgr=False, use_seek:bool = True):
        """Returns None, if a frame cannot be read for any reason, i.e because of invalid frame_num, otherwise a frame [HWC] uint8 data.

        frame_num: a specific frame_num, should be [1, FRAME_COUNT], if invalid a None would be returned.
        bgr: Flag to indicate if we want BGR data, if True would return BGR data, otherwise RGB.
        """

        ret = False
        frame = None
        prop_set = self.cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num - 1)
        if prop_set:
            ret, frame = self.cap.read()
            if not ret:
                frame = None

            # reset to original state MUST BE done to be in sync, if to use read and read_specific frame for a particular capture object.
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, self.current_frame_idx)
        
        if ret and (not bgr):
            return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        return frame       
    
    def get_pos_seconds(self):
        #TO REMOVE THIS..
        """Returns current playback position in seconds. Works good enough!
        # NOTE: We first actually have to read a frame using cap.read(), to get best-guess playback position, rather than directly calling cv2.CAP_PROP_POS_MSEC.
        """

        return self.cap.get(cv2.CAP_PROP_POS_MSEC) / 1000

        # prop_set = self.cap.set(self.current_frame_idx)  # this is a seeek operation right !!
        # if prop_set:
        #     return self.cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
        # # if self.read_specific_frame(frame_num=self.current_frame_idx) is not None:
        # #     return self.cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
        # else:
        #     return None


def get_frame_variance(frame, pixel_count: int = 100) -> float:
    """returns calculated variance for randomly selected pixels from the image.

    frame: Numpy array, representing image data [H,W,3] Uint8 values.
    pixel_count: number of pixels to use to calculate variance.

    """
    H = frame.shape[0]
    W = frame.shape[1]
    C = frame.shape[2]

    pixel_count = min(H * W, pixel_count)
    temp_std = []
    for i in range(7):
        temp_std.append(
            np.std(
                [
                    np.sum(
                        (frame.reshape((-1))[(x * C) : (x + 1) * C]).astype(np.float32)
                    )
                    for x in np.random.randint(low=0, high=H * W, size=pixel_count)
                ]
            )
        )
    return np.mean(temp_std)


# A cache like interface, that would allow a user to put some task/data.
# Similiar Cache can be used for video/audio/text data as well. easier to update/modify.
import threading
from collections import OrderedDict
import time
import imghdr

class ImageDataCache(object):
    """A cache/storage which should be able to fill itself, concurrently.    
    Should WORK as an INTERFACE allowing any kind of task to done asynchronously but transparently, using only standard library tools.
    Could be modelled better in case of pure multithreading, but for python this works good enoug
    """
    
    def __init__(self, cache_size = 50):        
        # appropriate data-structures:
        self.cache_size = cache_size 
        self.cache = OrderedDict()
        self.cache_lock = threading.RLock()
        self.lock = threading.RLock()

    def fulfill_tasks(self, hashes:list[str], absolute_paths:list[str]):
        # this function definition would vary  based on the task you want to done.

        for hash,absolute_path in zip(hashes, absolute_paths):
            with self.cache_lock:
                if self.cache.get(hash, False):
                    continue
            
                if len(self.cache) == self.cache_size - 1:
                    print("Cache at capacity... should not happen, no more data would be entered, CHECK CODE.")
                    break
                
                if os.path.exists(absolute_path):
                    image_data = open(absolute_path, "rb").read()
                    image_type = imghdr.what(absolute_path)
                    self.cache[hash] = (image_data, image_type)
                else:
                    self.cache[hash] = (None, None)
    
    def put(self, hashes:list[str], absolute_paths:list[str]):
        with self.lock:
            threading.Thread(target = self.fulfill_tasks, args = (hashes, absolute_paths)).start()
        
    def get(self, hash:str, n_tries:int = 100):
        # what if cache is not fulfilled for this hash.
        # this should happen very rarely, i guess ??
        temp_count = 0
        while True:
            if temp_count == n_tries:
                print ("[WARNING]: cache Missed, MUST NOT HAPPEN, returning.. none data")
                return (None, None)
            
            with self.cache_lock:
                if self.cache.get(hash, False):
                    data, data_type = self.cache[hash]
                    _ = self.cache.pop(hash)   # pop this key. Since this was consumed.
                    return (data, data_type)
                
            # print("CACHE MISS SHOULD NOT HAPPEN TOO OFTEN, otherwise CHECK..")
            time.sleep(0.01)
            temp_count += 1

    def __len__(self):
        with self.cache_lock:
            return len(self.cache)
        

class VideoFramesCache(object):
    """An interface to collect specified frames from Videos in the background.
    NOTE: it is used to fill corresponding frame data as frames_scores are sent already to client. So Don't skip data, just fill with None if needed. Let client handle it.
    """

    def __init__(self, cache_size = 50):        
        # appropriate data-structures:
        self.lock = threading.RLock()
        self.cache = Queue(maxsize=50)  # in this case, this is better modelled as queue.

    def fulfill_tasks(self, frame_indices:list[int], video_path:str):
        # creates a Video capture object and read/decode corresponding frames based on frame indices.

        cap = VideoCaptureBasic(video_path)
        for i, ix in enumerate(frame_indices):
            frame = cap.read_specific_frame(ix, bgr = True)

            # for each hash, client would request the data.
            temp_std = get_frame_variance(frame)
            if temp_std < PIXEL_VARIANCE_THRESHOLD:
                if i == (len(frame_indices) - 1):
                    self.cache.put((None, None, True))  # let client handle that..
                else:
                    self.cache.put((None, None, False))
                continue
            
            img_data = cv2.imencode('.jpg', frame)[1].tobytes()
            
            if i == (len(frame_indices) - 1):
                self.cache.put((img_data, "jpg", True)) # (data, data_type, queue_done)
            else:
                self.cache.put((img_data, "jpg", False))  # (data, data_type, queue_done)              

        del cap

    def get(self):
        return self.cache.get()
    
    def put(self, frame_indices:list[int], video_path:str):
        with self.lock:
            threading.Thread(target = self.fulfill_tasks, args = (frame_indices, video_path)).start()
