import IndexingService from "../services/indexing";

// Extend Window interface for testing
declare global {
  interface Window {
    MockIndexingService?: {
      getSuggestionPath: (request: FolderRequest) => Promise<string[]>;
    };
  }
}

interface FolderRequest {
  location: string;
  identifier: string;
  uri: string[];
}

interface FolderResponse {
  name: string;
  type: "folder" | "file";
}

interface SelectFolderOptions {
  onFolderSelect?: (path: string) => void;
  onCancel?: () => void;
  showOkButton?: boolean;
  showCancelButton?: boolean;
  title?: string;
  drives?: string[]; // Available drives like ['C:', 'D:', 'E:']
}

class SelectFolder {
  private container: HTMLElement;
  private currentPath: string[] = [];
  private currentDrive: string | null = null;
  private selectedFolder: string | null = null;
  private searchQuery: string = "";
  private sortOrder: "asc" | "desc" = "asc";
  private options: SelectFolderOptions;
  private isLoading: boolean = false;
  private availableDrives: string[] = [];
  private isDriveSelectionMode: boolean = true;  constructor(containerId: string, options: SelectFolderOptions = {}) {
    this.container = document.getElementById(containerId) as HTMLElement;
    this.options = {
      showOkButton: true,
      showCancelButton: true,
      title: "Select Folder",
      drives: ["C:", "D:", "E:"], // Default drives
      ...options,
    };

    this.availableDrives = this.options.drives || [];
    this.render();
    this.loadDrives();
  }

  private async fetchFolders(
    request: FolderRequest
  ): Promise<FolderResponse[]> {
    // Reset search query when making new requests
    this.searchQuery = "";
    this.clearSearchInput();
    
    try {
      const suggestionPaths = await IndexingService.getSuggestionPath(request);
      return suggestionPaths.map((path: string) => ({
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
    const searchInput = this.container.querySelector("#search-input") as HTMLInputElement;
    if (searchInput) {
      searchInput.value = "";
    }  }

  private render(): void {
    this.container.innerHTML = `
      <div class="bg-white border border-gray-200 rounded-xl shadow-xl max-w-3xl mx-auto flex flex-col max-h-[80vh]">
        <!-- Header -->
        <div class="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
          <div class="flex items-center space-x-3">
            <div class="p-2 bg-blue-100 rounded-lg">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-800">${this.options.title}</h3>
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

        <!-- Path breadcrumb -->
        <div class="px-5 py-4 bg-gray-50 border-b border-gray-200">
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
        </div>        <!-- Folder list -->
        <div class="flex-1 overflow-y-auto min-h-0">
          <div id="loading" class="hidden p-12 text-center text-gray-500">
            <div class="inline-block animate-spin rounded-full h-10 w-10 border-3 border-blue-500 border-t-transparent"></div>
            <p class="mt-4 text-lg font-medium">Loading folders...</p>
          </div>
          <div id="folder-list" class="divide-y divide-gray-100"></div>
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

        <!-- Selected folder display -->
        <div id="selected-folder" class="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 hidden">
          <div class="flex items-center space-x-3">
            <div class="p-2 bg-green-100 rounded-lg">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-green-700">Selected folder:</p>
              <p id="selected-path" class="font-mono text-green-800 text-lg"></p>
            </div>
          </div>
        </div>        <!-- Footer buttons -->
        ${
          this.options.showOkButton || this.options.showCancelButton
            ? `
        <div class="flex justify-end space-x-3 p-5 bg-gray-50 rounded-b-xl border-t border-gray-200 flex-shrink-0">
          ${
            this.options.showCancelButton
              ? `
            <button id="cancel-btn" class="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium transition-all duration-200">
              Cancel
            </button>
          `
              : ""
          }
          ${
            this.options.showOkButton
              ? `
            <button id="ok-btn" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200" disabled>
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Select Folder
            </button>
          `
              : ""
          }
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
    } catch (error) {
      console.error("Error loading drives:", error);
    } finally {      this.setLoading(false);
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
    const filteredFolders = this.filterFolders(sortedFolders);    folderList.innerHTML = filteredFolders
      .map((folder) => this.generateFolderHTML(folder))
      .join("");// Add event listeners for folder items
    this.attachFolderEventListeners(folderList);
  }

  private renderFilteredFolders(): void {
    const sortedFolders = this.sortFolders(this.currentFolders);
    const filteredFolders = this.filterFolders(sortedFolders);
    
    const folderList = this.container.querySelector("#folder-list") as HTMLElement;
    const emptyState = this.container.querySelector("#empty-state") as HTMLElement;

    if (filteredFolders.length === 0) {
      folderList.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");    folderList.innerHTML = filteredFolders
      .map((folder) => this.generateFolderHTML(folder))
      .join("");// Re-attach event listeners for new filtered items
    folderList.querySelectorAll(".folder-item").forEach((item) => {
      const folderName = item.getAttribute("data-folder") as string;
      const checkbox = item.querySelector(".folder-checkbox") as HTMLInputElement;

      // Restore selection state if this folder was previously selected
      if (this.selectedFolder === folderName) {
        checkbox.checked = true;
      }
    });
    
    // Attach event listeners using centralized method
    this.attachFolderEventListeners(folderList);
  }
  private handleFolderSelection(checkbox: HTMLInputElement): void {
    if (checkbox.checked) {
      this.selectedFolder = checkbox.value;
      this.updateSelectedFolderDisplay();
      this.updateOkButton();
    } else {
      this.clearSelection();
    }
  }

  private clearSelection(): void {
    this.selectedFolder = null;
    
    // Uncheck all checkboxes
    const checkboxes = this.container.querySelectorAll(".folder-checkbox") as NodeListOf<HTMLInputElement>;    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    
    this.updateSelectedFolderDisplay();
    this.updateOkButton();
  }

  private filterFolders(folders: FolderResponse[]): FolderResponse[] {
    if (!this.searchQuery.trim()) return folders;

    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  private sortFolders(folders: FolderResponse[]): FolderResponse[] {
    return [...folders].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);      return this.sortOrder === "asc" ? comparison : -comparison;
    });
  }

  private filterAndRenderFolders(): void {
    // Just re-render current folders with filters/sorting - no API calls
    this.renderFilteredFolders();
  }

  private selectFolder(folderName: string): void {
    // Clear previous selections
    this.clearSelection();
    
    // Select the specific folder
    const checkbox = this.container.querySelector(`input[value="${folderName}"]`) as HTMLInputElement;    if (checkbox) {
      checkbox.checked = true;
      this.selectedFolder = folderName;
      this.updateSelectedFolderDisplay();
      this.updateOkButton();
    }
  }

  private async navigateToFolder(folderName: string): Promise<void> {
    if (this.isDriveSelectionMode) {
      // User is selecting a drive (e.g., "C:", "D:")
      this.currentDrive = folderName; // Set identifier as the selected drive
      this.currentPath = []; // Reset path when selecting a new drive
      this.clearSelection();
      await this.loadFolders(); // Load folders in the selected drive
      this.updateBackButton();
    } else {
      // User is navigating into a folder within the drive
      this.currentPath.push(folderName); // Add folder to uri array
      this.clearSelection();
      await this.loadFolders(); // Load subfolders      this.updateBackButton();
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
    }    this.clearSelection();
    this.updateBackButton();
  }

  private toggleSort(): void {
    this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
    
    // Update sort button icon to show current order
    const sortBtn = this.container.querySelector("#sort-btn") as HTMLButtonElement;
    const icon = sortBtn.querySelector("svg");
    if (icon) {
      icon.style.transform = this.sortOrder === "desc" ? "rotate(180deg)" : "rotate(0deg)";
    }
    
    // Re-render the current folder list with new sort order
    this.renderFilteredFolders();
  }
  private updateBreadcrumb(): void {
    const currentPathElement = this.container.querySelector(
      "#current-path"
    ) as HTMLElement;
    let pathText = "Computer";

    if (this.isDriveSelectionMode) {
      pathText = "Computer";
    } else if (this.currentDrive) {
      pathText = this.currentDrive;
      if (this.currentPath.length > 0) {
        pathText += "\\" + this.currentPath.join("\\");
      }
    }

    currentPathElement.textContent = pathText;
  }

  private updateBackButton(): void {
    const backBtn = this.container.querySelector(
      "#back-btn"
    ) as HTMLButtonElement;
    // Enable back button if we're not in drive selection mode OR if we have path depth
    backBtn.disabled =
      this.isDriveSelectionMode && this.currentPath.length === 0;
  }

  private updateSelectedFolderDisplay(): void {
    const selectedFolderDiv = this.container.querySelector(
      "#selected-folder"
    ) as HTMLElement;
    const selectedPathSpan = this.container.querySelector(
      "#selected-path"
    ) as HTMLElement;

    if (this.selectedFolder) {
      let fullPath = "";
      if (this.currentDrive) {
        fullPath = this.currentDrive;
        if (this.currentPath.length > 0) {
          fullPath += "\\" + this.currentPath.join("\\");
        }
        fullPath += "\\" + this.selectedFolder;
      } else {
        fullPath = this.selectedFolder;
      }

      selectedPathSpan.textContent = fullPath;
      selectedFolderDiv.classList.remove("hidden");
    } else {
      selectedFolderDiv.classList.add("hidden");
    }
  }

  private updateOkButton(): void {
    const okBtn = this.container.querySelector("#ok-btn") as HTMLButtonElement;
    if (okBtn) {
      okBtn.disabled = !this.selectedFolder;
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
    if (this.selectedFolder && this.options.onFolderSelect) {
      let fullPath = "";
      if (this.currentDrive) {
        fullPath = this.currentDrive;
        if (this.currentPath.length > 0) {
          fullPath += "\\" + this.currentPath.join("\\");
        }
        fullPath += "\\" + this.selectedFolder;
      } else {
        fullPath = this.selectedFolder;
      }

      this.options.onFolderSelect(fullPath);
    }
  }

  private handleCancel(): void {
    if (this.options.onCancel) {
      this.options.onCancel();
    }
  }

  // Public methods
  public getCurrentPath(): string {
    let fullPath = "";
    if (this.currentDrive) {
      fullPath = this.currentDrive;
      if (this.currentPath.length > 0) {
        fullPath += "\\" + this.currentPath.join("\\");
      }
      if (this.selectedFolder) {
        fullPath += "\\" + this.selectedFolder;
      }
    }
    return fullPath;
  }

  public getSelectedFolder(): string | null {
    return this.selectedFolder;
  }

  public destroy(): void {
    this.container.innerHTML = "";
  }

  private attachFolderEventListeners(folderList: HTMLElement): void {
    folderList.querySelectorAll(".folder-item").forEach((item) => {
      const folderName = item.getAttribute("data-folder") as string;
      const checkbox = item.querySelector(".folder-checkbox") as HTMLInputElement;

      console.log(`Attaching events for folder: ${folderName}, isDriveSelectionMode: ${this.isDriveSelectionMode}`);

      // Click on checkbox to select
      checkbox.addEventListener("change", () => {
        console.log(`Checkbox changed for: ${folderName}, checked: ${checkbox.checked}`);
        this.handleFolderSelection(checkbox);
      });

      // Prevent checkbox click from triggering item click
      checkbox.addEventListener("click", (e) => {
        console.log(`Checkbox clicked for: ${folderName}, stopping propagation`);
        e.stopPropagation();
      });      // Click on folder area to navigate
      item.addEventListener("click", (e) => {
        console.log(`Folder item clicked: ${folderName}, currentDrive: ${this.currentDrive}, currentPath: [${this.currentPath.join(',')}]`);
        
        // Check if we clicked on the checkbox container or checkbox itself
        if (e.target === checkbox || 
            (e.target as Element).closest('.folder-checkbox') ||
            (e.target as Element).matches('.flex-shrink-0') ||
            (e.target as Element).closest('div.flex-shrink-0.p-2.bg-yellow-50')) {
          console.log(`Click was on checkbox area, ignoring navigation`);
          return;
        }
        
        console.log(`Navigating to folder: ${folderName}`);
        this.navigateToFolder(folderName);
      });
    });
  }

  private generateFolderHTML(folder: FolderResponse): string {
    return `
      <div class="folder-item flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 border-l-4 border-transparent hover:border-blue-200" data-folder="${folder.name}">
        <div class="flex items-center space-x-4 flex-1">
          <div class="flex-shrink-0 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <input 
              type="radio" 
              name="folder-selection" 
              value="${folder.name}" 
              class="folder-checkbox w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
          </div>
          <div class="flex items-center space-x-3 flex-1">
            <div class="p-2 bg-blue-50 rounded-lg">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-gray-800 font-medium">${folder.name}</p>
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
