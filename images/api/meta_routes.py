import os
from typing import Any, Dict, List
from flask import Blueprint, request, jsonify, Response
from urllib.parse import unquote

from ..semantic_search import metaIndex

meta_bp = Blueprint('meta_routes', __name__)

@meta_bp.route("/getMeta/<attribute>/<value>", methods=["GET"])
def getMeta(attribute: str, value: Any) -> Response:
    """
    Retrieve metadata and associated data hashes for a specific attribute-value pair with pagination.
    
    This endpoint performs exact matching on metadata attributes and returns
    all resources that have the specified attribute value, with support for pagination.
    
    URL Parameters:
        attribute (str): The metadata attribute to query (e.g., "person", "location", "date")
        value (str): The value to match for the specified attribute
    
    Query Parameters:
        page (int, optional): Page number (1-based, default: 1)
        page_size (int, optional): Number of results per page (default: 50, max: 1000)
    
    Returns:
        JSON response with:
        - data_hash (list): List of data hashes for current page
        - meta_data (list): Complete metadata objects for current page
        - score (list): Relevance scores (always 1.0 for exact matches)
        - pagination (dict): Pagination metadata including:
            - current_page (int): Current page number
            - page_size (int): Results per page
            - total_results (int): Total number of matching results
            - total_pages (int): Total number of pages
            - has_next (bool): Whether there are more pages
            - has_prev (bool): Whether there are previous pages
    
    Error Conditions:
        - 400: Missing or invalid attribute/value parameters, invalid pagination parameters
        - 404: No results found for the specified criteria
        - 500: Internal error during metadata query
    
    Behavior:
        - Performs exact string matching (not substring)
        - Handles special cases like resource_directory path normalization
        - URL-decodes parameters to handle special characters
        - Returns consistent score of 1.0 for all exact matches
        - Supports efficient pagination for large result sets
    """
    try:
        # Validate parameters
        if not attribute or not value:
            return jsonify({
                "error": "Missing required parameters: attribute and value"
            }), 400
        
        # URL decode parameters to handle special characters
        attribute = unquote(attribute.strip())
        value = unquote(str(value).strip())
        
        if not attribute or not value:
            return jsonify({
                "error": "Empty attribute or value parameters"
            }), 400
        
        # Extract and validate pagination parameters
        try:
            page = int(request.args.get('page', 1))
            page_size = int(request.args.get('page_size', 50))
            
            if page < 1:
                return jsonify({
                    "error": "Page number must be >= 1"
                }), 400
            
            if page_size < 1:
                return jsonify({
                    "error": "Page size must be >= 1"
                }), 400
            
            if page_size > 1000:
                return jsonify({
                    "error": "Page size cannot exceed 1000"
                }), 400
                
        except ValueError as e:
            return jsonify({
                "error": f"Invalid pagination parameters: {str(e)}"
            }), 400
        
        # Handle special case: resource_directory path normalization
        if attribute == "resource_directory":
            try:
                # Convert "|" back to "//" and normalize path
                normalized_value = value.replace("|", "//")
                value = os.path.abspath(normalized_value)
                print(f"[INFO]: Normalized resource_directory path: '{value}'")
            except Exception as e:
                print(f"[ERROR]: Failed to normalize path '{value}': {e}")
                return jsonify({
                    "error": f"Invalid path format: {str(e)}"
                }), 400
        
        # Query metadata index for exact matches
        try:
            result = metaIndex.query(attribute=attribute, attribute_value=value)
        except Exception as e:
            print(f"[ERROR]: Failed to query metadata for {attribute}='{value}': {e}")
            return jsonify({
                "error": f"Failed to query metadata: {str(e)}"            }), 500
        
        # Check if any results were found
        if not result:
            pagination = {
                "current_page": page,
                "page_size": page_size,
                "total_results": 0,
                "total_pages": 0,
                "has_next": False,
                "has_prev": False
            }
            return jsonify({
                "data_hash": [],
                "meta_data": [],
                "score": [],
                "pagination": pagination,
                "message": f"No results found for {attribute}='{value}'"
            }), 404

        # Calculate pagination metrics
        total_results = len(result)
        total_pages = (total_results + page_size - 1) // page_size  # Ceiling division
        
        # Validate page number against total pages
        if page > total_pages:
            return jsonify({
                "error": f"Page {page} exceeds total pages ({total_pages})"
            }), 400
        
        # Calculate pagination slice indices
        start_idx = (page - 1) * page_size
        end_idx = min(start_idx + page_size, total_results)
        
        # Build response structure with pagination
        all_data_hashes = list(result.keys())
        all_meta_data = [result[hash_id] for hash_id in all_data_hashes]
        all_scores = [1.0] * total_results  # Exact matches always have score 1.0
        
        # Apply pagination slicing
        paginated_data_hashes = all_data_hashes[start_idx:end_idx]
        paginated_meta_data = all_meta_data[start_idx:end_idx]
        paginated_scores = all_scores[start_idx:end_idx]
        
        # Build pagination metadata
        pagination = {
            "current_page": page,
            "page_size": page_size,
            "total_results": total_results,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
            "start_index": start_idx + 1,  # 1-based for user display
            "end_index": end_idx
        }
        
        print(f"[INFO]: Found {total_results} results for {attribute}='{value}', returning page {page}/{total_pages} ({len(paginated_data_hashes)} items)")
        
        return jsonify({
            "data_hash": paginated_data_hashes,
            "meta_data": paginated_meta_data,
            "score": paginated_scores,
            "pagination": pagination
        })
        
    except Exception as e:
        print(f"[ERROR]: Unexpected error in getMeta: {e}")
        return jsonify({
            "error": f"Internal server error: {str(e)}"
        }), 500


@meta_bp.route("/getGroup/<attribute>", methods=["GET"])
def getGroup(attribute: str) -> Response:
    """
    Get all unique values for a specified metadata attribute.
    
    This endpoint returns a list of all distinct values that exist
    for a given metadata attribute across the entire indexed collection.
    
    URL Parameters:
        attribute (str): The metadata attribute to get unique values for
                        (e.g., "person", "location", "date", "resource_directory")
    
    Returns:
        JSON array of unique values for the specified attribute
    
    Error Conditions:
        - 400: Missing or invalid attribute parameter
        - 404: Attribute not found or has no values
        - 500: Internal error during metadata query
    
    Behavior:
        - Returns all unique values for the specified attribute
        - Handles special formatting for resource_directory (converts \ to /)
        - Results are returned as a JSON array
        - Empty array if attribute exists but has no values
    """
    try:
        # Validate attribute parameter
        if not attribute:
            return jsonify({
                "error": "Missing required parameter: attribute"
            }), 400
        
        attribute = attribute.strip()
        if not attribute:
            return jsonify({
                "error": "Empty attribute parameter"
            }), 400
        
        # Get unique values for the attribute
        try:
            unique_values = metaIndex.get_unique(attribute)
        except Exception as e:
            print(f"[ERROR]: Failed to get unique values for attribute '{attribute}': {e}")
            return jsonify({
                "error": f"Failed to retrieve unique values: {str(e)}"
            }), 500
        
        # Handle special case: resource_directory path formatting
        if attribute == "resource_directory":
            try:
                # Convert backslashes to forward slashes for consistent frontend handling
                formatted_values = []
                for path in unique_values:
                    if path:
                        formatted_path = path.replace("\\", "/")
                        formatted_values.append(formatted_path)
                unique_values = formatted_values
                print(f"[INFO]: Formatted {len(unique_values)} resource directory paths")
            except Exception as e:
                print(f"[ERROR]: Failed to format resource directory paths: {e}")
                # Continue with original values if formatting fails
        
        # Convert to list if it's a set or other iterable
        result = list(unique_values) if unique_values else []
        
        print(f"[INFO]: Found {len(result)} unique values for attribute '{attribute}'")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[ERROR]: Unexpected error in getGroup: {e}")
        return jsonify({
            "error": f"Internal server error: {str(e)}"
        }), 500


@meta_bp.route("/getMetaStats", methods=["GET"])
def getMetaStats() -> Response:
    """
    Get statistical information about the metadata index.
    
    This endpoint returns comprehensive statistics about the indexed metadata,
    including counts of different resource types, attributes, and other metrics.
    
    Returns:
        JSON response with statistics:
        - total_resources (int): Total number of indexed resources
        - resource_types (dict): Count of each resource type
        - attribute_counts (dict): Number of unique values per attribute
        - Other statistical information about the metadata index
    
    Error Conditions:
        - 500: Internal error retrieving statistics
    
    Behavior:
        - Provides overview of the entire metadata collection
        - Useful for understanding index composition and size
        - Returns comprehensive statistics in a structured format
    """
    try:
        # Get statistics from metadata index
        try:
            stats = metaIndex.get_stats()
        except Exception as e:
            print(f"[ERROR]: Failed to get metadata statistics: {e}")
            return jsonify({
                "error": f"Failed to retrieve metadata statistics: {str(e)}"
            }), 500
        
        print(f"[INFO]: Retrieved metadata statistics successfully")
        
        return jsonify(stats)
        
    except Exception as e:
        print(f"[ERROR]: Unexpected error in getMetaStats: {e}")
        return jsonify({
            "error": f"Internal server error: {str(e)}"
        }), 500


@meta_bp.route("/tagPerson", methods=["POST"])
def tagPerson() -> Response:
    """
    Tag a person by updating cluster ID with a user-provided label.
    
    This endpoint allows users to assign human-readable names to automatically
    detected person clusters, replacing system-generated cluster IDs with
    meaningful person identifiers.
    
    Form Parameters:
        new_person_id (str): The new human-readable identifier for the person
        old_person_id (str): The existing cluster ID to be replaced
    
    Returns:
        JSON response with:
        - success (bool): Whether the tagging operation succeeded
        - reason (str): Success message or error description
    
    Error Conditions:
        - 400: Missing required parameters
        - 409: New person ID already exists
        - 500: Internal error during update process
    
    Behavior:
        - Validates that new person ID doesn't already exist
        - Updates all resources containing the old person ID
        - Maintains consistency across all affected metadata records
        - Persists changes to disk immediately
    """
    try:
        # Extract and validate form parameters
        new_person_id = request.form.get("new_person_id", "").strip()
        old_person_id = request.form.get("old_person_id", "").strip()
        
        if not new_person_id or not old_person_id:
            return jsonify({
                "success": False,
                "reason": "Missing required parameters: new_person_id and old_person_id"
            }), 400
        
        # Check if new person ID already exists
        try:
            existing_persons = metaIndex.get_unique(attribute="person")
            if new_person_id in existing_persons:
                return jsonify({
                    "success": False,
                    "reason": f"Person ID '{new_person_id}' already exists. Choose a different identifier."
                }), 409
        except Exception as e:
            print(f"[ERROR]: Failed to check existing person IDs: {e}")
            return jsonify({
                "success": False,
                "reason": f"Failed to validate person ID: {str(e)}"
            }), 500
        
        # Find all resources where old person ID is present
        try:
            hash_2_metadata = metaIndex.query(attribute="person", attribute_value=old_person_id)
        except Exception as e:
            print(f"[ERROR]: Failed to find resources for person '{old_person_id}': {e}")
            return jsonify({
                "success": False,
                "reason": f"Failed to find resources for person: {str(e)}"
            }), 500
        
        if not hash_2_metadata:
            return jsonify({
                "success": False,
                "reason": f"No resources found for person ID '{old_person_id}'"
            }), 404
        
        # Update each resource by replacing old person ID with new person ID
        updated_count = 0
        for hash_id, metadata in hash_2_metadata.items():
            try:
                old_persons = metadata.get("person", [])
                new_persons = []
                
                # Replace old person ID with new person ID
                for person in old_persons:
                    if person == old_person_id:
                        new_persons.append(new_person_id)
                    else:
                        new_persons.append(person)
                
                # Update metadata
                new_person_meta = {"person": new_persons}
                metaIndex.modify_meta_data(data_hash=hash_id, meta_data=new_person_meta)
                updated_count += 1
                
            except Exception as e:
                print(f"[ERROR]: Failed to update resource {hash_id}: {e}")
                # Continue with other resources
        
        # Save changes to disk
        try:
            metaIndex.save()
            print(f"[INFO]: Successfully tagged person '{old_person_id}' as '{new_person_id}' in {updated_count} resources")
        except Exception as e:
            print(f"[ERROR]: Failed to save metadata changes: {e}")
            return jsonify({
                "success": False,
                "reason": f"Failed to save changes: {str(e)}"
            }), 500
        
        return jsonify({
            "success": True,
            "reason": f"Successfully updated {updated_count} resources with new person ID '{new_person_id}'"
        })
        
    except Exception as e:
        print(f"[ERROR]: Unexpected error in tagPerson: {e}")
        return jsonify({
            "success": False,
            "reason": f"Internal server error: {str(e)}"
        }), 500


@meta_bp.route("/editMetaData", methods=["POST"])
def editMetaData() -> Response:
    """
    Update/modify metadata for a specific resource.
    
    This endpoint allows updating arbitrary metadata attributes for a given
    resource identified by its data hash.
    
    Form Parameters:
        data_hash (str): The unique identifier for the resource to update
        <attribute_name> (str): Any number of attribute-value pairs to update
    
    Returns:
        JSON response with:
        - success (bool): Whether the update operation succeeded
        - reason (str): Success message or error description
    
    Error Conditions:
        - 400: Missing data_hash parameter
        - 404: Resource not found for given data_hash
        - 500: Internal error during update process
    
    Behavior:
        - Updates only the specified attributes, leaving others unchanged
        - Validates that resource exists before updating
        - Persists changes to disk immediately
        - Supports updating multiple attributes in single request
    """
    try:
        # Extract data_hash parameter
        data_hash = request.form.get("data_hash", "").strip()
        if not data_hash:
            return jsonify({
                "success": False,
                "reason": "Missing required parameter: data_hash"
            }), 400
        
        # Collect attribute-value pairs to update (excluding data_hash)
        metadata_updates = {}
        for key, value in request.form.items():
            if key.lower() != "data_hash" and value.strip():
                metadata_updates[key] = value.strip()
        
        if not metadata_updates:
            return jsonify({
                "success": False,
                "reason": "No metadata attributes to update"
            }), 400
        
        # Verify that resource exists
        try:
            existing_metadata = metaIndex.query(data_hashes=data_hash)
            if data_hash not in existing_metadata:
                return jsonify({
                    "success": False,
                    "reason": f"Resource not found for data_hash '{data_hash}'"
                }), 404
        except Exception as e:
            print(f"[ERROR]: Failed to verify resource existence: {e}")
            return jsonify({
                "success": False,
                "reason": f"Failed to verify resource: {str(e)}"
            }), 500
        
        # Update metadata
        try:
            metaIndex.modify_meta_data(data_hash, metadata_updates)
            print(f"[INFO]: Updated metadata for {data_hash}: {metadata_updates}")
        except Exception as e:
            print(f"[ERROR]: Failed to update metadata for {data_hash}: {e}")
            return jsonify({
                "success": False,
                "reason": f"Failed to update metadata: {str(e)}"
            }), 500
        
        # Save changes to disk
        try:
            metaIndex.save()
        except Exception as e:
            print(f"[ERROR]: Failed to save metadata changes: {e}")
            return jsonify({
                "success": False,
                "reason": f"Failed to save changes: {str(e)}"
            }), 500
        
        return jsonify({
            "success": True,
            "reason": f"Successfully updated {len(metadata_updates)} attributes for resource"
        })
        
    except Exception as e:
        print(f"[ERROR]: Unexpected error in editMetaData: {e}")
        return jsonify({
            "success": False,
            "reason": f"Internal server error: {str(e)}"
        }), 500