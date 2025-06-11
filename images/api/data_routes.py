import os
import base64
import cv2
import numpy as np
from flask import Blueprint, Response

from semantic_search import metaIndex, dataCache, IMAGE_PREVIEW_DATA_PATH
from semantic_search import googlePhotos, faceIndex, USER_CLUSTER_ID_2_ORIGINAL, get_original_cluster_id

data_bp = Blueprint('data_routes', __name__)

@data_bp.route("/getRawData/<data_hash>", methods = ["GET"])
def getRawData(data_hash: str) -> Response:
    """
    Retrieve raw data for a given data hash, preferring preview versions when available.
    
    This endpoint serves raw file data with intelligent fallback behavior:
    1. First attempts to serve webp preview from IMAGE_PREVIEW_DATA_PATH
    2. Falls back to original file if preview unavailable
    3. Uses dataCache for efficient retrieval
    
    Args:
        data_hash (str): The unique hash identifier for the requested data
        
    Returns:
        Response: Flask response containing the raw file data with appropriate mimetype,
                 or error response with 404/500 status codes if data cannot be retrieved
                 
    Error Conditions:
        - 404: Data hash not found in metadata index
        - 404: Original file path not accessible (for remote or missing files)
        - 404: File does not exist at resolved path
        - 500: Data retrieval from cache fails
        
    Behavior:
        - Automatically determines appropriate mimetype based on resource type and extension
        - Logs warnings when falling back to original files
        - Handles both local files and remote resources appropriately
    """
    # Query metadata index for the given data hash
    hash_2_metaData = metaIndex.query(data_hashes=data_hash)
    
    # Check if data hash exists in metadata
    if data_hash not in hash_2_metaData:
        return Response(f"Data hash {data_hash} not found", status=404, mimetype="text/plain")

    temp_meta = hash_2_metaData[data_hash]
    
    # Safely extract metadata with defaults
    original_resource_type = temp_meta.get("resource_type", "application/octet-stream")
    original_resource_extension = temp_meta.get("resource_extension", "")
    original_absolute_path = temp_meta.get("absolute_path")
    
    # Validate that we have an absolute path in metadata
    if not original_absolute_path:
        return Response(f"Absolute path not found in metadata for {data_hash}", status=404, mimetype="text/plain")

    # Try to use preview data first (preferred)
    preview_path = os.path.join(IMAGE_PREVIEW_DATA_PATH, f"{data_hash}.webp")
    
    if os.path.exists(preview_path):
        # Use preview version
        final_absolute_path = preview_path
        final_resource_type = "image"
        final_resource_extension = ".webp"
        print(f"[INFO]: Serving preview for {data_hash}")
    else:
        # Fall back to original file
        print(f"[WARNING]: No preview available for {data_hash}. Using original: {original_absolute_path}")
        
        # Check if original path is accessible
        if original_absolute_path.strip().lower() == "remote":
            return Response(f"Original resource is remote and no local preview available for {data_hash}", status=404, mimetype="text/plain")
        
        if not os.path.exists(original_absolute_path):
            return Response(f"Original file not found at {original_absolute_path} for {data_hash}", status=404, mimetype="text/plain")
            
        final_absolute_path = original_absolute_path
        final_resource_type = original_resource_type
        final_resource_extension = original_resource_extension

    # Attempt to retrieve raw data from cache
    try:
        raw_data = dataCache.get(data_hash, final_absolute_path)
        if raw_data is None:
            return Response(f"Failed to retrieve resource for {data_hash} from cache", status=500, mimetype="text/plain")
    except Exception as e:
        print(f"Error retrieving data from cache for {data_hash}: {e}")
        return Response(f"Error retrieving resource for {data_hash}: {str(e)}", status=500, mimetype="text/plain")

    # Determine mimetype
    mimetype_str = final_resource_type
    if "/" not in final_resource_type and final_resource_extension and final_resource_extension.startswith("."):
        mimetype_str = f"{final_resource_type}/{final_resource_extension[1:]}"
    elif final_resource_type == "image" and final_resource_extension == ".webp":
        mimetype_str = "image/webp"
    
    return Response(raw_data, mimetype=mimetype_str)


@data_bp.route("/getRawDataFull/<data_hash>", methods = ["GET"])
def getRawDataFull(data_hash: str) -> Response:
    """
    Retrieve the full, original raw data for a given data hash.
    This endpoint serves the original file data, bypassing any preview versions.
    It can fetch data from local storage or remote sources like Google Photos
    based on the metadata.

    Args:
        data_hash (str): The unique hash identifier for the requested data.

    Returns:
        Response: Flask response containing the raw file data with appropriate mimetype,
                 or an error response (e.g., 404, 500) if the data cannot be retrieved.

    Behavior:
        - Queries the metadata index for the given data_hash.
        - If the 'absolute_path' in metadata is "remote":
            - It attempts to fetch data from the specified 'resource_directory' (e.g., "google_photos").
        - Otherwise (local path):
            - It reads the file directly from the 'absolute_path'.
        - Returns 404 if data_hash is not found in metadata.
        - Returns 500 or other appropriate error if data retrieval fails (e.g., file not found locally, remote fetch error).
        - Constructs the mimetype from 'resource_type' and 'resource_extension' from metadata.
    """
    # Query metadata index for the given data hash
    hash_2_metaData = metaIndex.query(data_hashes=data_hash)
    
    # Check if data hash exists in metadata
    if data_hash not in hash_2_metaData:
        return Response(f"Data hash {data_hash} not found", status=404, mimetype="text/plain")

    temp_meta = hash_2_metaData[data_hash]
    
    # Safely extract required metadata with defaults
    resource_type = temp_meta.get("resource_type", "application/octet-stream")
    resource_extension = temp_meta.get("resource_extension", "")
    resource_directory = temp_meta.get("resource_directory")
    absolute_path = temp_meta.get("absolute_path")

    # Validate that we have an absolute path
    if not absolute_path:
        return Response(f"Absolute path not found in metadata for {data_hash}", status=404, mimetype="text/plain")

    raw_data = None

    if absolute_path.strip().lower() == "remote":
        # Handle remote data retrieval
        remote_meta = temp_meta.get("remote")
        if not remote_meta:
            return Response(f"Remote metadata not found for remote resource {data_hash}", status=404, mimetype="text/plain")
        
        if resource_directory == "google_photos":
            try:
                raw_data = googlePhotos.get_raw_data(remote_meta)
                if raw_data is None:
                    return Response(f"Failed to retrieve data from Google Photos for {data_hash}", status=500, mimetype="text/plain")
            except Exception as e:
                print(f"Error fetching from Google Photos for {data_hash}: {e}")
                return Response(f"Error fetching from Google Photos for {data_hash}: {str(e)}", status=500, mimetype="text/plain")
        else:
            return Response(f"Unsupported remote resource directory: {resource_directory} for {data_hash}", status=400, mimetype="text/plain")
    else:
        # Handle local file reading
        if not os.path.exists(absolute_path):
            return Response(f"File not found at local path: {absolute_path} for {data_hash}", status=404, mimetype="text/plain")
        
        try:
            with open(absolute_path, "rb") as f:
                raw_data = f.read()
        except Exception as e:
            print(f"Error reading local file {absolute_path} for {data_hash}: {e}")
            return Response(f"Error reading local file for {data_hash}: {str(e)}", status=500, mimetype="text/plain")

    # Final check that we have data
    if raw_data is None:
        return Response(f"Failed to load raw_data for {data_hash}", status=500, mimetype="text/plain")

    # Determine mimetype
    mimetype_str = resource_type
    if "/" not in resource_type and resource_extension and resource_extension.startswith("."):
        mimetype_str = f"{resource_type}/{resource_extension[1:]}"

    return Response(raw_data, mimetype=mimetype_str)


@data_bp.route("/getPreviewPerson/<cluster_id>", methods=["GET"])
def getPreviewCluster(cluster_id: str) -> Response:
    """
    Retrieve a preview image for a person cluster/face group.
    
    This endpoint serves preview images for identified persons in the image collection.
    It handles both user-defined person tags and system-generated cluster IDs,
    including special cases like "no person detected".
    
    URL Parameters:
        cluster_id (str): The cluster/person identifier for which to retrieve preview
    
    Returns:
        Response: Flask response containing PNG image data with appropriate mimetype,
                 or error response with 404/500 status codes if preview cannot be retrieved
    
    Error Conditions:
        - 400: Missing or invalid cluster_id parameter
        - 404: Cluster ID not found in face index
        - 500: Error generating preview image or retrieving face data
    
    Behavior:
        - Maintains session cache mapping between user IDs and original cluster IDs
        - Handles "no_person_detected" case with placeholder image
        - Retrieves preview data from face index for valid clusters
        - Returns PNG image data with proper mimetype
        - Automatically manages memory cleanup for temporary objects
    """
    # Validate cluster_id parameter
    if not cluster_id:
        return Response("Missing cluster_id parameter", status=400, mimetype="text/plain")
    
    cluster_id = cluster_id.strip()
    if not cluster_id:
        return Response("Empty cluster_id parameter", status=400, mimetype="text/plain")

    try:
        # Get or resolve original cluster ID (with session caching)
        if cluster_id not in USER_CLUSTER_ID_2_ORIGINAL:
            try:
                original_cluster_id = get_original_cluster_id(cluster_id)
                # Update session mapping for future reference
                USER_CLUSTER_ID_2_ORIGINAL[cluster_id] = original_cluster_id
                print(f"[INFO]: Resolved cluster_id '{cluster_id}' to original '{original_cluster_id}'")
            except Exception as e:
                print(f"[ERROR]: Failed to resolve original cluster ID for '{cluster_id}': {e}")
                return Response(f"Failed to resolve cluster ID '{cluster_id}'", status=404, mimetype="text/plain")
        else:
            original_cluster_id = USER_CLUSTER_ID_2_ORIGINAL[cluster_id]

        # Handle special case: no person detected
        if original_cluster_id.lower() == "no_person_detected":
            try:
                # Generate a simple placeholder image for "no person detected"
                placeholder_image = np.zeros((64, 64, 3), dtype=np.uint8)  # Small black square
                success, encoded_image = cv2.imencode(".png", placeholder_image)
                
                if not success:
                    return Response("Failed to generate placeholder image", status=500, mimetype="text/plain")
                
                raw_data = encoded_image.tobytes()
                return Response(raw_data, mimetype="image/png")
                
            except Exception as e:
                print(f"[ERROR]: Failed to generate placeholder for no_person_detected: {e}")
                return Response("Failed to generate placeholder image", status=500, mimetype="text/plain")
        
        # Handle regular person clusters
        try:
            cluster_data = faceIndex.get(original_cluster_id)
            if cluster_data is None:
                return Response(f"Cluster data not found for ID '{original_cluster_id}'", status=404, mimetype="text/plain")
            
            # Extract preview data
            png_data = cluster_data.preview_data
            if not png_data:
                return Response(f"No preview data available for cluster '{original_cluster_id}'", status=404, mimetype="text/plain")
            
            # Decode base64 preview data
            try:
                raw_data = base64.b64decode(png_data)
                return Response(raw_data, mimetype="image/png")
            except Exception as e:
                print(f"[ERROR]: Failed to decode base64 preview data for '{original_cluster_id}': {e}")
                return Response("Failed to decode preview image data", status=500, mimetype="text/plain")
                
        except Exception as e:
            print(f"[ERROR]: Failed to retrieve cluster data for '{original_cluster_id}': {e}")
            return Response(f"Failed to retrieve cluster data for '{original_cluster_id}'", status=500, mimetype="text/plain")
        
    except Exception as e:
        print(f"[ERROR]: Unexpected error processing preview request for '{cluster_id}': {e}")
        return Response(f"Internal error processing preview request: {str(e)}", status=500, mimetype="text/plain")