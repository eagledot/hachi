// Image types
export interface ImageMetaData {
  absolute_path?: string;
  albums?: string; // TODO: Check if it needs to be an array
  description?: string;
  device?: string;
  filename?: string;
  gps_latitude?: string;
  gps_longitude?: string;
  height?: number;
  is_favourite?: boolean;
  is_indexed?: boolean;
  make?: string;
  model?: string;
  modified_at?: string;
  person?: string[];
  place?: string;
  resource_directory?: string;
  resource_extension?: string;
  resource_hash?: string;
  resource_type?: string;
  tags?: string[] | string;
  taken_at?: string;
  width?: number;
  // [key: string]: any; // Allow other fields not explicitly defined
}

export interface ImageData {
  id: string;
  metadata?: ImageMetaData;
  score?: number | string; // Score can be a number or a string TODO: FIX THIS IN BACKEND
}

export interface ImagesData {
  meta_data: ImageMetaData[];
  data_hash: string[];
  score: (string | number)[];  // Scores are sometimes strings, sometimes numbers
  done?: boolean; // Indicates if the data loading is complete
}

// Represents the raw response structure from the backend for a search query
export interface ImageSearchResponse extends ImagesData {
  client_id?: string;
  query_completed: boolean; // Indicates if the search/polling is complete
}
