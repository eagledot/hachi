
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