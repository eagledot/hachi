export type { ImageData as HachiImageData, ImageMetaData, ImageSearchResponse } from '../types/images';
import type { ImageData as HachiImageData } from '../types/images';

// Types specific to ImageSearch functionality
export interface SearchState {
  photos: HachiImageData[];
  isLoading: boolean;
  isSearchDone: boolean;
  error: string | null;
  selectedPhoto: HachiImageData | null;
  currentPhotoIndex: number | null;
  pollingSearchTerm: string;
  clientId: string | null;
  // pagination info return from `query` or `meta-data query` like APIs
  query_token: string | null;
  n_pages: number | null;
  n_matches_found: number | null;
}

export interface SearchRequestOptions {
  isInitialSearch: boolean;
  clientId?: string;
}

export interface SearchEvents {
  onPhotosUpdate: (photos: HachiImageData[], query_token:string, n_pages:number, n_matches_found:number) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onErrorChange: (error: string | null) => void;
  onSearchDoneChange: (isSearchDone: boolean) => void;
}
