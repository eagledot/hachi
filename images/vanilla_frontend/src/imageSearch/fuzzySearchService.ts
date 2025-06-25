// Fuzzy Search Service 

import { API_ENDPOINTS } from './constants';

export interface SearchFilter {
  [attribute: string]: string[];
}

export interface SearchSuggestion {
  text: string;
  attribute: string;
  type: 'suggestion';
}

export interface AttributePattern {
  // keywords: string[];
  icon: string;
  color: string;
  examples: string[];
  description: string;
  displayName: string;
}

export const ATTRIBUTE_PATTERNS: Record<string, AttributePattern> = {
  'person': {
    // keywords: ['person:', 'people:', 'face:', '@'],
    icon: '👤',
    color: 'bg-green-100 text-green-800 border-green-200',
    examples: ['john', 'sarah', 'mike'],
    description: 'Search for people in your photos',
    displayName: 'People'
  },
  // 'location': {
  //   // keywords: ['location:', 'place:', 'where:', 'loc:'],
  //   icon: '📍',
  //   color: 'bg-blue-100 text-blue-800 border-blue-200',
  //   examples: ['paris', 'home', 'beach'],
  //   description: 'Find photos by location or place',
  //   displayName: 'Places'
  // },
  'query': {
    // keywords: ['query:', 'search:', 'text:', '#'],
    icon: '🔍',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    examples: ['sunset', 'birthday party', 'vacation'],
    description: 'Search photo descriptions and content',
    displayName: 'Keywords'
  },
  // 'camera_make': {
  //   // keywords: ['camera:', 'make:', 'brand:'],
  //   icon: '📷',
  //   color: 'bg-orange-100 text-orange-800 border-orange-200',
  //   examples: ['canon', 'nikon', 'sony'],
  //   description: 'Filter by camera brand or model',
  //   displayName: 'Camera'
  // },
  'resource_directory': {
    // keywords: ['folder:', 'dir:', 'path:'],
    icon: '📁',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    examples: ['vacation', 'photos', '2023'],
    description: 'Browse photos by folder or album',
    displayName: 'Folders'
  }
};

export class FuzzySearchService {
  private currentSuggestionController: AbortController | null = null;
  /**
   * Gets suggestions for a specific attribute and query (without cancellation for batch requests)
   */
  async getSuggestionBatch(attribute: string, query: string): Promise<string[]> {
    console.log('getSuggestionBatch called with:', { attribute, query });
    
    try {
      const formData = new FormData();
      formData.append("attribute", attribute);
      formData.append("query", query);
      
      const response = await fetch(`${API_ENDPOINTS.GET_SUGGESTION}`, {
        method: "POST",
        body: formData
      });
      
      console.log('API response status for', attribute, ':', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('API response data for', attribute, ':', data);
        return data[attribute] || [];
      } else {
        console.error('API response not ok for', attribute, ':', response.status, response.statusText);
      }
    } catch (error) {
      console.warn(`Failed to fetch suggestions for ${attribute}:`, error);
    }
    
    return [];
  }

  /**
   * Gets suggestions for a specific attribute and query
   */
  async getSuggestion(attribute: string, query: string): Promise<string[]> {
    console.log('getSuggestion called with:', { attribute, query });
    
    // Cancel any previous request
    if (this.currentSuggestionController) {
      this.currentSuggestionController.abort();
    }
    
    this.currentSuggestionController = new AbortController();
    
    try {
      const formData = new FormData();
      formData.append("attribute", attribute);
      formData.append("query", query);
      
      const response = await fetch(`${API_ENDPOINTS.GET_SUGGESTION}`, {
        method: "POST",
        body: formData,
        signal: this.currentSuggestionController.signal
      });
      
      console.log('API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('API response data:', data);
        return data[attribute] || [];
      } else {
        console.error('API response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Suggestion request was cancelled');
      } else {
        console.warn(`Failed to fetch suggestions for ${attribute}:`, error);
      }
    } finally {
      this.currentSuggestionController = null;
    }
    
    return [];
  }
  /**
   * Generates suggestions for all attributes simultaneously
   */
  async generateAllAttributeSuggestions(value: string): Promise<SearchSuggestion[]> {
    console.log('generateAllAttributeSuggestions called with:', value);
    
    if (!value.trim()) {
      return [];
    }

    // Filter out 'query' attribute - we don't want suggestions for query
    const availableAttributes = this.getAvailableAttributes().filter(attr => attr !== 'query');
    
    const suggestionPromises = availableAttributes.map(async (attribute) => {
      try {
        // Use getSuggestionBatch to avoid request cancellation issues
        const suggestions = await this.getSuggestionBatch(attribute, value);
        return suggestions.map((suggestion: string) => ({
          text: suggestion,
          attribute: attribute,
          type: 'suggestion' as const
        }));
      } catch (error) {
        console.warn(`Failed to fetch suggestions for ${attribute}:`, error);
        return [];
      }
    });

    try {
      const allSuggestionArrays = await Promise.all(suggestionPromises);
      const allSuggestions = allSuggestionArrays.flat();
      
      // Filter out empty suggestions and limit the total number
      const validSuggestions = allSuggestions.filter(suggestion => suggestion.text && suggestion.text.trim());
        // Prioritize person and resource_directory suggestions, then others
      const personSuggestions = validSuggestions.filter(s => s.attribute === 'person');
      const directorySuggestions = validSuggestions.filter(s => s.attribute === 'resource_directory');
      const otherSuggestions = validSuggestions.filter(s => s.attribute !== 'person' && s.attribute !== 'resource_directory');
      
      // Combine with person and directory suggestions first, then others
      const combinedSuggestions = [...personSuggestions, ...directorySuggestions, ...otherSuggestions];
      
      return combinedSuggestions.slice(0, 15); // Limit to 15 total suggestions
    } catch (error) {
      console.error('Error generating all attribute suggestions:', error);
      return [];
    }
  }

  /**
   * Generates formatted suggestions for UI display
   */
  async generateSuggestions(attribute: string, value: string): Promise<SearchSuggestion[]> {
    console.log('generateSuggestions called with:', { attribute, value });
    
    if (!value.trim()) {
      return [];
    }

    try {
      const suggestions = await this.getSuggestion(attribute, value);
      const formattedSuggestions = suggestions.map((suggestion: string) => ({
        text: suggestion,
        attribute: attribute,
        type: 'suggestion' as const
      }));
      
      // return formattedSuggestions.slice(0, 5); // Limit to 5 suggestions
      // Not sure if there needs to be a limit here, so leaving it out for now
      return formattedSuggestions
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [];
    }
  }

  /**
   * Builds a query string from search filters
   */
  buildQueryString(filters: SearchFilter, newAttribute?: string, newValue?: string): string {
    // Create a copy of filters and add new filter if provided
    const updatedFilters = { ...filters };
    if (newAttribute && newValue) {
      updatedFilters[newAttribute] = [...(updatedFilters[newAttribute] || []), newValue];
    }
    
    let queryCompleted = '';
    const nonEmptyKeys = Object.keys(updatedFilters).filter(key => updatedFilters[key].length > 0);
    
    for (let i = 0; i < nonEmptyKeys.length; i++) {
      const key = nonEmptyKeys[i];
      const values = updatedFilters[key];
      
      queryCompleted += key + '=';
      
      for (let j = 0; j < values.length; j++) {
        queryCompleted += values[j];
        if (j !== values.length - 1) {
          queryCompleted += '?';
        }
      }
      
      if (i !== nonEmptyKeys.length - 1) {
        queryCompleted += '&';
      }
    }
    
    return queryCompleted;
  }

  /**
   * Gets the icon for an attribute
   */
  getAttributeIcon(attribute: string): string {
    const pattern = ATTRIBUTE_PATTERNS[attribute];
    return pattern ? pattern.icon : '#️⃣';
  }

  /**
   * Gets the color class for an attribute
   */
  getAttributeColor(attribute: string): string {
    const pattern = ATTRIBUTE_PATTERNS[attribute];
    return pattern ? pattern.color : 'bg-gray-100 text-gray-800 border-gray-200';
  }
  /**
   * Gets the display name for an attribute
   */
  getAttributeDisplayName(attribute: string): string {
    const pattern = ATTRIBUTE_PATTERNS[attribute];
    return pattern ? pattern.displayName : attribute.charAt(0).toUpperCase() + attribute.slice(1).replace('_', ' ');
  }

  /**
   * Gets the description for an attribute
   */
  getAttributeDescription(attribute: string): string {
    const pattern = ATTRIBUTE_PATTERNS[attribute];
    return pattern ? pattern.description : 'Search attribute';
  }

  /**
   * Gets available attributes list
   */
  getAvailableAttributes(): string[] {
    return Object.keys(ATTRIBUTE_PATTERNS);
  }

  /**
   * Cleanup method to abort any pending requests
   */
  cleanup(): void {
    if (this.currentSuggestionController) {
      this.currentSuggestionController.abort();
      this.currentSuggestionController = null;
    }
  }
}
