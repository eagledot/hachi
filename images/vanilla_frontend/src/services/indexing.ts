import { endpoints } from "../config";
import type { GetSuggestionPathRequest, Partition, RemoteClientInfo } from "../types/indexing";
import { fetchWithSession } from "../utils";


export default class IndexingService {
  
  static async getRemoteClients() {
    // Get availbale remote clients info, like Protocol and and a descriptive name.
    // We would be calling it once, for a fresh page reload. and populate it. Any new extensions set-up after that, should be visible after a page-reload!
    try {
      // const response = await fetchWithSession(endpoints.GET_REMOTE_CLIENTS);
      // Note: No need to send some extra-headers for this request. may be useful in Future!
      console.log("Getting remote Clients info: ");
      const response = await fetch(endpoints.GET_REMOTE_CLIENTS);
      if (!response.ok) {
        throw new Error(`Error fetching partitions: ${response.statusText}`);
      }

      const data: RemoteClientInfo[] = await response.json();
      return data;
    } catch (error) {
      console.error("Error in getting Remote Clients:", error);
      return [];
    }
    }
  
  static async getPartitions() {
    try {
      const response = await fetchWithSession(endpoints.GET_PARTITIONS);
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

  static async getSuggestionPath(data: GetSuggestionPathRequest) {
    try {
      const response = await fetchWithSession(endpoints.GET_SUGGESTION_PATH, {
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
