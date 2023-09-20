# imports
import threading
from threading import RLock
from typing import Union, Optional, Iterable
from collections import OrderedDict


class GlobalDataCache(object):

    def __init__(self, max_size = 100) -> None:
        self.lock = RLock()
        self.cache = OrderedDict()                    # hash to raw-data mapping.
        self.max_size = max_size                      # to limit the number of (raw_data) values cache can hold. Soft limit.

    def _background_thread(self, data_hash_list:Iterable[str], absolute_path_list:Iterable[str]):
        for temp_hash, temp_path in zip(data_hash_list, absolute_path_list):
            with self.lock:
                if temp_hash not in self.cache:
                    with open(temp_path, "rb") as f:
                        self.cache[temp_hash] = f.read()

    def append(self, data_hash: Union[str, Iterable[str]], absolute_path:Union[str, Iterable[str]]):
        # enqueue, this absolute path to be read from disk, by background thread.
        if isinstance(data_hash, str):
            data_hash = [data_hash]
        if isinstance(absolute_path, str):
            absolute_path = [absolute_path]
        
        threading.Thread(target = self._background_thread, args = (data_hash, absolute_path)).start()

    def get(self, data_hash:str, absolute_path:Optional[str] = None):
        # If data_hash could not be found, we would read it from the absolute_path.
        with self.lock:

            if len(self.cache) >= self.max_size:
                for key in self.cache.keys():   
                    _ = self.cache.pop(key)    #pop least recent key.
                    break

            if data_hash not in self.cache:
                assert absolute_path is not None
                with open(absolute_path, "rb") as f:
                    raw_data = f.read()                
                self.cache[data_hash] = raw_data
            
            return self.cache[data_hash]