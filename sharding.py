# imports
from threading import RLock
import os
import threading
import queue
import pickle
from collections import OrderedDict
from typing import Optional

import numpy as np

# Config.
N_ROWS_SHARD_META_DATA =  1   # top row, reserved for shard meta-data, like current filled rows in a shard etc.

######### SHARDING ###################################################################
#######################################################################################
def load_shard_from_disk_preload(preload_queue:queue.Queue, command_queue:queue.Queue, index_directory:os.path, shard_prefix:str):
    while True:
        idx_to_preload = command_queue.get()            # waiting which index to preload, HENCE ONE preload at a time.
        if idx_to_preload == -1:
            break
        
        shard_path =  os.path.join(index_directory,"{}_{}.idx".format(shard_prefix, idx_to_preload))
        if not os.path.exists(shard_path):
            preload_queue.put((False, None, None))
        else:
            with open(shard_path, "rb") as f:
                preload_queue.put((True, idx_to_preload, np.load(f)))
