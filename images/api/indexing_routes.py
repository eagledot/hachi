import os
import threading
from flask import Blueprint, request, jsonify

from semantic_search import appConfig, indexStatus, generate_endpoint, check_extension_status, indexing_thread

indexing_bp = Blueprint('indexing_routes', __name__)

@indexing_bp.route("/indexStart", methods=["POST"])        
def indexStart(batch_size=1):
    """
    Start indexing process for a given directory or remote protocol.
    
    This endpoint initiates the image indexing process which extracts metadata,
    generates embeddings, and builds searchable indices for images.
    
    Form Parameters:
        image_directory_path (str): Path to directory containing images to index,
                                   or name of supported remote protocol (e.g., "google_photos")
        complete_rescan (str): "true" to perform complete rescan (clears existing data),
                              "false" for incremental indexing (default)
    
    Returns:
        JSON response with:
        - success (bool): Whether indexing was successfully started
        - statusEndpoint (str): Client ID for tracking indexing progress (on success)
        - reason (str): Success/error message
    
    Error Conditions:
        - 400: Missing or invalid form parameters
        - 404: Directory path doesn't exist on server
        - 409: Indexing already in progress for this directory
        - 500: Extension not ready for remote protocols
    
    Behavior:
        - Validates directory existence or remote protocol support
        - Checks extension readiness for remote protocols
        - Prevents concurrent indexing of same directory
        - Starts indexing in background thread
        - Returns immediately with tracking endpoint
    """    
    # Extract and validate form parameters
    index_root_dir = request.form.get("image_directory_path")
    if not index_root_dir:
        return jsonify({
            "success": False, 
            "reason": "Missing required parameter: image_directory_path"
        })
    
    index_root_dir = index_root_dir.strip()
    if not index_root_dir:
        return jsonify({
            "success": False, 
            "reason": "Empty image_directory_path parameter"
        })

    # Parse complete_rescan parameter
    complete_rescan = request.form.get("complete_rescan", "false").strip().lower()
    complete_rescan_arg = complete_rescan == "true"
    
    # Normalize directory path if it's a file path
    if os.path.exists(index_root_dir) and not os.path.isdir(index_root_dir):
        index_root_dir = os.path.dirname(index_root_dir)
        print(f"[INFO]: Converted file path to directory: {index_root_dir}")
    
    # Validate directory existence or remote protocol support
    is_remote_protocol = index_root_dir in appConfig.get("supported_remote_protocols", [])
    is_local_directory = os.path.exists(index_root_dir) and os.path.isdir(index_root_dir)
    
    if not (is_local_directory or is_remote_protocol):
        return jsonify({
            "success": False, 
            "reason": f"Directory '{index_root_dir}' doesn't exist on server or is not a supported remote protocol"
        })
        
    # Check extension readiness for remote protocols
    if is_remote_protocol:
        try:
            status, reason = check_extension_status(index_root_dir)
            if not status:
                return jsonify({
                    "success": False, 
                    "reason": f"Extension not ready for {index_root_dir}: {reason}"
                })
        except Exception as e:
            print(f"[ERROR]: Failed to check extension status for {index_root_dir}: {e}")
            return jsonify({
                "success": False, 
                "reason": f"Failed to verify extension status for {index_root_dir}"
            })

    # Generate client ID for tracking
    try:
        client_id = generate_endpoint(index_root_dir)
    except Exception as e:
        print(f"[ERROR]: Failed to generate client ID for {index_root_dir}: {e}")
        return jsonify({
            "success": False, 
            "reason": "Failed to generate tracking ID for indexing process"
        })

    # Check if indexing is already active for this directory
    if indexStatus.is_active(client_id):
        return jsonify({
            "success": False, 
            "reason": "Indexing already in progress for this directory. Wait for completion or cancel existing process."
        })

    # Start indexing process
    try:
        indexStatus.add_endpoint_for_indexing(client_id)
        
        # Start indexing in background thread
        indexing_thread_instance = threading.Thread(
            target=indexing_thread, 
            args=(index_root_dir, client_id, complete_rescan_arg),
            name=f"IndexingThread-{client_id}",
            daemon=True
        )
        indexing_thread_instance.start()
        
        return jsonify({
            "success": True, 
            "statusEndpoint": client_id, 
            "reason": f"Indexing successfully started for '{index_root_dir}'"
        })
        
    except Exception as e:
        print(f"[ERROR]: Failed to start indexing thread for {index_root_dir}: {e}")
        # Clean up if thread start failed
        try:
            indexStatus.remove_endpoint(client_id)
        except:
            pass
        return jsonify({
            "success": False, 
            "reason": f"Failed to start indexing process: {str(e)}"
        })
    

@indexing_bp.route("/indexCancel/<endpoint>", methods=["GET"])
def indexCancel(endpoint: str):
    """
    Request cancellation of an ongoing indexing process.
    
    This endpoint signals an active indexing thread to stop processing.
    The actual cancellation is cooperative - the indexing thread must check
    for and respond to the cancellation request.
    
    URL Parameters:
        endpoint (str): The client ID/endpoint identifier for the indexing process
                       (obtained from /indexStart response)
    
    Returns:
        JSON response with:
        - success (bool): Whether cancellation request was successfully registered
        - reason (str): Success/error message
    
    Error Conditions:
        - 400: Missing or invalid endpoint parameter
        - 404: Endpoint doesn't exist (no active indexing for this endpoint)
        - 500: Internal error while processing cancellation request
    
    Behavior:
        - Validates endpoint parameter
        - Checks if indexing process exists for given endpoint
        - Registers cancellation request (cooperative cancellation)
        - Returns immediately (actual cancellation may take time)
        - Indexing thread will check and respond to cancellation signal
    """
    # Validate endpoint parameter
    if not endpoint:
        return jsonify({
            "success": False, 
            "reason": "Missing endpoint parameter"
        })
    
    endpoint = endpoint.strip()
    if not endpoint:
        return jsonify({
            "success": False, 
            "reason": "Empty endpoint parameter"
        })

    try:
        # Check if the endpoint exists and is active
        if not indexStatus.is_active(endpoint):
            return jsonify({
                "success": False, 
                "reason": f"No active indexing process found for endpoint '{endpoint}'"
            })

        # Attempt to register cancellation request
        result = indexStatus.indicate_cancellation(endpoint)
        
        if not result:
            return jsonify({
                "success": False, 
                "reason": f"Failed to register cancellation request for endpoint '{endpoint}'. Process may have already completed."
            })
        
        print(f"[INFO]: Cancellation request registered for endpoint '{endpoint}'")
        return jsonify({
            "success": True, 
            "reason": f"Cancellation request successfully registered for endpoint '{endpoint}'. Process will stop gracefully."
        })
        
    except Exception as e:
        print(f"[ERROR]: Failed to process cancellation request for endpoint '{endpoint}': {e}")
        return jsonify({
            "success": False, 
            "reason": f"Internal error while processing cancellation request: {str(e)}"
        })
    

@indexing_bp.route("/getIndexStatus/<endpoint>", methods=["GET", "POST"])
def getIndexStatus(endpoint: str):
    """
    Get or acknowledge the status of an indexing process.
    
    This endpoint provides real-time status information about an ongoing
    or completed indexing process. It supports both status queries (GET)
    and status acknowledgment (POST) for cleanup purposes.
    
    URL Parameters:
        endpoint (str): The client ID/endpoint identifier for the indexing process
                       (obtained from /indexStart response)
    
    Methods:
        GET: Retrieve current status information
        POST: Acknowledge completion status (triggers cleanup)
    
    Form Parameters (POST only):
        ack (str): Set to "true" to acknowledge DONE status and trigger cleanup
    
    Returns:
        JSON response with status information:
        - For GET: Complete status object with progress, ETA, current directory, etc.
        - For POST: Simple success confirmation
    
    Status Object Fields (GET response):
        - is_active (bool): Whether indexing is currently running
        - done (bool): Whether indexing has completed
        - progress (float): Completion percentage (0.0 to 1.0)
        - eta (str): Estimated time to completion
        - current_directory (str): Currently being processed directory
        - details (str): Additional status details
        - message (str): Completion or error message (if done)
    
    Error Conditions:
        - 400: Missing or invalid endpoint parameter
        - 404: Endpoint doesn't exist or has been cleaned up
        - 500: Internal error while retrieving status
    
    Behavior:
        - GET: Returns current status without modification
        - POST with ack="true": Removes endpoint from tracking (cleanup)
        - Validates endpoint parameter for both methods
        - Handles non-existent endpoints gracefully
    """
    # Validate endpoint parameter
    if not endpoint:
        return jsonify({
            "error": "Missing endpoint parameter"
        })
    
    endpoint = endpoint.strip()
    if not endpoint:
        return jsonify({
            "error": "Empty endpoint parameter"
        })

    try:
        if request.method == "POST":
            # Handle status acknowledgment and cleanup
            ack = request.form.get("ack", "").strip().lower()
            if ack == "true":
                # Client acknowledged the DONE status for indexing
                try:
                    indexStatus.remove_endpoint(endpoint)
                    print(f"[INFO]: Removed endpoint '{endpoint}' after client acknowledgment")
                except Exception as e:
                    print(f"[WARNING]: Failed to remove endpoint '{endpoint}': {e}")
                    # Don't fail the request if cleanup fails
                
            return jsonify({"success": True})
        
        else:
            # Handle status query (GET request)
            if not indexStatus.is_active(endpoint):
                # Check if this endpoint ever existed or was already cleaned up
                return jsonify({
                    "error": f"No indexing process found for endpoint '{endpoint}'. It may have completed and been acknowledged, or never existed."
                })
            
            status_info = indexStatus.get_status(endpoint)
            if status_info is None:
                return jsonify({
                    "error": f"Failed to retrieve status for endpoint '{endpoint}'"
                })
            
            return jsonify(status_info)
            
    except Exception as e:
        print(f"[ERROR]: Failed to process status request for endpoint '{endpoint}': {e}")
        return jsonify({
            "error": f"Internal error while processing status request: {str(e)}"
        })