// Main ImageSearch application entry point
import { SearchService, UIService } from "./imageSearch";
import type { HachiImageData } from "./imageSearch";
import { FuzzySearchUI } from "./imageSearch/fuzzySearchUI";

import {
  ImageModalComponent,
  PhotoGridComponent,
  PhotoFilterComponent,
} from "./components";
import { PaginationComponent } from "./components/pagination";
import { fitTiles } from "./utils";
import PhotoFilterSidebar from "./components/photoFilterSidebar";
import { endpoints } from "./config";

class ImageSearchApp {
  private searchService: SearchService;
  private uiService: UIService;
  private fuzzySearchUI: FuzzySearchUI;
  // private photoFilter: PhotoFilterComponent;
  private filteredPhotos: HachiImageData[] = [];
  private displayedPhotos: HachiImageData[] = []; // Currently displayed photos (for pagination)
  private selectedPhoto: HachiImageData | null = null;

  // Pagination properties
  private currentPage = 0;
  private totalPages = 0;
  private totalResults = 0;
  private queryToken = "";
  private resultsPerPage = 10;
  private paginationComponent?: PaginationComponent;
  private paginationContainerElement: HTMLElement | null = null;
  private filterContainer: HTMLElement | null = null;
  private imageHeight = 0; // Height of each photo in the grid
  private imageWidth = 0; // Width of each photo in the grid
  private photoFilterSidebar: PhotoFilterSidebar | null = null;

  private preloadedData: Record<number, HachiImageData[]> = {};
  private imagePreloadCache: Map<string, HTMLImageElement> = new Map();

  private findGallerySize() {
    // Get the window height
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    // Get photo-gallery element
    const photoGallery = document.getElementById("results-section");

    // Get the photo gallery height
    const photoGalleryHeight = windowHeight - 140; // Based on header and footer heights
    console.log(`Photo gallery height: ${photoGalleryHeight}px`);

    // Get photo-gallery width
    const photoGalleryWidth = photoGallery?.clientWidth! + 63;

    // Set static dimensions
    let side = 150;

    // If we are on mobile screens, reduce side length
    if (windowWidth < 768) {
      side = 100;
    }

    // Print the photo gallery width and height
    console.log(`Photo gallery width: ${photoGalleryWidth}px`);
    console.log(`Photo gallery height: ${photoGalleryHeight}px`);


    const { rows, cols, tileWidth, tileHeight } = fitTiles(
      photoGalleryHeight!,
      photoGalleryWidth,
      side
    );

    this.resultsPerPage = rows * cols;
    this.imageHeight = tileHeight - 1;
    this.imageWidth = tileWidth - 1;
  }

  constructor() {
    this.cacheDOMElements();
    // Initialize reusable components first
    ImageModalComponent.initialize();

    PhotoGridComponent.initialize("photo-grid-container", {
      loadingId: "loading-indicator",
      errorId: "error-display",
      noResultsId: "no-results-message",
      gridId: "photo-grid",
    });

    // Call findGallerySize to set the initial layout
    this.findGallerySize();

    // Get the fuzzy search container element
    const fuzzyContainer = document.getElementById("fuzzy-search-container");

    // Initialize fuzzy search UI
    this.fuzzySearchUI = new FuzzySearchUI(fuzzyContainer!, {
      onSearchExecuted: (query) => this.handleSearch(query),
    });

    // this.photoFilter = new PhotoFilterComponent({
    //   onFilterChange: (filteredPhotos: HachiImageData[]) =>
    //     this.handleFilteredPhotosUpdate(filteredPhotos),
    // });

    this.photoFilterSidebar = new PhotoFilterSidebar(
      (filteredPhotos: HachiImageData[]) =>
        this.handleFilteredPhotosUpdate(filteredPhotos), "filter-sidebar-toggle-btn"
    );

    // if (this.filterContainer) {
    //   this.filterContainer.classList.add("invisible");
    //   this.filterContainer.innerHTML =
    //     PhotoFilterComponent.getTemplate("photo-filter");
    //   this.photoFilter.initialize("photo-filter");
    // }

    // Initialize UI service with photo-grid-container since that's where the photo grid elements are created
    this.uiService = new UIService(
      "photo-grid-container",
      this.imageHeight,
      this.imageWidth,
      this.resultsPerPage
    );

    // Initialize search service with event callbacks
    this.searchService = new SearchService();

    this.setupEventListeners();

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

  /**
   * Handles updates to the filtered photos from the PhotoFilterComponent.
   * - Resets pagination to the first page.
   * - If no filtered photos, resets to show all results and updates pagination.
   * - Otherwise, updates filtered and displayed photos, updates pagination, and re-renders.
   */
  /**
   * Handles updates to the filtered photos from the PhotoFilterComponent.
   * Resets pagination and updates UI accordingly.
   */
  private handleFilteredPhotosUpdate(filteredPhotos: HachiImageData[]): void {
    console.log("Filtered photos updated:", filteredPhotos.length);
    this.currentPage = 0;
    this.clearPreloadedCache();
    if (filteredPhotos.length === 0) {
      // No filters applied, show all results
      this.filteredPhotos = [];
      this.updatePaginationComponent(this.totalResults, this.totalPages, 0);
      this.updatePaginationAndRenderPhotos();
      return;
    }
    this.filteredPhotos = [...filteredPhotos];
    this.displayedPhotos = [...filteredPhotos];
    const filteredTotalPages = Math.ceil(
      this.filteredPhotos.length / this.resultsPerPage
    );
    this.updatePaginationComponent(
      this.filteredPhotos.length,
      filteredTotalPages,
      0
    );
    this.updatePaginationAndRenderPhotos();
  }

  /**
   * Helper to update pagination component state.
   */
  private updatePaginationComponent(
    totalItems: number,
    totalPages: number,
    initialPage: number
  ) {
    this.paginationComponent?.update({
      totalItems,
      itemsPerPage: this.resultsPerPage,
      initialPage,
      totalPages,
    });
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
  /**
   * Handles the search operation when a user submits a query.
   * Validates, starts search, updates pagination, filter, and UI state.
   */
  private async handleSearch(query: string): Promise<void> {
    // if (!query.trim()) {
    //   this.uiService.updateError("Please enter a search term");
    //   return;
    // }
    // We have commented the above code. But this is not the best solution. TODO: Need to handle empty search better
    
    // Clear cache
    this.clearPreloadedCache();
    console.log("Starting search for:", query);
    try {
      // this.handleLoadingChange(true); TODO: Deal with it later. For now removing it
      this.currentPage = 0;
      const imageSearchResponse = await this.searchService.startSearch(
        query,
        this.resultsPerPage
      );
      this.totalPages = imageSearchResponse["n_pages"] || 1;
      this.totalResults = imageSearchResponse["n_matches"];
      this.queryToken = imageSearchResponse["query_token"];
      this.updatePaginationComponent(
        this.totalResults,
        this.totalPages,
        this.currentPage
      );
      this.paginationContainerElement?.classList.remove("hidden");
      this.filteredPhotos = [];
      await this.updatePaginationAndRenderPhotos();
      this.photoFilterSidebar?.updateQueryToken(this.queryToken);
      // this.photoFilter.updateQueryToken(this.queryToken); // TODO: For now, this will trigger the requests for getting filter options from backend. Not the most efficient way yet. Required Inspection.
      // this.handleLoadingChange(false);
      this.handleSearchDoneChange(true);
    } catch (error) {
      // this.handleLoadingChange(false);
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
  /**
   * Initializes the pagination component and sets up page change handling.
   */
  private setupPagination() {
    console.log("Setting up pagination");
    if (!this.paginationContainerElement) {
      console.warn("Pagination container element is missing");
      return;
    }
    this.paginationComponent = new PaginationComponent({
      container: this.paginationContainerElement,
      totalItems: this.totalResults,
      itemsPerPage: this.resultsPerPage,
      initialPage: this.currentPage,
      totalPages: this.totalPages,
      onPageChange: async (page) => {
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
  /**
   * Fetches and renders photos for the current page, handling both filtered and unfiltered states.
   */
  private async updatePaginationAndRenderPhotos(opts?: { skipScroll?: boolean }): Promise<void> {
    console.log(
      "Updating pagination and rendering photos for page:",
      this.currentPage
    );
    if (this.filteredPhotos.length) {
      this.displayedPhotos = this.filteredPhotos.slice(
        this.currentPage * this.resultsPerPage,
        (this.currentPage + 1) * this.resultsPerPage
      );
    } else {
      if (!this.preloadedData[this.currentPage]) {
        console.log(
          `Fetching search results for page ${this.currentPage} with token ${this.queryToken}`
        );
        this.displayedPhotos = await this.searchService.fetchSearchResults(
          this.queryToken,
          this.currentPage
        );
        if (!this.preloadedData[this.currentPage]) {
          this.preloadedData[this.currentPage] = this.displayedPhotos;
        }
      } else {
        this.displayedPhotos = this.preloadedData[this.currentPage];
      }
    }
    console.log("Displayed photos updated:", this.displayedPhotos.length);
    this.toggleFilterContainer(this.displayedPhotos.length > 0);
    this.renderDisplayedPhotos();
    if (!opts?.skipScroll) {
      window.scrollTo({ top: 0 });
    }
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => this.preloadData());
    } else {
      // Fallback if requestIdleCallback is not supported
      setTimeout(() => this.preloadData(), 1000);
    }
  }

  private async preloadData() {
    // TODO: Need a cache eviction strategy
    const nextPageNumber = this.currentPage + 1;
    if (nextPageNumber >= this.totalPages) return;
    if (!this.preloadedData[nextPageNumber]) {
      this.preloadedData[nextPageNumber] = await this.searchService.fetchSearchResults(
        this.queryToken,
        nextPageNumber
      );
    }
    await this.preloadImagesForPage(nextPageNumber);
  }

  private async preloadImagesForPage(pageId: number): Promise<void> {
    const imageData = this.preloadedData[pageId];
    if (!imageData) return;

    imageData.forEach((photo) => {
      if (!this.imagePreloadCache.has(photo.id)) {
        const img = new Image();
        img.decoding = "async";
        img.loading = "eager"; // Eager fetch
        img.src = `${endpoints.GET_PREVIEW_IMAGE}/${photo.id}.webp`;
        this.imagePreloadCache.set(photo.id, img);
      }
    });
  }

  clearPreloadedCache(): void {
    this.preloadedData = {};
    this.imagePreloadCache.clear();
  }

  /**
   * Show or hide the filter container based on photo count.
   */
  private toggleFilterContainer(show: boolean) {
    const filterContainer = document.getElementById("photo-filter-container");
    if (filterContainer) {
      filterContainer.classList.toggle("invisible", !show);
    }
  }

  private renderDisplayedPhotos(): void {
    this.uiService.updatePhotos([...this.displayedPhotos]);
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

    const photoIndex = this.displayedPhotos.findIndex((p) => p.id === photo.id);
    if (photoIndex === -1) return;

    // Update search service with selected photo for consistency
    this.selectedPhoto = photo;

    // Determine navigation capabilities based on filtered photos
    const canGoPrevious = photoIndex > 0;
    const canGoNext = photoIndex < this.displayedPhotos.length - 1;

    this.uiService.showModal(photo, canGoPrevious, canGoNext);
  }

  private handleModalClose(): void {
    console.log("Modal closed");
    this.selectedPhoto = null;
    this.uiService.hideModal();
  }

  private async handleModalNext(): Promise<void> {
    if (!this.selectedPhoto) return;
    const localIndex = this.displayedPhotos.findIndex(p => p.id === this.selectedPhoto!.id);
    if (localIndex === -1) return;

    // Case 1: still within current page
    if (localIndex < this.displayedPhotos.length - 1) {
      const nextPhoto = this.displayedPhotos[localIndex + 1];
      this.selectedPhoto = nextPhoto;
      const canGoPrevious = true;
      const canGoNext =
        (this.filteredPhotos.length
          ? (this.filteredPhotos.findIndex(p => p.id === nextPhoto.id) < this.filteredPhotos.length - 1)
          : (localIndex + 1 < this.displayedPhotos.length - 1)) ||
        (this.currentPage < this.totalPages - 1);
      this.uiService.showModal(nextPhoto, canGoPrevious, canGoNext);
      return;
    }

    // Case 2: end of current page – advance to next page if possible
    if (this.filteredPhotos.length) {
      const globalIndex = this.filteredPhotos.findIndex(p => p.id === this.selectedPhoto!.id);
      if (globalIndex === -1) return;
      const nextGlobalIndex = globalIndex + 1;
      if (nextGlobalIndex >= this.filteredPhotos.length) return; // no more

      const nextPage = Math.floor(nextGlobalIndex / this.resultsPerPage);
      if (nextPage !== this.currentPage) {
        this.currentPage = nextPage;
        await this.updatePaginationAndRenderPhotos({ skipScroll: true });
        // keep pagination component in sync
        const filteredTotalPages = Math.ceil(this.filteredPhotos.length / this.resultsPerPage);
        this.updatePaginationComponent(this.filteredPhotos.length, filteredTotalPages, this.currentPage);
      }
      const nextPhoto = this.displayedPhotos[nextGlobalIndex % this.resultsPerPage];
      this.selectedPhoto = nextPhoto;
      const canGoPrevious = nextGlobalIndex > 0;
      const canGoNext = nextGlobalIndex < this.filteredPhotos.length - 1;
      this.uiService.showModal(nextPhoto, canGoPrevious, canGoNext);
    } else {
      // Unfiltered: use totalPages / fetch
      if (this.currentPage >= this.totalPages - 1) return; // no more pages
      this.currentPage += 1;
      // Load next page data (reuse cache if present)
      if (!this.preloadedData[this.currentPage]) {
        this.displayedPhotos = await this.searchService.fetchSearchResults(
          this.queryToken,
          this.currentPage
        );
        this.preloadedData[this.currentPage] = this.displayedPhotos;
      } else {
        this.displayedPhotos = this.preloadedData[this.currentPage];
      }
      // Update pagination UI state
      this.updatePaginationComponent(this.totalResults, this.totalPages, this.currentPage);
      // Render grid silently (no scroll)
      this.renderDisplayedPhotos();
      // Preload upcoming
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => this.preloadData());
      } else {
        // Fallback if requestIdleCallback is not supported
        setTimeout(() => this.preloadData(), 1000);
      }

      if (this.displayedPhotos.length > 0) {
        const nextPhoto = this.displayedPhotos[0];
        this.selectedPhoto = nextPhoto;
        const canGoPrevious = !(this.currentPage === 0 && 0 === 0);
        const canGoNext =
          this.displayedPhotos.length > 1 ||
          this.currentPage < this.totalPages - 1;
        this.uiService.showModal(nextPhoto, canGoPrevious, canGoNext);
      }
    }
  }

  private async handleModalPrevious(): Promise<void> {
    if (!this.selectedPhoto) return;
    const localIndex = this.displayedPhotos.findIndex(p => p.id === this.selectedPhoto!.id);
    if (localIndex === -1) return;

    // Case 1: still within current page
    if (localIndex > 0) {
      const prevPhoto = this.displayedPhotos[localIndex - 1];
      this.selectedPhoto = prevPhoto;
      const canGoPrevious =
        localIndex - 1 > 0 ||
        (this.filteredPhotos.length
          ? this.filteredPhotos.findIndex(p => p.id === prevPhoto.id) > 0
          : (this.currentPage > 0));
      const canGoNext = true;
      this.uiService.showModal(prevPhoto, canGoPrevious, canGoNext);
      return;
    }

    // Case 2: start of page – load previous page
    if (this.filteredPhotos.length) {
      const globalIndex = this.filteredPhotos.findIndex(p => p.id === this.selectedPhoto!.id);
      if (globalIndex <= 0) return;
      const prevGlobalIndex = globalIndex - 1;
      const prevPage = Math.floor(prevGlobalIndex / this.resultsPerPage);
      if (prevPage !== this.currentPage) {
        this.currentPage = prevPage;
        await this.updatePaginationAndRenderPhotos({ skipScroll: true });
        const filteredTotalPages = Math.ceil(this.filteredPhotos.length / this.resultsPerPage);
        this.updatePaginationComponent(this.filteredPhotos.length, filteredTotalPages, this.currentPage);
      }
      const prevPhoto = this.displayedPhotos[prevGlobalIndex % this.resultsPerPage];
      this.selectedPhoto = prevPhoto;
      const canGoPrevious = prevGlobalIndex > 0;
      const canGoNext = prevGlobalIndex < this.filteredPhotos.length - 1;
      this.uiService.showModal(prevPhoto, canGoPrevious, canGoNext);
    } else {
      if (this.currentPage <= 0) return;
      this.currentPage -= 1;
      if (!this.preloadedData[this.currentPage]) {
        this.displayedPhotos = await this.searchService.fetchSearchResults(
          this.queryToken,
          this.currentPage
        );
        this.preloadedData[this.currentPage] = this.displayedPhotos;
      } else {
        this.displayedPhotos = this.preloadedData[this.currentPage];
      }
      this.updatePaginationComponent(this.totalResults, this.totalPages, this.currentPage);
      this.renderDisplayedPhotos();
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => this.preloadData());
      } else {
        // Fallback if requestIdleCallback is not supported
        setTimeout(() => this.preloadData(), 1000);
      }

      if (this.displayedPhotos.length > 0) {
        const prevPhoto = this.displayedPhotos[this.displayedPhotos.length - 1];
        this.selectedPhoto = prevPhoto;
        const canGoPrevious =
          this.currentPage > 0 ||
          this.displayedPhotos.length > 1;
        const canGoNext = true; // we came from a next page previously
        this.uiService.showModal(prevPhoto, canGoPrevious, canGoNext);
      }
    }
  }
}

export { ImageSearchApp };
