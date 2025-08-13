// Main ImageSearch application entry point
import {
  SearchService,
  UIService,
} from "./imageSearch";
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
  private resultsPerPage = 0;
  private paginationComponent?: PaginationComponent;
  private paginationContainerElement: HTMLElement | null = null;



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
      onFilterChange: (filteredPhotos: HachiImageData[]) => this.handleFilteredPhotosUpdate(filteredPhotos),
      hideSearchInput: true
    });

    const filterContainer = document.getElementById("photo-filter-container");

    if (filterContainer) {
      filterContainer.classList.add("hidden");
      filterContainer.innerHTML = PhotoFilterComponent.getTemplate('photo-filter', true);
      this.photoFilter.initialize('photo-filter');
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
    this.paginationContainerElement = document.getElementById("pagination-container");
  }

  private init(): void {
    console.log("ImageSearch app initialized");
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

  private async handleSearch(query: string): Promise<void> {
    if (!query.trim()) {
      this.uiService.updateError("Please enter a search term");
      return;
    }
    console.log("Starting search for:", query);
    try {
      this.handleLoadingChange(true);
      this.currentPage = 0;
      const imageSearchResponse = await this.searchService.startSearch(query);
      this.totalPages = imageSearchResponse['n_pages'] - 1; // For now, I am substracting one as data from backend is incorrect
      this.totalResults = imageSearchResponse['n_matches'];
      this.queryToken = imageSearchResponse['query_token'];
      this.resultsPerPage = Math.floor(this.totalResults / this.totalPages);

      this.setupPagination();
      await this.updatePaginationAndRenderPhotos();
      this.handleLoadingChange(false);
      this.handleSearchDoneChange(true);
    }
    catch (error) {
      this.handleLoadingChange(false);
      console.error("Search failed:", error);
      this.handleErrorChange(
        error instanceof Error
          ? error.message
          : "Search failed. Please try again."
      );
    }
  }
  private setupPagination() {
    if (!this.paginationContainerElement) return;
    this.paginationContainerElement.innerHTML = "";
    this.paginationComponent = new PaginationComponent({
      container: this.paginationContainerElement,
      totalItems: this.totalResults,
      itemsPerPage: this.resultsPerPage,
      initialPage: this.currentPage,
      onPageChange: async (page) => {
        this.currentPage = page;
        await this.updatePaginationAndRenderPhotos();
        window.scrollTo({ top: 0 });
      },
      totalPages: this.totalPages,
    });
  }

  private async updatePaginationAndRenderPhotos(): Promise<void> {
    this.displayedPhotos = await this.searchService.fetchSearchResults(
      this.queryToken,
      this.currentPage
    );
    this.filteredPhotos = [...this.displayedPhotos];
    this.photoFilter.updatePhotos([...this.displayedPhotos]);
    const filterContainer = document.getElementById("photo-filter-container");
    if (filterContainer) {
      if (this.displayedPhotos.length > 0) {
        filterContainer.classList.remove("hidden");
      } else {
        filterContainer.classList.add("hidden");
      }
    }
  this.renderDisplayedPhotos();
  window.scrollTo({ top: 0 })
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
