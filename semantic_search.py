# imports
import os



def generate_endpoint(directory_path) -> str:
    assert os.path.exists(directory_path)
    statusEndpoint = os.path.abspath(directory_path).replace("/", "-")
    statusEndpoint = statusEndpoint.replace('\\',"-")
    return statusEndpoint