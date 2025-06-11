# maybe we can use relative imports to make it work with LSP and easier to read.
# also just later change the workingdirectory "." in-place for "./images", that should be enough !

import sys
import os
import time

PYTHON_MODULES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "python_modules")
IMAGE_APP_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".")
IMAGE_APP_INDEX_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".", "index")
IMAGE_APP_ML_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".", "ml")

sys.path.insert(0, IMAGE_APP_PATH)
sys.path.insert(0, IMAGE_APP_INDEX_PATH)
sys.path.insert(0, IMAGE_APP_ML_PATH)
sys.path.insert(0, PYTHON_MODULES_PATH)

# imports
from typing import Optional, Union, Tuple, List, Iterable, Dict, Any
from threading import RLock
import threading
import time
from collections import OrderedDict
import uuid
import base64
import traceback

import cv2
from flask import Flask
import flask
import numpy as np

from config import appConfig

# config:
IMAGE_PERSON_PREVIEW_DATA_PATH = appConfig["image_person_preview_data_path"]
IMAGE_PREVIEW_DATA_PATH = appConfig["image_preview_data_path"]
IMAGE_INDEX_SHARD_SIZE = appConfig["image_index_shard_size"]
TOP_K_SHARD = appConfig["topK_per_shard"]

from image_index import ImageIndex
from face_clustering import FaceIndex
# from meta_index import MetaIndex, collect_resources
from meta_indexV2 import MetaIndex, collect_resources

from global_data_cache import GlobalDataCache

import clip_python_module as clip
#import faceEmbeddings_python_module as pipeline

USER_CLUSTER_ID_2_ORIGINAL = {} # a session cache to help ..

def generate_endpoint(directory_path: str) -> str:
    """
    Generate a unique endpoint identifier from a directory path.
    
    Converts a directory path into a safe string that can be used as an endpoint
    identifier by replacing path separators and handling special characters.
    
    Args:
        directory_path: The directory path to convert into an endpoint
        
    Returns:
        str: A sanitized endpoint string safe for use as an identifier
        
    Raises:
        ValueError: If directory_path is empty or invalid
        
    Examples:
        >>> generate_endpoint("/home/user/photos")
        "home-user-photos"
        
        >>> generate_endpoint("C:\\Users\\Photos")
        "c-users-photos"
        
        >>> generate_endpoint("  /path/with/spaces  ")
        "path-with-spaces"
    """
    if not directory_path or not isinstance(directory_path, str):
        raise ValueError("Directory path must be a non-empty string")
    
    # Clean and normalize the input
    cleaned_path = directory_path.strip()
    if not cleaned_path:
        raise ValueError("Directory path cannot be empty or whitespace only")
    
    # Convert to lowercase for consistency
    endpoint = cleaned_path.lower()
    
    # Replace path separators with hyphens
    endpoint = endpoint.replace("/", "-")
    endpoint = endpoint.replace("\\", "-")
    
    # Replace other common problematic characters
    endpoint = endpoint.replace(":", "-")  # Windows drive letters
    endpoint = endpoint.replace(" ", "-")  # Spaces
    endpoint = endpoint.replace(".", "-")  # Dots
    endpoint = endpoint.replace("_", "-")  # Underscores (normalize to hyphens)
    
    # Remove or replace other special characters that might cause issues
    import re
    endpoint = re.sub(r'[^\w\-]', '-', endpoint)  # Replace non-alphanumeric chars with hyphens
    
    # Clean up multiple consecutive hyphens
    endpoint = re.sub(r'-+', '-', endpoint)
    
    # Remove leading/trailing hyphens
    endpoint = endpoint.strip('-')
    
    # Ensure the endpoint is not empty after cleaning
    if not endpoint:
        # Fallback: generate a hash-based endpoint
        import hashlib
        hash_obj = hashlib.md5(directory_path.encode('utf-8'))
        endpoint = f"endpoint-{hash_obj.hexdigest()[:8]}"
    
    # Limit length to prevent overly long endpoints
    max_length = 100
    if len(endpoint) > max_length:
        # Truncate and add hash suffix to maintain uniqueness
        import hashlib
        hash_obj = hashlib.md5(directory_path.encode('utf-8'))
        hash_suffix = hash_obj.hexdigest()[:8]
        truncated_length = max_length - len(hash_suffix) - 1  # -1 for hyphen
        endpoint = f"{endpoint[:truncated_length]}-{hash_suffix}"
    
    return endpoint


def validate_endpoint(endpoint: str) -> bool:
    """
    Validate that an endpoint string is safe for use.
    
    Args:
        endpoint: The endpoint string to validate
        
    Returns:
        bool: True if the endpoint is valid, False otherwise
    """
    if not endpoint or not isinstance(endpoint, str):
        return False
    
    # Check length
    if len(endpoint) > 100 or len(endpoint) < 1:
        return False
    
    # Check for valid characters (alphanumeric and hyphens only)
    import re
    if not re.match(r'^[a-z0-9\-]+$', endpoint):
        return False
    
    # Check that it doesn't start or end with hyphen
    if endpoint.startswith('-') or endpoint.endswith('-'):
        return False
    
    # Check for consecutive hyphens
    if '--' in endpoint:
        return False
    
    return True


def normalize_path_for_endpoint(path: str) -> str:
    """
    Normalize a path for use in endpoint generation.
    
    Args:
        path: The path to normalize
        
    Returns:
        str: Normalized path string
    """
    if not path:
        return ""
    
    # Convert to absolute path and normalize
    import os
    try:
        normalized = os.path.normpath(os.path.abspath(path))
        return normalized
    except (OSError, ValueError):
        # If path normalization fails, return original cleaned path
        return path.strip()

import re
from urllib.parse import unquote

def parse_query(query: str) -> Dict[str, List[str]]:
    """
    Parse a search query string into structured attribute-value mappings.
    
    Query format: "attribute1=value1&attribute2=value2a?value2b"
    - & separates different attributes
    - = separates attribute from values  
    - ? separates multiple values for the same attribute
    
    Args:
        query: Query string to parse (e.g., "person=john?jane&location=paris")
        
    Returns:
        Dict mapping attribute names to lists of values
        Example: {"person": ["john", "jane"], "location": ["paris"]}
        
    Raises:
        ValueError: If query format is invalid
        
    Examples:
        >>> parse_query("person=john&location=paris")
        {"person": ["john"], "location": ["paris"]}
        
        >>> parse_query("person=john?jane&tag=vacation?summer")
        {"person": ["john", "jane"], "tag": ["vacation", "summer"]}
        
        >>> parse_query("  PERSON=John?JANE  &  location=Paris  ")
        {"person": ["john", "jane"], "location": ["paris"]}
    """
    if not query or not isinstance(query, str):
        return {}
    
    # Clean and validate input
    query = query.strip()
    if not query:
        return {}
    
    # URL decode the query to handle encoded characters
    try:
        query = unquote(query)
    except Exception as e:
        print(f"[WARNING] Failed to URL decode query '{query}': {e}")
        # Continue with original query if decoding fails
    
    # Configuration for query parsing
    OR_SEPARATOR = "?"      # Multiple values for same attribute
    AND_SEPARATOR = "&"     # Multiple attributes
    ASSIGNMENT_OPERATOR = "="  # Attribute-value separator
    
    # Validate query structure
    if ASSIGNMENT_OPERATOR not in query:
        raise ValueError(f"Invalid query format: missing '{ASSIGNMENT_OPERATOR}' operator")
    
    result: Dict[str, List[str]] = {}
    
    try:
        # Split into attribute-value pairs
        attribute_pairs = [pair.strip() for pair in query.split(AND_SEPARATOR)]
        
        for pair in attribute_pairs:
            if not pair:  # Skip empty pairs
                continue
                
            # Validate pair structure
            if ASSIGNMENT_OPERATOR not in pair:
                print(f"[WARNING] Skipping invalid attribute pair: '{pair}' (missing '=')")
                continue
            
            # Split attribute and values
            parts = pair.split(ASSIGNMENT_OPERATOR, 1)  # Split only on first '='
            if len(parts) != 2:
                print(f"[WARNING] Skipping malformed pair: '{pair}'")
                continue
            
            attribute_name = parts[0].strip().lower()
            values_string = parts[1].strip()
            
            # Validate attribute name
            if not attribute_name:
                print(f"[WARNING] Skipping pair with empty attribute name: '{pair}'")
                continue
            
            # Validate attribute name format (alphanumeric + underscore only)
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', attribute_name):
                print(f"[WARNING] Invalid attribute name format: '{attribute_name}'. "
                     f"Must start with letter/underscore and contain only alphanumeric/underscore")
                continue
            
            # Parse values (split by OR_SEPARATOR)
            raw_values = [val.strip() for val in values_string.split(OR_SEPARATOR)]
            
            # Filter out empty values and validate
            valid_values = []
            for value in raw_values:
                if value:  # Non-empty value
                    # Convert to lowercase for case-insensitive matching
                    normalized_value = value.lower()
                    
                    # Validate value format (no control characters)
                    if re.search(r'[\x00-\x1f\x7f]', normalized_value):
                        print(f"[WARNING] Skipping value with control characters: '{value}'")
                        continue
                    
                    # Limit value length to prevent abuse
                    if len(normalized_value) > 500:  # Configurable limit
                        print(f"[WARNING] Truncating overly long value: '{normalized_value[:50]}...'")
                        normalized_value = normalized_value[:500]
                    
                    valid_values.append(normalized_value)
            
            # Only add attribute if it has valid values
            if valid_values:
                # Merge with existing values if attribute already exists
                if attribute_name in result:
                    # Remove duplicates while preserving order
                    existing_values = set(result[attribute_name])
                    for value in valid_values:
                        if value not in existing_values:
                            result[attribute_name].append(value)
                            existing_values.add(value)
                else:
                    # Remove duplicates from current values
                    result[attribute_name] = list(dict.fromkeys(valid_values))
            else:
                print(f"[WARNING] Skipping attribute '{attribute_name}' with no valid values")
    
    except Exception as e:
        print(f"[ERROR] Failed to parse query '{query}': {e}")
        raise ValueError(f"Query parsing failed: {e}")
    
    # Validate final result
    if not result:
        print(f"[INFO] Query '{query}' produced no valid attribute-value pairs")
    
    return result


def validate_query_syntax(query: str) -> Tuple[bool, str]:
    """
    Validate query syntax without parsing.
    
    Args:
        query: Query string to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not query or not isinstance(query, str):
        return False, "Query must be a non-empty string"
    
    query = query.strip()
    if not query:
        return False, "Query cannot be empty or whitespace only"
    
    # Check for required operators
    if "=" not in query:
        return False, "Query must contain at least one '=' operator"
    
    # Check for malformed patterns
    if query.startswith("&") or query.endswith("&"):
        return False, "Query cannot start or end with '&'"
    
    if query.startswith("=") or query.endswith("="):
        return False, "Query cannot start or end with '='"
    
    if "==" in query:
        return False, "Query cannot contain consecutive '=' operators"
    
    if "&&" in query:
        return False, "Query cannot contain consecutive '&' operators"
    
    return True, ""


def get_query_examples() -> List[str]:
    """
    Get example query strings for documentation/testing.
    
    Returns:
        List of valid example queries
    """
    return [
        "person=john",
        "person=john?jane&location=paris",
        "tag=vacation?summer&year=2023",
        "person=alice&location=tokyo?osaka&tag=travel",
        "filename=IMG_001?IMG_002&person=bob",
        "location=beach&tag=sunset?golden_hour&person=family"
    ]


from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta

class IndexingPhase(Enum):
    """Enumeration of different indexing phases."""
    INITIALIZING = "initializing"
    SCANNING = "scanning"
    PROCESSING = "processing"
    FINALIZING = "finalizing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ERROR = "error"

@dataclass
class IndexingStatus:
    """Data class representing the current status of an indexing operation."""
    done: bool = False
    current_directory: str = "unknown"
    eta: Optional[str] = "unknown"
    details: str = ""
    progress: float = 0.0
    should_cancel: bool = False
    phase: IndexingPhase = IndexingPhase.INITIALIZING
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_items: int = 0
    processed_items: int = 0

class IndexStatus:
    """
    Thread-safe class for managing indexing operation status tracking.
    
    This class provides centralized status management for multiple concurrent
    indexing operations, identified by unique endpoint/client IDs.
    """

    def __init__(self) -> None:
        """Initialize the IndexStatus manager."""
        self._status_dict: Dict[str, IndexingStatus] = {}
        self._lock = RLock()

    def is_done(self, endpoint: str) -> bool:
        """
        Check if indexing is complete for the given endpoint.
        
        Args:
            endpoint: Unique identifier for the indexing operation
            
        Returns:
            bool: True if indexing is done, False otherwise
        """
        with self._lock:
            if endpoint not in self._status_dict:
                return True  # No active indexing means it's "done"
            return self._status_dict[endpoint].done

    def add_endpoint_for_indexing(self, endpoint: str) -> bool:
        """
        Register a new endpoint for indexing operations.
        
        Args:
            endpoint: Unique identifier for the indexing operation
            
        Returns:
            bool: True if successfully added, False if already exists
            
        Raises:
            ValueError: If endpoint is empty or invalid
        """
        if not endpoint or not isinstance(endpoint, str):
            raise ValueError("Endpoint must be a non-empty string")
            
        with self._lock:
            if endpoint in self._status_dict:
                return False  # Already exists
                
            self._status_dict[endpoint] = IndexingStatus(
                start_time=datetime.now(),
                phase=IndexingPhase.INITIALIZING
            )
            return True

    def set_done(self, endpoint: str, message: Optional[str] = None, is_error: bool = False) -> None:
        """
        Mark indexing as complete for the given endpoint.
        
        Args:
            endpoint: Unique identifier for the indexing operation
            message: Optional completion message or error details
            is_error: Whether the completion is due to an error
        """
        with self._lock:
            if endpoint not in self._status_dict:
                print(f"[WARNING] Attempting to mark unknown endpoint as done: {endpoint}")
                return
                
            status = self._status_dict[endpoint]
            status.done = True
            status.end_time = datetime.now()
            status.phase = IndexingPhase.ERROR if is_error else IndexingPhase.COMPLETED
            
            if message:
                status.details = str(message)
            elif not is_error:
                status.details = "SUCCESS"

    def update_status(
        self, 
        endpoint: str, 
        current_directory: str = "", 
        progress: float = 0.0, 
        eta: Optional[str] = None, 
        details: str = "",
        phase: Optional[IndexingPhase] = None,
        total_items: Optional[int] = None,
        processed_items: Optional[int] = None
    ) -> bool:
        """
        Update the status of an ongoing indexing operation.
        
        Args:
            endpoint: Unique identifier for the indexing operation
            current_directory: Directory currently being processed
            progress: Progress as a float between 0.0 and 1.0
            eta: Estimated time of arrival as a formatted string
            details: Additional status details
            phase: Current indexing phase
            total_items: Total number of items to process
            processed_items: Number of items already processed
            
        Returns:
            bool: True if update was successful, False if endpoint not found
        """
        with self._lock:
            if endpoint not in self._status_dict:
                print(f"[WARNING] Attempting to update unknown endpoint: {endpoint}")
                return False
                
            status = self._status_dict[endpoint]
            
            # Validate and clamp progress
            progress = max(0.0, min(1.0, progress))
            
            # Update status fields
            status.current_directory = current_directory
            status.progress = progress
            status.eta = eta or "unknown"
            status.details = details
            
            if phase is not None:
                status.phase = phase
                
            if total_items is not None:
                status.total_items = total_items
                
            if processed_items is not None:
                status.processed_items = processed_items
                
            return True

    def get_status(self, endpoint: str) -> Dict[str, Any]:
        """
        Get the current status for an endpoint.
        
        Args:
            endpoint: Unique identifier for the indexing operation
            
        Returns:
            Dict containing status information
        """
        with self._lock:
            if endpoint not in self._status_dict:
                # Handle phantom requests gracefully
                print(f"[WARNING] No status information for endpoint: {endpoint}. "
                     f"Client may have stale data.")
                return {
                    "done": True,
                    "details": "SUCCESS",
                    "is_active": False,
                    "current_directory": "unknown",
                    "eta": "unknown",
                    "progress": "1.0",
                    "phase": IndexingPhase.COMPLETED.value,
                    "total_items": 0,
                    "processed_items": 0
                }
            
            status = self._status_dict[endpoint]
            
            # Calculate elapsed time if still running
            elapsed_time = None
            if status.start_time and not status.done:
                elapsed_time = (datetime.now() - status.start_time).total_seconds()
            
            return {
                "done": status.done,
                "current_directory": status.current_directory,
                "eta": status.eta,
                "progress": str(status.progress),
                "details": status.details,
                "is_active": self.is_active(endpoint),
                "phase": status.phase.value,
                "total_items": status.total_items,
                "processed_items": status.processed_items,
                "elapsed_time": elapsed_time
            }

    def is_active(self, endpoint: str) -> bool:
        """
        Check if an endpoint has an active indexing operation.
        
        Args:
            endpoint: Unique identifier for the indexing operation
            
        Returns:
            bool: True if active, False otherwise
        """
        with self._lock:
            return endpoint in self._status_dict and not self._status_dict[endpoint].done

    def remove_endpoint(self, endpoint: str) -> bool:
        """
        Remove an endpoint from tracking.
        
        Args:
            endpoint: Unique identifier for the indexing operation
            
        Returns:
            bool: True if successfully removed, False if not found
        """
        with self._lock:
            if endpoint not in self._status_dict:
                # Handle phantom requests gracefully
                print(f"[INFO] Attempting to remove non-existent endpoint: {endpoint}")
                return False
                
            status = self._status_dict[endpoint]
            if not status.done:
                print(f"[WARNING] Removing endpoint {endpoint} that is not done yet")
                
            del self._status_dict[endpoint]
            return True

    def indicate_cancellation(self, endpoint: str) -> bool:
        """
        Request cancellation of an indexing operation.
        
        Args:
            endpoint: Unique identifier for the indexing operation
            
        Returns:
            bool: True if cancellation was requested, False if endpoint not found
        """
        with self._lock:
            if endpoint not in self._status_dict:
                return False
                
            status = self._status_dict[endpoint]
            status.should_cancel = True
            status.phase = IndexingPhase.CANCELLED
            return True

    def is_cancel_request_active(self, endpoint: str) -> bool:
        """
        Check if cancellation has been requested for an endpoint.
        
        Args:
            endpoint: Unique identifier for the indexing operation
            
        Returns:
            bool: True if cancellation requested, False otherwise
        """
        with self._lock:
            if endpoint not in self._status_dict:
                return False
            return self._status_dict[endpoint].should_cancel

    def get_all_active_endpoints(self) -> List[str]:
        """
        Get a list of all currently active endpoints.
        
        Returns:
            List[str]: List of active endpoint identifiers
        """
        with self._lock:
            return [
                endpoint for endpoint, status in self._status_dict.items()
                if not status.done
            ]

    def cleanup_completed_endpoints(self, max_age_hours: int = 24) -> int:
        """
        Clean up completed endpoints older than specified age.
        
        Args:
            max_age_hours: Maximum age in hours for completed endpoints
            
        Returns:
            int: Number of endpoints cleaned up
        """
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        cleanup_count = 0
        
        with self._lock:
            endpoints_to_remove = []
            
            for endpoint, status in self._status_dict.items():
                if (status.done and 
                    status.end_time and 
                    status.end_time < cutoff_time):
                    endpoints_to_remove.append(endpoint)
            
            for endpoint in endpoints_to_remove:
                del self._status_dict[endpoint]
                cleanup_count += 1
                
        if cleanup_count > 0:
            print(f"[INFO] Cleaned up {cleanup_count} completed indexing endpoints")
            
        return cleanup_count
        
########################################################################
IMAGE_EMBEDDING_SIZE = 512  # depends on the model architecture.
TEXT_EMBEDDING_SIZE = 512  # depends on the model architecture.
FACE_EMBEDDING_SIZE = 512   # depends on the model architecture.

def generate_image_embedding(
    image: Union[str, np.ndarray], 
    is_bgr: bool = True, 
    center_crop: bool = False
) -> Optional[np.ndarray]:
    """
    Generate image embeddings using CLIP model.
    
    Args:
        image: Either a file path (string) or numpy array containing image data
        is_bgr: Whether the image is in BGR format (True for OpenCV images)
        center_crop: Whether to apply center cropping to the image
        
    Returns:
        Optional[np.ndarray]: Image embedding vector of size IMAGE_EMBEDDING_SIZE,
                             or None if image processing fails
                             
    Raises:
        FileNotFoundError: If image path doesn't exist
        ValueError: If image data is invalid or embedding size is incorrect
    """
    # For debugging/simulation mode - uncomment if needed
    # return np.random.uniform(size=(IMAGE_EMBEDDING_SIZE,)).astype(np.float32)
    
    try:
        # Handle file path input
        if isinstance(image, str):
            if not os.path.exists(image):
                raise FileNotFoundError(f"Image file not found: {image}")
            
            image_data = cv2.imread(image)
            if image_data is None:
                raise ValueError(f"Failed to load image from path: {image}")
            
            # OpenCV always loads images in BGR format
            is_bgr = True
            
        # Handle numpy array input
        elif isinstance(image, np.ndarray):
            image_data = image.copy()  # Create copy to avoid modifying original
            
            # Validate image array
            if image_data.size == 0:
                raise ValueError("Empty image array provided")
            
            # Ensure image has proper dimensions
            if len(image_data.shape) < 2:
                raise ValueError(f"Invalid image dimensions: {image_data.shape}")
                
        else:
            raise TypeError(f"Unsupported image type: {type(image)}")
        
        # Additional validation for image data
        if image_data is None or image_data.size == 0:
            return None
            
        # Generate embeddings using CLIP
        try:
            image_features = clip.encode_image(
                image_data, 
                is_bgr=is_bgr, 
                center_crop=center_crop
            )
        except Exception as e:
            print(f"[ERROR] CLIP encoding failed: {e}")
            return None
        
        # Validate embedding size
        if image_features is None or image_features.size != IMAGE_EMBEDDING_SIZE:
            expected_size = IMAGE_EMBEDDING_SIZE
            actual_size = image_features.size if image_features is not None else 0
            raise ValueError(
                f"Invalid embedding size. Expected: {expected_size}, Got: {actual_size}"
            )
        
        return image_features
        
    except (FileNotFoundError, ValueError, TypeError) as e:
        print(f"[ERROR] Image embedding generation failed: {e}")
        return None
    except Exception as e:
        print(f"[ERROR] Unexpected error in image embedding generation: {e}")
        return None

def generate_text_embedding(query: str) -> Optional[np.ndarray]:
    """
    Generate text embeddings using CLIP model.
    
    Args:
        query: Text query string to encode into embedding vector
        
    Returns:
        Optional[np.ndarray]: Text embedding vector of size TEXT_EMBEDDING_SIZE,
                             or None if text processing fails
                             
    Raises:
        ValueError: If query is empty, invalid, or embedding size is incorrect
        TypeError: If query is not a string
        
    Examples:
        >>> embedding = generate_text_embedding("a photo of a cat")
        >>> embedding.shape
        (512,)
        
        >>> embedding = generate_text_embedding("person walking in park")
        >>> isinstance(embedding, np.ndarray)
        True
    """
    # For debugging/simulation mode - uncomment if needed
    # return np.random.uniform(size=(TEXT_EMBEDDING_SIZE,)).astype(np.float32)
    
    try:
        # Input validation
        if not isinstance(query, str):
            raise TypeError(f"Query must be a string, got {type(query)}")
        
        if not query:
            raise ValueError("Query cannot be empty")
        
        # Clean and validate the query
        cleaned_query = query.strip()
        if not cleaned_query:
            raise ValueError("Query cannot be empty or whitespace only")
        
        # Validate query length to prevent potential issues
        max_length = 10000  # Reasonable limit for text queries
        if len(cleaned_query) > max_length:
            print(f"[WARNING] Query length ({len(cleaned_query)}) exceeds maximum ({max_length}), truncating")
            cleaned_query = cleaned_query[:max_length]
        
        # Check for potentially problematic characters
        if any(ord(char) < 32 for char in cleaned_query if char not in '\t\n\r'):
            print(f"[WARNING] Query contains control characters, this may affect encoding")
        
        # Generate embeddings using CLIP
        try:
            text_features = clip.encode_text(cleaned_query)
        except Exception as e:
            print(f"[ERROR] CLIP text encoding failed: {e}")
            return None
        
        # Validate the output
        if text_features is None:
            print(f"[ERROR] CLIP returned None for text encoding")
            return None
        
        # Validate embedding size
        if not hasattr(text_features, 'size') or text_features.size != TEXT_EMBEDDING_SIZE:
            expected_size = TEXT_EMBEDDING_SIZE
            actual_size = text_features.size if hasattr(text_features, 'size') else 'unknown'
            raise ValueError(
                f"Invalid text embedding size. Expected: {expected_size}, Got: {actual_size}"
            )
        
        # Validate embedding data type and values
        if not isinstance(text_features, np.ndarray):
            print(f"[WARNING] Expected numpy array, got {type(text_features)}")
        
        # Check for NaN or infinite values
        if hasattr(text_features, 'dtype') and np.issubdtype(text_features.dtype, np.floating):
            if np.any(np.isnan(text_features)):
                print(f"[WARNING] Text embedding contains NaN values")
                return None
            if np.any(np.isinf(text_features)):
                print(f"[WARNING] Text embedding contains infinite values")
                return None
        
        return text_features
        
    except (ValueError, TypeError) as e:
        print(f"[ERROR] Text embedding generation failed: {e}")
        return None
    except Exception as e:
        print(f"[ERROR] Unexpected error in text embedding generation: {e}")
        return None


def validate_text_query(query: str) -> Tuple[bool, str]:
    """
    Validate a text query for embedding generation.
    
    Args:
        query: Text query to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(query, str):
        return False, f"Query must be a string, got {type(query)}"
    
    if not query:
        return False, "Query cannot be empty"
    
    cleaned_query = query.strip()
    if not cleaned_query:
        return False, "Query cannot be empty or whitespace only"
    
    # Check reasonable length limits
    if len(cleaned_query) > 10000:
        return False, f"Query too long ({len(cleaned_query)} chars), maximum is 10000"
    
    if len(cleaned_query) < 1:
        return False, "Query too short"
    
    return True, ""


def preprocess_text_query(query: str) -> str:
    """
    Preprocess a text query for optimal embedding generation.
    
    Args:
        query: Raw text query
        
    Returns:
        str: Preprocessed query string
    """
    if not isinstance(query, str):
        return ""
    
    # Basic cleanup
    processed = query.strip()
    
    # Remove excessive whitespace
    import re
    processed = re.sub(r'\s+', ' ', processed)
    
    # Remove control characters except common ones
    processed = ''.join(char for char in processed 
                       if ord(char) >= 32 or char in '\t\n\r')
    
    return processed


print("[Debug]: Loading Model, may take a few seconds.")
clip.load_text_transformer(os.path.join(IMAGE_APP_PATH, "data", "ClipTextTransformerV2.bin"))
clip.load_vit_b32Q(os.path.join(IMAGE_APP_PATH, "data", "ClipViTB32V2.bin"))

imageIndex = ImageIndex(shard_size = IMAGE_INDEX_SHARD_SIZE, embedding_size = IMAGE_EMBEDDING_SIZE)
print("Created Image index")

metaIndex = MetaIndex()
print("Created meta Index")
# all_filename = metaIndex.get_unique("filename")
# print(len(all_filename))
# print(metaIndex.query(attribute = "filename", attribute_value = "insta_bk0s3j5hejj_0.jpg"))
# assert "insta_bk0s3j5hejj_0.jpg" in all_filename

faceIndex = FaceIndex(embedding_size = FACE_EMBEDDING_SIZE)
print("Created Face Index")

indexStatus = IndexStatus()

# TODO: better to do everything through cache or caches..
dataCache = GlobalDataCache()   # a global data cache to serve raw-data for previews.
# dataCacheFull = GlobalDataCache()   # a global data cache to serve raw-data for original resources!

# config/data-structures
sessionId_to_config = {}      # a mapping to save some user specific settings for a session.
personId_to_avgEmbedding = {} # we seek to create average embedding for a group/id a face can belong to, only for a single session.
global_lock = threading.RLock()

def generate_image_preview(
    data_hash: str, 
    image: Union[str, np.ndarray], 
    face_bboxes: Optional[List[List[int]]] = None, 
    person_ids: Optional[List[str]] = None,
    max_width: int = 640,
    quality: int = 90
) -> bool:
    """
    Generate optimized image previews for faster loading and reduced storage.
    
    Creates compressed WebP preview images that maintain aspect ratio while
    reducing file size for improved performance, especially on HDDs.
    
    Args:
        data_hash: Unique hash identifier for the image
        image: Either a file path (string) or numpy array containing image data
        face_bboxes: Optional list of face bounding boxes [x, y, w, h] (currently unused)
        person_ids: Optional list of person IDs detected in image (currently unused)
        max_width: Maximum width for the preview image (default: 640)
        quality: WebP compression quality 0-100 (default: 90)
        
    Returns:
        bool: True if preview was generated successfully, False otherwise
        
    Raises:
        ValueError: If inputs are invalid
        OSError: If file operations fail
        
    Examples:
        >>> success = generate_image_preview("abc123", "/path/to/image.jpg")
        >>> success = generate_image_preview("def456", image_array, max_width=800)
    """
    if not data_hash or not isinstance(data_hash, str):
        raise ValueError("data_hash must be a non-empty string")
    
    if face_bboxes is None:
        face_bboxes = []
    if person_ids is None:
        person_ids = []
    
    try:
        # Input validation and loading
        if isinstance(image, str):
            if not os.path.exists(image):
                raise FileNotFoundError(f"Image file not found: {image}")
            
            try:
                raw_data = cv2.imread(image)
                if raw_data is None:
                    raise ValueError(f"Failed to load image from path: {image}")
            except Exception as e:
                print(f"[ERROR] Failed to read image file '{image}': {e}")
                return False
                
        elif isinstance(image, np.ndarray):
            if image.size == 0:
                raise ValueError("Empty image array provided")
            
            raw_data = image.copy()  # Create copy to avoid modifying original
            
        else:
            raise TypeError(f"Unsupported image type: {type(image)}")
        
        # Validate image data and dimensions
        if raw_data is None or raw_data.size == 0:
            print(f"[ERROR] Invalid image data for hash: {data_hash}")
            return False
        
        if len(raw_data.shape) != 3:
            print(f"[ERROR] Invalid image dimensions {raw_data.shape} for hash: {data_hash}")
            return False
        
        height, width, channels = raw_data.shape
        
        if channels not in [1, 3, 4]:  # Grayscale, RGB/BGR, or RGBA/BGRA
            print(f"[WARNING] Unusual number of channels ({channels}) for hash: {data_hash}")
        
        # Validate and clamp parameters
        max_width = max(1, min(max_width, 4096))  # Reasonable limits
        quality = max(1, min(quality, 100))
        
        # Calculate new dimensions while preserving aspect ratio
        if width <= max_width:
            # Image is already smaller than or equal to max width
            new_width = width
            new_height = height
        else:
            # Scale down proportionally
            aspect_ratio = height / width
            new_width = max_width
            new_height = int(aspect_ratio * new_width)
        
        # Ensure minimum dimensions
        new_width = max(1, new_width)
        new_height = max(1, new_height)
        
        # Resize image if necessary
        if new_width != width or new_height != height:
            try:
                # Use high-quality interpolation for better results
                interpolation = cv2.INTER_LANCZOS4 if (new_width < width) else cv2.INTER_CUBIC
                raw_data_resized = cv2.resize(raw_data, (new_width, new_height), interpolation=interpolation)
            except Exception as e:
                print(f"[ERROR] Failed to resize image for hash {data_hash}: {e}")
                return False
        else:
            raw_data_resized = raw_data
        
        # Ensure output directory exists
        try:
            os.makedirs(IMAGE_PREVIEW_DATA_PATH, exist_ok=True)
        except OSError as e:
            print(f"[ERROR] Failed to create preview directory: {e}")
            return False
        
        # Generate output path
        output_path = os.path.join(IMAGE_PREVIEW_DATA_PATH, f"{data_hash}.webp")
        
        # Save as WebP with specified quality
        try:
            success = cv2.imwrite(
                output_path, 
                raw_data_resized, 
                [int(cv2.IMWRITE_WEBP_QUALITY), quality]
            )
            
            if not success:
                print(f"[ERROR] Failed to write preview image for hash: {data_hash}")
                return False
                
        except Exception as e:
            print(f"[ERROR] Exception while writing preview for hash {data_hash}: {e}")
            return False
        
        # Verify the file was created and has reasonable size
        try:
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                if file_size == 0:
                    print(f"[WARNING] Generated preview file is empty for hash: {data_hash}")
                    return False
                elif file_size > 50 * 1024 * 1024:  # 50MB limit
                    print(f"[WARNING] Generated preview file is very large ({file_size} bytes) for hash: {data_hash}")
            else:
                print(f"[ERROR] Preview file was not created for hash: {data_hash}")
                return False
        except OSError as e:
            print(f"[WARNING] Could not verify preview file for hash {data_hash}: {e}")
        
        return True
        
    except (ValueError, TypeError, FileNotFoundError) as e:
        print(f"[ERROR] Preview generation failed for hash {data_hash}: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Unexpected error generating preview for hash {data_hash}: {e}")
        return False


def validate_preview_parameters(
    data_hash: str, 
    max_width: int = 640, 
    quality: int = 90
) -> Tuple[bool, str]:
    """
    Validate parameters for preview generation.
    
    Args:
        data_hash: Hash identifier to validate
        max_width: Maximum width to validate
        quality: Quality setting to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not data_hash or not isinstance(data_hash, str):
        return False, "data_hash must be a non-empty string"
    
    if len(data_hash) > 256:  # Reasonable limit for hash length
        return False, f"data_hash too long ({len(data_hash)} chars), maximum is 256"
    
    if not isinstance(max_width, int) or max_width < 1 or max_width > 4096:
        return False, f"max_width must be between 1 and 4096, got {max_width}"
    
    if not isinstance(quality, int) or quality < 1 or quality > 100:
        return False, f"quality must be between 1 and 100, got {quality}"
    
    return True, ""


def get_preview_path(data_hash: str) -> str:
    """
    Get the file path for a preview image.
    
    Args:
        data_hash: Hash identifier for the image
        
    Returns:
        str: Full path to the preview file
    """
    if not data_hash:
        return ""
    
    return os.path.join(IMAGE_PREVIEW_DATA_PATH, f"{data_hash}.webp")


def preview_exists(data_hash: str) -> bool:
    """
    Check if a preview image already exists.
    
    Args:
        data_hash: Hash identifier for the image
        
    Returns:
        bool: True if preview exists and is valid, False otherwise
    """
    if not data_hash:
        return False
    
    preview_path = get_preview_path(data_hash)
    
    try:
        return os.path.exists(preview_path) and os.path.getsize(preview_path) > 0
    except OSError:
        return False

def index_image_resources(resources_batch:List[os.PathLike], prefix_personId:str, generate_preview_data:bool = True, remote_protocol:Optional[str] = None):
    hash_2_metaData = metaIndex.extract_image_metaData(resources_batch)       # extra meta data
    for data_hash, meta_data in hash_2_metaData.items():
        assert data_hash is not None
        absolute_path = meta_data["absolute_path"]
        is_indexed = meta_data["is_indexed"]
        if is_indexed:
            continue
        
        # read raw-data only once.. and share it for image-clip,face and previews
        frame = cv2.imread(absolute_path)
        if frame is None:
            print("[WARNING]: Invalid data for {}".format(absolute_path))
            continue
        is_bgr = True

        # generate image embeddings
        image_embedding = generate_image_embedding(image = frame, is_bgr = is_bgr, center_crop=False)
        if image_embedding is None:
            print("Invalid data for {}".format(absolute_path))
            continue
        
        meta_data["person"] = ["no_person_detected"] # it is supposed to be updated, after clusters finalizing.
        # sync/update both the indices.
        meta_data["is_indexed"] = True

        # merge remote meta-data too if allowed remoted protocol.
        if remote_protocol == "google_photos":
            remote_meta_data = googlePhotos.get_remote_meta(data_hash)
            meta_data["remote"] = remote_meta_data  
            meta_data["resource_directory"] = "google_photos"
            meta_data["absolute_path"] = "remote"
        
        metaIndex.update(data_hash, meta_data) # TODO: append instead of update for clearer semantics!
        imageIndex.update(data_hash, data_embedding = image_embedding)
        faceIndex.update(
            frame = frame,
            absolute_path = absolute_path,
            resource_hash = data_hash,
            is_bgr = True)
        
        generate_image_preview(data_hash, image = frame, face_bboxes = None, person_ids=[])                

def _clean_person_previews(client_id: str) -> None:
    """Clean up person preview files during complete rescan."""
    indexStatus.update_status(
        client_id, 
        current_directory="", 
        progress=0, 
        eta="unknown", 
        details="Removing person previews.."
    )
    
    try:
        preview_files = os.listdir(IMAGE_PERSON_PREVIEW_DATA_PATH)
        total_files = len(preview_files)
        
        for i, preview_file in enumerate(preview_files):
            try:
                os.remove(os.path.join(IMAGE_PERSON_PREVIEW_DATA_PATH, preview_file))
            except OSError as e:
                print(f"Error deleting preview file {preview_file}: {e}")
            
            # Update progress every 20 files
            if i % 20 == 0:
                progress = (i + 1) / total_files if total_files > 0 else 1
                indexStatus.update_status(
                    client_id, 
                    current_directory="", 
                    progress=progress, 
                    eta="unknown", 
                    details="Removing person previews.."
                )
    except OSError as e:
        print(f"Error accessing preview directory: {e}")


def _reset_indices(client_id: str) -> None:
    """Reset all indices during complete rescan."""
    indexStatus.update_status(
        client_id, 
        current_directory="", 
        progress=0, 
        eta="unknown", 
        details="Removing old indices.."
    )
    
    faceIndex.reset()
    imageIndex.reset()
    metaIndex.reset()


def _handle_google_photos_download(client_id: str, remote_protocol: str) -> Tuple[bool, str, str]:
    """
    Handle Google Photos download process.
    
    Returns:
        Tuple of (success, error_message, download_directory)
    """
    download_directory = googlePhotos.get_temp_resource_directory()
    
    if not googlePhotos.start_download():
        return False, f"Failed to start downloading for {remote_protocol}", download_directory
    
    while True:
        if indexStatus.is_cancel_request_active(client_id):
            stop_success = googlePhotos.stop_download()
            error_msg = ("Downloading stopped on user request" if stop_success 
                        else "Could not stop downloading. POTENTIAL BUG")
            return False, error_msg, download_directory
        
        download_status = googlePhotos.get_downloading_status()
        
        if download_status["finished"]:
            if download_status["message"].strip().lower() != "success":
                return False, download_status["message"], download_directory
            break
        
        # Update download progress
        progress = 0
        if download_status.get("available"):
            progress = download_status["downloaded"] / download_status["available"]
        
        indexStatus.update_status(
            endpoint=client_id,
            current_directory="google_photos",
            progress=progress,
            eta="unknown",
            details=download_status["details"]
        )
        
        time.sleep(1)
    
    return True, "", download_directory


def _calculate_eta(processing_time: float, batch_size: int, remaining_items: int) -> str:
    """Calculate and format ETA for indexing progress."""
    if batch_size <= 0:
        return "unknown"
    
    time_per_item = processing_time / (batch_size + 1e-5)
    eta_seconds = time_per_item * remaining_items
    
    hours = int(eta_seconds // 3600)
    minutes = int((eta_seconds % 3600) // 60)
    seconds = int(eta_seconds % 60)
    
    return f"{hours}:{minutes:02d}:{seconds:02d}"


def _process_resource_batch(
    contents_batch: List[str], 
    prefix_person_id: str, 
    remote_protocol: Optional[str]
) -> None:
    """Process a batch of resources for indexing."""
    index_image_resources(
        resources_batch=contents_batch,
        prefix_personId=prefix_person_id,
        generate_preview_data=True,
        remote_protocol=remote_protocol
    )


def _finalize_indexing(client_id: str) -> None:
    """Finalize the indexing process by updating cluster information."""
    indexStatus.update_status(
        client_id, 
        current_directory="", 
        progress=0, 
        eta="unknown", 
        details="Finalizing Clusters.."
    )
    
    cluster_meta_info = faceIndex.save()
    
    indexStatus.update_status(
        client_id, 
        current_directory="", 
        progress=0, 
        eta="unknown", 
        details="Updating metaIndex..."
    )
    
    for resource_hash, cluster_ids in cluster_meta_info.items():
        metaIndex.modify_meta_data(
            resource_hash, 
            {"person": list(cluster_ids)}, 
            force=True
        )


def indexing_thread(
    index_directory: str, 
    client_id: str, 
    complete_rescan: bool = False, 
    include_subdirectories: bool = True, 
    batch_size: int = 10, 
    generate_preview_data: bool = True
) -> None:
    """
    Main indexing thread function that processes images and builds indices.
    
    Args:
        index_directory: Directory to index or remote protocol name
        client_id: Unique client identifier for status tracking
        complete_rescan: Whether to perform a complete rescan (cleanup first)
        include_subdirectories: Whether to include subdirectories in scan
        batch_size: Number of images to process in each batch
        generate_preview_data: Whether to generate preview images
    """
    error_trace = None
    
    try:
        # Handle complete rescan cleanup
        if complete_rescan:
            _clean_person_previews(client_id)
            _reset_indices(client_id)

        # Handle remote protocols
        remote_protocol = None
        if index_directory in appConfig["supported_remote_protocols"]:
            remote_protocol = index_directory
            
            if index_directory.lower().strip() == "google_photos":
                success, error_msg, download_dir = _handle_google_photos_download(
                    client_id, remote_protocol
                )
                if not success:
                    error_trace = error_msg
                    return
                index_directory = download_dir
            else:
                error_trace = f"Unsupported remote protocol: {remote_protocol}"
                return

        # Generate unique prefix for person IDs
        timestamp = str(int(time.time()))
        prefix_person_id = f"id{timestamp}".lower()
        
        # Process resources
        resource_generator = collect_resources(index_directory, include_subdirectories)
        
        for resource_mapping in resource_generator:
            # Check for cancellation
            if indexStatus.is_cancel_request_active(client_id):
                print("Indexing cancelled by user request")
                break
            
            if resource_mapping["finished"]:
                break
            
            image_resources = resource_mapping["image"]
            if not image_resources:
                continue
            
            resource_directory = list(image_resources.keys())[0]
            contents = image_resources[resource_directory]
            
            if not contents:
                continue
            
            indexStatus.update_status(
                client_id, 
                current_directory=index_directory, 
                progress=0, 
                eta="unknown", 
                details="Scanning..."
            )
            
            # Process contents in batches
            total_items = len(contents)
            
            for start_idx in range(0, total_items, batch_size):
                # Check for cancellation
                if indexStatus.is_cancel_request_active(client_id):
                    print("Batch processing cancelled by user request")
                    return
                
                end_idx = min(start_idx + batch_size, total_items)
                batch_contents = contents[start_idx:end_idx]
                batch_paths = [os.path.join(resource_directory, item) for item in batch_contents]
                
                # Update progress before processing batch
                progress = start_idx / total_items if total_items > 0 else 1
                remaining_items = total_items - start_idx
                
                indexStatus.update_status(
                    client_id, 
                    current_directory=resource_directory, 
                    progress=progress, 
                    eta="calculating...", 
                    details=f"{start_idx}/{total_items}"
                )
                
                # Process the batch
                start_time = time.time()
                _process_resource_batch(batch_paths, prefix_person_id, remote_protocol)
                processing_time = time.time() - start_time
                
                # Calculate and update ETA
                eta = _calculate_eta(processing_time, len(batch_paths), remaining_items)
                indexStatus.update_status(
                    client_id, 
                    current_directory=resource_directory, 
                    progress=progress, 
                    eta=eta, 
                    details=f"{end_idx}/{total_items}"
                )

        # Finalize indexing
        _finalize_indexing(client_id)
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Indexing error: {e}")
        print(error_trace)
    finally:
        # Always save indices and update status
        try:
            metaIndex.save()
            imageIndex.save()
        except Exception as e:
            print(f"Error saving indices: {e}")
            if error_trace is None:
                error_trace = f"Error saving indices: {e}"
        
        indexStatus.set_done(client_id, error_trace)
        # imageIndex.sanity_check()

############
## FLASK APP
############
app = Flask(__name__, static_folder = None, static_url_path= None)
app.secret_key = "Fdfasfdasdfasfasdfas"

# Import and register blueprints
from .api.data_routes import data_bp
from .api.meta_routes import meta_bp
from .api.search_routes import search_bp
from .api.indexing_routes import indexing_bp
from .api.google_photos_routes import gphotos_bp

app.register_blueprint(data_bp)
app.register_blueprint(meta_bp)
app.register_blueprint(search_bp)
app.register_blueprint(indexing_bp)
app.register_blueprint(gphotos_bp)

def get_original_cluster_id(cluster_id: str) -> Optional[str]:
    """
    Get the original cluster ID for a given cluster identifier.
    
    This function maps user-modified cluster IDs back to their original cluster IDs
    by querying both the latest and original metadata versions. It includes caching
    to improve performance for subsequent calls.
    
    Args:
        cluster_id: The cluster identifier to look up
        
    Returns:
        Optional[str]: The original cluster ID if found, None if not found or on error
        
    Raises:
        ValueError: If cluster_id is invalid
        TypeError: If cluster_id is not a string
        
    Examples:
        >>> original_id = get_original_cluster_id("user_modified_cluster_123")
        >>> if original_id:
        ...     print(f"Original ID: {original_id}")
        
        >>> original_id = get_original_cluster_id("cluster_abc123")
        >>> print(original_id)  # Returns the same ID if already original
        
    Note:
        This function is computationally expensive as it queries metadata twice.
        Results are cached in USER_CLUSTER_ID_2_ORIGINAL for better performance.
    """
    try:
        # Input validation
        if not isinstance(cluster_id, str):
            raise TypeError(f"cluster_id must be a string, got {type(cluster_id)}")
        
        if not cluster_id:
            raise ValueError("cluster_id cannot be empty")
        
        # Clean and validate input
        cleaned_id = cluster_id.strip()
        if not cleaned_id:
            raise ValueError("cluster_id cannot be empty or whitespace only")
        
        # Validate cluster ID length
        if len(cleaned_id) > 500:  # Reasonable limit
            raise ValueError(f"cluster_id too long ({len(cleaned_id)} chars), maximum is 500")
        
        # Check cache first for performance optimization
        if cleaned_id in USER_CLUSTER_ID_2_ORIGINAL:
            cached_result = USER_CLUSTER_ID_2_ORIGINAL[cleaned_id]
            if cached_result is not None:
                return cached_result
        
        # If already an original cluster ID (contains "cluster_"), return as-is
        if _is_original_cluster_id(cleaned_id):
            USER_CLUSTER_ID_2_ORIGINAL[cleaned_id] = cleaned_id
            return cleaned_id
        
        # Query metadata for both original and current versions
        try:
            original_hash_2_metadata = metaIndex.query(
                attribute="person", 
                attribute_value=cleaned_id, 
                latest_version=False
            )
            new_hash_2_metadata = metaIndex.query(
                attribute="person", 
                attribute_value=cleaned_id, 
                latest_version=True
            )
        except Exception as e:
            print(f"[ERROR] Failed to query metadata for cluster_id '{cleaned_id}': {e}")
            return None
        
        # Validate query results
        if not isinstance(new_hash_2_metadata, dict) or not new_hash_2_metadata:
            print(f"[WARNING] No metadata found for cluster_id: {cleaned_id}")
            USER_CLUSTER_ID_2_ORIGINAL[cleaned_id] = None
            return None
        
        if not isinstance(original_hash_2_metadata, dict) or not original_hash_2_metadata:
            print(f"[WARNING] No original metadata found for cluster_id: {cleaned_id}")
            USER_CLUSTER_ID_2_ORIGINAL[cleaned_id] = None
            return None
        
        # Find the cluster ID in the current metadata
        target_info = _find_cluster_in_metadata(new_hash_2_metadata, cleaned_id)
        if not target_info:
            print(f"[WARNING] Cluster ID '{cleaned_id}' not found in current metadata")
            USER_CLUSTER_ID_2_ORIGINAL[cleaned_id] = None
            return None
        
        desired_hash, desired_index = target_info
        
        # Get the original cluster ID from the same position
        original_cluster_id = _extract_original_cluster_id(
            original_hash_2_metadata, desired_hash, desired_index, cleaned_id
        )
        
        # Cache the result
        USER_CLUSTER_ID_2_ORIGINAL[cleaned_id] = original_cluster_id
        
        return original_cluster_id
        
    except (ValueError, TypeError) as e:
        print(f"[ERROR] Invalid input for get_original_cluster_id: {e}")
        return None
    except Exception as e:
        print(f"[ERROR] Unexpected error in get_original_cluster_id for '{cluster_id}': {e}")
        return None


def _is_original_cluster_id(cluster_id: str) -> bool:
    """
    Check if a cluster ID is already an original cluster ID.
    
    Args:
        cluster_id: The cluster ID to check
        
    Returns:
        bool: True if it's an original cluster ID
    """
    if not cluster_id:
        return False
    
    return "cluster_" in cluster_id.lower()


def _find_cluster_in_metadata(metadata: Dict[str, Any], cluster_id: str) -> Optional[Tuple[str, int]]:
    """
    Find a cluster ID within metadata and return its hash and index position.
    
    Args:
        metadata: Metadata dictionary to search
        cluster_id: Cluster ID to find
        
    Returns:
        Optional[Tuple[str, int]]: (hash, index) if found, None otherwise
    """
    try:
        for hash_key, meta_data in metadata.items():
            if not isinstance(meta_data, dict):
                continue
            
            person_list = meta_data.get("person", [])
            if not isinstance(person_list, list):
                continue
            
            for index, person_id in enumerate(person_list):
                if person_id == cluster_id:
                    return hash_key, index
        
        return None
        
    except Exception as e:
        print(f"[ERROR] Error searching metadata for cluster_id '{cluster_id}': {e}")
        return None


def _extract_original_cluster_id(
    original_metadata: Dict[str, Any], 
    target_hash: str, 
    target_index: int, 
    cluster_id: str
) -> Optional[str]:
    """
    Extract the original cluster ID from metadata at a specific position.
    
    Args:
        original_metadata: Original metadata dictionary
        target_hash: Hash key to look up
        target_index: Index position within the person list
        cluster_id: Original cluster ID for error reporting
        
    Returns:
        Optional[str]: Original cluster ID if found, None otherwise
    """
    try:
        if target_hash not in original_metadata:
            print(f"[ERROR] Hash '{target_hash}' not found in original metadata for cluster_id '{cluster_id}'")
            return None
        
        original_meta = original_metadata[target_hash]
        if not isinstance(original_meta, dict):
            print(f"[ERROR] Invalid metadata structure for hash '{target_hash}'")
            return None
        
        person_list = original_meta.get("person", [])
        if not isinstance(person_list, list):
            print(f"[ERROR] Invalid person list in original metadata for hash '{target_hash}'")
            return None
        
        if target_index >= len(person_list):
            print(f"[ERROR] Index {target_index} out of bounds for person list (length: {len(person_list)})")
            return None
        
        original_cluster_id = person_list[target_index]
        
        if not isinstance(original_cluster_id, str):
            print(f"[WARNING] Original cluster ID is not a string: {type(original_cluster_id)}")
            return str(original_cluster_id) if original_cluster_id is not None else None
        
        return original_cluster_id
        
    except Exception as e:
        print(f"[ERROR] Error extracting original cluster ID: {e}")
        return None


def clear_cluster_id_cache() -> int:
    """
    Clear the cluster ID cache to free memory or force fresh lookups.
    
    Returns:
        int: Number of cached entries that were cleared
    """
    try:
        cache_size = len(USER_CLUSTER_ID_2_ORIGINAL)
        USER_CLUSTER_ID_2_ORIGINAL.clear()
        print(f"[INFO] Cleared {cache_size} entries from cluster ID cache")
        return cache_size
    except Exception as e:
        print(f"[ERROR] Error clearing cluster ID cache: {e}")
        return 0


def get_cluster_cache_stats() -> Dict[str, Any]:
    """
    Get statistics about the cluster ID cache.
    
    Returns:
        Dict containing cache statistics
    """
    try:
        total_entries = len(USER_CLUSTER_ID_2_ORIGINAL)
        valid_entries = sum(1 for v in USER_CLUSTER_ID_2_ORIGINAL.values() if v is not None)
        null_entries = total_entries - valid_entries
        
        return {
            "total_entries": total_entries,
            "valid_mappings": valid_entries,
            "null_mappings": null_entries,
            "cache_hit_potential": f"{(valid_entries/total_entries)*100:.1f}%" if total_entries > 0 else "0%"
        }
    except Exception as e:
        print(f"[ERROR] Error getting cache stats: {e}")
        return {"error": str(e)}

################
# Extension specific routes
##################
import requests
import webbrowser
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "./extensions/google_photos"))
from gphotos import GooglePhotos, read_gClient_secret, write_gClient_credentials

googlePhotos = GooglePhotos() #in case not client_secret/credentials, would be equivalent to a dummy initialization.
GAuthFlowStatus = {
    "status":"not active",
    "finished":True,
}

############################################################################
def check_extension_status(remote_protocol: str) -> Tuple[bool, str]:
    """
    Check the activation status of a remote protocol extension.
    
    Validates the protocol and checks if the corresponding extension is properly
    configured and activated for use. Each protocol may have different activation
    requirements (e.g., OAuth, API keys, credentials).
    
    Args:
        remote_protocol: Name of the remote protocol to check (e.g., "google_photos")
        
    Returns:
        Tuple[bool, str]: (is_active, status_message)
            - is_active: True if extension is ready to use, False otherwise
            - status_message: Empty string if active, error description if not
            
    Raises:
        ValueError: If remote_protocol is invalid
        TypeError: If remote_protocol is not a string
        
    Examples:
        >>> is_active, msg = check_extension_status("google_photos")
        >>> if is_active:
        ...     print("Google Photos extension is ready")
        ... else:
        ...     print(f"Error: {msg}")
        
        >>> is_active, msg = check_extension_status("unsupported_service")
        >>> print(f"Status: {msg}")  # "Not a supported protocol"
    """
    try:
        # Input validation
        if not isinstance(remote_protocol, str):
            raise TypeError(f"remote_protocol must be a string, got {type(remote_protocol)}")
        
        if not remote_protocol:
            raise ValueError("remote_protocol cannot be empty")
        
        # Clean and normalize input
        protocol = remote_protocol.strip().lower()
        if not protocol:
            raise ValueError("remote_protocol cannot be empty or whitespace only")
        
        # Validate protocol length to prevent potential issues
        if len(protocol) > 100:  # Reasonable limit
            raise ValueError(f"remote_protocol too long ({len(protocol)} chars), maximum is 100")
        
        # Check if protocol is supported
        supported_protocols = appConfig.get("supported_remote_protocols", [])
        if not supported_protocols:
            return False, "No remote protocols are configured"
        
        if protocol not in supported_protocols:
            available = ", ".join(supported_protocols) if supported_protocols else "none"
            return False, f"Protocol '{protocol}' is not supported. Available: {available}"
        
        # Protocol-specific status checking
        if protocol == "google_photos":
            return _check_google_photos_status()
        else:
            # Future protocols can be added here
            return False, f"Status checking not implemented for protocol: {protocol}"
            
    except (ValueError, TypeError) as e:
        print(f"[ERROR] Extension status check failed: {e}")
        return False, str(e)
    except Exception as e:
        print(f"[ERROR] Unexpected error checking extension status: {e}")
        return False, f"Internal error: {str(e)}"


def _check_google_photos_status() -> Tuple[bool, str]:
    """
    Check Google Photos extension activation status.
    
    Returns:
        Tuple[bool, str]: (is_active, status_message)
    """
    try:
        # Get client info from Google Photos extension
        status = googlePhotos.get_client_info()
        
        if not isinstance(status, dict):
            print(f"[WARNING] Google Photos returned invalid status type: {type(status)}")
            return False, "Google Photos extension returned invalid status"
        
        # Check activation status
        is_activated = status.get("is_activated", False)
        
        if is_activated is True:
            return True, ""
        else:
            # Provide detailed error message based on status
            if "error" in status:
                error_msg = status["error"]
                return False, f"Google Photos error: {error_msg}"
            elif "details" in status:
                details = status["details"]
                return False, f"Google Photos not ready: {details}"
            else:
                return False, "Google Photos not activated. Please link a Google account first."
                
    except AttributeError:
        print("[ERROR] Google Photos extension not properly initialized")
        return False, "Google Photos extension not available"
    except Exception as e:
        print(f"[ERROR] Error checking Google Photos status: {e}")
        return False, f"Google Photos status check failed: {str(e)}"


def validate_remote_protocol(protocol: str) -> Tuple[bool, str]:
    """
    Validate a remote protocol name without checking activation status.
    
    Args:
        protocol: Protocol name to validate
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if not isinstance(protocol, str):
        return False, f"Protocol must be a string, got {type(protocol)}"
    
    if not protocol:
        return False, "Protocol cannot be empty"
    
    cleaned = protocol.strip().lower()
    if not cleaned:
        return False, "Protocol cannot be empty or whitespace only"
    
    if len(cleaned) > 100:
        return False, f"Protocol name too long ({len(cleaned)} chars), maximum is 100"
    
    # Check for valid characters (alphanumeric, underscore, hyphen)
    import re
    if not re.match(r'^[a-z0-9_-]+$', cleaned):
        return False, "Protocol name contains invalid characters (use only a-z, 0-9, _, -)"
    
    return True, ""


def get_supported_protocols() -> List[str]:
    """
    Get a list of all supported remote protocols.
    
    Returns:
        List[str]: List of supported protocol names
    """
    try:
        supported = appConfig.get("supported_remote_protocols", [])
        return list(supported) if supported else []
    except Exception as e:
        print(f"[ERROR] Error getting supported protocols: {e}")
        return []


def get_protocol_status_summary() -> Dict[str, Dict[str, Any]]:
    """
    Get status summary for all supported protocols.
    
    Returns:
        Dict mapping protocol names to their status information
    """
    summary = {}
    
    for protocol in get_supported_protocols():
        try:
            is_active, message = check_extension_status(protocol)
            summary[protocol] = {
                "is_active": is_active,
                "status_message": message,
                "last_checked": datetime.now().isoformat()
            }
        except Exception as e:
            summary[protocol] = {
                "is_active": False,
                "status_message": f"Error checking status: {e}",
                "last_checked": datetime.now().isoformat()
            }
    
    return summary

#######################################

if __name__ == "__main__":

    port = 8200

    import argparse
    parser = argparse.ArgumentParser()# Add an argument
    parser.add_argument('--port', type=int, required=False)
    args = parser.parse_args()

    if args.port is not None:
        port = args.port
    
    app.run(host = "127.0.0.1",  port = port)
