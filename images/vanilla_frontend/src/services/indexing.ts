import { endpoints } from "../config";
import type { GetSuggestionPathRequest, Partition } from "../types/indexing";

export default class IndexingService {
  static async getPartitions() {
    try {
      const response = await fetch(endpoints.GET_PARTITIONS);
      if (!response.ok) {
        throw new Error(`Error fetching partitions: ${response.statusText}`);
      }

      const data: Partition[] = await response.json();
      return data;
    } catch (error) {
      console.error("Error in getPartitions:", error);
      return [];
    }
    }

  static processDirectoryPath(directoryPath: string): string[] {
    // Split the directory path into parts
    const parts = directoryPath.split(/[/\\]/); // Split by both forward and backward slashes
    
    // Handle root directory case - preserve leading slash
    if (parts[0] === '' && parts.length > 1) {
      return ['/', ...parts.slice(1).filter((part) => part.length > 0)];
    }
    
    // Remove empty parts (in case of trailing slashes)
    return parts.filter((part) => part.length > 0);
  }

  static async getSuggestionPath(data: GetSuggestionPathRequest) {
    try {
      const response = await fetch(endpoints.GET_SUGGESTION_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `Error fetching suggestion path: ${response.statusText}`
        );
      }

      const suggestionPath: string[] = await response.json();
      return suggestionPath;
    } catch (error) {
      console.error("Error in getSuggestionPath:", error);
      return [];
    }
  }
}
