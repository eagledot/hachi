import type {
  HachiImageData,
} from "./types";
import { endpoints } from "../config";
import type { ImageSearchResponse } from "./types";
import { transformRawDataChunk } from "./utils";

export class SearchService {
  async startSearch(searchTerm: string): Promise<ImageSearchResponse> {
    let formData = new FormData();
    formData.append("query_start", String(true));
    formData.append("query", searchTerm);
    formData.append("page_size", String(100));

    try {
      const response = await fetch(endpoints.IMAGE_SEARCH, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Image search error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Search request failed:", error);
      throw error;
    }
  }

  async fetchSearchResults(queryToken: string, pageNumber: Number) : Promise<HachiImageData[]> {
    try {
      const URL = `${endpoints.COLLECT_QUERY_META}/${queryToken}/${String(pageNumber)}`;
      console.log(URL)
      const response = await fetch(URL);
      if (!response.ok) {
        throw new Error(`Query results fetch error: ${response.status}`);
      }
      const results = await response.json();
      return transformRawDataChunk(results);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
