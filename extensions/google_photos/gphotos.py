
"""
Google Photos extension for Hachi (https://github.com/eagledot/hachi)
    Author:     eagledot (Anubhav N.)
    Copyright:  (c) Anubhav N. 2023
    License:    AGPL v 3.0
"""

import os
import requests
from typing import Optional, Dict
import time
import json
import threading
from queue import Queue
from copy import deepcopy

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
    def __init__(self):
        self.resource_directory = os.path.join(os.path.dirname(__file__), "temp_gphotos")
        self.meta_json_path = os.path.join(os.path.dirname(__file__), "./hachiMeta.json") # corresponding metaData if available.
        
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

        self.stop_downloading = False
        self.download_status_queue = Queue() # to communicate the current downloading status.
        

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
    
    def get_new_access_token(self) -> Dict:
        result = {'success':False, 'reason':""}
        data = {
            'client_id': self.credentials["client_id"],
            'client_secret': self.credentials["client_secret"],
            'grant_type': 'refresh_token',
            'refresh_token': self.credentials["refresh_token"]
        }
        r = requests.post(self.credentials["token_uri"], data=data)
        if r.status_code == 200:
            result["success"] = True
            result["reason"] = ""

            temp = r.json()
            temp["refresh_token"] = self.credentials["refresh_token"]
            for k,v in temp.items():
                self.credentials[k] = v
            
            # sync the credentials to disk as well.
            write_gClient_credentials(temp)
        else:
            result["success"] = False
            result["reason"] = r.text
        return result
    
    def download_target(self):
        self.stop_downloading = False
        if not self.is_token_valid():
            self.download_status_queue.put({
                "finished":False,
                "details":"getting new token!"
            })
            status, reason = self.get_new_access_token()
            if status == False:
                print("Could not get new token, {}".format(reason))
                return

        # download all metaData for mediaItems. (have to check in case user has large number of photos/videos.)   
        self.download_status_queue.put({
                "finished":False,
                "details":"Downloading remote metaData!"
            })
        remote_metaData = self.listMediaItems()
        if remote_metaData is None:
            self.download_status_queue.put({
                "finished":True,
                "message":"FAILURE",
                "details":"failed to download remote metaData!"
            })
            return

        available_mediaItemids = [v["id"] for v in self.remote_meta.values()]
        for x in remote_metaData:
            with self.lock:
                if self.stop_downloading == True:
                    break
            
            resource_type, extension = x["mimeType"].lower().split("/")
            if resource_type == "image" and x["id"] not in available_mediaItemids:
                
                temp_headers = {
                    'User-Agent': 'Mozilla/5.0 gzip', # Api suggests to include gzip string in user-agent too !!
                    'Accept-Encoding': 'gzip'
                }
                try:
                    r = requests.get(x["baseUrl"], headers=temp_headers, allow_redirects=False)   # this URL is temporary, would need to create new based on mediaItemId on the fly.
                    if r.status_code == 200:
                        
                        with open(os.path.join(self.resource_directory, x["filename"]), "wb") as f:
                            f.write(r.content)
                                            
                        temp_hash = generate_data_hash(os.path.join(self.resource_directory, x["filename"]))       # NOTE: this hash MUST USE THE COMMON HASH GENERATION ROUTINE.
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
                        # TODO: if UNATHENTICATED ..(rare..)
                        pass
                except ConnectionError as e:
                    continue
        
        self.download_status_queue.put({
            "available": len(remote_metaData),
            "downloaded": len(self.remote_meta),
            "finished":True,
            "message": "SUCCESS"  # or any other message to indicate some error.
        })

    def listMediaItems(self) -> Optional[Dict]:
        # TODO: more possible error cases.        
        try:
            if not self.is_token_valid():
                success, reason = self.get_new_access_token()
                if not success:
                    print("Couldn't download token..{}".format(reason))
                    return None

            headers = {'Authorization': 'Bearer {}'.format(self.credentials['access_token']),
                    'Content-type': 'application/json'}
            req_uri = 'https://photoslibrary.googleapis.com/v1/mediaItems'

            r = requests.get(req_uri, headers=headers, allow_redirects = False)
            if r.status_code == 200:
                return r.json()["mediaItems"]
            else:
                return None
        except ConnectionError as e:
            print("Connection Problem...")
            return None

    def start_download(self):
        # TODO: empty the queue if not!!
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