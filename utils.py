import numpy as np
from typing import List, Union
import os
import hashlib
import cv2


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

        Returns: a tuple, where first argument indicates, if a frame has been read successfully or not.
        """
        frame = self.read_specific_frame(
            frame_num=self.current_frame_idx + self.frames_to_skip + 1, bgr=bgr
        )
        if frame is not None:
            return True, frame
        else:
            return False, None

    def read_specific_frame(self, frame_num: int, bgr=False):
        """Returns None, if a frame cannot be read for any reason, i.e because of invalid frame_num, otherwise a frame [HWC] uint8 data.

        frame_num: a specific frame_num, should be [1, FRAME_COUNT], if invalid a None would be returned.
        bgr: Flag to indicate if we want BGR data, if True would return BGR data, otherwise RGB.
        """

        self.current_frame_idx = frame_num
        prop_set = self.cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num - 1)
        if prop_set:
            ret, frame = self.cap.read()
            if ret == True:
                if bgr:
                    return frame
                else:
                    return frame[:, :, ::-1].copy()
            else:
                return None
        else:
            None

    def get_pos_seconds(self):
        """Returns current playback position in seconds. Works good enough!
        # NOTE: We first actually have to read a frame using cap.read(), to get best-guess playback position, rather than directly calling cv2.CAP_PROP_POS_MSEC.
        """

        if self.read_specific_frame(frame_num=self.current_frame_idx) is not None:
            return self.cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
        else:
            return None


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
