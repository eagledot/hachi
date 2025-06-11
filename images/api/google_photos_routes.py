import json
import os
import webbrowser
from typing import Dict, Any
from flask import Blueprint, request, jsonify, Response
import requests
import os

from semantic_search import (
    googlePhotos, global_lock, GAuthFlowStatus,
    read_gClient_secret, write_gClient_credentials
)

gphotos_bp = Blueprint('google_photos_routes', __name__)

@gphotos_bp.route("/gClientInfo", methods=["GET"])
def gClientInfo() -> Response:
    """
    Get Google Photos client configuration information.
    
    This endpoint returns the current status and configuration of the Google Photos
    client, including whether it's activated and any relevant client metadata.
    
    Returns:
        JSON response with client information:
        - is_activated (bool): Whether Google Photos integration is active
        - client_id (str): OAuth client ID (if configured)
        - Other client-specific configuration details
    
    Error Conditions:
        - 500: Internal error retrieving client information
    
    Behavior:
        - Returns current Google Photos client status
        - Safe to call even if client is not configured
        - Does not expose sensitive credentials
    """
    try:
        client_info = googlePhotos.get_client_info()
        return jsonify(client_info)
    except Exception as e:
        print(f"[ERROR]: Failed to get Google Photos client info: {e}")
        return jsonify({
            "error": f"Failed to retrieve client information: {str(e)}"
        }), 500


@gphotos_bp.route("/uploadClientData", methods=["POST"])
def uploadClientData() -> Response:
    """
    Upload and configure Google Photos OAuth client credentials.
    
    This endpoint accepts OAuth client configuration data (typically from
    Google Cloud Console) and configures the Google Photos integration.
    
    Form Parameters:
        client_data (str): JSON string containing OAuth client configuration
                          (client_id, client_secret, auth_uri, token_uri, etc.)
    
    Returns:
        JSON response with:
        - success (bool): Whether client data was successfully configured
        - error (str): Error message if configuration failed
    
    Error Conditions:
        - 400: Missing or invalid client_data parameter
        - 400: Invalid JSON format in client_data
        - 500: Internal error configuring client
    
    Behavior:
        - Validates and parses client configuration JSON
        - Stores client credentials securely
        - Initializes Google Photos client with new configuration
    """
    try:
        # Extract and validate client data parameter
        client_data_str = request.form.get("client_data")
        if not client_data_str:
            return jsonify({
                "success": False,
                "error": "Missing required parameter: client_data"
            }), 400
        
        client_data_str = client_data_str.strip()
        if not client_data_str:
            return jsonify({
                "success": False,
                "error": "Empty client_data parameter"
            }), 400
        
        # Parse JSON client data
        try:
            client_data = json.loads(client_data_str)
        except json.JSONDecodeError as e:
            return jsonify({
                "success": False,
                "error": f"Invalid JSON format in client_data: {str(e)}"
            }), 400
        
        # Validate required fields
        required_fields = ["client_id", "client_secret", "auth_uri", "token_uri"]
        missing_fields = [field for field in required_fields if field not in client_data]
        if missing_fields:
            return jsonify({
                "success": False,
                "error": f"Missing required fields in client_data: {missing_fields}"
            }), 400
        
        # Configure Google Photos client
        googlePhotos.add_new_client(client_data)
        print(f"[INFO]: Successfully configured Google Photos client")
        
        return jsonify({"success": True})
        
    except Exception as e:
        print(f"[ERROR]: Failed to upload client data: {e}")
        return jsonify({
            "success": False,
            "error": f"Failed to configure client: {str(e)}"
        }), 500


@gphotos_bp.route("/beginGAuthFlow", methods=["GET"])
def beginGAuthFlow() -> Response:
    """
    Initiate Google Photos OAuth authentication flow.
    
    This endpoint starts the OAuth 2.0 authorization flow by opening the
    Google authorization URL in the user's default browser and updating
    the authentication status.
    
    Returns:
        Simple text response indicating flow initiation status
    
    Error Conditions:
        - 400: Client not configured (missing client secrets)
        - 500: Internal error reading client configuration or opening browser
    
    Behavior:
        - Reads OAuth client configuration from secure storage
        - Constructs authorization URL with appropriate scopes
        - Opens authorization URL in user's default browser
        - Updates global authentication flow status
        - Returns immediately (user completes auth in browser)
    """
    try:
        # Read client configuration
        try:
            client_data = read_gClient_secret(password=None)
        except Exception as e:
            print(f"[ERROR]: Failed to read client secrets: {e}")
            return jsonify({
                "error": "Google Photos client not configured. Please upload client data first."
            }), 400
        
        # Validate required configuration
        required_fields = ["client_id", "auth_uri", "redirect_uris"]
        missing_fields = [field for field in required_fields if field not in client_data]
        if missing_fields:
            return jsonify({
                "error": f"Incomplete client configuration. Missing: {missing_fields}"
            }), 400
        
        # Extract OAuth parameters
        client_id = client_data["client_id"]
        redirect_uri = client_data["redirect_uris"][0]
        auth_uri = client_data["auth_uri"]
        
        # Google Photos API scope
        SCOPE = "https://www.googleapis.com/auth/photoslibrary"
        
        # Construct authorization URL
        auth_url = (
            f"{auth_uri}?response_type=code"
            f"&client_id={client_id}"
            f"&redirect_uri={redirect_uri}"
            f"&scope={SCOPE}"
            f"&access_type=offline"
        )
        
        # Open authorization URL in browser
        try:
            webbrowser.get(using=None).open(auth_url, new=1, autoraise=True)
            print(f"[INFO]: Opened Google Photos authorization URL in browser")
        except Exception as e:
            print(f"[ERROR]: Failed to open browser: {e}")
            return jsonify({
                "error": f"Failed to open authorization URL in browser: {str(e)}"
            }), 500
        
        # Update authentication flow status
        with global_lock:
            GAuthFlowStatus["status"] = "in progress"
            GAuthFlowStatus["finished"] = False
        
        return "Authorization flow initiated. Please complete authentication in your browser."
        
    except Exception as e:
        print(f"[ERROR]: Failed to begin auth flow: {e}")
        return jsonify({
            "error": f"Failed to initiate authentication flow: {str(e)}"
        }), 500


@gphotos_bp.route("/OAuthCallback", methods=["GET"])
def oAuthCallback() -> Response:
    """
    Handle OAuth callback from Google Photos authorization.
    
    This endpoint is called by Google's OAuth service after the user
    completes authorization. It exchanges the authorization code for
    access tokens and completes the authentication setup.
    
    Query Parameters:
        code (str): Authorization code from Google OAuth service
        error (str): Error code if authorization was denied/failed
    
    Returns:
        Simple text response indicating callback processing status
    
    Error Conditions:
        - 400: Missing authorization code or authorization denied
        - 500: Network error during token exchange
        - 500: Internal error processing callback
    
    Behavior:
        - Validates authorization code from callback
        - Exchanges code for access/refresh tokens
        - Stores credentials securely
        - Reinitializes Google Photos client with new tokens
        - Updates global authentication flow status
    """
    try:
        # Check for authorization errors
        error = request.args.get("error")
        if error:
            error_description = request.args.get("error_description", "Unknown error")
            print(f"[ERROR]: OAuth authorization failed: {error} - {error_description}")
            
            with global_lock:
                GAuthFlowStatus["status"] = f"Authorization failed: {error}"
                GAuthFlowStatus["finished"] = True
            
            return f"Authorization failed: {error_description}"
        
        # Extract authorization code
        auth_code = request.args.get("code")
        if not auth_code:
            print("[ERROR]: No authorization code received in callback")
            
            with global_lock:
                GAuthFlowStatus["status"] = "No authorization code received"
                GAuthFlowStatus["finished"] = True
            
            return "Error: No authorization code received"
        
        # Read client configuration for token exchange
        try:
            client_data = read_gClient_secret()
        except Exception as e:
            print(f"[ERROR]: Failed to read client configuration: {e}")
            
            with global_lock:
                GAuthFlowStatus["status"] = "Configuration error"
                GAuthFlowStatus["finished"] = True
            
            return f"Configuration error: {str(e)}"
        
        # Exchange authorization code for tokens
        token_uri = client_data["token_uri"]
        token_data = {
            'client_id': client_data["client_id"],
            'client_secret': client_data["client_secret"],
            'grant_type': 'authorization_code',
            'redirect_uri': client_data["redirect_uris"][0],
            'code': auth_code
        }
        
        try:
            print("[INFO]: Exchanging authorization code for tokens")
            response = requests.post(token_uri, data=token_data, timeout=30)
            response.raise_for_status()
            
            token_response = response.json()
            
            # Check for errors in token response
            if "error" in token_response:
                error_msg = token_response.get("error_description", token_response["error"])
                print(f"[ERROR]: Token exchange failed: {error_msg}")
                
                with global_lock:
                    GAuthFlowStatus["status"] = f"Token exchange failed: {error_msg}"
                    GAuthFlowStatus["finished"] = True
                
                return f"Token exchange failed: {error_msg}"
            
        except requests.exceptions.RequestException as e:
            print(f"[ERROR]: Network error during token exchange: {e}")
            
            with global_lock:
                GAuthFlowStatus["status"] = "Network error"
                GAuthFlowStatus["finished"] = True
            
            return f"Network error during authentication: {str(e)}"
          # Store credentials securely
        try:
            write_gClient_credentials(token_response, password=None)
            print("[INFO]: Successfully stored OAuth credentials")
        except Exception as e:
            print(f"[ERROR]: Failed to store credentials: {e}")
            
            with global_lock:
                GAuthFlowStatus["status"] = "Failed to store credentials"
                GAuthFlowStatus["finished"] = True
            
            return f"Failed to store credentials: {str(e)}"
        
        # Reinitialize Google Photos client with new credentials
        try:
            global googlePhotos
            from semantic_search import GooglePhotos
            googlePhotos = GooglePhotos()
            print("[INFO]: Successfully reinitialized Google Photos client")
        except Exception as e:
            print(f"[ERROR]: Failed to reinitialize Google Photos client: {e}")
            # Don't fail the entire callback for this - credentials are stored
        
        # Update authentication flow status
        with global_lock:
            GAuthFlowStatus["status"] = "Success"
            GAuthFlowStatus["finished"] = True
        
        return "Google Photos authentication completed successfully!"
        
    except Exception as e:
        print(f"[ERROR]: Unexpected error in OAuth callback: {e}")
        
        with global_lock:
            GAuthFlowStatus["status"] = f"Internal error: {str(e)}"
            GAuthFlowStatus["finished"] = True
        
        return f"Internal error: {str(e)}"


@gphotos_bp.route("/statusGAuthFlow", methods=["GET"])
def statusGAuthFlow() -> Response:
    """
    Get the current status of Google Photos OAuth authentication flow.
    
    This endpoint returns the current state of the authentication process,
    which can be polled by clients to track progress.
    
    Returns:
        JSON response with authentication status:
        - status (str): Current status message
        - finished (bool): Whether the authentication flow is complete
    
    Error Conditions:
        - 500: Internal error accessing status information
    
    Behavior:
        - Thread-safe access to global authentication status
        - Returns current status without modification
        - Safe to poll frequently for status updates
    """
    try:
        with global_lock:
            return jsonify(dict(GAuthFlowStatus))
    except Exception as e:
        print(f"[ERROR]: Failed to get auth flow status: {e}")
        return jsonify({
            "error": f"Failed to retrieve authentication status: {str(e)}"
        }), 500


@gphotos_bp.route("/startDownload", methods=["POST"])
def startDownload() -> Response:
    """
    Start downloading media from Google Photos.
    
    This endpoint initiates the download process for Google Photos media items.
    The download runs in a background thread and can be monitored via the
    download status endpoint.
    
    Returns:
        JSON response with:
        - success (bool): Whether download was successfully started
        - error (str): Error message if download failed to start
    
    Error Conditions:
        - 400: Client not configured or not authenticated
        - 409: Download already in progress
        - 500: Internal error starting download
    
    Behavior:
        - Checks if Google Photos client is properly configured
        - Starts background download thread
        - Returns immediately (download continues in background)
        - Use getDownloadStatus to monitor progress
    """
    try:
        # Check if client is configured and authenticated
        client_info = googlePhotos.get_client_info()
        if not client_info.get("is_activated", False):
            return jsonify({
                "success": False,
                "error": "Google Photos client not activated. Please complete authentication first."
            }), 400
        
        # Start download process
        success = googlePhotos.start_download()
        if success:
            print("[INFO]: Successfully started Google Photos download")
            return jsonify({"success": True})
        else:
            return jsonify({
                "success": False,
                "error": "Download already in progress"
            }), 409
            
    except Exception as e:
        print(f"[ERROR]: Failed to start download: {e}")
        return jsonify({
            "success": False,
            "error": f"Failed to start download: {str(e)}"
        }), 500


@gphotos_bp.route("/stopDownload", methods=["POST"])
def stopDownload() -> Response:
    """
    Stop the current Google Photos download process.
    
    This endpoint requests cancellation of the ongoing download process.
    The actual stopping is asynchronous and may take a few seconds.
    
    Returns:
        JSON response with:
        - success (bool): Whether stop request was successful
        - error (str): Error message if stop failed
    
    Error Conditions:
        - 400: No download in progress
        - 500: Internal error stopping download
        - 408: Timeout waiting for download to stop
    
    Behavior:
        - Requests download thread to stop gracefully
        - Waits up to 30 seconds for download to stop
        - Returns success/failure status
        - Downloads can be restarted after stopping
    """
    try:
        # Stop download process
        success = googlePhotos.stop_download()
        if success:
            print("[INFO]: Successfully stopped Google Photos download")
            return jsonify({"success": True})
        else:
            return jsonify({
                "success": False,
                "error": "Failed to stop download within timeout period"
            }), 408
            
    except Exception as e:
        print(f"[ERROR]: Failed to stop download: {e}")
        return jsonify({
            "success": False,
            "error": f"Failed to stop download: {str(e)}"
        }), 500


@gphotos_bp.route("/getDownloadStatus", methods=["GET"])
def getDownloadStatus() -> Response:
    """
    Get the current status of Google Photos download process.
    
    This endpoint returns real-time information about the download progress,
    including number of items downloaded and current status.
    
    Returns:
        JSON response with download status:
        - finished (bool): Whether download is complete
        - available (int): Total number of items to download (if known)
        - downloaded (int): Number of items already downloaded  
        - details (str): Current download details/filename
        - message (str): Final status message (if finished)
    
    Error Conditions:
        - 404: No download status available
        - 500: Internal error retrieving status
    
    Behavior:
        - Returns current download queue status
        - Safe to poll frequently for progress updates
        - Status persists until next download starts
        - Useful for progress bars and status displays
    """
    try:
        # Get download status from queue
        status = googlePhotos.get_downloading_status()
        return jsonify(status)
        
    except Exception as e:
        print(f"[ERROR]: Failed to get download status: {e}")
        return jsonify({
            "error": f"Failed to retrieve download status: {str(e)}"
        }), 500


@gphotos_bp.route("/resetClient", methods=["POST"])
def resetClient() -> Response:
    """
    Reset Google Photos client configuration and data.
    
    This endpoint completely resets the Google Photos integration by:
    - Removing all stored credentials
    - Clearing downloaded media files
    - Resetting client configuration
    - Reinitializing the client
    
    Returns:
        JSON response with:
        - success (bool): Whether reset was successful
        - error (str): Error message if reset failed
    
    Error Conditions:
        - 500: Internal error during reset
    
    Behavior:
        - Stops any ongoing downloads
        - Removes all stored OAuth credentials
        - Clears temporary downloaded files
        - Clears metadata cache
        - Requires re-authentication after reset
        - Irreversible operation - use with caution
    """
    try:
        # Reset the Google Photos client
        googlePhotos.reset()
        print("[INFO]: Successfully reset Google Photos client")
        
        return jsonify({"success": True})
        
    except Exception as e:
        print(f"[ERROR]: Failed to reset client: {e}")
        return jsonify({
            "success": False,
            "error": f"Failed to reset client: {str(e)}"
        }), 500


@gphotos_bp.route("/getTemporaryDirectory", methods=["GET"])
def getTemporaryDirectory() -> Response:
    """
    Get the temporary directory used for Google Photos downloads.
    
    This endpoint returns the path where Google Photos media files
    are temporarily stored during the indexing process.
    
    Returns:
        JSON response with:
        - directory (str): Path to temporary download directory
        - exists (bool): Whether the directory exists
    
    Error Conditions:
        - 500: Internal error retrieving directory information
    
    Behavior:
        - Returns the configured temporary directory path
        - Useful for debugging and monitoring storage usage
        - Directory is created automatically when needed
        - Files in this directory are managed by the system
    """
    try:
        temp_dir = googlePhotos.get_temp_resource_directory()
        
        return jsonify({
            "directory": str(temp_dir),
            "exists": os.path.exists(temp_dir)
        })
        
    except Exception as e:
        print(f"[ERROR]: Failed to get temporary directory: {e}")
        return jsonify({
            "error": f"Failed to retrieve temporary directory: {str(e)}"
        }), 500


@gphotos_bp.route("/refreshAccessToken", methods=["POST"])
def refreshAccessToken() -> Response:
    """
    Manually refresh the Google Photos access token.
    
    This endpoint forces a refresh of the OAuth access token using
    the stored refresh token. Normally tokens are refreshed automatically,
    but this endpoint allows manual refresh for testing or recovery.
    
    Returns:
        JSON response with:
        - success (bool): Whether token refresh was successful
        - error (str): Error message if refresh failed
        - expires_in (int): New token expiration time in seconds (if successful)
    
    Error Conditions:
        - 400: Client not configured or missing refresh token
        - 401: Invalid or expired refresh token
        - 500: Network error or internal error
    
    Behavior:
        - Uses stored refresh token to get new access token
        - Updates stored credentials with new token
        - Returns new token expiration information
        - Useful for testing authentication or recovering from token issues
    """
    try:
        # Check if client is configured
        client_info = googlePhotos.get_client_info()
        if not client_info.get("client_id_available", False):
            return jsonify({
                "success": False,
                "error": "Google Photos client not configured"
            }), 400
        
        # Attempt to refresh the access token
        result = googlePhotos.update_access_token()
        
        if result["success"]:
            print("[INFO]: Successfully refreshed Google Photos access token")
            return jsonify({
                "success": True,
                "expires_in": result.get("expires_in", 3600)
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get("reason", "Unknown error")
            }), 401
            
    except Exception as e:
        print(f"[ERROR]: Failed to refresh access token: {e}")
        return jsonify({
            "success": False,
            "error": f"Failed to refresh access token: {str(e)}"
        }), 500