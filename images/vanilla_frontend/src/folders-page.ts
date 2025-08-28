import "./style.css";
import { Layout } from "./components/layout";
import Config, { endpoints } from "./config";
import { html } from "./utils";

// Initialize the layout for the folders page
new Layout({
  title: "Folders - Hachi",
  currentPage: "/folders.html",
  showNavbar: true,
});

interface Directory {
  name: string;
  imageCount: number;
  fullPath: string;
}

// Folders page functionality
class FoldersApp {
  private folders: Directory[] = [];
  private filteredFolders: Directory[] = [];
  private searchTerm: string = "";
  private sortBy: string = "name";
  private isLoading: boolean = false;

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
    }
  }


  private async loadFolders(): Promise<void> {
    this.isLoading = true;
    this.showLoading(true);
    this.hideError();

    try {
      await this.loadFoldersFromAPI();
    } catch (error) {
      console.error("Error loading folders:", error);
      this.showError(
        `Failed to load folders: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
      this.folders = data.map((dirName: string) => ({
        name: this.getDisplayName(dirName),
        fullPath: dirName,
        imageCount: 0,
      }));

      this.filteredFolders = [...this.folders];
      this.sortFolders(this.sortBy);
      this.renderFolders();
    } else {
      throw new Error("Invalid response format");
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
    grid.classList.remove("hidden");
    grid.className =
      "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4";

    // Show all folders without pagination
    grid.innerHTML = this.filteredFolders
      .map((folder) => this.renderFolderCard(folder))
      .join("");

    // Setup click handlers for folder cards
    this.setupFolderClickHandlers();
  }

  private renderFolderCard(folder: Directory): string {
    return this.renderGridViewCard(folder);
  }

  private renderGridViewCard(folder: Directory): string {
    // Show folder name, trimmed full path (left-ellipsis), and photo count
    const maxPathLen = 32;
    let trimmedPath = folder.fullPath;
    if (trimmedPath.length > maxPathLen) {
      trimmedPath = '…' + trimmedPath.slice(-maxPathLen);
    }
    return html`
      <div
        class="folder-list-item px-4 py-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex flex-col gap-1 justify-between"
        data-folder-path="${encodeURIComponent(folder.fullPath)}"
      >
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
          </svg>
          <span class="font-medium text-gray-800" title="${folder.name}">${folder.name}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-400 truncate max-w-full" title="${folder.fullPath}">${trimmedPath}</span>
          <!-- <span class="text-xs text-gray-500 ml-auto">${folder.imageCount} photo${folder.imageCount !== 1 ? "s" : ""}</span> -->
        </div>
      </div>
    `;
  }

  private setupFolderClickHandlers(): void {
    const folderItems = document.querySelectorAll(".folder-list-item");
    folderItems.forEach((item) => {
      item.addEventListener("click", () => {
        const folderPath = item.getAttribute("data-folder-path");
        if (folderPath) {
          // window.location.href = `/folder-photos.html?path=${folderPath}`;
          window.location.href = `/image-search.html?resource_directory=${folderPath}`;
        }
      });
    });
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

// Initialize the folders app
const foldersApp = new FoldersApp();

// Make it globally accessible for onclick handlers
(window as any).foldersApp = foldersApp;
