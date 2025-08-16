import "./style.css";
import { Layout } from "./components/layout";
import { endpoints } from "./config";
import { UIService } from "./imageSearch/uiService";
import type { HachiImageData } from "./imageSearch/types";
import {
  ImageModalComponent,
  PhotoGridComponent,
  PhotoFilterComponent,
} from "./components";
import { PaginationComponent } from "./components/pagination";
import { collectAttributeMeta, queryAttribute } from "./utils";

// Interface for folder photo data matching the actual API response
interface FolderPhotoData {
  meta_data: any[];
  score: number[];
  data_hash: string[];
}

// Folder photos page functionality
class FolderPhotosApp {
  private filteredPhotos: HachiImageData[] = [];
  private displayedPhotos: HachiImageData[] = []; // Currently displayed photos (for pagination)
  private currentPhotoIndex: number = -1;
  private folderPath: string = "";
  private folderName: string = "";
  private uiService!: UIService;
  private photoFilter!: PhotoFilterComponent;
  private paginationComponent!: PaginationComponent;
  private queryToken: string | null = null;
  private currentPage: number = 1; // Current page for pagination
  private imageHeight: number = 0;
  private imageWidth: number = 0;

  // Pagination properties
  private PAGE_SIZE = Math.floor(window.innerHeight / 45);

  constructor() {
    this.init();
  }

  // private findGallerySize() {
  //   // Get the photo-gallery container
  //   const photoGallery = document.getElementById("photo-gallery");

  //   // If the photoGallery container is not there, log an error
  //   if (!photoGallery) {
  //     console.error("Photo gallery container not found");
  //     return;
  //   }

  //   // Get its height and width
  //   const photoGalleryHeight = photoGallery?.clientHeight!;

  //   // Set columns TODO: Set it dynamically based on container width
  //   const columns = 6;

  //   // Set rows
  //   const rows = 4;

  //   // Calculate and set height
  //   this.imageHeight = photoGalleryHeight / rows;
  //   console.log(`Calculated photo height: ${this.imageHeight}px`);

  //   // Set the page size
  //   this.PAGE_SIZE = Math.floor(rows * columns);
  // }

    private findGallerySize() {
    // Get the window height
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    // Get photo-gallery element
    const photoGallery = document.getElementById("photo-gallery");

    // Get the photo gallery height
    const photoGalleryHeight = photoGallery?.clientHeight;
    console.log(`Photo gallery height: ${photoGalleryHeight}px`);

    // Get photo-gallery width
    const photoGalleryWidth = photoGallery?.clientWidth!;

    // Set columns TODO: Set it dynamically based on container width
    let columns = 6;

    // Change columns based on width as per tailwind grid
    if (windowWidth < 640) {
      columns = 2;
    } else if (windowWidth < 768) {
      columns = 3;
    } else if (windowWidth < 1024) {
      columns = 4;
    } else if (windowWidth < 1280) {
      columns = 5;
    }

    // Based on the columns, determine width of each photo
    const photoWidth = photoGalleryWidth / columns;
      this.imageWidth = photoWidth - 8; // Subtracting for margins
      console.log(`Calculated photo width: ${this.imageWidth}px`);

    // Set rows based on window height
    let rows = 4;
    if (windowHeight < 640) {
      rows = 2;
    } else if (windowHeight < 768) {
      rows = 3;
    } else if (windowHeight < 1024) {
      rows = 4;
    } else if (windowHeight < 1280) {
      rows = 5;
    }

    // Calculate and set height
    this.imageHeight = (photoGalleryHeight! / rows) - 8; // Substracting for margins
    console.log(`Calculated photo height: ${this.imageHeight}px`);

    // Set the page size
    this.PAGE_SIZE = rows * columns;
    console.log(`Calculated results per page: ${this.PAGE_SIZE}`);
  }


  private async init(): Promise<void> {

    // Call findGallerySize to set the initial layout
    this.findGallerySize();

    // Initialize layout first
    new Layout({
      title: "Folder Photos - Hachi",
      currentPage: "/folder-photos.html",
      showNavbar: true,
    });

    // Initialize reusable components before UIService
    this.initializeComponents();

    // Now create UIService after components are in the DOM
    // Use photo-grid-container since that's where the photo grid elements are created
    this.uiService = new UIService("photo-grid-container", this.imageHeight, this.imageWidth, this.PAGE_SIZE);
    this.uiService.ensureElementsInDOM(this.PAGE_SIZE);

    this.extractFolderPath();
    this.setupEventListeners();
    await this.loadFolderPhotos();
  }
  private initializeComponents(): void {
    // Initialize reusable components
    ImageModalComponent.initialize();
    PhotoGridComponent.initialize("photo-grid-container", {
      loadingId: "loading-indicator",
      errorId: "error-display",
      noResultsId: "no-results-message",
      gridId: "photo-grid",
    });

    // Initialize photo filter component
    this.photoFilter = new PhotoFilterComponent({
      onFilterChange: (filteredPhotos) =>
        this.handleFilteredPhotosUpdate(filteredPhotos),
    });

    // Initialize filter UI
    const filterContainer = document.getElementById("photo-filter-container");
    if (filterContainer) {
      // Ensure filter starts completely hidden until photos are loaded
      // filterContainer.classList.add("hidden");

      filterContainer.innerHTML =
        PhotoFilterComponent.getTemplate("photo-filter");
      this.photoFilter.initialize("photo-filter");
    }

    // Initialize pagination component
    const paginationContainer = document.getElementById("pagination-container");
    if (paginationContainer) {
      this.paginationComponent = new PaginationComponent({
        container: paginationContainer,
        totalItems: 0,
        itemsPerPage: this.PAGE_SIZE,
        initialPage: 0,
        onPageChange: (page: number) => this.handlePageChange(page),
      });
    }
  }

  private extractFolderPath(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const pathParam = urlParams.get("path");

    if (pathParam) {
      this.folderPath = decodeURIComponent(pathParam);
      this.folderName = this.getDisplayName(this.folderPath);
      this.updateHeader();
    } else {
      this.showError("No folder path specified");
    }
  }

  private getDisplayName(fullPath: string): string {
    const pathParts = fullPath.split(/[/\\]/);
    return pathParts[pathParts.length - 1] || fullPath;
  }

  private updateHeader(): void {
    const folderNameEl = document.getElementById("folder-name");
    const folderPathEl = document.getElementById("folder-path");

    if (folderNameEl) {
      folderNameEl.textContent = this.folderName;
    }

    if (folderPathEl) {
      folderPathEl.textContent = this.folderPath;
    }
  }
  private setupEventListeners(): void {
    // Back button
    const backBtn = document.getElementById("back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        window.location.href = "/folders.html";
      });
    }

    // Setup UI service event listeners
    this.uiService.setupEventListeners({
      onPhotoClick: (photo: HachiImageData) => this.handlePhotoClick(photo),
      onModalClose: () => this.closeModal(),
      onModalNext: () => this.nextPhoto(),
      onModalPrevious: () => this.previousPhoto(),
    });
  }

  private async loadFolderPhotos(): Promise<void> {
    // If the folder path is not set, show an error
    if (!this.folderPath) {
      this.showError("No folder path specified");
      return;
    }

    // Hide error message
    this.hideError();

    try {
      // Preprocess filename according to backend requirements
      // Replace slashes with pipe characters to avoid issues with URL encoding
      // Does the backend expect the filename to have pipes instead of slashes?
      const filename = this.folderPath
        .toString()
        .toLowerCase()
        .replace(/\//g, "|");

      if (!this.displayedPhotos.length) {
        // Show loading indicator
        this.showLoading(true);
        console.log("Fetching pagination info for:", filename);
        // Get pagination information for the attribute
        const paginationInfo = await queryAttribute(
          "resource_directory",
          filename,
          this.PAGE_SIZE
        );

        this.paginationComponent?.update({
          totalItems: paginationInfo.n_matches,
          totalPages: paginationInfo.n_pages,
        });

        console.log("Pagination Info:", paginationInfo);
        this.queryToken = paginationInfo.query_token || null;
        // this.uiService.ensureElementsInDOM(this.PAGE_SIZE);
      }

      // If query token is not set, we cannot fetch images
      if (!this.queryToken) return;



      // Fetch folder images from the backend
      const data: FolderPhotoData = await collectAttributeMeta(this.queryToken!, this.currentPage - 1);

      console.log("Fetched folder photos:", data);

      if (data && data.meta_data && Array.isArray(data.meta_data)) {
        // Convert API data to HachiImageData format for UIService
        this.displayedPhotos = data.data_hash.map((hash: string, index: number) => ({
          id: hash,
          score: data.score[index] || 0,
          metadata: data.meta_data[index] || {},
        }));

        console.log("Converted photos:", this.displayedPhotos);

        // Update photo filter with loaded photos
        this.filteredPhotos = [...this.displayedPhotos];

        // Get the filter container element. TODO: Cache it for later use
        const filterContainer = document.getElementById(
          "photo-filter-container"
        );

        // Show filter container if we have photos
        // if (filterContainer) {
        //   if (this.displayedPhotos.length > 0) {
        //     filterContainer.classList.remove("hidden");
        //   } else {
        //     filterContainer.classList.add("hidden");
        //   }
        // }

        // Render photos
        this.renderPhotos();
        
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error loading folder photos:", error);
      this.showError(
        `Failed to load photos: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      this.showLoading(false);
    }
  }


  private handlePageChange(page: number): void {
    // Update displayed photos for the new page
    this.currentPage = page + 1;
    // Re-render photos for the new page
    this.loadFolderPhotos();

    // Scroll to the top of the page instantly for performance
    window.scrollTo(0, 0);
  }

  private renderPhotos(): void {
    const container = document.getElementById("photo-grid-container");
    const noPhotos = document.getElementById("no-photos");

    if (!container || !noPhotos) return;

    console.log("Photos inside renderPhotos", this.filteredPhotos.length);

    if (this.filteredPhotos.length === 0) {
      container.innerHTML = "";
      noPhotos.classList.remove("hidden");
      return;
    }

    noPhotos.classList.add("hidden");

    // Use UIService to update the photo grid with ONLY the displayed photos (pagination)
    this.uiService.updatePhotos(this.displayedPhotos);
  }

  private handleFilteredPhotosUpdate(filteredPhotos: HachiImageData[]): void {
    console.log("Filtered photos updated:", filteredPhotos.length);
    this.filteredPhotos = filteredPhotos;
    this.renderPhotos();
  }

  private handlePhotoClick(photo: HachiImageData): void {
    // Find the index in the FILTERED photos (not just displayed photos)
    this.currentPhotoIndex = this.filteredPhotos.findIndex(
      (p) => p.id === photo.id
    );

    if (this.currentPhotoIndex !== -1) {
      this.openModal(photo);
    }
  }
  private openModal(photo: HachiImageData): void {
    const canGoPrevious = this.currentPhotoIndex > 0;
    const canGoNext = this.currentPhotoIndex < this.filteredPhotos.length - 1;

    this.uiService.showModal(photo, canGoPrevious, canGoNext);
  }

  private closeModal(): void {
    this.uiService.hideModal();
    this.currentPhotoIndex = -1;
  }

  private nextPhoto(): void {
    if (this.currentPhotoIndex < this.filteredPhotos.length - 1) {
      this.currentPhotoIndex++;
      const nextPhoto = this.filteredPhotos[this.currentPhotoIndex];
      this.openModal(nextPhoto);
    }
  }

  private previousPhoto(): void {
    if (this.currentPhotoIndex > 0) {
      this.currentPhotoIndex--;
      const prevPhoto = this.filteredPhotos[this.currentPhotoIndex];
      this.openModal(prevPhoto);
    }
  }
  private showLoading(show: boolean): void {
    const indicator = document.getElementById("loading-indicator");
    if (indicator) {
      if (show) {
        indicator.classList.remove("hidden");
        indicator.classList.add("flex");
      } else {
        indicator.classList.add("hidden");
        indicator.classList.remove("flex");
      }
    }
  }

  private showError(message: string): void {
    const errorDiv = document.getElementById("error-message");
    const errorText = document.getElementById("error-text");

    if (errorDiv && errorText) {
      errorText.textContent = message;
      errorDiv.classList.remove("hidden");
    }
  }
  private hideError(): void {
    const errorDiv = document.getElementById("error-message");
    if (errorDiv) {
      errorDiv.classList.add("hidden");
    }
  }
}

// Initialize the folder photos app
const folderPhotosApp = new FolderPhotosApp();

// Make it globally accessible for onclick handlers
(window as any).folderPhotosApp = folderPhotosApp;

console.log("Folder photos page initialized");
