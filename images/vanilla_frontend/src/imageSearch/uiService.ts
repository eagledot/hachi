// UI service for managing DOM updates and interactions
import type { HachiImageData } from "./types";
import { SearchApiService } from "./apiService";
import { endpoints } from "../config";

export class UIService {
  private container: HTMLElement;
  // Search elements no longer needed - handled by FuzzySearchUI
  private loadingIndicator!: HTMLElement;
  private errorDisplay!: HTMLElement;
  private photoGrid!: HTMLElement;
  private noResultsMessage!: HTMLElement;
  private modal!: HTMLElement;
  private modalImage!: HTMLImageElement;
  private modalMetadata!: HTMLElement;
  private modalPrevBtn!: HTMLButtonElement;
  private modalNextBtn!: HTMLButtonElement;
  private modalCloseBtn!: HTMLButtonElement;
  private modalFullscreenBtn!: HTMLButtonElement;
  private modalLikeBtn!: HTMLButtonElement;
  private modalFacesBtn!: HTMLButtonElement;
  private modalTitleEl!: HTMLElement;
  private currentFullImageLoader: HTMLImageElement | null = null; // Track current image loader
  private showScores = false; // Flag to control score display in photo grid
  // Efficient photo grid management - optimized for pagination
  private photoElementPool: HTMLElement[] = []; // Fixed pool of reusable DOM elements
  private maxPoolSize = 100; // Match typical pagination size
  private currentPhotoClick: ((photo: HachiImageData) => void) | null = null;
  private imageHeight: number;
  private imageWidth: number;

  // Performance optimizations
  private static readonly FALLBACK_IMAGE_SVG =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvcnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=";
  private static readonly VIEW_ICON_SVG = `<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;

  // Event listener cleanup tracking
  private eventCleanupFunctions: (() => void)[] = [];
  private globalKeydownHandler?: (e: KeyboardEvent) => void;
  constructor(
    containerId: string,
    imageHeight: number,
    imageWidth?: number,
    pageSize?: number
  ) {
    this.imageHeight = imageHeight;
    this.imageWidth = imageWidth || 0;

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id '${containerId}' not found`);
    }
    this.container = container;
    this.initializeElements();
    this.injectResponsivePhotoStyles();
    if (pageSize) {
      this.maxPoolSize = pageSize;
      this.ensureElementPool(pageSize);
      this.ensureElementsInDOM(pageSize);
    }
  }
  private initializeElements(): void {
    // Elements within the container - search elements no longer needed as handled by FuzzySearchUI
    this.loadingIndicator = this.container.querySelector(
      "#loading-indicator"
    ) as HTMLElement;
    this.errorDisplay = this.container.querySelector(
      "#error-display"
    ) as HTMLElement;
    this.photoGrid = this.container.querySelector("#photo-grid") as HTMLElement;
    this.noResultsMessage = this.container.querySelector(
      "#no-results-message"
    ) as HTMLElement;
    // Modal elements - search in document since modal might be outside container
    this.modal = document.querySelector("#image-modal") as HTMLElement;
    this.modalImage = document.querySelector(
      "#modal-image"
    ) as HTMLImageElement;
    this.modalMetadata = document.querySelector(
      "#modal-metadata"
    ) as HTMLElement;
    this.modalPrevBtn = document.querySelector(
      "#modal-prev-btn"
    ) as HTMLButtonElement;
    this.modalNextBtn = document.querySelector(
      "#modal-next-btn"
    ) as HTMLButtonElement;
    this.modalCloseBtn = document.querySelector(
      "#modal-close-btn"
    ) as HTMLButtonElement;
    this.modalFullscreenBtn = document.querySelector(
      "#modal-fullscreen-btn"
    ) as HTMLButtonElement;
    this.modalLikeBtn = document.querySelector(
      "#modal-like-btn"
    ) as HTMLButtonElement;
    this.modalFacesBtn = document.querySelector(
      "#modal-faces-btn"
    ) as HTMLButtonElement;
    this.modalTitleEl = document.querySelector(
      "#modal-title"
    ) as HTMLElement;
    if (!this.photoGrid) {
      throw new Error("Required UI elements not found");
    }
  }
  /**
   * Sets up event listeners
   */
  setupEventListeners(callbacks: {
    onPhotoClick: (photo: HachiImageData) => void;
    onModalClose: () => void;
    onModalNext: () => void;
    onModalPrevious: () => void;
  }): void {
    // Clean up existing event listeners first
    this.cleanupEventListeners();

    // Search functionality is now handled by FuzzySearchUI
    this.currentPhotoClick = callbacks.onPhotoClick;

    // Modal functionality
    if (this.modalCloseBtn) {
      const closeHandler = () => callbacks.onModalClose();
      this.modalCloseBtn.addEventListener("click", closeHandler);
      this.eventCleanupFunctions.push(() =>
        this.modalCloseBtn?.removeEventListener("click", closeHandler)
      );
    }
    if (this.modalNextBtn) {
      const nextHandler = () => callbacks.onModalNext();
      this.modalNextBtn.addEventListener("click", nextHandler);
      this.eventCleanupFunctions.push(() =>
        this.modalNextBtn?.removeEventListener("click", nextHandler)
      );
    }
    if (this.modalPrevBtn) {
      const prevHandler = () => callbacks.onModalPrevious();
      this.modalPrevBtn.addEventListener("click", prevHandler);
      this.eventCleanupFunctions.push(() =>
        this.modalPrevBtn?.removeEventListener("click", prevHandler)
      );
    }

    // Additional modal controls
    if (this.modalFullscreenBtn) {
      const fullscreenHandler = this.handleToggleFullScreen.bind(this);
      this.modalFullscreenBtn.addEventListener("click", fullscreenHandler);
      this.eventCleanupFunctions.push(() =>
        this.modalFullscreenBtn?.removeEventListener("click", fullscreenHandler)
      );
    }
    if (this.modalLikeBtn) {
      const likeHandler = this.handleLike.bind(this);
      this.modalLikeBtn.addEventListener("click", likeHandler);
      this.eventCleanupFunctions.push(() =>
        this.modalLikeBtn?.removeEventListener("click", likeHandler)
      );
    }

    if (this.modalFacesBtn) {
      const facesHandler = this.handleShowFaces.bind(this);
      this.modalFacesBtn.addEventListener("click", facesHandler);
      this.eventCleanupFunctions.push(() =>
        this.modalFacesBtn?.removeEventListener("click", facesHandler)
      );
    }

    // Close modal on backdrop click
    if (this.modal) {
      const backdropHandler = (e: Event) => {
        if (e.target === this.modal) {
          callbacks.onModalClose();
        }
      };
      this.modal.addEventListener("click", backdropHandler);
      this.eventCleanupFunctions.push(() =>
        this.modal?.removeEventListener("click", backdropHandler)
      );
    }

    // Keyboard navigation for modal - use bound function for cleanup
    this.globalKeydownHandler = (e: KeyboardEvent) => {
      if (!this.modal || this.modal.classList.contains("hidden")) return;

      switch (e.key) {
        case "Escape":
          callbacks.onModalClose();
          break;
        case "ArrowLeft":
          callbacks.onModalPrevious();
          break;
        case "ArrowRight":
          callbacks.onModalNext();
          break;
      }
    };
    document.addEventListener("keydown", this.globalKeydownHandler);
  }

  /**
   * Cleans up all event listeners to prevent memory leaks
   */
  cleanupEventListeners(): void {
    // Clean up all registered event listeners
    this.eventCleanupFunctions.forEach((cleanup) => cleanup());
    this.eventCleanupFunctions = [];

    // Clean up global keydown listener
    if (this.globalKeydownHandler) {
      document.removeEventListener("keydown", this.globalKeydownHandler);
      this.globalKeydownHandler = undefined;
    }
  }
  /**
   * Destructor method to clean up resources
   */
  destroy(): void {
    this.cleanupEventListeners();
    this.photoElementPool = [];
    this.currentPhotoClick = null;

    // Cancel any pending image loading
    if (this.currentFullImageLoader) {
      this.currentFullImageLoader.onload = null;
      this.currentFullImageLoader.onerror = null;
      this.currentFullImageLoader = null;
    }
  }
  /**
   * Updates the loading state
   */
  updateLoading(isLoading: boolean): void {
    if (!this.loadingIndicator) return;

    if (isLoading) {
      this.loadingIndicator.classList.remove("hidden");
    } else {
      this.loadingIndicator.classList.add("hidden");
    }
  }

  /**
   * Updates the error display
   */
  updateError(error: string | null): void {
    if (!this.errorDisplay) return;

    if (error) {
      this.errorDisplay.textContent = `Error: ${error}`;
      this.errorDisplay.classList.remove("hidden");
    } else {
      this.errorDisplay.classList.add("hidden");
    }
  }

  /**
   * Updates the photo grid efficiently using pagination-optimized approach
   */
  updatePhotos(photos: HachiImageData[]): void {
    if (!this.photoGrid || !this.noResultsMessage) return;
    console.log("Updating photos in UIService:", photos.length);
    // Handle empty state
    if (photos.length === 0) {
      this.clearPhotoGrid();
      this.noResultsMessage.classList.remove("hidden");
      return;
    }

    this.noResultsMessage.classList.add("hidden");

    // Use pagination-optimized update
    this.updatePhotoGridForPagination(photos);
  }

  /**
   * Clears the photo grid and resets tracking data
   */
  private clearPhotoGrid(): void {
    // Don't clear innerHTML as it breaks the element pool
    // Instead, just hide all elements from the pool
    this.photoElementPool.forEach((element) => {
      element.style.visibility = "hidden";
    });
  }

  /**
   * Optimized for pagination - reuses DOM elements instead of creating/destroying
   */
  private updatePhotoGridForPagination(photos: HachiImageData[]): void {
    console.log("Updating photo grid for pagination:", photos.length);

    // Update existing elements with new photo data
    photos.forEach((photo, index) => {
      const element = this.photoElementPool[index];
      this.updateElementWithPhotoData(element, photo);
    });

    // Hide unused elements
    for (let i = photos.length; i < this.photoElementPool.length; i++) {
      // console.log("Hiding unused element:", i);
      this.photoElementPool[i].style.visibility = "hidden";
    }

    // Ensure all visible elements are in the DOM
    // this.ensureElementsInDOM(photos.length);
  }

  /**
   * Ensures we have enough DOM elements in the pool
   */
  private ensureElementPool(requiredSize: number): void {
    // const neededElements =
    //   Math.min(requiredSize, this.maxPoolSize) - this.photoElementPool.length;
    console.log("Ensuring element pool size:", requiredSize);
    const neededElements = requiredSize;

    for (let i = 0; i < neededElements; i++) {
      const element = this.createEmptyPhotoElement();
      this.photoElementPool.push(element);
    }
    console.log(
      "Element pool size after ensuring:",
      this.photoElementPool.length
    );
  }

  /**
   * Ensures the required number of elements are in the DOM
   */
  public ensureElementsInDOM(visibleCount: number): void {
    console.log(
      "Ensuring elements in DOM:",
      visibleCount,
      this.photoElementPool.length
    );
    const fragment = document.createDocumentFragment();
    let needsUpdate = false;

    for (let i = 0; i < visibleCount && i < this.photoElementPool.length; i++) {
      // console.log("Ensuring element in DOM:", i);
      const element = this.photoElementPool[i];
      if (!element.parentNode) {
        fragment.appendChild(element);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      this.photoGrid.appendChild(fragment);
    }
  }

  /**
   * Creates an empty photo element template for reuse
   */
  private createEmptyPhotoElement(): HTMLElement {
    const div = document.createElement("div");
    div.className =
      "group relative bg-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer mobile-photo-height invisible";

    const img = document.createElement("img");
    img.className =
      "w-full h-full rounded-sm object-cover group-hover:scale-105 transition-transform duration-200";
    img.loading = "lazy";

    // Error handling
    img.onerror = () => {
      img.src = UIService.FALLBACK_IMAGE_SVG;
      img.alt = "Image not found";
    };

    // Hover overlay
    const hoverOverlay = document.createElement("div");
    hoverOverlay.className =
      "absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100";

    const viewIcon = document.createElement("div");
    viewIcon.className = "text-white bg-black/50 rounded-full p-2";
    viewIcon.innerHTML = UIService.VIEW_ICON_SVG;

    hoverOverlay.appendChild(viewIcon);
    div.appendChild(img);
    div.appendChild(hoverOverlay);

    return div;
  }

  /**
   * Updates an existing DOM element with new photo data
   */
  private updateElementWithPhotoData(
    element: HTMLElement,
    photo: HachiImageData
  ): void {
    const img = element.querySelector("img") as HTMLImageElement;
    if (!img) return;
    // console.log("Updating element with photo data:", photo.id);
    // Update image source and metadata
    img.src = `${endpoints.GET_PREVIEW_IMAGE}/${photo.id}.webp`;
    img.alt = photo.metadata?.filename || "";
    element.setAttribute("data-photo-id", photo.id);

    // Update score badge
    const existingScoreBadge = element.querySelector(".score-badge");
    if (existingScoreBadge) {
      existingScoreBadge.remove();
    }

    if (this.showScores && photo.score !== undefined && photo.score !== null) {
      const scoreBadge = document.createElement("div");
      scoreBadge.className =
        "score-badge absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow z-10";
      scoreBadge.textContent = Number(photo.score).toFixed(3);
      element.appendChild(scoreBadge);
    }

    // Remove all existing click listeners efficiently
    element.onclick = null;

    // Add new click handler directly
    if (this.currentPhotoClick) {
      element.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.currentPhotoClick!(photo);
      };
    }

    // Update the visibility
    // console.log("Updating visibility for element:", element);
    // element.classList.remove("invisible");
    element.style.visibility = "visible";
    // console.log("Updated visibility for element:", element);
  }

  /**
   * Shows the image modal
   */
  showModal(
    photo: HachiImageData,
    canGoPrevious: boolean,
    canGoNext: boolean
  ): void {
    if (!this.modal) {
      console.error("Modal element not found");
      return;
    }

    if (!this.modalImage) {
      console.error("Modal image element not found");
      return;
    }
    if (this.modal.classList.contains("hidden")) {
      this.modal.classList.remove("hidden");
    }

    this.loadImageProgressively(photo);
    this.modalImage.alt = photo.metadata?.filename || "Image";

    this.updateModalMetadata(photo);
    this.updateModalNavigation(canGoPrevious, canGoNext);
  this.updateModalTitle(photo);
    document.body.style.overflow = "hidden";
  }

  /**
   * Loads image progressively - starts with preview, then loads full resolution
   */
  private loadImageProgressively(photo: HachiImageData): void {
    // Check if modal image element exists
    if (!this.modalImage) return;

    // Cancel any previous image loading
    if (this.currentFullImageLoader) {
      this.currentFullImageLoader.onload = null;
      this.currentFullImageLoader.onerror = null;
      this.currentFullImageLoader = null;
    }

    // Start with preview image (thumbnail)
    const thumbnailUrl = `${endpoints.GET_PREVIEW_IMAGE}/${photo.id}.webp`;
    const fullImageUrl = `${endpoints.GET_IMAGE}/${photo.id}`;
    this.modalImage.src = thumbnailUrl;

    // Start loading the full resolution image in background
    this.currentFullImageLoader = new Image();
    this.currentFullImageLoader.decoding = "async"; // Use async decoding for better performance
    this.currentFullImageLoader.loading = "eager";
    this.currentFullImageLoader.src = fullImageUrl;
    

    this.currentFullImageLoader.onload = () => {
      // Switch to full resolution while maintaining the same dimensions
      if (this.currentFullImageLoader && this.modalImage) {
        this.modalImage.src = fullImageUrl;
      }
      // Clear the loader reference
      this.currentFullImageLoader = null;
    };

    this.currentFullImageLoader.onerror = () => {
      console.error("Failed to load full resolution image:", fullImageUrl);
      if (this.currentFullImageLoader) {
        this.currentFullImageLoader = null;
      }
    };
  }

  /**
   * Hides the image modal
   */
  hideModal(): void {
    if (!this.modal) {
      console.error("Modal element not found for hiding");
      return;
    }

    // Cancel any pending image loading
    if (this.currentFullImageLoader) {
      this.currentFullImageLoader.onload = null;
      this.currentFullImageLoader.onerror = null;
      this.currentFullImageLoader = null;
    }

    this.modal.classList.add("hidden");
    document.body.style.overflow = "auto";
  }

  /**
   * Updates modal navigation buttons
   */
  updateModalNavigation(canGoPrevious: boolean, canGoNext: boolean): void {
    if (!this.modalPrevBtn || !this.modalNextBtn) return;

    this.modalPrevBtn.disabled = !canGoPrevious;
    this.modalNextBtn.disabled = !canGoNext;

    if (canGoPrevious) {
      this.modalPrevBtn.classList.remove("opacity-50", "cursor-not-allowed");
    } else {
      this.modalPrevBtn.classList.add("opacity-50", "cursor-not-allowed");
    }

    if (canGoNext) {
      this.modalNextBtn.classList.remove("opacity-50", "cursor-not-allowed");
    } else {
      this.modalNextBtn.classList.add("opacity-50", "cursor-not-allowed");
    }
  }

  /**
   * Updates modal metadata display
   */
  private updateModalMetadata(photo: HachiImageData): void {
    if (!this.modalMetadata) return;

    const metadata = photo.metadata;
    if (!metadata) {
      this.modalMetadata.innerHTML =
        '<p class="text-gray-500">No metadata available</p>';
      return;
    }

    // Pre-filter and prepare metadata items for efficiency
    const metadataItems = [
      // { label: "Filename", value: metadata.filename },
      {
        label: "Dimensions",
        value:
          metadata.width && metadata.height
            ? `${metadata.width} × ${metadata.height}`
            : null,
      },
      {
        label: "Date Taken",
        value:
          metadata.taken_at && metadata.taken_at.toLowerCase() !== "unk"
            ? metadata.taken_at
            : null,
      },
      {
        label: "Location",
        value:
          metadata.place && metadata.place.toLowerCase() !== "unk"
            ? metadata.place
            : null,
      },
      { label: "Description", value: metadata.description },
      {
        label: "Device",
        value:
          metadata.device && metadata.device.toLowerCase() !== "unk"
            ? metadata.device
            : null,
      },
      { label: "Path", value: metadata.resource_path },
    ].filter((item) => item.value && item.value.toString().trim() !== "");

    // Use DocumentFragment for efficient DOM building
    const fragment = document.createDocumentFragment();

    // Create standard metadata items
    // Create standard metadata items
    metadataItems.forEach((item) => {
      const div = document.createElement("div");
      div.className =
        "grid grid-cols-3 gap-2 py-1 border-b border-gray-800 last:border-b-0";

      const label = document.createElement("span");
      label.className = "font-semibold col-span-1 text-gray-100";
      label.textContent = `${item.label}:`;
      div.appendChild(label);
      const valueText = item.value as string;

      // Special handling for Path label
      if (item.label === "Path") {
        // Create container for value and copy button
        const valueContainer = document.createElement("div");
        valueContainer.className = "col-span-2 flex gap-2";

        const value = document.createElement("span");
        value.className = "text-gray-200 flex-1 min-w-0";

        const maxLength = 20; // Adjust this value as needed
        const trimmedText =
          valueText.length > maxLength
            ? valueText.substring(0, maxLength) + "..."
            : valueText;
        value.textContent = trimmedText;
        value.title = valueText; // Full path in tooltip

        // Create copy button
        const copyButton = document.createElement("button");
        copyButton.className =
          "text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded transition-colors";
        copyButton.innerHTML = "📋"; // You can replace with an icon
        copyButton.title = "Copy full path";

        // Copy functionality
        copyButton.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(valueText);
            copyButton.innerHTML = "✅";
            setTimeout(() => {
              copyButton.innerHTML = "📋";
            }, 1000);
          } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = valueText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);

            copyButton.innerHTML = "✅";
            setTimeout(() => {
              copyButton.innerHTML = "📋";
            }, 1000);
          }
        });

        valueContainer.appendChild(value);
        valueContainer.appendChild(copyButton);
        div.appendChild(valueContainer);
      } else {
        // Standard handling for other labels
        const value = document.createElement("span");
        value.className = "col-span-2 text-gray-200";
        value.textContent = valueText;
        div.appendChild(value);
      }

      // Value handling is now inside the conditional above
      fragment.appendChild(div);
    });

    // Add people section if available
    const hasPeople =
      metadata.person &&
      metadata.person.length > 0 &&
      !metadata.person.every(
        (p) =>
          p === "no_person_detected" || p === "no_categorical_info" || p === ""
      );

    if (hasPeople) {
      const peopleDiv = document.createElement("div");
      peopleDiv.className = "py-1 border-b border-gray-800";

      const peopleLabel = document.createElement("span");
      peopleLabel.className = "font-semibold text-gray-100";
      peopleLabel.textContent = "People:";

      const peopleContainer = document.createElement("div");
      peopleContainer.className = "flex flex-wrap gap-4 mt-2";
      peopleContainer.setAttribute("data-people-container", "true");

      // Create person avatars efficiently
      const validPeople =
        metadata.person?.filter(
          (personId) =>
            personId !== "no_person_detected" &&
            personId !== "no-categorical-info" &&
            personId.trim() !== ""
        ) || [];

      if (validPeople.length === 0) {
        // Show a placeholder if no valid people
        const noPeople = document.createElement("span");
        noPeople.className = "text-gray-500 text-sm";
        noPeople.textContent = "No people detected.";
        peopleContainer.appendChild(noPeople);
      } else {
        validPeople.forEach((personId) => {
          const personWrapper = document.createElement("div");
          personWrapper.className = "flex flex-col items-center w-24 group";

          const img = document.createElement("img");
          img.src = `${endpoints.GET_PERSON_IMAGE}/${personId}`;
          img.alt = personId;
          img.className =
            "w-24 h-24 object-cover border-2 border-gray-300 shadow-sm cursor-pointer group-hover:border-blue-500 group-hover:scale-105 transition-all duration-200 bg-gray-200";
          img.title = `Click to view ${personId}'s photos`;
          img.setAttribute("data-person-id", personId);

          // Fallback for broken images
          img.onerror = () => {
            img.src = UIService.FALLBACK_IMAGE_SVG;
            img.classList.add("bg-gray-100");
          };

          // Add click handler directly
          img.addEventListener("click", () =>
            this.handlePersonAvatarClick(personId)
          );

          // Add name label under avatar (show short version if long)
          const nameLabel = document.createElement("span");
          nameLabel.className =
            "mt-1 text-xs text-gray-200 text-center truncate max-w-full";
          // If personId looks like a hash, show only first 8 chars, else show as is
          nameLabel.textContent =
            personId.length > 16 && /^[a-f0-9]+$/i.test(personId)
              ? personId.slice(0, 8) + "..."
              : personId;
          nameLabel.title = personId;

          personWrapper.appendChild(img);
          personWrapper.appendChild(nameLabel);
          peopleContainer.appendChild(personWrapper);
        });
      }

      peopleDiv.appendChild(peopleLabel);
      peopleDiv.appendChild(peopleContainer);
      fragment.appendChild(peopleDiv);
    }

    // Clear and append all at once for efficiency
    this.modalMetadata.innerHTML = "";
    this.modalMetadata.appendChild(fragment);
  }

  /**
   * Updates modal filename display
   */
  private updateModalTitle(photo: HachiImageData): void {
    if (!this.modalTitleEl) return;
    this.modalTitleEl.textContent = photo.metadata?.filename || "Image";
  }

  /**
   * Shows the no results message
   */
  showNoResults(isSearchDone: boolean): void {
    if (!this.noResultsMessage) return;

    if (isSearchDone) {
      this.noResultsMessage.classList.remove("hidden");
    } else {
      this.noResultsMessage.classList.add("hidden");
    }
  }

  /**
   * Handles fullscreen toggle for the modal image
   */
  private handleToggleFullScreen(): void {
    if (!this.modalImage) return;

    if (!document.fullscreenElement) {
      this.modalImage.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
        );
        alert(
          `Could not enter fullscreen. Your browser might not support it or it's disabled.`
        );
      });
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * Handles like button click (placeholder)
   */
  private handleLike(): void {
    alert('Feature "Like" is a placeholder.');
  }
  /**
   * Handles show faces button click (placeholder)
   */
  private handleShowFaces(): void {
    alert('Feature "Show Faces" is a placeholder.');
  }

  /**
   * Handles click on a person avatar - navigates to person's dedicated page
   */
  private handlePersonAvatarClick(personId: string): void {
    try {
      // Hide the current modal first
      this.hideModal();

      // Check if we're already on the person photos page
      const currentPath = window.location.pathname;
      // const targetUrl = `/person-photos.html?id=${encodeURIComponent(
      //   personId
      // )}`;
      const targetUrl = `/image-search.html?person=${encodeURIComponent(
        personId
      )}`;

      if (currentPath.includes("person-photos.html")) {
        // We're already on person photos page, need to reload with new person ID
        window.location.assign(targetUrl);
      } else {
        // We're on a different page (like image search), navigate normally
        window.location.href = targetUrl;
      }
    } catch (error) {
      console.error("Error navigating to person page:", error);
      alert(`Failed to navigate to person page: ${personId}`);
    }
  }

  /**
   * Injects CSS styles for responsive photo grid heights
   */
  private injectResponsivePhotoStyles(): void {
    // Check if styles already exist
    if (document.getElementById("responsive-photo-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "responsive-photo-styles";
    style.textContent = `
      .mobile-photo-height {
        height: ${this.imageHeight ? this.imageHeight : 140}px !important;
        width: ${this.imageWidth ? this.imageWidth : 240}px !important;
      }
    `;

    document.head.appendChild(style);
  }
}
