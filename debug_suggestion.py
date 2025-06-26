from typing import TypedDict, List
import requests
import time

ATTRIBUTE_VALUE = "resource_directory"

BASE_PATH = "http://localhost:5000/api"
GET_SUGGESTION_ENDPOINT = f"{BASE_PATH}/getSuggestion"
GET_FOLDERS_ENDPOINT = f"{BASE_PATH}/getGroup/resource_directory"

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
    

class SuggestionRequest(TypedDict):
    query: str
    attribute: str

class SuggestionResponse(TypedDict):
    resource_directory: List[str]



def convert_path_to_backslashes(path: str) -> str:
    """Convert forward slashes to backslashes in a file path."""
    return path.replace('/', '\\')


def has_suggestions(response_data : SuggestionResponse) -> bool:
    """Check if the response data contains any suggestions."""
    return bool(response_data.get("resource_directory")) and len(response_data["resource_directory"]) > 0


def send_suggestion_request(folder_path: str) -> dict:
    """Send a request to the suggestion endpoint for a given folder path."""
    folder_path = convert_path_to_backslashes(folder_path)

    request_body = {
        "query": folder_path,
        "attribute": ATTRIBUTE_VALUE
    }

    try:
        response = requests.post(
            str(GET_SUGGESTION_ENDPOINT),
            data=request_body
        )

        response.raise_for_status()
        data = response.json()

        print("Suggestions: ", data['resource_directory'])

        return {
            "folder": folder_path,
            "status": "success",
            "data": data
        }
    
    except requests.exceptions.RequestException as e:
        return {
            "folder": folder_path,
            "status": "error",
            "error": str(e)
        }
    
def process_all_folders(folders: List[str]):
    """Process all folders and send requests to the suggestion endpoint."""
    results = []

    print(f"Processing {len(folders)} folders...")

    for i, folder in enumerate(folders, 1):
        print(f"Processing folder {i}/{len(folders)}: {folder}")

        result = send_suggestion_request(folder)
        results.append(result)

        time.sleep(0.1)

    return results

def main():
    """Main function to run the suggestion requests."""
    print("Starting folder suggestion processing...")

    folders = get_folders_list()

    if not folders:
        print("No folders found or failed to retrieve folders.")
        return

    # Process all folders
    results = process_all_folders(folders)

    # Count successes and failures
    successes = [r for r in results if r["status"] == "success"]
    failures = [r for r in results if r["status"] == "error"]

    folders_with_suggestions = [r['folder'] for r in successes if has_suggestions(r['data'])]
    folders_with_no_suggestions = [r['folder'] for r in successes if not has_suggestions(r['data'])]

    print(f"\n=== Summary ===")
    print(f"Total folders processed: {len(results)}")
    print(f"Successful requests: {len(successes)}")
    print(f"Failed requests: {len(failures)}")

    print(f"Folders with suggestions: {len(folders_with_suggestions)}")
    print(f"Folders with No suggestions: {len(folders_with_no_suggestions)}")

    if failures:
        print(f"\nFailed folders:")
        for failure in failures:
            print(f"  - {failure['folder']}: {failure['error']}")

    if folders_with_no_suggestions:
        print(f"\nFolders with NO suggestions:")
        for folder in folders_with_no_suggestions:
            print(f"  - {folder}")

    if folders_with_suggestions:
        print(f"\nFolders with suggestions:")
        for folder in folders_with_suggestions:
            print(f"  - {folder}")

    return results

if __name__ == "__main__":
    main()