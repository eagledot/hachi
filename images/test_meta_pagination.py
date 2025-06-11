#!/usr/bin/env python3
"""
Test script to demonstrate the pagination functionality of the getMeta endpoint.

This script shows example usage of the enhanced getMeta endpoint with pagination.
"""

import requests
import json
from typing import Dict, Any
  
def test_get_meta_pagination(base_url: str = "http://localhost:5000") -> None:
    """
    Test the getMeta endpoint with various pagination scenarios.
    
    Args:
        base_url: The base URL of the Flask application
    """
    
    # Example 1: Basic pagination - get first page with default page size (50)
    print("=== Example 1: Basic pagination (first page, default size) ===")
    response = requests.get(f"{base_url}/getMeta/person/john_doe")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {data['pagination']['total_results']} total results")
        print(f"Page {data['pagination']['current_page']} of {data['pagination']['total_pages']}")
        print(f"Showing {len(data['data_hash'])} items")
        print(f"Has next page: {data['pagination']['has_next']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    print()
    
    # Example 2: Custom page size
    print("=== Example 2: Custom page size (10 items per page) ===")
    response = requests.get(f"{base_url}/getMeta/person/john_doe?page=1&page_size=10")
    if response.status_code == 200:
        data = response.json()
        print(f"Page size: {data['pagination']['page_size']}")
        print(f"Total pages: {data['pagination']['total_pages']}")
        print(f"Items {data['pagination']['start_index']}-{data['pagination']['end_index']} of {data['pagination']['total_results']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    print()
    
    # Example 3: Navigate to specific page
    print("=== Example 3: Navigate to page 2 ===")
    response = requests.get(f"{base_url}/getMeta/person/john_doe?page=2&page_size=10")
    if response.status_code == 200:
        data = response.json()
        print(f"Current page: {data['pagination']['current_page']}")
        print(f"Has previous page: {data['pagination']['has_prev']}")
        print(f"Has next page: {data['pagination']['has_next']}")
        print(f"Items on this page: {len(data['data_hash'])}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    print()
    
    # Example 4: Test edge cases
    print("=== Example 4: Edge case - page exceeds total pages ===")
    response = requests.get(f"{base_url}/getMeta/person/john_doe?page=999&page_size=10")
    print(f"Status: {response.status_code}")
    if response.status_code != 200:
        error_data = response.json()
        print(f"Error message: {error_data.get('error', 'Unknown error')}")
    print()
    
    # Example 5: Test invalid parameters
    print("=== Example 5: Invalid parameters ===")
    test_cases = [
        ("page=0", "Invalid page number (0)"),
        ("page_size=0", "Invalid page size (0)"),
        ("page_size=2000", "Page size too large"),
        ("page=abc", "Non-numeric page"),
        ("page_size=xyz", "Non-numeric page size")
    ]
    
    for params, description in test_cases:
        print(f"Testing {description}: {params}")
        response = requests.get(f"{base_url}/getMeta/person/john_doe?{params}")
        print(f"  Status: {response.status_code}")
        if response.status_code != 200:
            error_data = response.json()
            print(f"  Error: {error_data.get('error', 'Unknown error')}")
        print()

def print_pagination_info(data: Dict[str, Any]) -> None:
    """Print formatted pagination information."""
    pagination = data.get('pagination', {})
    print(f"Pagination Info:")
    print(f"  Current Page: {pagination.get('current_page')}")
    print(f"  Page Size: {pagination.get('page_size')}")
    print(f"  Total Results: {pagination.get('total_results')}")
    print(f"  Total Pages: {pagination.get('total_pages')}")
    print(f"  Has Previous: {pagination.get('has_prev')}")
    print(f"  Has Next: {pagination.get('has_next')}")
    print(f"  Showing: {pagination.get('start_index')}-{pagination.get('end_index')}")

if __name__ == "__main__":
    # Note: This test requires the Flask application to be running
    # and to have some data indexed with person metadata
    print("Testing getMeta pagination functionality...")
    print("Note: Make sure the Flask application is running on localhost:5000")
    print("and has some indexed data with person metadata.")
    print()
    
    try:
        test_get_meta_pagination()
        print("✅ All pagination tests completed!")
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to Flask application.")
        print("Make sure the application is running on localhost:5000")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
