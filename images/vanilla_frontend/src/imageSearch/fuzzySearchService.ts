// Fuzzy Search Service

import { endpoints } from "../config";
import { fetchWithSession } from "../utils";

export interface SearchFilter {
  [attribute: string]: string[];
}

export interface SearchSuggestion {
  text: string;
  attribute: string;
  type: "suggestion";
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
  person: {
    // keywords: ['person:', 'people:', 'face:', '@'],
    icon: "👤",
    color: "bg-green-100 text-green-800 border-green-200",
    examples: ["john", "sarah", "mike"],
    description: "Search for people in your photos",
    displayName: "People",
  },
  // 'location': {
  //   // keywords: ['location:', 'place:', 'where:', 'loc:'],
  //   icon: '📍',
  //   color: 'bg-blue-100 text-blue-800 border-blue-200',
  //   examples: ['paris', 'home', 'beach'],
  //   description: 'Find photos by location or place',
  //   displayName: 'Places'
  // },
  query: {
    // keywords: ['query:', 'search:', 'text:', '#'],
    icon: "🔍",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    examples: ["sunset", "birthday party", "vacation"],
    description: "Search photo descriptions and content",
    displayName: "Keywords",
  },
  // 'camera_make': {
  //   // keywords: ['camera:', 'make:', 'brand:'],
  //   icon: '📷',
  //   color: 'bg-orange-100 text-orange-800 border-orange-200',
  //   examples: ['canon', 'nikon', 'sony'],
  //   description: 'Filter by camera brand or model',
  //   displayName: 'Camera'
  // },
  resource_directory: {
    // keywords: ['folder:', 'dir:', 'path:'],
    icon: "📁",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    examples: ["vacation", "photos", "2023"],
    description: "Browse photos by folder or album",
    displayName: "Folders",
  },
};

export class FuzzySearchService {
  private currentSuggestionController: AbortController | null = null;
  /**
   * Gets suggestions for a specific attribute and query (without cancellation for batch requests)
   */

  /**
   * Builds a query string from search filters
   */
  buildQueryString(
    filters: SearchFilter,
    newAttribute?: string,
    newValue?: string
  ): string {
    // Create a copy of filters and add new filter if provided
    const updatedFilters = { ...filters };
    if (newAttribute && newValue) {
      updatedFilters[newAttribute] = [
        ...(updatedFilters[newAttribute] || []),
        newValue,
      ];
    }

    let queryCompleted = "";
    const nonEmptyKeys = Object.keys(updatedFilters).filter(
      (key) => updatedFilters[key].length > 0
    );

    for (let i = 0; i < nonEmptyKeys.length; i++) {
      const key = nonEmptyKeys[i];
      const values = updatedFilters[key];

      queryCompleted += key + "=";

      for (let j = 0; j < values.length; j++) {
        queryCompleted += values[j];
        if (j !== values.length - 1) {
          queryCompleted += "?";
        }
      }

      if (i !== nonEmptyKeys.length - 1) {
        queryCompleted += "&";
      }
    }

    return queryCompleted;
  }

  /**
   * Gets the icon for an attribute
   */
  getAttributeIcon(attribute: string): string {
    const pattern = ATTRIBUTE_PATTERNS[attribute];
    return pattern ? pattern.icon : "#️⃣";
  }

  /**
   * Gets the color class for an attribute
   */
  getAttributeColor(attribute: string): string {
    const pattern = ATTRIBUTE_PATTERNS[attribute];
    return pattern
      ? pattern.color
      : "bg-gray-100 text-gray-800 border-gray-200";
  }
  /**
   * Gets the display name for an attribute
   */
  getAttributeDisplayName(attribute: string): string {
    const pattern = ATTRIBUTE_PATTERNS[attribute];
    return pattern
      ? pattern.displayName
      : attribute.charAt(0).toUpperCase() +
          attribute.slice(1).replace("_", " ");
  }

  /**
   * Gets the description for an attribute
   */
  getAttributeDescription(attribute: string): string {
    const pattern = ATTRIBUTE_PATTERNS[attribute];
    return pattern ? pattern.description : "Search attribute";
  }

  async getSuggestions(value: string) {
    const formData = new FormData();
    formData.append("query", value);

    const response = await fetchWithSession(`${endpoints.GET_SUGGESTIONS}`, {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
      let data = await response.json();
      const suggestions = [];

      let attributes = Object.keys(data);
      console.log("Suggestion attributes: ", attributes);
      for (let i = 0; i < attributes.length; i++) {
        let curr_attribute = attributes[i];
        // Remove the duplicates from it since the backend currently send duplicate values
        const uniqueValues = Array.from(new Set(data[curr_attribute]));
        for (let j = 0; j < uniqueValues.length; j++)
          suggestions.push({
            text: uniqueValues[j] as string,
            attribute: curr_attribute,
            type: "suggestion" as const,
          });
      }

      return suggestions;
    }
    return [];
  }

  /**
   * Gets available attributes list
   */
  getAvailableAttributes(): string[] {
    return Object.keys(ATTRIBUTE_PATTERNS);
  }
}
