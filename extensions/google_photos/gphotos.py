
"""
Google Photos extension for Hachi (https://github.com/eagledot/hachi)
    Author:     eagledot (Anubhav N.)
    Copyright:  (c) Anubhav N. 2023
    License:    AGPL v 3.0
"""

import os
import requests
from requests.exceptions import ConnectionError
from typing import Optional, Dict, Tuple
import time
import json
import threading
from queue import Queue
from copy import deepcopy

PAGE_SIZE = 100   # max allowed Page size for downloading/listing.

import hashlib  # TODO: use already defined ...
def generate_data_hash(resource_path:str, chunk_size:int = 400) -> Optional[str]:
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

CLIENT_SECRET_PATH = os.path.join(os.path.abspath(os.path.dirname(__file__)), "client_secret.json")
CREDENTIALS_PATH  = os.path.join(os.path.abspath(os.path.dirname(__file__)), "credentials.json")

def read_gClient_secret(password:Optional[str] = None) -> Dict:
    with open(CLIENT_SECRET_PATH, "r") as f:
        return json.load(f)["web"]  # web since ours would be webapp.

def write_gClient_credentials(credentials:Dict, password:Optional[str] = None):
    with open(CREDENTIALS_PATH, "w") as f:
        assert "refresh_token" in credentials
        credentials["expires_at"] = int(time.time() + float(credentials["expires_in"])) # add another field.
        return json.dump(credentials, f)

def read_gClient_credentials(password:Optional[str] = None) -> Dict:
    with open(CREDENTIALS_PATH, "r") as f:
        return json.load(f)
    
class GooglePhotos(object):
    def __init__(self, page_size = PAGE_SIZE):
        self.resource_directory = os.path.join(os.path.dirname(__file__), "temp_gphotos")
        self.meta_json_path = os.path.join(os.path.dirname(__file__), "./hachiMeta.json") # corresponding metaData if available.
        self.is_downloading = False
        self.download_status_queue = Queue() # to communicate the current downloading status.
        self.page_size = PAGE_SIZE
        self.stop_downloading_thread = False

        # mapping from (data_hash) --> remote_metaData, data_hash would be used by Original MetaData during augmenting/mergin.
        if not os.path.exists(self.meta_json_path):
            self.remote_meta = {}
        else:
            with open(self.meta_json_path, "r") as f:
                self.remote_meta = json.load(f)

        if not os.path.exists(self.resource_directory):
            os.mkdir(self.resource_directory)

        if not hasattr(self, "lock"):
            self.lock = threading.RLock()        
      
        if not os.path.exists(CREDENTIALS_PATH):
            return  # indicates dummy initialization.       
        
        self.credentials = read_gClient_credentials()
        assert "refresh_token" in self.credentials
        assert "access_token" in self.credentials

        temp = read_gClient_secret()
        self.credentials["client_secret"] = temp["client_secret"]
        self.credentials["client_id"] = temp["client_id"]
        self.credentials["redirect_uris"] = temp["redirect_uris"]
        self.credentials["auth_uri"] = temp["auth_uri"]
        self.credentials["token_uri"] = temp["token_uri"]

        

    def get_client_info(self):
        """Information about current Client linked."""
        with self.lock:
            result = {
                "client_id_available":False
            }
            if hasattr(self, "credentials"):
                assert "refresh_token" in self.credentials
                result["client_id"] = self.credentials["client_id"]
                result["is_activated"] = True
                result["client_id_available"] = True
            elif os.path.exists(CLIENT_SECRET_PATH):
                temp = read_gClient_secret()
                result["client_id"] = temp["client_id"]
                result["is_activated"] = False
                result["client_id_available"] = True
            else:
                pass
        return result

    def is_token_valid(self) -> bool:
        result = False
        if int(self.credentials["expires_at"]) >= int(time.time() + 15*60):              # atleast 15 minutes should be remaining.
            # print("{} minutes remaining".format((self.credentials["expires_at"] - time.time()) / 60))
            result = True
        return result
    
    def update_access_token(self) -> Tuple[bool, Optional[str]]:

        result = {'success':False, 'reason':None}
        data = {
            'client_id': self.credentials["client_id"],
            'client_secret': self.credentials["client_secret"],
            'grant_type': 'refresh_token',
            'refresh_token': self.credentials["refresh_token"]
        }
        try:
            r = requests.post(self.credentials["token_uri"], data=data, timeout = 5)
        except ConnectionError as e:
            result = {"success":False, "reason": "Connection Error"}
            return result
        
        if r.status_code == 200:
            temp = r.json()
            if "access_token" in temp: 
                result["success"] = True
                result["reason"] = None

                temp["refresh_token"] = self.credentials["refresh_token"]
                write_gClient_credentials(temp) 
                self.credentials = read_gClient_credentials()  # read from the disk. (so that in sync..)
            else:
                result["success"] = False
                result["success"] = r.text
        else:
            result["success"] = False
            result["reason"] = r.text
        return result
    
    def download_target(self):
        with self.lock:
            self.stop_downloading_thread = False
        if not self.is_token_valid():
            self.download_status_queue.put({
                "finished":False,
                "details":"getting new token!"
            })
            status, reason = self.update_access_token()
            if status == False:
                self.download_status_queue.put({
                    "finished":True,
                    "message": reason
                }) 
                with self.lock:
                    self.is_downloading = False
                return

        curr_page_token = None
        while True:
            # download all metaData for mediaItems. (have to check in case user has large number of photos/videos.)   
            self.download_status_queue.put({
                    "finished":False,
                    "details":"Downloading remote metaData!"
                })
            next_page_token, remote_metaData, error_fetching = self.listMediaItems(curr_page_token)  # TODO: check for large amount of personal data.
            if error_fetching is not None:
                self.download_status_queue.put({
                "finished":True,
                "message":error_fetching
                })
                with self.lock:
                    self.is_downloading = False
                return
            
            available_mediaItemids = [v["id"] for v in self.remote_meta.values()]

            for x in remote_metaData:
                with self.lock:
                    if self.stop_downloading_thread == True:
                        self.download_status_queue.put({
                            "finished":True,
                            "message": "Downloading Stopped.."  # or any other message to indicate some error.
                        })
                        self.is_downloading = False
                        return
                
                resource_type, extension = x["mimeType"].lower().split("/")
                if resource_type == "image" and x["id"] not in available_mediaItemids:
                
                    temp_headers = {
                        'User-Agent': 'Mozilla/5.0 gzip', # Api suggests to include gzip string in user-agent too !!
                        'Accept-Encoding': 'gzip'
                    }
                try:
                    r = requests.get(x["baseUrl"], headers=temp_headers, allow_redirects=False, timeout = 5)   # this URL is temporary, would need to create new based on mediaItemId on the fly.
                except ConnectionError as e:
                    continue

                if r.status_code == 200:
                    with open(os.path.join(self.resource_directory, x["filename"]), "wb") as f:
                        f.write(r.content)
                                        
                    temp_hash = generate_data_hash(os.path.join(self.resource_directory, x["filename"]))       # NOTE: this hash MUST USE THE COMMON HASH GENERATION ROUTINE.
                    if temp_hash is None:
                        continue
                    
                    self.remote_meta[temp_hash] = x     # map the hash for file to remote_metaData.
        
                    # save this meta JSON to disk, as soon as a single image is successfully downloaded.
                    with open(self.meta_json_path, "w") as f:
                        json.dump(self.remote_meta, f)

                    self.download_status_queue.put({
                        "available": len(remote_metaData),
                        "downloaded": len(self.remote_meta),
                        "finished":False,
                        "details":x["filename"]
                    })

                else:
                    # TODO: possible, some error/unauthentication, even with a successful response.
                    # TODO: return response text in this case. to queue.
                    pass
            
            if next_page_token is None:
                break
            curr_page_token = next_page_token
            
        # finally.
        self.download_status_queue.put({
            "finished":True,
            "message": "SUCCESS"  # or any other message to indicate some error.
        })
        with self.lock:
            self.is_downloading = False
    
    def listMediaItems(self, page_token:str = None) -> Tuple[Optional[str], Dict, Optional[str]]:
        # Paginated listing
        # Return (pageToken, Dict for meta-data about mediaItems, error) (at max self.page_size). Paginated listing
        
        result = (None, {}, None)    # (page_token[optional], response json, error[optional])
        if not self.is_token_valid():
            success, reason = self.update_access_token()
            if not success:
                result = (None, {}, reason)

        headers = {'Authorization': 'Bearer {}'.format(self.credentials['access_token']),
                'Content-type': 'application/json'}
        
        if page_token is not None:
            req_uri = 'https://photoslibrary.googleapis.com/v1/mediaItems?pageSize={}&pageToken={}'.format(self.page_size, page_token)
        else:
            req_uri = 'https://photoslibrary.googleapis.com/v1/mediaItems?pageSize={}'.format(self.page_size)

        try:
            r = requests.get(req_uri, headers=headers, allow_redirects = False, timeout = 5)
        except ConnectionError as e:
            result = (None, {}, "Connection Error")
            return result
        
        if r.status_code == 200:
            # TODO: check for error message, like Unauthenticated or disabled api etc.
            temp_result = r.json()

            if "mediaItems" in temp_result:
                if "pageToken" in temp_result:
                    result = (temp_result["pageToken"], temp_result["mediaItems"], None)
                else:
                    result = (None, temp_result["mediaItems"], None)
            else:
                result = (None, {}, r.text)
        else:
            result = (None, {}, r.text)
            
        return result

    def start_download(self):
        # TODO: empty the queue if not!!
        # TODO: return if already downloading in progress.
        threading.Thread(target = (self.download_target)).start()
    
    def stop_download(self):
        # TODO: be sure that downloading stopped..age old problem !!!
        with self.lock:
            self.stop_downloading = True
    
    def reset(self):
        # NOTE: must be called during revoking of a token, i.e only credentials specific reasons.. NO relation with main codebase.
        with self.lock:
            if os.path.exists(self.resource_directory):
                for x in os.listdir(self.resource_directory):
                    os.remove(os.path.join(self.resource_directory, x))
            
            if os.path.exists(self.meta_json_path):
                os.remove(self.meta_json_path)  # like ./hachiMeta.json.
            if os.path.exists(CLIENT_SECRET_PATH):
                os.remove(CLIENT_SECRET_PATH)
            if os.path.exists(CREDENTIALS_PATH):
                os.remove(CREDENTIALS_PATH)
            
            if hasattr(self, "credentials"):
                delattr(self, "credentials")
    
    def add_new_client(self, client_secret:Dict):
        self.reset()
        with open(CLIENT_SECRET_PATH, "w") as f:
            json.dump(client_secret, f)
        with self.lock:
            self.__init__()

    def get_remote_meta(self, data_hash:str) -> Dict:
        assert data_hash in self.remote_meta, "data_hash must be there, as a key. if this routine has been called."
        return deepcopy(self.remote_meta[data_hash])

    def get_temp_resource_directory(self) -> os.PathLike:
        # return local temporary directory where data is being downloaded from google photos.
        return deepcopy(self.resource_directory)
    
    def get_downloading_status(self) -> Dict:
        status = self.download_status_queue.get()
        return status
    