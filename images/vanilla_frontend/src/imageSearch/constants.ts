// API endpoints and constants for the ImageSearch module
import Config from '../config';

const API_BASE_URL = Config.apiUrl;

// API Endpoints
export const API_ENDPOINTS = {
  // Search endpoints
  QUERY: `${API_BASE_URL}/query`,
  GET_SUGGESTION: `${API_BASE_URL}/getSuggestion`,
  
  // Image endpoints
  GET_IMAGE: `${API_BASE_URL}/getRawDataFull`,
  // GET_PREVIEW_IMAGE: `${API_BASE_URL}/getRawData`,
  GET_PREVIEW_IMAGE: `/preview_image`,

  GET_PERSON_IMAGE: `${API_BASE_URL}/getPreviewPerson`,
} as const;

// URL builders for endpoints that require parameters
export const API_URL_BUILDERS = {
  /**
   * Builds the image URL for a given hash
   */
  getImageUrl: (hash: string): string => {
    return `${API_ENDPOINTS.GET_IMAGE}/${encodeURIComponent(hash)}`;
  },

  /**
   * Builds the preview image URL for a given hash
   */
  getPreviewImageUrl: (hash: string): string => {
    // return `${API_ENDPOINTS.GET_PREVIEW_IMAGE}/${encodeURIComponent(hash)}`;
    
    // Being returned by `front-end` proxy to reduce pressure on `upstream application server`.
    return "/preview_image/" + hash + ".webp";
  },

  /**
   * Builds the person image URL for a given person ID
   */
  getPersonImageUrl: (personId: string): string => {
    return `${API_ENDPOINTS.GET_PERSON_IMAGE}/${encodeURIComponent(personId)}`;
  },

} as const;

// Configuration constants
export const CONFIG = {
  // Polling configuration
  POLLING_INTERVAL: 100, // Poll every 0.1 second

  // UI configuration
  DEFAULT_GRID_COLUMNS: {
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5,
  },
  
  // Search configuration
  MIN_SEARCH_LENGTH: 1,
  DEBOUNCE_DELAY: 300,
  
  // Image configuration
  PREVIEW_IMAGE_SIZE: 400,
  MODAL_IMAGE_MAX_SIZE: 1920,
  
  // Error messages
  ERROR_MESSAGES: {
    SEARCH_FAILED: 'Search request failed. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    INVALID_RESPONSE: 'Invalid response from server.',
    NO_RESULTS: 'No images found for your query.',
    UNKNOWN_ERROR: 'An unknown error occurred.',
  },
  
  // Success messages
  SUCCESS_MESSAGES: {
    SEARCH_COMPLETED: 'Search completed successfully.',
    IMAGES_LOADED: 'Images loaded successfully.',
  },
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Content types
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data',
} as const;
