import uuid
import base64
import io
import cv2
import numpy as np
from typing import Dict, List, Any
from flask import Blueprint, request, jsonify

from semantic_search import (
    metaIndex, imageIndex, generate_text_embedding, generate_image_embedding, parse_query,
    TOP_K_SHARD, experiment_cache
)

search_bp = Blueprint('search_routes', __name__)

@search_bp.route("/query", methods=["POST"])
def query() -> Dict[str, Any]:
    """
    Execute a semantic search query with optional metadata filtering.
    
    This endpoint supports two query modes:
    1. Pure semantic search: Uses text embeddings for similarity matching
    2. Hybrid search: Combines metadata filtering with semantic re-ranking
    
    Form Parameters:
        query_start (str): "true" to start new query, "false" to continue existing
        query (str): The search query string (can include metadata filters)
        client_id (str): Required when query_start="false" for session continuation
    
    Query Format:
        - Pure text: "cats playing in garden"
        - With metadata: "person=john&location=paris&query=sunset"
        - Multiple values: "person=john?jane&query=family photo"
        
    Returns:
        JSON response with:
        - meta_data (list): Metadata for each result
        - data_hash (list): Unique identifiers for each result  
        - score (list): Relevance scores for each result
        - query_completed (bool): Whether query processing is finished
        - client_id (str): Session identifier for streaming queries
    
    Error Conditions:
        - 400: Missing required parameters or invalid query format
        - 500: Internal error during query processing or embedding generation
    
    Behavior:
        - Generates unique client_id for new queries
        - Caches text embeddings for session continuation
        - Supports streaming results for large datasets
        - Automatically cleans up completed query sessions
        - Combines metadata scores with semantic similarity scores
    """
    try:
        # Extract and validate required parameters
        query_start = request.form.get("query_start", "").strip().lower()
        query_text = request.form.get("query", "").strip()
        
        if not query_text:
            return jsonify({
                "error": "Missing required parameter: query"
            }), 400
        
        # Handle client session management
        if query_start == "true":
            client_id = uuid.uuid4().hex
            print(f"[INFO]: Starting new query session: {client_id}")
        else:
            client_id = request.form.get("client_id", "").strip()
            if not client_id:
                return jsonify({
                    "error": "Missing client_id for continuing query"
                }), 400
        
        # Parse query to extract attributes and semantic components
        try:
            image_attributes = parse_query(query_text)
        except Exception as e:
            print(f"[ERROR]: Failed to parse query '{query_text}': {e}")
            return jsonify({
                "error": f"Invalid query format: {str(e)}"
            }), 400
        
        # Determine query strategy based on attributes
        meta_attributes_list = [attr for attr in image_attributes if attr != "query"]
        use_metadata_filtering = len(meta_attributes_list) > 0
        
        # Initialize response structure
        response_data = {
            "meta_data": [],
            "data_hash": [],
            "score": [],
            "query_completed": True,
            "client_id": client_id
        }
        
        if not use_metadata_filtering:
            # Pure semantic search mode
            response_data.update(
                _execute_semantic_search(image_attributes, client_id)
            )
        else:
            # Hybrid search mode (metadata + optional semantic re-ranking)
            response_data.update(
                _execute_hybrid_search(image_attributes, client_id, meta_attributes_list)
            )
        
        # Validate response consistency
        data_lengths = [len(response_data["meta_data"]), 
                       len(response_data["data_hash"]), 
                       len(response_data["score"])]
        if len(set(data_lengths)) > 1:
            print(f"[ERROR]: Inconsistent response data lengths: {data_lengths}")
            return jsonify({
                "error": "Internal consistency error in query results"
            }), 500
        
        # Clean up completed query sessions
        if response_data["query_completed"] and client_id in experiment_cache:
            experiment_cache.pop(client_id, None)
            print(f"[INFO]: Cleaned up completed query session: {client_id}")
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"[ERROR]: Unexpected error in query processing: {e}")
        return jsonify({
            "error": f"Internal server error: {str(e)}"
        }), 500


def _execute_semantic_search(image_attributes: Dict[str, List[str]], client_id: str) -> Dict[str, Any]:
    """Execute pure semantic search using text embeddings."""
    try:
        # Extract semantic query
        if "query" not in image_attributes or not image_attributes["query"]:
            raise ValueError("No semantic query component found")
        
        current_query = image_attributes["query"][0]  # Single query enforcement
        
        # Generate or retrieve cached text embedding
        if client_id not in experiment_cache:
            text_embedding = generate_text_embedding(current_query)
            experiment_cache[client_id] = {"text-embeddings": text_embedding}
            print(f"[INFO]: Generated new text embedding for query: '{current_query}'")
        else:
            text_embedding = experiment_cache[client_id]["text-embeddings"]
            print(f"[INFO]: Using cached text embedding for client: {client_id}")
        
        # Execute semantic search
        is_streaming, image_hash2scores = imageIndex.query(
            text_embedding, client_key=client_id
        )
        
        # Limit results to top-k
        top_hashes = list(image_hash2scores.keys())[:TOP_K_SHARD]
        
        # Retrieve metadata for top results
        metadata_results = metaIndex.query(data_hashes=top_hashes)
        
        # Build response
        meta_data, data_hash, scores = [], [], []
        for hash_id in top_hashes:
            if hash_id in metadata_results:
                meta_data.append(metadata_results[hash_id])
                data_hash.append(hash_id)
                # Use max score if multiple scores per hash
                score_value = max(image_hash2scores[hash_id]) if isinstance(
                    image_hash2scores[hash_id], list
                ) else image_hash2scores[hash_id]
                scores.append(str(score_value))
        
        return {
            "meta_data": meta_data,
            "data_hash": data_hash,
            "score": scores,
            "query_completed": not is_streaming
        }
        
    except Exception as e:
        print(f"[ERROR]: Semantic search execution failed: {e}")
        raise


def _execute_hybrid_search(
    image_attributes: Dict[str, List[str]], 
    client_id: str, 
    meta_attributes_list: List[str]
) -> Dict[str, Any]:
    """Execute hybrid search combining metadata filtering with semantic re-ranking."""
    try:
        # Phase 1: Metadata filtering
        matching_hashes = set()
        hash_scores = {}
        
        for i, attribute in enumerate(meta_attributes_list):
            attribute_hashes = set()
            
            # Collect hashes for all values of this attribute (OR operation)
            for value in image_attributes[attribute]:
                value_results = metaIndex.query(attribute=attribute, attribute_value=value)
                for hash_id in value_results:
                    attribute_hashes.add(hash_id)
                    # Increment score for multiple attribute matches
                    hash_scores[hash_id] = hash_scores.get(hash_id, 0) + 1
            
            # Combine with previous attributes (AND operation)
            if i == 0:
                matching_hashes = attribute_hashes
                if not matching_hashes:
                    break  # Early exit if no matches
            else:
                matching_hashes &= attribute_hashes
        
        if not matching_hashes:
            print("[INFO]: No results found matching metadata criteria")
            return {
                "meta_data": [],
                "data_hash": [],
                "score": [],
                "query_completed": True
            }
        
        # Retrieve metadata for matching hashes
        metadata_results = metaIndex.query(data_hashes=matching_hashes)
        
        # Build initial results
        meta_data, data_hash, scores = [], [], []
        for hash_id, metadata in metadata_results.items():
            meta_data.append(metadata)
            data_hash.append(hash_id)
            scores.append(hash_scores.get(hash_id, 1))
        
        # Phase 2: Optional semantic re-ranking
        if "query" in image_attributes and image_attributes["query"]:
            current_query = image_attributes["query"][0]
            
            try:
                text_embedding = generate_text_embedding(current_query)
                is_streaming, semantic_scores = imageIndex.query(
                    text_embedding,
                    key=matching_hashes,
                    client_key=client_id
                )
                
                # Combine metadata and semantic scores
                for i, hash_id in enumerate(data_hash):
                    if hash_id in semantic_scores:
                        semantic_score = max(semantic_scores[hash_id]) if isinstance(
                            semantic_scores[hash_id], list
                        ) else semantic_scores[hash_id]
                        # Multiply metadata score by semantic score
                        scores[i] = str(scores[i] * semantic_score)
                
                print(f"[INFO]: Applied semantic re-ranking to {len(data_hash)} results")
                
            except Exception as e:
                print(f"[WARNING]: Semantic re-ranking failed, using metadata scores: {e}")
        
        return {
            "meta_data": meta_data,
            "data_hash": data_hash,
            "score": [str(score) for score in scores],
            "query_completed": True
        }
        
    except Exception as e:
        print(f"[ERROR]: Hybrid search execution failed: {e}")
        raise


@search_bp.route("/getSuggestion", methods=["POST"])
def getSuggestion() -> Dict[str, Any]:
    """
    Get auto-completion suggestions for metadata attribute values.
    
    This endpoint provides intelligent auto-complete functionality for metadata
    attributes to help users discover available values and improve search experience.
    
    Form Parameters:
        attribute (str): The metadata attribute to get suggestions for
                        (e.g., "person", "location", "tag", "album")
        query (str): The partial query string to match against attribute values
                    (can be empty string for all values)
    
    Returns:
        JSON response with:
        - {attribute_name} (list): List of suggested values matching the query
                                  ordered by relevance/frequency
    
    Example:
        POST /getSuggestion
        Form data: attribute="person", query="joh"
        Response: {"person": ["john", "john_doe", "johnny"]}
    
    Error Conditions:
        - 400: Missing required parameters (attribute)
        - 500: Internal error during suggestion retrieval
    
    Behavior:
        - Returns partial matches based on the query prefix
        - Results are typically ordered by frequency or relevance
        - Empty query returns most common values for the attribute
        - Case-insensitive matching for better user experience
    """
    try:
        # Extract and validate required parameters
        attribute = request.form.get("attribute", "").strip()
        query = request.form.get("query", "").strip()
        
        if not attribute:
            return jsonify({
                "error": "Missing required parameter: attribute"
            }), 400
        
        # Initialize result structure
        result = {}
        
        try:
            # Get suggestions from metaIndex
            suggestions = metaIndex.suggest(attribute, query)
            result[attribute] = suggestions
            
            print(f"[INFO]: Retrieved {len(suggestions)} suggestions for attribute '{attribute}' with query '{query}'")
            
        except Exception as e:
            print(f"[ERROR]: Failed to get suggestions for attribute '{attribute}': {e}")
            # Return empty suggestions on metaIndex error
            result[attribute] = []
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[ERROR]: Unexpected error in getSuggestion: {e}")
        return jsonify({
            "error": f"Internal server error: {str(e)}"
        }), 500


@search_bp.route("/similarImages", methods=["POST"])
def similar_images() -> Dict[str, Any]:
    """
    Find images similar to an uploaded image using visual similarity search.
    
    This endpoint accepts an image upload and returns visually similar images from
    the indexed collection using CLIP embeddings for semantic image matching.
    
    Form Parameters:
        image (file): The uploaded image file (JPEG, PNG, WebP, etc.)
        top_k (int, optional): Maximum number of similar images to return (default: 20, max: 100)
        metadata_filter (str, optional): Additional metadata filters in query format
                                        (e.g., "person=john&location=paris")
        similarity_threshold (float, optional): Minimum similarity score (0.0-1.0, default: 0.0)
    
    Alternative Form Parameters:
        image_base64 (str): Base64 encoded image data (alternative to file upload)
        
    Returns:
        JSON response with:
        - meta_data (list): Metadata for each similar image
        - data_hash (list): Unique identifiers for each similar image
        - similarity_scores (list): Similarity scores (0.0-1.0, higher = more similar)
        - query_image_hash (str): Hash of the uploaded query image
        - total_results (int): Total number of results found
        
    Error Conditions:
        - 400: Missing image, invalid file format, or invalid parameters
        - 413: Uploaded image too large
        - 500: Internal error during image processing or similarity search
        
    Behavior:
        - Supports multiple image formats (JPEG, PNG, WebP, BMP, TIFF)
        - Automatically resizes large images for processing
        - Can combine visual similarity with metadata filtering
        - Returns results sorted by similarity score (highest first)
        - Generates embeddings for the query image on-the-fly
    """
    try:
        # Extract parameters
        top_k = request.form.get("top_k", "20")
        metadata_filter = request.form.get("metadata_filter", "").strip()
        similarity_threshold = request.form.get("similarity_threshold", "0.0")
        
        # Validate parameters
        try:
            top_k = max(1, min(int(top_k), 100))  # Limit to reasonable range
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid top_k parameter. Must be an integer between 1-100"}), 400
        
        try:
            similarity_threshold = max(0.0, min(float(similarity_threshold), 1.0))
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid similarity_threshold. Must be a float between 0.0-1.0"}), 400
        
        # Get image data from either file upload or base64
        image_data = None
        query_image_hash = None
        
        # Try file upload first
        if 'image' in request.files:
            uploaded_file = request.files['image']
            if uploaded_file.filename == '':
                return jsonify({"error": "No file selected"}), 400
            
            # Check file size (limit to 50MB)
            uploaded_file.seek(0, 2)  # Seek to end
            file_size = uploaded_file.tell()
            uploaded_file.seek(0)  # Reset to beginning
            
            if file_size > 50 * 1024 * 1024:  # 50MB limit
                return jsonify({"error": "Image file too large. Maximum size is 50MB"}), 413
            
            # Read image data
            try:
                file_bytes = uploaded_file.read()
                if not file_bytes:
                    return jsonify({"error": "Empty image file"}), 400
                
                # Decode image using OpenCV
                nparr = np.frombuffer(file_bytes, np.uint8)
                image_data = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if image_data is None:
                    return jsonify({"error": "Invalid image format or corrupted image"}), 400
                
                # Generate hash for query image (for tracking)
                import hashlib
                query_image_hash = hashlib.md5(file_bytes).hexdigest()[:16]
                
            except Exception as e:
                print(f"[ERROR] Failed to process uploaded image: {e}")
                return jsonify({"error": f"Failed to process image: {str(e)}"}), 400
        
        # Try base64 encoded image as fallback
        elif 'image_base64' in request.form:
            base64_data = request.form.get('image_base64', '').strip()
            if not base64_data:
                return jsonify({"error": "Empty base64 image data"}), 400
            
            try:
                # Remove data URL prefix if present
                if ',' in base64_data:
                    base64_data = base64_data.split(',', 1)[1]
                
                # Decode base64
                image_bytes = base64.b64decode(base64_data)
                if not image_bytes:
                    return jsonify({"error": "Invalid base64 image data"}), 400
                
                # Decode image using OpenCV
                nparr = np.frombuffer(image_bytes, np.uint8)
                image_data = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if image_data is None:
                    return jsonify({"error": "Invalid base64 image format"}), 400
                
                # Generate hash for query image
                import hashlib
                query_image_hash = hashlib.md5(image_bytes).hexdigest()[:16]
                
            except Exception as e:
                print(f"[ERROR] Failed to process base64 image: {e}")
                return jsonify({"error": f"Failed to decode base64 image: {str(e)}"}), 400
        
        else:
            return jsonify({"error": "No image provided. Use 'image' file upload or 'image_base64' parameter"}), 400
        
        # Validate image dimensions
        if len(image_data.shape) != 3:
            return jsonify({"error": f"Invalid image dimensions: {image_data.shape}"}), 400
        
        height, width, channels = image_data.shape
        if channels not in [1, 3, 4]:
            return jsonify({"error": f"Unsupported image format. Channels: {channels}"}), 400
        
        # Resize image if too large (for performance)
        max_dimension = 2048
        if max(height, width) > max_dimension:
            scale = max_dimension / max(height, width)
            new_width = int(width * scale)
            new_height = int(height * scale)
            image_data = cv2.resize(image_data, (new_width, new_height), interpolation=cv2.INTER_AREA)
            print(f"[INFO] Resized query image from {width}x{height} to {new_width}x{new_height}")
        
        # Generate embedding for query image
        print(f"[INFO] Generating embedding for query image (hash: {query_image_hash})")
        query_embedding = generate_image_embedding(image_data, is_bgr=True, center_crop=False)
        
        if query_embedding is None:
            return jsonify({"error": "Failed to generate embedding for query image"}), 500
        
        # Flatten embedding if needed
        if len(query_embedding.shape) > 1:
            query_embedding = query_embedding.flatten()
        
        print(f"[INFO] Generated embedding with shape: {query_embedding.shape}")
        
        # Search for similar images
        try:
            # Use imageIndex to find similar images
            client_key = f"image_search_{query_image_hash}"
            
            # Get all results first (no key filtering for visual search)
            query_completed, similarity_results = imageIndex.query(
                query=query_embedding,
                client_key=client_key,
                key=None  # No specific data_hash filtering
            )
            
            if not query_completed:
                return jsonify({"error": "Image similarity search did not complete"}), 500
            
            if not similarity_results:
                return jsonify({
                    "meta_data": [],
                    "data_hash": [],
                    "similarity_scores": [],
                    "query_image_hash": query_image_hash,
                    "total_results": 0
                })
            
            # Process results
            all_data_hashes = []
            all_similarity_scores = []
            
            for data_hash, scores in similarity_results.items():
                if scores:  # Check if scores list is not empty
                    # Use the best score for this image
                    best_score = max(scores) if isinstance(scores, list) else scores
                    
                    # Filter by similarity threshold
                    if best_score >= similarity_threshold:
                        all_data_hashes.append(data_hash)
                        all_similarity_scores.append(float(best_score))
            
            # Sort by similarity score (highest first)
            if all_data_hashes:
                sorted_pairs = sorted(
                    zip(all_data_hashes, all_similarity_scores),
                    key=lambda x: x[1],
                    reverse=True
                )
                
                # Limit to top_k results
                sorted_pairs = sorted_pairs[:top_k]
                
                final_data_hashes = [pair[0] for pair in sorted_pairs]
                final_scores = [pair[1] for pair in sorted_pairs]
            else:
                final_data_hashes = []
                final_scores = []
            
            print(f"[INFO] Found {len(final_data_hashes)} similar images above threshold {similarity_threshold}")
            
            # Get metadata for results
            meta_data = []
            if final_data_hashes:
                # Apply metadata filtering if specified
                if metadata_filter:
                    try:
                        # Parse metadata filter
                        parsed_filters = parse_query(metadata_filter)
                        
                        # Get metadata for all candidates
                        hash_2_metadata = metaIndex.query(data_hashes=final_data_hashes)
                        
                        # Filter results based on metadata
                        filtered_hashes = []
                        filtered_scores = []
                        
                        for i, data_hash in enumerate(final_data_hashes):
                            if data_hash in hash_2_metadata:
                                metadata = hash_2_metadata[data_hash]
                                
                                # Check if metadata matches all filter criteria
                                matches_filter = True
                                for attr, values in parsed_filters.items():
                                    metadata_values = metadata.get(attr, [])
                                    if not isinstance(metadata_values, list):
                                        metadata_values = [str(metadata_values)]
                                    
                                    # Convert to lowercase for case-insensitive matching
                                    metadata_values_lower = [str(v).lower() for v in metadata_values]
                                    
                                    # Check if any filter value matches any metadata value
                                    if not any(filter_val in metadata_values_lower for filter_val in values):
                                        matches_filter = False
                                        break
                                
                                if matches_filter:
                                    filtered_hashes.append(data_hash)
                                    filtered_scores.append(final_scores[i])
                        
                        final_data_hashes = filtered_hashes
                        final_scores = filtered_scores
                        
                        print(f"[INFO] After metadata filtering: {len(final_data_hashes)} results")
                        
                    except Exception as e:
                        print(f"[WARNING] Metadata filtering failed: {e}")
                        # Continue without filtering
                
                # Get final metadata
                if final_data_hashes:
                    hash_2_metadata = metaIndex.query(data_hashes=final_data_hashes)
                    meta_data = [hash_2_metadata.get(data_hash, {}) for data_hash in final_data_hashes]
            
            return jsonify({
                "meta_data": meta_data,
                "data_hash": final_data_hashes,
                "similarity_scores": [f"{score:.4f}" for score in final_scores],
                "query_image_hash": query_image_hash,
                "total_results": len(final_data_hashes),
                "search_params": {
                    "top_k": top_k,
                    "similarity_threshold": similarity_threshold,
                    "metadata_filter": metadata_filter if metadata_filter else None
                }
            })
            
        except Exception as e:
            print(f"[ERROR] Image similarity search failed: {e}")
            return jsonify({"error": f"Similarity search failed: {str(e)}"}), 500
        
    except Exception as e:
        print(f"[ERROR] Unexpected error in similar_images endpoint: {e}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


@search_bp.route("/getImageEmbedding", methods=["POST"])
def get_image_embedding() -> Dict[str, Any]:
    """
    Generate and return the embedding vector for an uploaded image.
    
    This endpoint is useful for debugging, caching embeddings, or building
    custom similarity search applications.
    
    Form Parameters:
        image (file): The uploaded image file
        return_format (str, optional): "array" (default) or "base64" 
    
    Alternative Form Parameters:
        image_base64 (str): Base64 encoded image data
        
    Returns:
        JSON response with:
        - embedding (list/str): The embedding vector as array or base64
        - embedding_size (int): Size of the embedding vector
        - image_hash (str): Hash of the input image
        - image_dimensions (list): [height, width, channels] of processed image
        
    Error Conditions:
        - 400: Missing image, invalid file format, or invalid parameters
        - 500: Internal error during embedding generation
    """
    try:
        # Extract parameters
        return_format = request.form.get("return_format", "array").strip().lower()
        if return_format not in ["array", "base64"]:
            return jsonify({"error": "Invalid return_format. Must be 'array' or 'base64'"}), 400
        
        # Get image data (reuse logic from similar_images endpoint)
        image_data = None
        image_hash = None
        
        # Try file upload first
        if 'image' in request.files:
            uploaded_file = request.files['image']
            if uploaded_file.filename == '':
                return jsonify({"error": "No file selected"}), 400
            
            try:
                file_bytes = uploaded_file.read()
                if not file_bytes:
                    return jsonify({"error": "Empty image file"}), 400
                
                # Decode image
                nparr = np.frombuffer(file_bytes, np.uint8)
                image_data = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if image_data is None:
                    return jsonify({"error": "Invalid image format"}), 400
                
                # Generate hash
                import hashlib
                image_hash = hashlib.md5(file_bytes).hexdigest()[:16]
                
            except Exception as e:
                return jsonify({"error": f"Failed to process image: {str(e)}"}), 400
        
        # Try base64 as fallback
        elif 'image_base64' in request.form:
            base64_data = request.form.get('image_base64', '').strip()
            if not base64_data:
                return jsonify({"error": "Empty base64 image data"}), 400
            
            try:
                if ',' in base64_data:
                    base64_data = base64_data.split(',', 1)[1]
                
                image_bytes = base64.b64decode(base64_data)
                nparr = np.frombuffer(image_bytes, np.uint8)
                image_data = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if image_data is None:
                    return jsonify({"error": "Invalid base64 image"}), 400
                
                import hashlib
                image_hash = hashlib.md5(image_bytes).hexdigest()[:16]
                
            except Exception as e:
                return jsonify({"error": f"Failed to decode base64: {str(e)}"}), 400
        
        else:
            return jsonify({"error": "No image provided"}), 400
        
        # Generate embedding
        embedding = generate_image_embedding(image_data, is_bgr=True, center_crop=False)
        
        if embedding is None:
            return jsonify({"error": "Failed to generate embedding"}), 500
        
        # Flatten if needed
        if len(embedding.shape) > 1:
            embedding = embedding.flatten()
        
        # Format response based on return_format
        if return_format == "base64":
            # Convert to base64
            embedding_bytes = embedding.astype(np.float32).tobytes()
            embedding_b64 = base64.b64encode(embedding_bytes).decode('utf-8')
            embedding_output = embedding_b64
        else:
            # Return as array
            embedding_output = embedding.tolist()
        
        return jsonify({
            "embedding": embedding_output,
            "embedding_size": len(embedding),
            "image_hash": image_hash,
            "image_dimensions": list(image_data.shape),
            "return_format": return_format
        })
        
    except Exception as e:
        print(f"[ERROR] Unexpected error in get_image_embedding: {e}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500