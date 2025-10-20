

export interface IndexStartResponse {
  details: string;
  error: string;
}

export interface IndexStartRequest {
  location: string;
  identifier: string;
  uri: string[];
  complete_rescan?: boolean;
}

export interface RemoteClientInfo {
  protocol:string; // generally a 3 letter protocol identifier like MTP, GDR (google drive)
  name:string;    // descriptive name
  last_scan:string;     // (iso-format) last successful scan information!
  id:string;            // unique Id like an email or device-serial number!
  logo:string;          // supposed to be  base64 encoded, but still be sent from backend!
}
export interface Partition {
  location: string;
  identifier: string;
}

export interface GetSuggestionPathRequest extends Partition {
  uri: string[];
}

export interface IndexStatusResponse {
  done: boolean;        // If true, client should stop asking status updates, it would mean previous indexing is done.
  processed: number;  // How many of items for current event has been processed!
  total: number;      // How many total items for current event has been estimated! 
  eta: number;  // Estimated time for current event. (like indexing a particular directory.. may be not the whole of index!)
  details?: string;     // Latest details if any!
  error?: string;      // If any error occurred during indexing!
}


export interface IndexingStats {
    image: {
        count: number;
        unique_people_count: number;
        unique_place_count: number;
    }
}

