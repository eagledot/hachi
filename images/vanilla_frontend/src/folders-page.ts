import "./style.css";
import { Layout } from "./components/layout";
import Config, { endpoints } from "./config";
import { folderCache } from "./services/folder-cache";
import type { CachedFolderData } from "./services/folder-cache";
import { html } from "./utils";

const API_URL = Config.apiUrl;

// Initialize the layout for the folders page
new Layout({
  title: "Folders - Hachi",
  currentPage: "/folders.html",
  showNavbar: true,
});

// Types matching the LocalView React implementation
interface DirectoryWithPreview {
  name: string;
  imageCount: number;
  previewImage?: string;
  fullPath: string;
}

// Folders page functionality
class FoldersApp {
  private folders: DirectoryWithPreview[] = [];
  private filteredFolders: DirectoryWithPreview[] = [];
  private searchTerm: string = "";
  private sortBy: string = "name";
  private pageSize: number = 20;
  private currentPage: number = 1;
  private isLoading: boolean = false;
  private imageErrorRetryCount: Map<string, number> = new Map();
  private readonly MAX_RETRY_ATTEMPTS = 2;
  constructor() {
    this.setupEventListeners();
    this.loadFolders();
  }
  private setupEventListeners(): void {
    // Search functionality
    const searchInput = document.getElementById(
      "folder-search"
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = (e.target as HTMLInputElement).value.toLowerCase();
        this.setSearchTerm(query);
      });
    }

    // Sort functionality
    const sortSelect = document.getElementById(
      "sort-filter"
    ) as HTMLSelectElement;
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        const sortBy = (e.target as HTMLSelectElement).value;
        this.sortFolders(sortBy);
      });
    } // Load more button
    const loadMoreBtn = document.getElementById("load-more-btn");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        this.loadMoreFolders();
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById("refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.refreshFolders();
      });
    }
  }
  private async loadFolders(): Promise<void> {
    this.isLoading = true;
    this.showLoading(true);
    this.hideError();

    try {
      // First, try to load from cache
      const isValidCache = await folderCache.isCacheValid();

      if (isValidCache) {
        const cachedData = await folderCache.getCachedFolderData();
        if (cachedData && cachedData.length > 0) {
          // Transform cached data to our interface
          this.folders = cachedData.map((cached: CachedFolderData) => ({
            name: this.getDisplayName(cached.name),
            fullPath: cached.fullPath,
            imageCount: cached.imageCount,
            previewImage: cached.previewImageHash
              ? `${endpoints.GET_IMAGE}/${cached.previewImageHash}`
              : undefined,
          }));

          this.filteredFolders = [...this.folders];
          this.sortFolders(this.sortBy);
          this.renderFolders();

          this.isLoading = false;
          this.showLoading(false);

          // Optionally refresh in background if cache is older than 1 hour
          const stats = await folderCache.getCacheStats();
          const oneHourAgo = Date.now() - 60 * 60 * 1000;
          if (stats.lastUpdated && stats.lastUpdated < oneHourAgo) {
            this.refreshFoldersInBackground();
          }

          return;
        }
      }

      await this.loadFoldersFromAPI();
    } catch (error) {
      console.error("Error in loadFolders:", error);

      // Fallback to API loading if cache fails
      try {
        await this.loadFoldersFromAPI();
      } catch (apiError) {
        console.error("Error loading folders from API:", apiError);
        this.showError(
          `Failed to load folders: ${
            apiError instanceof Error ? apiError.message : "Unknown error"
          }`
        );
      }
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  private async loadFoldersFromAPI(): Promise<void> {
    const response = await fetch(endpoints.GET_FOLDERS);

    if (!response.ok) {
      throw new Error(`Failed to fetch folders: ${response.status}`);
    }

    const data = await response.json();

    // Transform the data to match our interface
    // The API returns an array of directory names
    if (Array.isArray(data)) {
      // Reset image error tracking
      this.imageErrorRetryCount.clear();
      
      this.folders = data.map((dirName: string) => ({
        name: this.getDisplayName(dirName),
        fullPath: dirName,
        imageCount: 0, // Will be populated when we get preview images
        previewImage: undefined,
      }));

      // Load preview images and counts for visible folders
      await this.loadFolderPreviews();

      // Cache the loaded data
      await this.cacheFolderData();

      this.filteredFolders = [...this.folders];
      this.sortFolders(this.sortBy);
      this.renderFolders();
    } else {
      throw new Error("Invalid response format");
    }
  }

  private async refreshFoldersInBackground(): Promise<void> {
    try {
      const response = await fetch(endpoints.GET_FOLDERS);
      if (!response.ok) {
        console.warn("Background refresh failed:", response.status);
        return;
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        console.warn("Invalid response format in background refresh");
        return;
      }

      // Create temporary folder list for background loading
      const tempFolders = data.map((dirName: string) => ({
        name: this.getDisplayName(dirName),
        fullPath: dirName,
        imageCount: 0,
        previewImage: undefined,
      })); // Load previews for the temp folders
      await this.loadFolderPreviewsForList(tempFolders);
      // Cache the refreshed data
      const cacheData: CachedFolderData[] = tempFolders.map((folder) => ({
        name: folder.name,
        fullPath: folder.fullPath,
        imageCount: folder.imageCount,
        previewImageHash: folder.previewImage
          ? (folder.previewImage as string).split("/").pop() || undefined
          : undefined,
        lastUpdated: Date.now(),
      }));

      await folderCache.cacheFolderData(cacheData);
    } catch (error) {
      console.warn("Background refresh failed:", error);
    }
  }

  private async cacheFolderData(): Promise<void> {
    // Do not cache if indexing  is in progress
    if (folderCache.isIndexingInProgress()) {
      console.warn("Skipping cache update while indexing is in progress");
      return;
    }
    try {
      const cacheData: CachedFolderData[] = this.folders.map((folder) => ({
        name: folder.name,
        fullPath: folder.fullPath,
        imageCount: folder.imageCount,
        previewImageHash: folder.previewImage
          ? (folder.previewImage as string).split("/").pop() || undefined
          : undefined,
        lastUpdated: Date.now(),
      }));

      await folderCache.cacheFolderData(cacheData);
    } catch (error) {
      console.warn("Failed to cache folder data:", error);
    }
  }
  private async loadFolderPreviews(): Promise<void> {
    // Load preview images for all folders, but limit concurrent requests
    const concurrentLimit = 5;

    for (let i = 0; i < this.folders.length; i += concurrentLimit) {
      const batch = this.folders.slice(i, i + concurrentLimit);

      await Promise.allSettled(
        batch.map(async (folder) => {
          try {
            // Preprocess filename according to backend requirements
            const filename = folder.fullPath
              .toString()
              .toLowerCase()
              .replace(/\//g, "|");

            const response = await fetch(
              `${endpoints.GET_FOLDER_IMAGES}/${filename}`
            );

            if (response.ok) {
              const data = await response.json();

              if (data && data.meta_data && Array.isArray(data.meta_data)) {
                folder.imageCount = data.meta_data.length;

                // Get first image hash as preview
                if (data.data_hash && data.data_hash.length > 0) {
                  const firstImageHash = data.data_hash[0];
                  if (firstImageHash) {
                    folder.previewImage = `${endpoints.GET_IMAGE}/${firstImageHash}`;
                  }
                }
              }
            } else {
              console.warn(
                `Failed to fetch preview for ${folder.name}: ${response.status} ${response.statusText}`
              );
            }
          } catch (error) {
            console.error(
              `Error loading preview for folder ${folder.name}:`,
              error
            );
          }
        })
      );

      // Re-render after each batch to show progressive updates
      this.renderFolders();
    }
  }

  private async loadFolderPreviewsForList(
    foldersList: DirectoryWithPreview[]
  ): Promise<void> {
    // Load preview images for all folders, but limit concurrent requests
    const concurrentLimit = 5;

    for (let i = 0; i < foldersList.length; i += concurrentLimit) {
      const batch = foldersList.slice(i, i + concurrentLimit);

      await Promise.allSettled(
        batch.map(async (folder) => {
          try {
            // Preprocess filename according to backend requirements
            const filename = folder.fullPath
              .toString()
              .toLowerCase()
              .replace(/\//g, "|");

            const response = await fetch(
              `${endpoints.GET_FOLDER_IMAGES}/${filename}`
            );

            if (response.ok) {
              const data = await response.json();

              if (data && data.meta_data && Array.isArray(data.meta_data)) {
                folder.imageCount = data.meta_data.length;

                // Get first image hash as preview
                if (data.data_hash && data.data_hash.length > 0) {
                  const firstImageHash = data.data_hash[0];
                  if (firstImageHash) {
                    folder.previewImage = `${endpoints.GET_IMAGE}/${firstImageHash}`;
                  }
                }
              }
            }
          } catch (error) {
            console.error(
              `Error loading preview for folder ${folder.name}:`,
              error
            );
          }
        })
      );
    }
  }

  private getDisplayName(fullPath: string): string {
    // Extract the folder name from the full path
    const pathParts = fullPath.split(/[/\\]/);
    return pathParts[pathParts.length - 1] || fullPath;
  }
  private setSearchTerm(term: string): void {
    this.searchTerm = term;
    this.filterFolders();
    this.renderFolders();
  }
  private filterFolders(): void {
    if (!this.searchTerm) {
      this.filteredFolders = [...this.folders];
      return;
    }

    this.filteredFolders = this.folders.filter(
      (folder) =>
        folder.name.toLowerCase().includes(this.searchTerm) ||
        folder.fullPath.toLowerCase().includes(this.searchTerm)
    );
  }

  private sortFolders(sortBy: string): void {
    this.sortBy = sortBy;

    this.filteredFolders.sort((a, b) => {
      switch (sortBy) {
        case "photos":
          return b.imageCount - a.imageCount;
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });

    this.renderFolders();
  }
  private renderFolders(): void {
    const grid = document.getElementById("folders-grid");
    const noFolders = document.getElementById("no-folders");

    if (!grid || !noFolders) return;

    // Don't show "no folders" message while loading
    if (this.filteredFolders.length === 0 && !this.isLoading) {
      grid.classList.add("hidden");
      noFolders.classList.remove("hidden");
      return;
    } else if (this.filteredFolders.length === 0 && this.isLoading) {
      // Hide both grid and "no folders" while loading
      grid.classList.add("hidden");
      noFolders.classList.add("hidden");
      return;
    }
    noFolders.classList.add("hidden");
    grid.classList.remove("hidden"); // Set grid layout - improved spacing for photo-focused cards
    grid.className =
      "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4";

    // Calculate which folders to show based on pagination
    const startIndex = 0;
    const endIndex = this.currentPage * this.pageSize;
    const foldersToShow = this.filteredFolders.slice(startIndex, endIndex);

    grid.innerHTML = foldersToShow
      .map((folder) => this.renderFolderCard(folder))
      .join("");

    // Update load more button visibility
    this.updateLoadMoreButton();

    // Setup click handlers for folder cards
    this.setupFolderClickHandlers();
  }
  private renderFolderCard(folder: DirectoryWithPreview): string {
    return this.renderGridViewCard(folder);
  }
  private renderGridViewCard(folder: DirectoryWithPreview): string {
    const previewImage = folder.previewImage
      ? html`<img loading="lazy" src="${folder.previewImage}" alt="${folder.name}" class="w-full h-48 object-cover">`
      : html`<div class="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
           <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
           </svg>
         </div>`;

    return `
      <div class="folder-card bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer group relative" 
           data-folder-path="${encodeURIComponent(folder.fullPath)}">
        ${previewImage}
        
        <!-- Overlay with folder info -->
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5">
          <h3 class="font-semibold text-white text-xs leading-tight mb-1 line-clamp-2" title="${
            folder.name
          }">
            ${folder.name}
          </h3>
          <div class="flex items-center justify-between text-xs">
            <span class="text-gray-200 text-xs">
              ${
                folder.imageCount > 0
                  ? `${folder.imageCount} photo${
                      folder.imageCount !== 1 ? "s" : ""
                    }`
                  : "Loading..."
              }
            </span>
            <svg class="w-3 h-3 text-white/60 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
        
        <!-- Hover indicator -->
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 flex items-center justify-center">
          <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-full p-1.5">
            <svg class="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </div>
        </div>
      </div>
    `;
  }
  private setupFolderClickHandlers(): void {
    const folderCards = document.querySelectorAll(".folder-card");
    folderCards.forEach((card) => {
      card.addEventListener("click", () => {
        const folderPath = card.getAttribute("data-folder-path");
        if (folderPath) {
          window.location.href = `/folder-photos.html?path=${folderPath}`;
        }
      });
    });
  }

  private loadMoreFolders(): void {
    this.currentPage++;
    this.renderFolders();
  }

  private updateLoadMoreButton(): void {
    const loadMoreContainer = document.getElementById("load-more-container");
    if (!loadMoreContainer) return;

    const totalShown = this.currentPage * this.pageSize;
    const hasMore = totalShown < this.filteredFolders.length;

    if (hasMore) {
      loadMoreContainer.classList.remove("hidden");
    } else {
      loadMoreContainer.classList.add("hidden");
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
  private async refreshFolders(): Promise<void> {
    // Disable the refresh button and show loading state
    const refreshBtn = document.getElementById(
      "refresh-btn"
    ) as HTMLButtonElement;
    const refreshIcon = document.getElementById("refresh-icon");

    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.classList.add("opacity-50", "cursor-not-allowed");
    }

    if (refreshIcon) {
      refreshIcon.classList.add("animate-spin");
    }

    // Show loading indicator and hide error messages
    this.showLoading(true);
    this.hideError();
    this.isLoading = true;

    try {
      // Clear the cache
      await folderCache.clearCache();
      console.log("Folder cache cleared successfully");
      
      // Reset image error tracking
      this.imageErrorRetryCount.clear();
      
      // Reset the current state
      this.folders = [];
      this.filteredFolders = [];
      this.currentPage = 1;

      // Hide load more button immediately after pagination reset
      this.updateLoadMoreButton(); // Reload folders from API
      await this.loadFoldersFromAPI();
    } catch (error) {
      console.error("Error refreshing folders:", error);
      this.showError(
        `Failed to refresh folders: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      // Re-enable the refresh button and stop loading state
      this.isLoading = false;
      this.showLoading(false);

      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove("opacity-50", "cursor-not-allowed");
      }

      if (refreshIcon) {
        refreshIcon.classList.remove("animate-spin");
      }
    }
  }
}

// Initialize the folders app
const foldersApp = new FoldersApp();

// Make it globally accessible for onclick handlers
(window as any).foldersApp = foldersApp;
