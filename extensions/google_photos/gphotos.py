
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
    