// Main ImageSearch application entry point
import { SearchService, UIService, CONFIG, transformRawDataChunk } from './imageSearch';
import type { HachiImageData, ImageSearchResponse } from './imageSearch';
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
  
  //Pagination Info placeholders, initialized after querying is Done. 
  private queryToken: string = "";
  private nMatchesFound: number = 0; // This would comes from search-service, total number of matches found! 

  // Pagination properties
  private readonly PAGE_SIZE = 20;  // set the page-size . NOTE: keep it less than 200 for performance reasons!
  private currentPage = 0;  // NOTE: actual page_id for backend starts from zero, but we render zeroth/first page during `query` already!
  private totalPages = 0;
  constructor() {
    // Initialize reusable components first
    ImageModalComponent.initialize();
    PhotoGridComponent.initialize('photo-grid-container', {
      loadingId: 'loading-indicator',
      errorId: 'error-display',
      noResultsId: 'no-results-message',
      gridId: 'photo-grid'
    });    // Initialize photo filter component
    this.photoFilter = new PhotoFilterComponent({
      onFilterChange: (filteredPhotos) => this.handleFilteredPhotosUpdate(filteredPhotos),
      hideSearchInput: true // Hide search input in image-search page
    });    // Initialize filter UI immediately but keep it hidden
    const filterContainer = document.getElementById('photo-filter-container');
    if (filterContainer) {
      // Ensure filter starts completely hidden until photos are loaded
      filterContainer.classList.add('hidden');
      
      filterContainer.innerHTML = PhotoFilterComponent.getTemplate('photo-filter', true);
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
      onSearchExecuted: (query) => this.handleSearch(query)
    });    // Initialize UI service with photo-grid-container since that's where the photo grid elements are created
    this.uiService = new UIService('photo-grid-container');

    // Initialize search service with event callbacks
    this.searchService = new SearchService({
      onPhotosUpdate: (photos, query_token, n_pages, n_matches_found) => this.handlePhotosUpdate(photos, query_token, n_pages, n_matches_found),
      onLoadingChange: (isLoading) => this.handleLoadingChange(isLoading),
      onErrorChange: (error) => this.handleErrorChange(error),
      onSearchDoneChange: (isSearchDone) => this.handleSearchDoneChange(isSearchDone)
    });

    this.setupEventListeners();
    this.init();
  }  private init(): void {
    console.log('ImageSearch app initialized');
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
  }  private handlePhotosUpdate(
      // TODO: use a new type to represent the pagination data we received from server!
      photos: HachiImageData[],
      // pagination info. Declare proper type!
      query_token:string,
      n_pages:number,
      n_matches_found:number  
      ): void {
    /* @Anubhav
    This call back is being called by `searchService` on new updates of Photos data! (HachiPhotos type!)
    This does
    1. Filtering (To read the code)
    2. Pagination initialization (To modify it to call `collectQueryMeta` on new page request)
    3. Render 
    */
    
    console.log("query token: ", query_token);
    this.allPhotos = photos;
    this.filteredPhotos = [...photos]; // Initialize filtered photos with all photos
    
    //update pagination Info.
    this.currentPage = 0    // start with zero!
    this.queryToken = query_token
    this.totalPages = n_pages
    this.nMatchesFound = n_matches_found


    // Update filter component with new photos
    this.photoFilter.updatePhotos(photos);
    
    // Show filter container if we have photos
    const filterContainer = document.getElementById('photo-filter-container');
    if (filterContainer) {
      if (photos.length > 0) {
        filterContainer.classList.remove('hidden');
      } else {
        filterContainer.classList.add('hidden');
      }
    }
    
    /* @Anubhav
    Why we are setting up listeners again, and again, is there not a cleaner way
    Like set up once.. then difficult to pass state or something?
    */
    // Setup pagination event listeners after pagination UI is rendered
    this.setupPaginationEventListenersNew();

    // Set up page-specific fields/data and render pagination UI and then photos!
    this.updatePaginationNewAndRender(0); // set up zeroth/first page
        
    // Show/hide no results message
    const state = this.searchService.getState();
    if (photos.length === 0 && state.isSearchDone && !state.isLoading && !state.error) {
      this.uiService.showNoResults(true);
    } else {
      this.uiService.showNoResults(false);
    }
  }

  private handleFilteredPhotosUpdate(filteredPhotos: HachiImageData[]): void {
    // TODO:
    console.log('Filtered photos updated:', filteredPhotos.length);
    // this.filteredPhotos = filteredPhotos;
    
    // // Reset to page 0 when filters change, WHY ???
    // // If we do it page by page, then makes sense or doing it globally!
    // // in case of pagination i think it is easier to handle page by page basis.
    // // Let user adjust the page size instead to say 400 or something, to make it possible to filter on larger items!
    // this.currentPage = 0;
    
    // // this.updatePagination(); // Update pagination first
    // this.renderDisplayedPhotos();
    
    // // Re-setup pagination event listeners to ensure they work correctly
    // // this.setupPaginationEventListeners();
    
    // // Update search service state to use filtered photos
    // this.currentModal = null; // Reset modal state when filters change
  }

  private updatePaginationNewAndRender(
    page_id:number
    ): void {

    /*
      Updates the displayedPhotos field in reference to the page_id.
      Then updates the Pagination UI based on the `currentPage` and totalPages.
      Then renders the Displayed/collected photos!
    */

    const startIndex = (page_id) * this.PAGE_SIZE;
    const endIndex = Math.min((page_id + 1) * this.PAGE_SIZE, this.nMatchesFound);
    
    if (page_id !== this.currentPage){
      fetch("/api/collectQueryMeta/" + this.queryToken + "/" + String(page_id))
      .then((response) => {
        if (response.ok){
          response.json()
          .then((rawData) => {
            if (rawData){
              console.log("Yeah ok!!!");
              let temp = rawData as ImageSearchResponse;
              // TODO: transform can be done away i think, as no need to map or anything, we send back float values!!
              const newPhotosChunk = transformRawDataChunk(temp);

              // TODO: udpate/rectify mergePhotos, to sync i think properly!
              // const updatedPhotos = mergePhotos(this.state.photos, newPhotosChunk);

              this.displayedPhotos = newPhotosChunk;
              this.updatePaginationUINew();
              this.renderDisplayedPhotos();
            }
          })
        }
        else{
          throw(Error); // TODO: throw a proper error you noob!
        }
      })
    }
    else{
      this.displayedPhotos = this.allPhotos.slice(startIndex, endIndex);
      console.log((this.displayedPhotos).length)
      this.updatePaginationUINew();
      this.renderDisplayedPhotos();
    }
    this.currentPage = page_id;
    }
    
  private updatePaginationUINew(): void {
    // Update pagination info
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) {
      const startIndex = (this.currentPage) * this.PAGE_SIZE;
      const endIndex = Math.min((this.currentPage + 1)* this.PAGE_SIZE, this.nMatchesFound);
      // TODO: may be integrate Filtered photos details here but filter should be page by page!
      paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${this.nMatchesFound} photos`;

    }

    // Update pagination buttons
    const prevBtn = document.getElementById('prev-page-btn') as HTMLButtonElement;
    const nextBtn = document.getElementById('next-page-btn') as HTMLButtonElement;
    const pageInfo = document.getElementById('page-info');

    if (prevBtn) {
      prevBtn.disabled = this.currentPage <= 0;
    }
    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= (this.totalPages - 1);
    }
    if (pageInfo) {
      pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages - 1}`;
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
  }  

  private scrollToFilterLevel(): void {
    // Find the filter container or results section to scroll to
    const filterContainer = document.getElementById('photo-filter-container');
    const resultsSection = document.getElementById('results-section');
    
    // Use the filter container if visible, otherwise use the results section
    const targetElement = filterContainer && !filterContainer.classList.contains('hidden') ? filterContainer : resultsSection;
    
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

  private setupPaginationEventListenersNew(): void {
    /* @Anubhav 
    Why this need to be called again and again
    */    
    const prevBtn = document.getElementById('prev-page-btn') as HTMLButtonElement;
    const nextBtn = document.getElementById('next-page-btn') as HTMLButtonElement;
    
    if (prevBtn) {
      // Remove any existing listeners first
      const newPrevBtn = prevBtn.cloneNode(true) as HTMLButtonElement;
      prevBtn.parentNode?.replaceChild(newPrevBtn, prevBtn);
      

      newPrevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("prev button clicked! displaying: ", this.currentPage);
        this.updatePaginationNewAndRender(this.currentPage - 1);
      });
    }

    if (nextBtn) {
      // Remove any existing listeners first
      const newNextBtn = nextBtn.cloneNode(true) as HTMLButtonElement;
      nextBtn.parentNode?.replaceChild(newNextBtn, nextBtn);
      
      newNextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("prev button clicked! displaying: ", this.currentPage);
        this.updatePaginationNewAndRender(this.currentPage + 1);
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
    
    // Disable/enable fuzzy search inputs based on loading state
    if (isLoading) {
      this.fuzzySearchUI.disableInputs();
    } else {
      this.fuzzySearchUI.enableInputs();
    }
  }

  private handleErrorChange(error: string | null): void {
    console.log('Error state changed:', error);
    this.uiService.updateError(error);
  }

  private handleSearchDoneChange(isSearchDone: boolean): void {
    console.log('Search done state changed:', isSearchDone);
    
    // Ensure inputs are enabled when search is done
    if (isSearchDone) {
      this.fuzzySearchUI.enableInputs();
    }
    
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