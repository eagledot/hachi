// API service for handling search requests
import type { ImageSearchResponse, SearchRequestOptions } from './types';
import { constructQueryString } from './utils';
import { API_ENDPOINTS, API_URL_BUILDERS, CONFIG, CONTENT_TYPES } from './constants';

export class SearchApiService {
  /**
   * Performs a search request to the backend
   */  static async searchImages(
    searchTerm: string, 
    options: SearchRequestOptions
  ): Promise<ImageSearchResponse> {
    console.log('SearchApiService.searchImages called with:', { searchTerm, options });
    const { isInitialSearch, clientId } = options;
    
    // Check if searchTerm is already a constructed query string (contains '=' or '&')
    const constructedQuery = searchTerm.includes('=') || searchTerm.includes('&') 
      ? searchTerm 
      : constructQueryString(searchTerm);

    const params = new URLSearchParams();
    params.append('query', constructedQuery);
    params.append('query_start', String(isInitialSearch));

    if (!isInitialSearch && clientId) {
      params.append('client_id', clientId);
    }
    const response = await fetch(API_ENDPOINTS.QUERY, {
      method: 'POST',
      headers: {
        'Content-Type': CONTENT_TYPES.FORM_URLENCODED,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`${CONFIG.ERROR_MESSAGES.SEARCH_FAILED}: ${response.statusText} - ${errorData}`);
    }

    return await response.json();
  }
  /**
   * Gets the image URL for a given hash
   */
  static getImageUrl(hash: string): string {
    return API_URL_BUILDERS.getImageUrl(hash);
  }
  /**
   * Gets the preview image URL for a given hash
   */
  static getPreviewImageUrl(hash: string): string {
    return API_URL_BUILDERS.getPreviewImageUrl(hash);
  }

  /**
   * Gets the person image URL for a given person ID
   */
  static getPersonImageUrl(personId: string): string {
    return API_URL_BUILDERS.getPersonImageUrl(personId);
  }
}
