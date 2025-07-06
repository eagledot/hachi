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
  private filteredPhotos: HachiImageData[] = [];
  private displayedPhotos: HachiImageData[] = []; // Currently displayed photos (for pagination)
  private currentModal: HachiImageData | null = null;
  
  // Pagination properties
  private readonly PAGE_SIZE = 100; // Display 100 photos per page for good performance
  private currentPage = 1;
  private totalPages = 0;constructor() {
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
  }  private handlePhotosUpdate(photos: HachiImageData[]): void {
    console.log('Photos updated:', photos.length);
    this.allPhotos = photos;
    this.filteredPhotos = [...photos]; // Initialize filtered photos with all photos
    
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
    
    // Initialize pagination
    this.updatePagination();
    this.renderDisplayedPhotos();
    
    // Setup pagination event listeners after pagination UI is rendered
    this.setupPaginationEventListeners();
    
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
    this.filteredPhotos = filteredPhotos;
    
    // Reset to page 1 when filters change
    this.currentPage = 1;
    
    this.updatePagination(); // Update pagination first
    this.renderDisplayedPhotos();
    
    // Re-setup pagination event listeners to ensure they work correctly
    this.setupPaginationEventListeners();
    
    // Update search service state to use filtered photos
    this.currentModal = null; // Reset modal state when filters change
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredPhotos.length / this.PAGE_SIZE);
    
    // Calculate displayed photos for current page
    const startIndex = (this.currentPage - 1) * this.PAGE_SIZE;
    const endIndex = Math.min(startIndex + this.PAGE_SIZE, this.filteredPhotos.length);
    this.displayedPhotos = this.filteredPhotos.slice(startIndex, endIndex);
    
    this.updatePaginationUI();
  }

  private updatePaginationUI(): void {
    // Update pagination info
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) {
      const startIndex = (this.currentPage - 1) * this.PAGE_SIZE + 1;
      const endIndex = Math.min(this.currentPage * this.PAGE_SIZE, this.filteredPhotos.length);
      paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${this.filteredPhotos.length} photos`;
    }

    // Update pagination buttons
    const prevBtn = document.getElementById('prev-page-btn') as HTMLButtonElement;
    const nextBtn = document.getElementById('next-page-btn') as HTMLButtonElement;
    const pageInfo = document.getElementById('page-info');

    if (prevBtn) {
      prevBtn.disabled = this.currentPage <= 1;
    }
    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= this.totalPages;
    }
    if (pageInfo) {
      pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    }

    // Show/hide pagination controls based on whether pagination is needed
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
      if (this.totalPages > 1) {
        paginationContainer.classList.remove('hidden');
      } else {
        paginationContainer.classList.add('hidden');
      }
    }
  }  private goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    
    this.currentPage = page;
    this.updatePagination();
    this.renderDisplayedPhotos();
    
    // Scroll to the top of the page instantly for performance
    window.scrollTo(0, 0);
  }

  private scrollToFilterLevel(): void {
    // Find the filter container or results section to scroll to
    const filterContainer = document.getElementById('photo-filter-container');
    const resultsSection = document.getElementById('results-section');
    
    // Use the filter container if visible, otherwise use the results section
    const targetElement = filterContainer?.classList.contains('lg:block') ? filterContainer : resultsSection;
    
    if (targetElement) {
      // Use requestAnimationFrame to ensure DOM updates are complete
      requestAnimationFrame(() => {
        const rect = targetElement.getBoundingClientRect();
        const offsetTop = window.pageYOffset + rect.top - 20; // 20px padding from top
        
        window.scrollTo({
          top: offsetTop,
          behavior: 'instant'
        });
      });
    }
  }

  private setupPaginationEventListeners(): void {
    const prevBtn = document.getElementById('prev-page-btn') as HTMLButtonElement;
    const nextBtn = document.getElementById('next-page-btn') as HTMLButtonElement;

    if (prevBtn) {
      // Remove any existing listeners first
      const newPrevBtn = prevBtn.cloneNode(true) as HTMLButtonElement;
      prevBtn.parentNode?.replaceChild(newPrevBtn, prevBtn);
      
      newPrevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!newPrevBtn.disabled) {
          this.goToPage(this.currentPage - 1);
        }
      });
    }

    if (nextBtn) {
      // Remove any existing listeners first
      const newNextBtn = nextBtn.cloneNode(true) as HTMLButtonElement;
      nextBtn.parentNode?.replaceChild(newNextBtn, nextBtn);
      
      newNextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!newNextBtn.disabled) {
          this.goToPage(this.currentPage + 1);
        }
      });
    }
  }

  private renderDisplayedPhotos(): void {
    // Use UIService to update photos with ONLY the displayed photos (pagination)
    this.uiService.updatePhotos(this.displayedPhotos, (photo) => this.handlePhotoClick(photo));
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
    
    // Find the index in the FILTERED photos (not just displayed photos)
    const photoIndex = this.filteredPhotos.findIndex(p => p.id === photo.id);
    if (photoIndex === -1) return;

    // Update search service with selected photo for consistency
    this.searchService.selectPhoto(photo);
    
    // Determine navigation capabilities based on filtered photos
    const canGoPrevious = photoIndex > 0;
    const canGoNext = photoIndex < this.filteredPhotos.length - 1;
    
    this.uiService.showModal(photo, canGoPrevious, canGoNext);
  }

  private handleModalClose(): void {
    console.log('Modal closed');
    this.searchService.clearSelection();
    this.uiService.hideModal();
  }
  private handleModalNext(): void {
    const state = this.searchService.getState();
    if (!state.selectedPhoto) return;
    
    // Find current photo in filtered photos
    const currentIndex = this.filteredPhotos.findIndex(p => p.id === state.selectedPhoto!.id);
    if (currentIndex !== -1 && currentIndex < this.filteredPhotos.length - 1) {
      console.log('Modal next');
      const nextPhoto = this.filteredPhotos[currentIndex + 1];
      this.searchService.selectPhoto(nextPhoto);
      
      const canGoPrevious = currentIndex + 1 > 0;
      const canGoNext = currentIndex + 1 < this.filteredPhotos.length - 1;
      
      this.uiService.showModal(nextPhoto, canGoPrevious, canGoNext);
    }
  }

  private handleModalPrevious(): void {
    const state = this.searchService.getState();
    if (!state.selectedPhoto) return;
    
    // Find current photo in filtered photos
    const currentIndex = this.filteredPhotos.findIndex(p => p.id === state.selectedPhoto!.id);
    if (currentIndex !== -1 && currentIndex > 0) {
      console.log('Modal previous');
      const prevPhoto = this.filteredPhotos[currentIndex - 1];
      this.searchService.selectPhoto(prevPhoto);
      
      const canGoPrevious = currentIndex - 1 > 0;
      const canGoNext = currentIndex - 1 < this.filteredPhotos.length - 1;
      
      this.uiService.showModal(prevPhoto, canGoPrevious, canGoNext);
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