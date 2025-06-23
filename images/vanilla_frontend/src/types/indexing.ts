export interface IndexingStats {
  // Define based on the actual structure returned by GET_META_STATS_URL
  // This is a placeholder based on the React component's usage.
  // Example: image: { total: number; indexed: number };
  [key: string]: any;
}

export interface IndexStartResponse {
  success: boolean;
  statusEndpoint?: string; // Matches React component's expectation
  reason?: string;
}

export interface IndexStatusResponse {
  done: boolean;
  progress: number;
  details: string;
  current_directory: string; // Matches React component's expectation
  eta: string;
}

export interface IndexStartRequest {
  location: string;
  identifier: string;
  uri: string[];
  complete_rescan?: boolean;
}

export interface Partition {
  location: string;
  identifier: string;
}

export interface GetSuggestionPathRequest extends Partition {
  uri: string[];
}