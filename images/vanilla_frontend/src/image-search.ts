// Main ImageSearch application entry point
import { SearchService, UIService, CONFIG } from './imageSearch';
import type { HachiImageData } from './imageSearch';
import { FuzzySearchService } from './imageSearch/fuzzySearchService';
import { FuzzySearchUI } from './imageSearch/fuzzySearchUI';
import { ImageModalComponent, PhotoGridComponent, PhotoFilterComponent } from './components';

class ImageSearchApp {
  private searchService: SearchService;
  private uiService: UIService;
  private fuzzySearchService: FuzzySearchService;
  private fuzzySearchUI: FuzzySearchUI;
  private photoFilter: PhotoFilterComponent;
  private allPhotos: HachiImageData[] = [];
  private currentModal: HachiImageData | null = null;  constructor() {
    // Initialize reusable components first
    ImageModalComponent.initialize();
    PhotoGridComponent.initialize('photo-grid-container', {
      loadingId: 'loading-indicator',
      errorId: 'error-display',
      noResultsId: 'no-results-message',
      gridId: 'photo-grid'
    });    // Initialize photo filter component
    this.photoFilter = new PhotoFilterComponent({
      onFilterChange: (filteredPhotos) => this.handleFilteredPhotosUpdate(filteredPhotos)
    });    // Initialize filter UI immediately but keep it hidden
    const filterContainer = document.getElementById('photo-filter-container');
    if (filterContainer) {
      // Ensure filter starts completely hidden until photos are loaded
      filterContainer.classList.remove('lg:block');
      filterContainer.classList.add('hidden');
      
      filterContainer.innerHTML = PhotoFilterComponent.getTemplate('photo-filter');
      this.photoFilter.initialize('photo-filter');
    }

    // Initialize fuzzy search service first
    this.fuzzySearchService = new FuzzySearchService();
    
    // Get the fuzzy search container element
    const fuzzyContainer = document.getElementById('fuzzy-search-container');
    if (!fuzzyContainer) {
      throw new Error('Fuzzy search container not found');
    }
    
    // Initialize fuzzy search UI
    this.fuzzySearchUI = new FuzzySearchUI(fuzzyContainer, {
      onSearchExecuted: (query, _filters) => this.handleSearch(query),
      onFilterAdded: (attribute, value) => this.handleFilterAdded(attribute, value),
      onFilterRemoved: (attribute, value) => this.handleFilterRemoved(attribute, value)
    });    // Initialize UI service with photo-grid-container since that's where the photo grid elements are created
    this.uiService = new UIService('photo-grid-container');

    // Initialize search service with event callbacks
    this.searchService = new SearchService({
      onPhotosUpdate: (photos) => this.handlePhotosUpdate(photos),
      onLoadingChange: (isLoading) => this.handleLoadingChange(isLoading),
      onErrorChange: (error) => this.handleErrorChange(error),
      onSearchDoneChange: (isSearchDone) => this.handleSearchDoneChange(isSearchDone)
    });

    this.setupEventListeners();
    this.init();
  }  private init(): void {
    console.log('ImageSearch app initialized');
    
    // Process URL parameters to initialize search state
    this.processUrlParameters();
  }
  /**
   * Process URL search parameters to initialize default search attributes
   */
  private processUrlParameters(): void {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for various search parameters and add them as filters
    const supportedAttributes = ['query', 'person', 'resource_directory', 'camera_make', 'camera_model', 'location'];
    let hasFilters = false;
    
    supportedAttributes.forEach(attribute => {
      const value = urlParams.get(attribute);
      if (value) {
        console.log(`Found URL parameter: ${attribute}=${value}`);
        let processedValue = decodeURIComponent(value);
        
        // Fix path separators for resource_directory on Windows
        if (attribute === 'resource_directory') {
          processedValue = processedValue.replace(/\//g, '\\');
        }
        
        this.fuzzySearchUI.addFilterExternal(attribute, processedValue);
        hasFilters = true;
      }
    });
    
    // If we have filters from URL, execute search automatically
    if (hasFilters) {
      console.log('Executing search based on URL parameters');
      this.fuzzySearchUI.executeSearchExternal();
    }
  }

  private handleFilterAdded(attribute: string, value: string): void {
    console.log('Filter added:', attribute, value);
    // Optional: Track filter changes for analytics or recent searches
  }

  private handleFilterRemoved(attribute: string, value: string): void {
    console.log('Filter removed:', attribute, value);
    // Optional: Track filter changes for analytics
  }
  
  private setupEventListeners(): void {
    console.log('Setting up event listeners for ImageSearchApp');
    // Setup UI service event listeners for modal and photo grid interactions
    this.uiService.setupEventListeners({
      onPhotoClick: (photo) => this.handlePhotoClick(photo),
      onModalClose: () => this.handleModalClose(),
      onModalNext: () => this.handleModalNext(),
      onModalPrevious: () => this.handleModalPrevious()
    });    // Listen for global search events (if any external components trigger searches)
    this.setupGlobalSearchListener();
    
    // Setup mobile filter toggle
    this.setupMobileFilterToggle();
  }
  
  private setupMobileFilterToggle(): void {
    const mobileToggle = document.getElementById('mobile-filter-toggle');
    const filterContainer = document.getElementById('photo-filter-container');
    
    if (mobileToggle && filterContainer) {
      mobileToggle.addEventListener('click', () => {
        filterContainer.classList.toggle('hidden');
        
        // Update toggle button icon
        const chevron = mobileToggle.querySelector('svg:last-child');
        if (chevron) {
          chevron.classList.toggle('rotate-180');
        }
      });
    }
  }
  private setupGlobalSearchListener(): void {
    console.log('Setting up global search listener');
    // Listen for custom search events from other components
    document.addEventListener('imageSearch', (event: any) => {
      const { query } = event.detail;
      if (query) {
        // Execute search directly since fuzzy search UI handles query formatting
        this.handleSearch(query);
      }
    });
  }
  private async handleSearch(query: string): Promise<void> {
    console.log("Function handleSearch called with query:", query);
    if (!query.trim()) {
      this.uiService.updateError('Please enter a search term');
      return;
    }

    if (query.length < CONFIG.MIN_SEARCH_LENGTH) {
      this.uiService.updateError(`Search term must be at least ${CONFIG.MIN_SEARCH_LENGTH} character(s) long`);
      return;
    }

    console.log('Starting search for:', query);
    
    try {
      await this.searchService.startSearch(query);
    } catch (error) {
      console.error('Search failed:', error);
      this.uiService.updateError(error instanceof Error ? error.message : CONFIG.ERROR_MESSAGES.UNKNOWN_ERROR);
    }
  }
  private handlePhotosUpdate(photos: HachiImageData[]): void {
    console.log('Photos updated:', photos.length);
    this.allPhotos = photos;
      // Update filter component with new photos
    this.photoFilter.updatePhotos(photos);
      // Show filter container if we have photos
    const filterContainer = document.getElementById('photo-filter-container');
    if (filterContainer) {
      if (photos.length > 0) {
        filterContainer.classList.remove('hidden');
        filterContainer.classList.add('lg:block');
      } else {
        filterContainer.classList.remove('lg:block');
        filterContainer.classList.add('hidden');
      }
    }
    
    // Show/hide no results message
    const state = this.searchService.getState();
    if (photos.length === 0 && state.isSearchDone && !state.isLoading && !state.error) {
      this.uiService.showNoResults(true);
    } else {
      this.uiService.showNoResults(false);
    }
  }

  private handleFilteredPhotosUpdate(filteredPhotos: HachiImageData[]): void {
    console.log('Filtered photos updated:', filteredPhotos.length);
    this.uiService.updatePhotos(filteredPhotos, (photo) => this.handlePhotoClick(photo));
    
    // Update search service state to use filtered photos
    this.currentModal = null; // Reset modal state when filters change
  }

  private handleLoadingChange(isLoading: boolean): void {
    console.log('Loading state changed:', isLoading);
    this.uiService.updateLoading(isLoading);
  }

  private handleErrorChange(error: string | null): void {
    console.log('Error state changed:', error);
    this.uiService.updateError(error);
  }

  private handleSearchDoneChange(isSearchDone: boolean): void {
    console.log('Search done state changed:', isSearchDone);
    
    // Update no results display if needed
    const state = this.searchService.getState();
    if (state.photos.length === 0 && isSearchDone && !state.isLoading && !state.error) {
      this.uiService.showNoResults(true);
    }
  }

  private handlePhotoClick(photo: HachiImageData): void {
    console.log('Photo clicked:', photo.id);
    this.searchService.selectPhoto(photo);
    
    this.uiService.showModal(
      photo, 
      this.searchService.canGoPrevious(), 
      this.searchService.canGoNext()
    );
  }

  private handleModalClose(): void {
    console.log('Modal closed');
    this.searchService.clearSelection();
    this.uiService.hideModal();
  }

  private handleModalNext(): void {
    if (this.searchService.canGoNext()) {
      console.log('Modal next');
      this.searchService.nextPhoto();
      
      const state = this.searchService.getState();
      if (state.selectedPhoto) {
        this.uiService.showModal(
          state.selectedPhoto,
          this.searchService.canGoPrevious(),
          this.searchService.canGoNext()
        );
      }
    }
  }

  private handleModalPrevious(): void {
    if (this.searchService.canGoPrevious()) {
      console.log('Modal previous');
      this.searchService.previousPhoto();
      
      const state = this.searchService.getState();
      if (state.selectedPhoto) {
                this.uiService.showModal(
          state.selectedPhoto,
          this.searchService.canGoPrevious(),
          this.searchService.canGoNext()
        );
      }
    }
  }

  // Public API for external usage
  public search(query: string): void {
    // Execute search directly with the fuzzy search system
    this.handleSearch(query);
  }

  public getState() {
    return this.searchService.getState();
  }
  
  public destroy(): void {
    this.searchService.destroy();
    // FuzzySearchUI doesn't have a destroy method currently
    this.fuzzySearchUI.cleanup();
    // TODO: Implement cleanup if needed
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing ImageSearch app');
  
  // Create global instance
  (window as any).imageSearchApp = new ImageSearchApp();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  if ((window as any).imageSearchApp) {
    (window as any).imageSearchApp.destroy();
  }
});

export { ImageSearchApp };