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
}

export interface SearchRequestOptions {
  isInitialSearch: boolean;
  clientId?: string;
}

export interface SearchEvents {
  onPhotosUpdate: (photos: HachiImageData[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onErrorChange: (error: string | null) => void;
  onSearchDoneChange: (isSearchDone: boolean) => void;
}
