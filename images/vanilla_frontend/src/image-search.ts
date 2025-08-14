// Main ImageSearch application entry point
import { SearchService, UIService } from "./imageSearch";
import type { HachiImageData } from "./imageSearch";
import { FuzzySearchService } from "./imageSearch/fuzzySearchService";
import { FuzzySearchUI } from "./imageSearch/fuzzySearchUI";

import {
  ImageModalComponent,
  PhotoGridComponent,
  PhotoFilterComponent,
} from "./components";
import { PaginationComponent } from "./components/pagination";

class ImageSearchApp {
  private searchService: SearchService;
  private uiService: UIService;
  private fuzzySearchService: FuzzySearchService;
  private fuzzySearchUI: FuzzySearchUI;
  private photoFilter: PhotoFilterComponent;
  private filteredPhotos: HachiImageData[] = [];
  private displayedPhotos: HachiImageData[] = []; // Currently displayed photos (for pagination)
  private selectedPhoto: HachiImageData | null = null;

  // Pagination properties
  private currentPage = 0;
  private totalPages = 0;
  private totalResults = 0;
  private queryToken = "";
  private resultsPerPage = 100;
  private paginationComponent?: PaginationComponent;
  private paginationContainerElement: HTMLElement | null = null;
  private filterContainer: HTMLElement | null = null;

  constructor() {
    // Initialize reusable components first
    ImageModalComponent.initialize();

    PhotoGridComponent.initialize("photo-grid-container", {
      loadingId: "loading-indicator",
      errorId: "error-display",
      noResultsId: "no-results-message",
      gridId: "photo-grid",
    });

    // Initialize fuzzy search service first
    this.fuzzySearchService = new FuzzySearchService();

    // Get the fuzzy search container element
    const fuzzyContainer = document.getElementById("fuzzy-search-container");
    if (!fuzzyContainer) {
      throw new Error("Fuzzy search container not found");
    }

    // Initialize fuzzy search UI
    this.fuzzySearchUI = new FuzzySearchUI(fuzzyContainer, {
      onSearchExecuted: (query) => this.handleSearch(query),
    });

    this.photoFilter = new PhotoFilterComponent({
      onFilterChange: (filteredPhotos: HachiImageData[]) =>
        this.handleFilteredPhotosUpdate(filteredPhotos),
      hideSearchInput: true,
    });

    

    if (this.filterContainer) {
      this.filterContainer.classList.add("hidden");
      this.filterContainer.innerHTML = PhotoFilterComponent.getTemplate(
        "photo-filter",
        true
      );
      this.photoFilter.initialize("photo-filter");
    }

    // Initialize UI service with photo-grid-container since that's where the photo grid elements are created
    this.uiService = new UIService("photo-grid-container");

    // Initialize search service with event callbacks
    this.searchService = new SearchService();

    this.setupEventListeners();
    this.cacheDOMElements();
    this.init();
  }

  private cacheDOMElements() {
    this.paginationContainerElement = document.getElementById(
      "pagination-container"
    );
    this.filterContainer = document.getElementById("photo-filter-container");
  }

  private init(): void {
    console.log("ImageSearch app initialized");
    this.setupPagination();
  }

  private handleFilteredPhotosUpdate(filteredPhotos: HachiImageData[]): void {
    this.filteredPhotos = [...filteredPhotos];
    this.renderDisplayedPhotos();
  }

  private setupEventListeners(): void {
    this.uiService.setupEventListeners({
      onPhotoClick: (photo) => this.handlePhotoClick(photo),
      onModalClose: () => this.handleModalClose(),
      onModalNext: () => this.handleModalNext(),
      onModalPrevious: () => this.handleModalPrevious(),
    });
  }

  /**
   * Handles the search operation when a user submits a query.
   * - Validates the query.
   * - Starts the search using the SearchService.
   * - Updates pagination, filter, and UI state.
   * - Handles loading and error states.
   */
  private async handleSearch(query: string): Promise<void> {
    // Validate the search query
    if (!query.trim()) {
      this.uiService.updateError("Please enter a search term");
      return;
    }
    console.log("Starting search for:", query);
    try {
      // Set loading state
      this.handleLoadingChange(true);

      // Reset to first page for new search
      this.currentPage = 0;

      // Start the search and get the response from the backend
      const imageSearchResponse = await this.searchService.startSearch(query, this.resultsPerPage);

      // Extract pagination and result info from the response
      this.totalPages = imageSearchResponse["n_pages"] || 1;
      this.totalResults = imageSearchResponse["n_matches"];
      this.queryToken = imageSearchResponse["query_token"];

      // Update the photo filter with the new query token
      this.photoFilter.updateQueryToken(this.queryToken);

      // Update or initialize the pagination component
      if (this.paginationComponent) {
        this.paginationComponent.update({
          totalItems: this.totalResults,
          itemsPerPage: this.resultsPerPage,
          initialPage: this.currentPage,
          totalPages: this.totalPages,
        });
        this.paginationContainerElement?.classList.remove("hidden");
      } else {
        // Fallback: initialize if not yet created
        this.setupPagination();
      }

      // Fetch and render photos for the current page
      await this.updatePaginationAndRenderPhotos();

      // Reset loading state and indicate search is done
      this.handleLoadingChange(false);
      this.handleSearchDoneChange(true);
    } catch (error) {
      // Handle errors and reset loading state
      this.handleLoadingChange(false);
      console.error("Search failed:", error);
      this.handleErrorChange(
        error instanceof Error
          ? error.message
          : "Search failed. Please try again."
      );
    }
  }


  /**
   * Initializes the pagination component.
   */
  private setupPagination() {
    // Ensure the pagination container element exists
    if (!this.paginationContainerElement) {
      console.warn("Pagination container element is missing");
      return;
    }

    // Initialize the pagination component
    this.paginationComponent = new PaginationComponent({
      container: this.paginationContainerElement,
      totalItems: this.totalResults,
      itemsPerPage: this.resultsPerPage,
      initialPage: this.currentPage,
      totalPages: this.totalPages,
      onPageChange: async (page) => {
        // Update the current page and re-render photos when the page changes
        this.currentPage = page;
        await this.updatePaginationAndRenderPhotos();
        window.scrollTo({ top: 0 });
      },
    });

    this.paginationContainerElement.classList.add("hidden");
  }

  /**
   * Fetches search results for the current page, updates filtered and displayed photos,
   * updates the photo filter, toggles the filter container visibility, and renders photos.
   */
  private async updatePaginationAndRenderPhotos(): Promise<void> {
    // Fetch search results for the current page using the query token
    this.displayedPhotos = await this.searchService.fetchSearchResults(
      this.queryToken,
      this.currentPage
    );

    // Set filteredPhotos to the newly fetched photos (before any filter is applied)
    this.filteredPhotos = [...this.displayedPhotos];

    // Update the photo filter component with the new photos
    this.photoFilter.updatePhotos([...this.displayedPhotos]);

    // Show or hide the filter container based on whether there are photos to display
    const filterContainer = document.getElementById("photo-filter-container");
    if (filterContainer) {
      if (this.displayedPhotos.length > 0) {
        filterContainer.classList.remove("hidden");
      } else {
        filterContainer.classList.add("hidden");
      }
    }

    // Render the currently displayed (and filtered) photos in the UI
    this.renderDisplayedPhotos();

    // Scroll to the top of the page after updating photos
    window.scrollTo({ top: 0 });
  }

  // Pagination UI is now handled by PaginationComponent

  // Pagination event listeners are handled by PaginationComponent

  private renderDisplayedPhotos(): void {
    this.uiService.updatePhotos([...this.filteredPhotos]);
  }

  private handleLoadingChange(isLoading: boolean): void {
    console.log("Loading state changed:", isLoading);
    this.uiService.updateLoading(isLoading);

    // Disable/enable fuzzy search inputs based on loading state
    if (isLoading) {
      this.fuzzySearchUI.disableInputs();
    } else {
      this.fuzzySearchUI.enableInputs();
    }
  }

  private handleErrorChange(error: string | null): void {
    console.log("Error state changed:", error);
    this.uiService.updateError(error);
  }

  private handleSearchDoneChange(isSearchDone: boolean): void {
    if (this.displayedPhotos.length === 0 && isSearchDone) {
      this.uiService.showNoResults(true);
    }
  }

  private handlePhotoClick(photo: HachiImageData): void {
    console.log("Photo clicked:", photo);

    // Find the index in the FILTERED photos (not just displayed photos)
    const photoIndex = this.filteredPhotos.findIndex((p) => p.id === photo.id);
    if (photoIndex === -1) return;

    // Update search service with selected photo for consistency
    this.selectedPhoto = photo;

    // Determine navigation capabilities based on filtered photos
    const canGoPrevious = photoIndex > 0;
    const canGoNext = photoIndex < this.filteredPhotos.length - 1;

    this.uiService.showModal(photo, canGoPrevious, canGoNext);
  }

  private handleModalClose(): void {
    console.log("Modal closed");
    this.selectedPhoto = null;
    this.uiService.hideModal();
  }

  private handleModalNext(): void {
    if (!this.selectedPhoto) return;

    // Find current photo in filtered photos
    const currentIndex = this.filteredPhotos.findIndex(
      (p) => p.id === this.selectedPhoto!.id
    );
    if (currentIndex !== -1 && currentIndex < this.filteredPhotos.length - 1) {
      console.log("Modal next");
      const nextPhoto = this.filteredPhotos[currentIndex + 1];
      this.selectedPhoto = nextPhoto;

      const canGoPrevious = currentIndex + 1 > 0;
      const canGoNext = currentIndex + 1 < this.filteredPhotos.length - 1;

      this.uiService.showModal(nextPhoto, canGoPrevious, canGoNext);
    }
  }

  private handleModalPrevious(): void {
    if (!this.selectedPhoto) return;

    // Find current photo in filtered photos
    const currentIndex = this.filteredPhotos.findIndex(
      (p) => p.id === this.selectedPhoto!.id
    );
    if (currentIndex !== -1 && currentIndex > 0) {
      console.log("Modal previous");
      const prevPhoto = this.filteredPhotos[currentIndex - 1];
      this.selectedPhoto = prevPhoto;

      const canGoPrevious = currentIndex - 1 > 0;
      const canGoNext = currentIndex - 1 < this.filteredPhotos.length - 1;

      this.uiService.showModal(prevPhoto, canGoPrevious, canGoNext);
    }
  }
}

export { ImageSearchApp };
