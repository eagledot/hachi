// Updated folders-page.ts with improved UI design

import "./style.css";
import { Layout } from "./components/layout";
import Config, { endpoints } from "./config";
import { fetchWithSession, html } from "./utils";

// Initialize the layout for the folders page
new Layout({
  title: "Folders - Hachi",
  currentPage: "/folders.html",
  showNavbar: true,
});

interface FolderResponse {
  count: number;
  directory: string;
  thumbnail_hash: string;
}

interface Directory {
  name: string;
  imageCount: number;
  fullPath: string;
  thumbnailHash: string;
}

// Folders page functionality
class FoldersApp {
  private folders: Directory[] = [];
  private filteredFolders: Directory[] = [];
  private searchTerm: string = "";
  private sortBy: string = "photos";
  private isLoading: boolean = false;

  constructor() {
    this.setupEventListeners();
    this.loadFolders();
    // Event delegation for folder card clicks
    const grid = document.getElementById("folders-grid");
    if (grid && !grid.getAttribute("data-click-delegation")) {
      grid.addEventListener("click", (e) => {
        const target = (e.target as HTMLElement).closest(
          ".folder-card"
        ) as HTMLElement | null;
        if (target && target.hasAttribute("data-folder-path")) {
          const folderPath = target.getAttribute("data-folder-path");
          if (folderPath) {
            window.location.href = `/image-search.html?resource_directory=${folderPath}`;
          }
        }
      });
      grid.setAttribute("data-click-delegation", "true");
    }
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
    const response = await fetchWithSession(endpoints.GET_FOLDERS);

    if (!response.ok) {
      throw new Error(`Failed to fetch folders: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      this.folders = data.map((folder: FolderResponse) => ({
        name: this.getDisplayName(folder.directory),
        fullPath: folder.directory,
        imageCount: folder.count,
        thumbnailHash: folder.thumbnail_hash,
      }));

      // Sort based on image count descending by default
      this.folders.sort((a, b) => b.imageCount - a.imageCount);

      this.filteredFolders = [...this.folders];
      this.sortFolders(this.sortBy);
      this.renderFolders();
    } else {
      throw new Error("Invalid response format");
    }
  }

  private getDisplayName(fullPath: string): string {
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
          return a.name.localeCompare(b.name);
        default:
          return b.imageCount - a.imageCount;
      }
    });

    this.renderFolders();
  }

  private renderFolders(): void {
    const grid = document.getElementById("folders-grid");
    const noFolders = document.getElementById("no-folders");

    if (!grid || !noFolders) return;

    if (this.filteredFolders.length === 0 && !this.isLoading) {
      grid.classList.add("hidden");
      noFolders.classList.remove("hidden");
      return;
    } else if (this.filteredFolders.length === 0 && this.isLoading) {
      grid.classList.add("hidden");
      noFolders.classList.add("hidden");
      return;
    }

    noFolders.classList.add("hidden");
    grid.classList.remove("hidden");

    this.batchUpdateFolderGrid(grid);
  }

  private batchUpdateFolderGrid(grid: HTMLElement): void {
    const existingNodes = Array.from(
      grid.querySelectorAll<HTMLElement>(":scope > .folder-card")
    );
    const existingMap = new Map<string, HTMLElement>();
    existingNodes.forEach((node) => {
      const key = node.getAttribute("data-folder-path");
      if (key) existingMap.set(key, node);
    });

    const fragment = document.createDocumentFragment();
    const seen = new Set<string>();

    for (const folder of this.filteredFolders) {
      const key = encodeURIComponent(folder.fullPath);
      seen.add(key);
      const existing = existingMap.get(key);
      if (existing) {
        this.updateFolderElement(existing, folder);
        fragment.appendChild(existing);
      } else {
        fragment.appendChild(this.createFolderElement(folder));
      }
    }

    // Remove stale nodes
    for (const [key, node] of existingMap.entries()) {
      if (!seen.has(key)) {
        node.remove();
      }
    }

    grid.appendChild(fragment);
  }

  private createFolderElement(folder: Directory): HTMLElement {
    const card = document.createElement("div");
    card.className = "folder-card shadow-sm bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer";
    card.setAttribute("data-folder-path", encodeURIComponent(folder.fullPath));

    // Thumbnail section
    const thumbnailContainer = document.createElement("div");
    thumbnailContainer.className = "aspect-video bg-gray-100 relative";

    if (folder.thumbnailHash) {
      const img = document.createElement("img");
      img.src = `${endpoints.GET_PREVIEW_IMAGE}/${folder.thumbnailHash}.webp`;
      img.alt = folder.name;
      img.className = "w-full h-full object-cover";
      img.onerror = () => {
        img.style.display = "none";
        const placeholder = this.createPlaceholderIcon();
        thumbnailContainer.appendChild(placeholder);
      };
      thumbnailContainer.appendChild(img);
    } else {
      const placeholder = this.createPlaceholderIcon();
      thumbnailContainer.appendChild(placeholder);
    }

    card.appendChild(thumbnailContainer);

    // Content section
    const content = document.createElement("div");
    content.className = "p-4";

    // Folder name
    const nameElement = document.createElement("h3");
    nameElement.className = "folder-name text-base font-semibold text-gray-900 mb-2 truncate";
    nameElement.textContent = folder.name;
    nameElement.title = folder.name;

    // Photo count
    const countElement = document.createElement("p");
    countElement.className = "photo-count text-sm text-gray-600";
    countElement.textContent = `${folder.imageCount.toLocaleString()} ${folder.imageCount === 1 ? "photo" : "photos"}`;

    // Full path (shown on hover via title)
    const pathElement = document.createElement("p");
    pathElement.className = "folder-path text-xs text-gray-400 mt-1 truncate";
    pathElement.textContent = this.getTrimmedPath(folder.fullPath);
    pathElement.title = folder.fullPath;

    content.appendChild(nameElement);
    content.appendChild(countElement);
    content.appendChild(pathElement);

    card.appendChild(content);

    return card;
  }

  private createPlaceholderIcon(): HTMLElement {
    const placeholder = document.createElement("div");
    placeholder.className = "flex items-center justify-center w-full h-full";
    placeholder.innerHTML = `
      <svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z">
        </path>
      </svg>
    `;
    return placeholder;
  }

  private updateFolderElement(el: HTMLElement, folder: Directory): void {
    // Update thumbnail
    const img = el.querySelector("img");
    if (img && folder.thumbnailHash && !img.src.includes(folder.thumbnailHash)) {
      img.src = `${endpoints.GET_PREVIEW_IMAGE}/${folder.thumbnailHash}.webp`;
    }

    // Update name
    const nameDiv = el.querySelector(".folder-name") as HTMLElement | null;
    if (nameDiv && nameDiv.textContent !== folder.name) {
      nameDiv.textContent = folder.name;
      nameDiv.title = folder.name;
    }

    // Update path
    const pathDiv = el.querySelector(".folder-path") as HTMLElement | null;
    if (pathDiv) {
      const trimmedPath = this.getTrimmedPath(folder.fullPath);
      if (pathDiv.textContent !== trimmedPath) {
        pathDiv.textContent = trimmedPath;
        pathDiv.title = folder.fullPath;
      }
    }

    // Update count
    const countDiv = el.querySelector(".photo-count") as HTMLElement | null;
    const newCountText = `${folder.imageCount.toLocaleString()} ${folder.imageCount === 1 ? "photo" : "photos"}`;
    if (countDiv && countDiv.textContent !== newCountText) {
      countDiv.textContent = newCountText;
    }
  }

  private getTrimmedPath(fullPath: string): string {
    const maxPathLen = 40;
    if (fullPath.length > maxPathLen) {
      return "…" + fullPath.slice(-maxPathLen);
    }
    return fullPath;
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