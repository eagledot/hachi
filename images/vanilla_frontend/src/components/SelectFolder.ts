import IndexingService from "../services/indexing";
import { html } from "../utils";

interface FolderRequest {
  location: string;
  identifier: string;
  uri: string[];
}

interface FolderResponse {
  // We are not currently getting the type from the backend, only the name
  name: string;
  type: "folder" | "file"; 
}

interface SelectFolderOptions {
  onFolderSelect?: (path: FolderRequest) => void;
  onCancel?: () => void;
  showOkButton?: boolean;
  showCancelButton?: boolean;
  title?: string;
  drives?: string[]; // Available drives like ['C:', 'D:', 'E:'] or in case for linux, ['/', '/home', '/mnt']
}

class SelectFolder {
  private container: HTMLElement;
  private currentPath: string[] = []; // This will be the path array, e.g., ["Documents", "Projects"] for "C:/Documents/Projects"
  private currentDrive: string | null = null; // This will be the identifier for the selected drive. Example: "C:", "D:" in Windows or "/" in Linux
  private searchQuery: string = "";
  private sortOrder: "asc" | "desc" = "asc";
  private options: SelectFolderOptions;
  private isLoading: boolean = false;
  private availableDrives: string[] = [];
  private isDriveSelectionMode: boolean = true; // Flag to indicate if we are in drive selection mode or folder navigation mode
  constructor(containerId: string, options: SelectFolderOptions = {}) {
    this.container = document.getElementById(containerId) as HTMLElement;
    this.options = {
      showOkButton: true,
      showCancelButton: true,
      title: "Select Folder",
      // drives: ["C:", "D:", "E:"], // Default drives
      drives: [], // Default to empty, will be set later. Setting with default drives causes confusion in case the API request fails
      ...options,
    };

    this.availableDrives = this.options.drives || []; // Now it can be just this.options.drives. But let's not touch it for now
    this.render();
    this.loadDrives();
  }
  private async fetchFolders(
    request: FolderRequest
  ): Promise<FolderResponse[]> {
    // Reset search query when making new requests
    this.searchQuery = ""; // Should this be a part of this.clearSearchInput()?
    this.clearSearchInput();

    try {
      const suggestionPaths = await IndexingService.getSuggestionPath(request);
      // Filter out files (items that have file extensions like .txt, .jpg, etc.)
      // TODO: This is a temporary solution. The backend should ideally return only folders or return a type field
      const foldersOnly = suggestionPaths.filter((path: string) => {
        // Check if the path ends with a file extension pattern (dot followed by characters)
        const fileExtensionRegex = /\.[a-zA-Z0-9]+$/;
        return !fileExtensionRegex.test(path);
      });
      
      return foldersOnly.map((path: string) => ({
        name: path,
        type: "folder" as const,
      }));
    } catch (error) {
      console.error("Error fetching folders:", error);
      return [];
    }
  }

  private currentFolders: FolderResponse[] = [];

  private clearSearchInput(): void {
    const searchInput = this.container.querySelector(
      "#search-input"
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.value = "";
    }
  }

  private render(): void {
    this.container.innerHTML = html`
      <div class="bg-white border border-gray-200 rounded-xl shadow-xl max-w-3xl mx-auto flex flex-col max-h-[80vh]">
        <!-- Header -->
        <div class="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
          <div class="flex items-center space-x-3">
            <div class="p-2 bg-blue-100 rounded-lg">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-800">${
              this.options.title
            }</h3>
          </div>
          <div class="flex items-center space-x-2">
            <button id="back-btn" class="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled title="Go back">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <button id="sort-btn" class="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200" title="Toggle sort order">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Search bar -->
        <div class="p-5 border-b border-gray-200">
          <div class="relative">
            <input 
              type="text" 
              id="search-input" 
              placeholder="Search folders..." 
              class="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
            />
            <svg class="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>            </svg>
          </div>
        </div>        
        <!-- Folder list -->
        <div class="flex-1 overflow-y-auto min-h-0">
          <div id="loading" class="hidden p-12 text-center text-gray-500">
            <div class="inline-block animate-spin rounded-full h-10 w-10 border-3 border-blue-500 border-t-transparent"></div>
            <p class="mt-4 text-lg font-medium">Loading folders...</p>
          </div>
          <div id="folder-list" class="divide-y grid grid-cols-3 divide-gray-100"></div>
          <div id="empty-state" class="hidden p-12 text-center text-gray-500">
            <div class="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
            </div>
            <p class="text-lg font-medium text-gray-600">No folders found</p>
            <p class="text-sm text-gray-500 mt-1">Try adjusting your search or navigate to a different location</p>
          </div>
        </div>        
        <!-- Footer buttons -->
        <div class="flex p-5 justify-between align-middle bg-gray-50 rounded-b-xl border-t border-gray-200">
          <div id="breadcrumb" class="flex items-center space-x-2 text-sm">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span class="text-gray-500 font-medium">Location:</span>
              <div class="flex items-center space-x-1">
                <span id="current-path" class="font-mono text-gray-700 bg-white px-3 py-1.5 rounded-lg border shadow-sm">Computer</span>
              </div>
            </div>

        ${
          this.options.showOkButton || this.options.showCancelButton
            ? `
        <div class="flex justify-end space-x-3 flex-shrink-0">
          ${
            this.options.showCancelButton
              ? `
            <button id="cancel-btn" class="px-3 py-2 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium transition-all duration-200">
              Cancel
            </button>
          `
              : ""
          }
          ${
            this.options.showOkButton
              ? `            <button id="ok-btn" class="px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" ${this.isDriveSelectionMode ? 'disabled' : ''}>
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Select Current Location
            </button>
          `
              : ""
          }
        </div>
        </div>
        `
            : ""
        }
      </div>
    `;

    this.attachEventListeners();
  }
  private attachEventListeners(): void {
    // Back button
    const backBtn = this.container.querySelector(
      "#back-btn"
    ) as HTMLButtonElement;
    backBtn?.addEventListener("click", () => this.navigateBack());

    // Sort button
    const sortBtn = this.container.querySelector(
      "#sort-btn"
    ) as HTMLButtonElement;
    sortBtn?.addEventListener("click", () => this.toggleSort());

    // Search input
    const searchInput = this.container.querySelector(
      "#search-input"
    ) as HTMLInputElement;
    searchInput?.addEventListener("input", (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.renderFilteredFolders(); // Only filter current results, no API call
    });

    // OK button
    const okBtn = this.container.querySelector("#ok-btn") as HTMLButtonElement;
    okBtn?.addEventListener("click", () => this.handleOk());

    // Cancel button
    const cancelBtn = this.container.querySelector(
      "#cancel-btn"
    ) as HTMLButtonElement;
    cancelBtn?.addEventListener("click", () => this.handleCancel());
  }
  private async loadDrives(): Promise<void> {
    this.setLoading(true);
    this.isDriveSelectionMode = true;

    try {
      // Show available drives from constructor options
      const driveList: FolderResponse[] = this.availableDrives.map((drive) => ({
        name: drive,
        type: "folder" as const,
      }));

      this.currentFolders = driveList;
      this.renderFolderList(driveList);
      this.updateBreadcrumb();
      this.updateOkButton();
    } catch (error) {
      console.error("Error loading drives:", error);
    } finally {
      this.setLoading(false);
    }
  }
  private async loadFolders(): Promise<void> {
    if (!this.currentDrive) return;

    this.setLoading(true);
    this.isDriveSelectionMode = false;

    try {
      // Now fetch folders using the selected drive as identifier
      const folders = await this.fetchFolders({
        location: "LOCAL",
        identifier: this.currentDrive,
        uri: this.currentPath,
      });
      this.currentFolders = folders;
      this.renderFolderList(folders);
      this.updateBreadcrumb();
      this.updateOkButton();
    } catch (error) {
      console.error("Error loading folders:", error);
    } finally {
      this.setLoading(false);
    }
  }
  private renderFolderList(folders: FolderResponse[]): void {
    const folderList = this.container.querySelector(
      "#folder-list"
    ) as HTMLElement;
    const emptyState = this.container.querySelector(
      "#empty-state"
    ) as HTMLElement;

    if (folders.length === 0) {
      folderList.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    const sortedFolders = this.sortFolders(folders);
    const filteredFolders = this.filterFolders(sortedFolders);
    folderList.innerHTML = filteredFolders
      .map((folder) => this.generateFolderHTML(folder))
      .join(""); // Add event listeners for folder items
    this.attachFolderEventListeners(folderList);
  }
  private renderFilteredFolders(): void {
    const sortedFolders = this.sortFolders(this.currentFolders);
    const filteredFolders = this.filterFolders(sortedFolders);

    const folderList = this.container.querySelector(
      "#folder-list"
    ) as HTMLElement;
    const emptyState = this.container.querySelector(
      "#empty-state"
    ) as HTMLElement;

    if (filteredFolders.length === 0) {
      folderList.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    folderList.innerHTML = filteredFolders
      .map((folder) => this.generateFolderHTML(folder))
      .join("");

    // Attach event listeners using centralized method
    this.attachFolderEventListeners(folderList);
  }

  private filterFolders(folders: FolderResponse[]): FolderResponse[] {
    if (!this.searchQuery.trim()) return folders;

    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  /**
   * Sorts an array of `FolderResponse` objects by their `name` property.
   *
   * The sorting order is determined by the `sortOrder` property of the class instance:
   * - If `sortOrder` is `"asc"`, folders are sorted in ascending (A-Z) order.
   * - If `sortOrder` is any other value (typically `"desc"`), folders are sorted in descending (Z-A) order.
   *
   * @param folders - The array of `FolderResponse` objects to sort.
   * @returns A new array of `FolderResponse` objects sorted by name according to the specified order.
   */
  private sortFolders(folders: FolderResponse[]): FolderResponse[] {
    return [...folders].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return this.sortOrder === "asc" ? comparison : -comparison;
    });
  }

  private async navigateToFolder(folderName: string): Promise<void> {
    if (this.isDriveSelectionMode) {
      // User is selecting a drive (e.g., "C:", "D:")
      this.currentDrive = folderName; // Set identifier as the selected drive
      this.currentPath = []; // Reset path when selecting a new drive
      await this.loadFolders(); // Load folders in the selected drive
      this.updateBackButton();
      this.updateOkButton();
    } else {
      // User is navigating into a folder within the drive
      this.currentPath.push(folderName); // Add folder to uri array
      await this.loadFolders(); // Load subfolders
      this.updateBackButton();
      this.updateOkButton();
    }
  }

  private navigateBack(): void {
    if (this.currentPath.length > 0) {
      // Navigate back within the current drive
      this.currentPath.pop();
      this.loadFolders();
    } else if (this.currentDrive) {
      // Go back to drive selection
      this.currentDrive = null;
      this.isDriveSelectionMode = true;
      this.loadDrives();
    }
    this.updateBackButton();
    this.updateOkButton();
  }

  private toggleSort(): void {
    this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";

    // Update sort button icon to show current order
    const sortBtn = this.container.querySelector(
      "#sort-btn"
    ) as HTMLButtonElement;
    const icon = sortBtn.querySelector("svg");
    if (icon) {
      icon.style.transform =
        this.sortOrder === "desc" ? "rotate(180deg)" : "rotate(0deg)";
    }

    // Re-render the current folder list with new sort order
    this.renderFilteredFolders();
  }
  private updateBreadcrumb(): void {
    const currentPathElement = this.container.querySelector(
      "#current-path"
    ) as HTMLElement;
    const breadcrumbElement = this.container.querySelector(
      "#breadcrumb"
    ) as HTMLElement;
    
    let pathText = "Computer";

    if (this.isDriveSelectionMode) {
      pathText = "Computer";
      // Hide breadcrumb in drive selection mode
      if (breadcrumbElement) {
        breadcrumbElement.classList.add("invisible");
      }
    } else if (this.currentDrive) {
      pathText = this.currentDrive;
      if (this.currentPath.length > 0) {
        pathText += "/" + this.currentPath.join("/");
      }
      // Show breadcrumb when navigating folders
      if (breadcrumbElement) {
        breadcrumbElement.classList.remove("invisible");
      }
    }
    
    console.log(`Updating breadcrumb: ${pathText}`);
    if (currentPathElement) {
      currentPathElement.textContent = pathText;
    }
  }

  private updateBackButton(): void {
    const backBtn = this.container.querySelector(
      "#back-btn"
    ) as HTMLButtonElement;
    // Enable back button if we're not in drive selection mode OR if we have path depth
    backBtn.disabled =
      this.isDriveSelectionMode && this.currentPath.length === 0;
  }

  private updateOkButton(): void {
    const okBtn = this.container.querySelector("#ok-btn") as HTMLButtonElement;
    if (okBtn) {
      okBtn.disabled = this.isDriveSelectionMode;
    }
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    const loadingElement = this.container.querySelector(
      "#loading"
    ) as HTMLElement;
    const folderList = this.container.querySelector(
      "#folder-list"
    ) as HTMLElement;

    if (loading) {
      loadingElement.classList.remove("hidden");
      folderList.classList.add("hidden");
    } else {
      loadingElement.classList.add("hidden");
      folderList.classList.remove("hidden");
    }
  }


  private handleOk(): void {
    if (this.options.onFolderSelect) {
      const selectedFolder: FolderRequest = {
        location: this.currentDrive ? "LOCAL" : "REMOTE",
        identifier: this.currentDrive || "",
        uri: this.currentPath.length > 0 ? this.currentPath : [],
      };
      
      this.options.onFolderSelect(selectedFolder);
    }
  }

  private handleCancel(): void {
    if (this.options.onCancel) {
      this.options.onCancel();
    }
  }


  // Public methods
  public getCurrentPath(): FolderRequest {
    // It should return the object representing the current folder path
    return {
      location: this.currentDrive ? "LOCAL" : "REMOTE",
      identifier: this.currentDrive || "",
      uri: this.currentPath.length > 0 ? this.currentPath : [],
    };
  }

  public getSelectedFolder(): FolderRequest {
    return this.getCurrentPath();
  }

  public destroy(): void {
    this.container.innerHTML = "";
  }

  private attachFolderEventListeners(folderList: HTMLElement): void {
    // Remove existing event listeners to prevent duplicates
    folderList.querySelectorAll(".folder-item").forEach((item) => {
      const newItem = item.cloneNode(true) as HTMLElement;
      item.parentNode?.replaceChild(newItem, item);
    });

    // Attach new event listeners
    folderList.querySelectorAll(".folder-item").forEach((item) => {
      const folderName = item.getAttribute("data-folder") as string;

      item.addEventListener("click", () => {
        console.log(`Navigating to folder: ${folderName}`);
        this.navigateToFolder(folderName);
      });
    });
  }

  private generateFolderHTML(folder: FolderResponse): string {
    return `
      <div class="folder-item text-xsm flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 border-l-4 border-transparent hover:border-blue-200" data-folder="${folder.name}">
        <div class="flex items-center space-x-4 flex-1">
          <div class="flex items-center space-x-3 flex-1">
            <div class="p-2 bg-blue-50 rounded-lg">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-gray-800 text-xs">${folder.name}</p>
              <p class="text-xs text-gray-500">Folder</p>
            </div>
          </div>
        </div>
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </div>
      </div>
    `;
  }
}

export default SelectFolder;
