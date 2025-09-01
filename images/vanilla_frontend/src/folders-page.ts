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
    // Event delegation for folder card clicks (added once)
    const grid = document.getElementById("folders-grid");
    if (grid && !grid.getAttribute("data-click-delegation")) {
      grid.addEventListener("click", (e) => {
        const target = (e.target as HTMLElement).closest('.folder-list-item') as HTMLElement | null;
        if (target && target.hasAttribute('data-folder-path')) {
          const folderPath = target.getAttribute('data-folder-path');
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
    // this.isLoading = true;
    // this.showLoading(true);
    // this.hideError();

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
      // this.isLoading = false;
      // this.showLoading(false);
    }
  }

  private async loadFoldersFromAPI(): Promise<void> {
    const response = await fetchWithSession(endpoints.GET_FOLDERS);

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

    this.batchUpdateFolderGrid(grid);
  }

  // Efficiently update the grid without full innerHTML replacement
  private batchUpdateFolderGrid(grid: HTMLElement): void {
    const existingNodes = Array.from(grid.querySelectorAll<HTMLElement>(":scope > .folder-list-item"));
    const existingMap = new Map<string, HTMLElement>();
    existingNodes.forEach(node => {
      const key = node.getAttribute('data-folder-path');
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

    // Remove stale nodes (those not re-appended)
    for (const [key, node] of existingMap.entries()) {
      if (!seen.has(key)) {
        node.remove();
      }
    }

    // Append new order (this also reorders existing nodes without re-rendering contents)
    grid.appendChild(fragment);
  }

  private createFolderElement(folder: Directory): HTMLElement {
    const div = document.createElement('div');
    div.className = "folder-list-item px-4 py-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex flex-col gap-1 justify-between";
    div.setAttribute('data-folder-path', encodeURIComponent(folder.fullPath));
    // Structure
    div.appendChild(this.buildTopRow(folder));
    div.appendChild(this.buildPathRow(folder));
    return div;
  }

  private updateFolderElement(el: HTMLElement, folder: Directory): void {
    // Update only if changed
    const nameSpan = el.querySelector('.folder-name') as HTMLElement | null;
    if (nameSpan && nameSpan.textContent !== folder.name) {
      nameSpan.textContent = folder.name;
      nameSpan.title = folder.name;
    }
    const pathSpan = el.querySelector('.folder-path') as HTMLElement | null;
    if (pathSpan) {
      const { trimmedPath } = this.getTrimmedPath(folder.fullPath);
      if (pathSpan.textContent !== trimmedPath) {
        pathSpan.textContent = trimmedPath;
      }
      if (pathSpan.title !== folder.fullPath) pathSpan.title = folder.fullPath;
    }
  }

  private buildTopRow(folder: Directory): HTMLElement {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3';
    row.innerHTML = `
      <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
      </svg>
      <span class="folder-name font-medium text-gray-800" title="${folder.name}">${folder.name}</span>`;
    return row;
  }

  private buildPathRow(folder: Directory): HTMLElement {
    const { trimmedPath } = this.getTrimmedPath(folder.fullPath);
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2';
    row.innerHTML = `<span class="folder-path text-xs text-gray-400 truncate max-w-full" title="${folder.fullPath}">${trimmedPath}</span>`;
    return row;
  }

  private getTrimmedPath(fullPath: string): { trimmedPath: string } {
    const maxPathLen = 32;
    let trimmedPath = fullPath;
    if (trimmedPath.length > maxPathLen) {
      trimmedPath = '…' + trimmedPath.slice(-maxPathLen);
    }
    return { trimmedPath };
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
