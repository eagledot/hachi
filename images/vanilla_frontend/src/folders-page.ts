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
  previewImage?: string;
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
      "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4";

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
    return html`
      <div
        class="folder-card bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer group relative"
        data-folder-path="${encodeURIComponent(folder.fullPath)}"
      >
        <div
          class="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"
        >
          <svg
            class="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            ></path>
          </svg>
        </div>

        <!-- Overlay with folder info -->
        <div
          class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5"
        >
          <h3
            class="font-semibold text-white text-xs leading-tight mb-1 line-clamp-2"
            title="${folder.name}"
          >
            ${folder.name}
          </h3>
          <div class="flex items-center justify-between text-xs">
            <span class="text-gray-200 text-xs">
              ${folder.imageCount > 0
                ? `${folder.imageCount} photo${
                    folder.imageCount !== 1 ? "s" : ""
                  }`
                : "0 photos"}
            </span>
            <svg
              class="w-3 h-3 text-white/60 group-hover:text-white transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
          </div>
        </div>

        <!-- Hover indicator -->
        <div
          class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 flex items-center justify-center"
        >
          <div
            class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-full p-1.5"
          >
            <svg
              class="w-4 h-4 text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              ></path>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              ></path>
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
