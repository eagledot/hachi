// Main search service that handles search logic and state management
import type { HachiImageData, SearchState, SearchEvents, SearchRequestOptions } from './types';
import { SearchApiService } from './apiService';
import { transformRawDataChunk, mergePhotos } from './utils';
import { CONFIG } from './constants';

const POLLING_INTERVAL = CONFIG.POLLING_INTERVAL;

export class SearchService {
  private state: SearchState = {
    photos: [],
    isLoading: false,
    isSearchDone: false,
    error: null,
    selectedPhoto: null,
    currentPhotoIndex: null,
    pollingSearchTerm: '',
    clientId: null
  };

  private events: SearchEvents;
  private pollingInterval: number | null = null;
  private shouldStopPolling: boolean = false; 

  constructor(events: SearchEvents) {
    this.events = events;
  }

  /**
   * Gets the current state
   */
  getState(): Readonly<SearchState> {
    return { ...this.state };
  }

  /**
   * Updates state and triggers appropriate events
   */
  private updateState(updates: Partial<SearchState>): void {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };    // Trigger events for changed properties
    if (updates.photos !== undefined && updates.photos !== oldState.photos) {
      this.events.onPhotosUpdate(this.state.photos);
    }
    if (updates.isLoading !== undefined && updates.isLoading !== oldState.isLoading) {
      this.events.onLoadingChange(this.state.isLoading);
    }
    if (updates.error !== undefined) {
      this.events.onErrorChange(this.state.error);
    }
    if (updates.isSearchDone !== undefined && updates.isSearchDone !== oldState.isSearchDone) {
      this.events.onSearchDoneChange(this.state.isSearchDone);
    }
  }

  /**
   * Starts a new search
   */
  async startSearch(searchTerm: string): Promise<void> {
    console.log("Inside startSearch with term:", searchTerm);
    this.stopPolling();
    
    this.updateState({
      isLoading: true,
      error: null,
      isSearchDone: false,
      photos: [],
      pollingSearchTerm: searchTerm.trim(),
      clientId: null
    });

    await this.performSearch(searchTerm, { isInitialSearch: true });
  }

  /**
   * Performs a search request
   */
  private async performSearch(searchTerm: string, options: SearchRequestOptions): Promise<void> {
    try {
      const rawData = await SearchApiService.searchImages(searchTerm, {
        ...options,
        clientId: this.state.clientId || undefined
      });

      // Update client ID if this is an initial search
      if (options.isInitialSearch && rawData.client_id) {
        this.updateState({ clientId: rawData.client_id });
      }

      // Transform and merge photos
      const newPhotosChunk = transformRawDataChunk(rawData);
      const updatedPhotos = mergePhotos(this.state.photos, newPhotosChunk);

      // Verify photos are sorted in decreasing order by score
      for (let i = 1; i < updatedPhotos.length; i++) {
        if (updatedPhotos[i].score !== undefined && updatedPhotos[i - 1].score !== undefined && 
            updatedPhotos[i].score! > updatedPhotos[i - 1].score!) {
          console.warn(`Photos not in decreasing score order at index ${i}: ${updatedPhotos[i - 1].score} -> ${updatedPhotos[i].score}`);
          break;
        }
      }



      this.updateState({
        photos: updatedPhotos,
        isSearchDone: rawData.query_completed,
        isLoading: false // Stop loading when first chunk is received
      });

      // Handle search completion or start polling
      if (rawData.query_completed) {
        this.updateState({ isLoading: false });
        this.stopPolling();
      } else if (options.isInitialSearch) {
        this.startPolling();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      this.updateState({
        error: errorMessage,
        isLoading: false,
        isSearchDone: true
      });
      this.stopPolling();
      console.error('Search error:', error);
    }
  }

  /**
   * Starts polling for search updates
   */
  private async startPolling(): Promise<void> {
    console.log("Starting polling for search term:", this.state.pollingSearchTerm);
    // if (this.pollingInterval) return;
    this.shouldStopPolling = false;

    while (!this.shouldStopPolling && this.state.pollingSearchTerm && !this.state.isSearchDone) {
      // await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));

      await this.performSearch(this.state.pollingSearchTerm, { isInitialSearch: false });
    }

    // this.pollingInterval = window.setInterval(() => {
    //   if (this.state.pollingSearchTerm && !this.state.isSearchDone) {
    //     this.performSearch(this.state.pollingSearchTerm, { isInitialSearch: false });
    //   }
    // }, POLLING_INTERVAL);
  }

  /**
   * Stops polling
   */
  private stopPolling(): void {
    // if (this.pollingInterval) {
    //   clearInterval(this.pollingInterval);
    //   this.pollingInterval = null;
    // }
    this.shouldStopPolling = true;
    console.log("Polling stopped.");
  }

  /**
   * Selects a photo and sets the current index
   */
  selectPhoto(photo: HachiImageData): void {
    const index = this.state.photos.findIndex(p => p.id === photo.id);
    if (index !== -1) {
      this.updateState({
        selectedPhoto: photo,
        currentPhotoIndex: index
      });
    }
  }

  /**
   * Clears the selected photo
   */
  clearSelection(): void {
    this.updateState({
      selectedPhoto: null,
      currentPhotoIndex: null
    });
  }

  /**
   * Navigates to the next photo
   */
  nextPhoto(): void {
    const { currentPhotoIndex, photos } = this.state;
    if (currentPhotoIndex !== null && currentPhotoIndex < photos.length - 1) {
      const nextIndex = currentPhotoIndex + 1;
      this.updateState({
        currentPhotoIndex: nextIndex,
        selectedPhoto: photos[nextIndex]
      });
    }
  }

  /**
   * Navigates to the previous photo
   */
  previousPhoto(): void {
    const { currentPhotoIndex, photos } = this.state;
    if (currentPhotoIndex !== null && currentPhotoIndex > 0) {
      const prevIndex = currentPhotoIndex - 1;
      this.updateState({
        currentPhotoIndex: prevIndex,
        selectedPhoto: photos[prevIndex]
      });
    }
  }

  /**
   * Checks if can navigate to next photo
   */
  canGoNext(): boolean {
    const { currentPhotoIndex, photos } = this.state;
    return currentPhotoIndex !== null && currentPhotoIndex < photos.length - 1;
  }

  /**
   * Checks if can navigate to previous photo
   */
  canGoPrevious(): boolean {
    const { currentPhotoIndex } = this.state;
    return currentPhotoIndex !== null && currentPhotoIndex > 0;
  }

  /**
   * Cleans up resources
   */
  destroy(): void {
    this.stopPolling();
  }
}
