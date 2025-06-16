from typing import List
import requests
import time

ATTRIBUTE_VALUE = "resource_directory"

BASE_PATH = "http://localhost:5000/api"
GET_SUGGESTION_ENDPOINT = f"{BASE_PATH}/getSuggestion"
GET_FOLDERS_ENDPOINT = f"{BASE_PATH}/getGroup/resource_directory"
QUERY_ENDPOINT = f"{BASE_PATH}/query"

def get_folders_list():
    """Get the list of folders"""
    try:
        response = requests.get(GET_FOLDERS_ENDPOINT, timeout=30)
        # Check if request was successful
        response.raise_for_status()
        data : List[str] = response.json()
        if (isinstance(data, list)):
            print(f"Successfully retrieved {len(data)} folders from API")
            return data
        print(f"Warning: resource_directory is not a list, got {type(data)}")
        return None
    except Exception as e:
        print(f"Error: Request failed: {e}")
        return None
    
def convert_path_to_backslashes(path: str) -> str:
    """Convert forward slashes to backslashes in a file path."""
    return path.replace('/', '\\')

def form_query(keyword:str, folder:str):
    folder = convert_path_to_backslashes(folder)
    return f"query={keyword}&resource_directory={folder}"

def send_query_request(query) -> dict:
    """Send a request to the endpoint for a given query."""
    
    print(f"Sending request with query: {query}")

    request_body = {
        "query": query,
        "query_start": True
    }

    try:
        response = requests.post(
            str(QUERY_ENDPOINT),
            data=request_body
        )

        response.raise_for_status()
        data = response.json()

        return {
            "status": "success",
            "data": data
        }
    
    except requests.exceptions.RequestException as e:
        return {
            "status": "error",
            "error": str(e)
        }
    
def process_all_folders(folders: List[str]):
    results = []

    for i, folder in enumerate(folders, 1):
        query = form_query(keyword="cars", folder=folder)
        result = send_query_request(query=query)
        result.update({
            "folder": folder
        })
        results.append(result)
        time.sleep(0.1)
    return results


def main():
    folders = get_folders_list()

    if not folders:
        print("No folders found or failed to retrieve folders.")
        return

    # Process all folders
    results = process_all_folders(folders)

    # Count successes and failures
    successes = [r for r in results if r["status"] == "success"]
    failures = [r for r in results if r["status"] == "error"]

    print(f"\n=== Summary ===")
    print(f"Total folders processed: {len(results)}")
    print(f"Successful requests: {len(successes)}")
    print(f"Failed requests: {len(failures)}")

    if failures:
        print(f"\nFailed folders:")
        for failure in failures:
            print(f"  - {failure['folder']}: {failure['error']}")

    return results

if __name__ == "__main__":
    main()