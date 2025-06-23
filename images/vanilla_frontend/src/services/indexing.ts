import { endpoints } from "../config";
import type { GetSuggestionPathRequest, Partition } from "../types/indexing";

export default class IndexingService {
    static async getPartitions() {
        const response = await fetch(endpoints.GET_PARTITIONS);
        if (!response.ok) {
            throw new Error(`Error fetching partitions: ${response.statusText}`);
        }

        const data: Partition[] = await response.json();
        return data;
    }

    static processDirectoryPath(directoryPath: string): string[] {
        // Split the directory path into parts
        const parts = directoryPath.split(/[/\\]/); // Split by both forward and backward slashes
        // Remove empty parts (in case of leading/trailing slashes)
        return parts.filter(part => part.length > 0);
    }

    static async getSuggestionPath(data: GetSuggestionPathRequest) {
        const response = await fetch(endpoints.GET_SUGGESTION_PATH, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Error fetching suggestion path: ${response.statusText}`);
        }

        const suggestionPath: string[] = await response.json();
        return suggestionPath;
    }
}

