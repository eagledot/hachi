// FuzzySearchUI
import { FuzzySearchService, ATTRIBUTE_PATTERNS } from "./fuzzySearchService";
import type { SearchFilter, SearchSuggestion } from "./fuzzySearchService";
import { html } from "../utils";

export interface FuzzySearchCallbacks {
  onSearchExecuted: (query: string, filters: SearchFilter) => void;
  onFilterAdded: (attribute: string, value: string) => void;
  onFilterRemoved: (attribute: string, value: string) => void;
  
  // IMPORTANT: Implement at least one of these to handle clean slate (empty state)
  // Without these, images won't be cleared when all filters are removed!
  onCleanSlate?: () => void; // Preferred: called when returning to empty state
  onClearImages?: () => void; // Alternative: explicitly clear images
  
  // Example implementation:
  // onCleanSlate: () => setImages([])
}

export class FuzzySearchUI {
  private container: HTMLElement;
  private fuzzySearchService: FuzzySearchService;
  private callbacks: FuzzySearchCallbacks;
  // UI Elements
  private searchContainer!: HTMLElement;
  private filtersContainer!: HTMLElement;
  private inputContainer!: HTMLElement;
  private searchInput!: HTMLInputElement;  private searchButton!: HTMLButtonElement;
  private dropdown!: HTMLElement;// State
  private selectedFilters: SearchFilter = { query: [] };
  private suggestions: SearchSuggestion[] = [];
  private showDropdown = false;
  private selectedIndex = -1;
  constructor(container: HTMLElement, callbacks: FuzzySearchCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.fuzzySearchService = new FuzzySearchService();

    // Warn if no clean slate callbacks are provided
    if (!this.hasCleanSlateCallback()) {
      console.warn('FuzzySearchUI: No clean slate callbacks provided. Images may not be cleared when all filters are removed.');
      console.warn('Please implement onCleanSlate or onClearImages in your callbacks.');
    }

    this.initializeFilters();
    this.createUI();
    this.setupEventListeners();

    // Auto-focus the search input when the component is initialized
    setTimeout(() => {
      this.searchInput.focus();
    }, 0);
  }

  private initializeFilters(): void {
    // Initialize filters for all available attributes
    const availableAttributes =
      this.fuzzySearchService.getAvailableAttributes();
    availableAttributes.forEach((attr) => {
      this.selectedFilters[attr] = [];
    });
  }  private createUI(): void {
    this.container.innerHTML = html`
      <div class="w-full max-w-4xl mx-auto p-2 fuzzy-search-container">
        <div class="w-full relative">
          <!-- Active Filters Display -->
          <div
            id="filters-container"
            class="flex w-full items-center mb-2 flex-wrap gap-1.5 min-h-[1.5rem]"
          >
            <!-- Filters will be rendered here -->
          </div>

          <!-- Compact Search Container -->
          <div class="flex flex-col space-y-2">
            <!-- Main Search Row -->
            <div class="flex space-x-2">
              <div id="input-container" class="relative flex-grow">
                <!-- Compact Input Container -->
                <div
                  class="relative border border-gray-300 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200 transition-all duration-200 bg-white flex items-center h-9 shadow-sm hover:shadow-md group"
                >                  <!-- Simplified Input Field -->                  <input
                    id="fuzzy-search-input"
                    type="text"
                    autocomplete="off"
                    placeholder="Search by people, folders, or keywords..."
                    class="flex-1 h-full px-3 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400"
                  />
                  <!-- Compact Clear Button -->
                  <button
                    id="clear-input-btn"
                    class="items-center justify-center w-7 h-7 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full mr-1 transition-all duration-200 hidden"
                  >
                    <svg
                      class="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      ></path>
                    </svg>
                  </button>
                </div>

                <!-- Compact Smart Dropdown -->
                <div
                  id="fuzzy-dropdown"
                  class="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 z-50 max-h-64 overflow-y-auto hidden"
                  style="box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);"
                >
                  <div id="dropdown-content">
                    <!-- Dropdown content will be rendered here -->
                  </div>
                </div>
              </div>
              <!-- Compact Search Button -->
              <button
                id="fuzzy-search-btn"
                class="h-9 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-400 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-1.5 text-sm"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  ></path>
                </svg>
                <span id="search-btn-text">Search</span>              </button>
            </div>
          </div>

        </div>
      </div>
    `;// Get references to elements
    this.searchContainer = this.container.querySelector(
      ".fuzzy-search-container"
    ) as HTMLElement;
    this.filtersContainer = this.container.querySelector(
      "#filters-container"
    ) as HTMLElement;
    this.inputContainer = this.container.querySelector(
      "#input-container"
    ) as HTMLElement;
    this.searchInput = this.container.querySelector(
      "#fuzzy-search-input"
    ) as HTMLInputElement;
    this.searchButton = this.container.querySelector(
      "#fuzzy-search-btn"
    ) as HTMLButtonElement;    this.dropdown = this.container.querySelector(
      "#fuzzy-dropdown"
    ) as HTMLElement;
  }

  private setupEventListeners(): void {
    // Search input events
    this.searchInput.addEventListener(
      "input",
      this.handleInputChange.bind(this)
    );
    this.searchInput.addEventListener("keydown", this.handleKeyDown.bind(this));
    this.searchInput.addEventListener(
      "focus",
      this.handleInputFocus.bind(this)
    );
    this.searchInput.addEventListener("blur", this.handleInputBlur.bind(this));

    // Search button
    this.searchButton.addEventListener(
      "click",
      this.handleSearchClick.bind(this)
    );    // Clear input button
    const clearBtn = this.container.querySelector(
      "#clear-input-btn"
    ) as HTMLButtonElement;
    clearBtn.addEventListener("click", this.clearInput.bind(this));

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.inputContainer.contains(e.target as Node)) {
        this.hideDropdown();
      }
    });  }
  
  private async handleInputChange(e: Event): Promise<void> {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    console.log("Input changed to:", value);

    this.selectedIndex = -1; // Reset keyboard navigation
    this.updateClearButton();

    if (value.trim()) {
      // Generate suggestions for all attributes simultaneously
      this.suggestions = await this.fuzzySearchService.generateAllAttributeSuggestions(value);
      if (this.suggestions.length > 0) {
        this.showDropdown = true;
        this.renderDropdown();
      } else {
        this.hideDropdown();
      }
    } else {
      // Clear suggestions if input is empty
      this.suggestions = [];
      this.hideDropdown();
    }
  }
  private handleKeyDown(e: KeyboardEvent): void {
    if (this.showDropdown && this.suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.selectedIndex =
          this.selectedIndex < this.suggestions.length - 1
            ? this.selectedIndex + 1
            : 0;
        this.updateDropdownSelection();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.selectedIndex =
          this.selectedIndex > 0
            ? this.selectedIndex - 1
            : this.suggestions.length - 1;
        this.updateDropdownSelection();
      } else if (e.key === "Enter") {
        e.preventDefault();

        if (
          this.selectedIndex >= 0 &&
          this.selectedIndex < this.suggestions.length
        ) {
          // Select the highlighted suggestion
          const suggestion = this.suggestions[this.selectedIndex];
          this.handleSuggestionClick(suggestion);
        } else {
          // No item selected, use default enter behavior
          if (e.shiftKey) {
            // Shift + Enter: Execute search immediately
            this.handleSearchClick();
          } else {
            // Enter: Add current input as a search query
            this.handleAddFilter();
          }
        }
      } else if (e.key === "Escape") {
        this.selectedIndex = -1;
        this.hideDropdown();
        this.suggestions = [];
      }
    } else {
      // Handle keys when dropdown is not shown
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift + Enter: Execute search immediately
          this.handleSearchClick();
        } else {
          // Enter: Add current input as a search query
          this.handleAddFilter();
        }
      }
    }  }
  
  private handleInputFocus(): void {
    this.selectedIndex = -1; // Reset keyboard navigation

    if (this.searchInput.value.trim()) {
      // Generate suggestions for all attributes
      this.fuzzySearchService.generateAllAttributeSuggestions(this.searchInput.value).then(suggestions => {
        this.suggestions = suggestions;
        if (this.suggestions.length > 0) {
          this.showDropdown = true;
          this.renderDropdown();
        } else {
          this.hideDropdown();
        }
      });
    }
  }
  
  private handleInputBlur(): void {
    setTimeout(() => {
      this.suggestions = [];
      this.selectedIndex = -1;
      this.hideDropdown();
    }, 200); // Timeout to allow suggestion clicks
  }
  
  private async handleAddFilter(): Promise<void> {
    if (this.searchInput.value.trim()) {
      const trimmedValue = this.searchInput.value.trim();

      // Add as a query filter by default
      if (!this.selectedFilters["query"]?.includes(trimmedValue)) {
        this.addFilter("query", trimmedValue);
      }

      // Clear input and hide dropdown
      this.searchInput.value = "";
      this.suggestions = [];
      this.hideDropdown();
      this.updateClearButton();

      // Execute search immediately for consistency with other actions
      this.executeSearch();
    }
  }
  private async handleSuggestionClick(
    suggestion: SearchSuggestion
  ): Promise<void> {
    console.log("Suggestion clicked:", suggestion);
    // Add the suggestion as a filter
    this.addFilter(suggestion.attribute, suggestion.text);
    // Clear input but keep attribute selected
    this.searchInput.value = "";
    this.suggestions = [];
    this.hideDropdown();
    this.updateClearButton();

    // Execute search immediately
    this.executeSearch();
  }
  private async handleSearchClick(): Promise<void> {
    // Add current input to filters if not empty
    if (this.searchInput.value.trim()) {
      await this.handleAddFilter();
    }

    // Execute search with existing filters
    this.executeSearch();
  }

  private addFilter(attribute: string, value: string): void {
    if (!this.selectedFilters[attribute]) {
      this.selectedFilters[attribute] = [];
    }

    if (!this.selectedFilters[attribute].includes(value)) {
      // If attribute is query, replace it
      if (attribute === "query") {
        this.selectedFilters[attribute] = [value];
      } else {
        this.selectedFilters[attribute].push(value);
      }
      this.renderFilters();
      this.callbacks.onFilterAdded(attribute, value);
    }
  }  private removeFilter(attribute: string, value: string): void {
    if (this.selectedFilters[attribute]) {
      this.selectedFilters[attribute] = this.selectedFilters[attribute].filter(
        (v) => v !== value
      );
      this.renderFilters();
      this.callbacks.onFilterRemoved(attribute, value);
      
      // Check if we have any filters left
      const hasAnyFilters = Object.keys(this.selectedFilters).some(
        key => this.selectedFilters[key] && this.selectedFilters[key].length > 0
      );
      
      // Also check if there's any search input
      const hasSearchInput = this.searchInput.value.trim().length > 0;
      
      console.log(`Filter removed: ${attribute}=${value}`);
      console.log(`hasAnyFilters: ${hasAnyFilters}, hasSearchInput: ${hasSearchInput}`);
      console.log('Current filters:', this.selectedFilters);
      
      if (hasAnyFilters || hasSearchInput) {
        // Trigger a fresh search with remaining filters/input
        console.log("Triggering fresh search with remaining filters/input");
        this.executeSearch();
      } else {
        // Return to clean slate - trigger search with empty filters to reset the view
        console.log("No filters or input remaining, returning to clean slate");
        this.executeSearchForCleanSlate();
      }
    }
  }
  private clearInput(): void {
    this.searchInput.value = "";
    this.suggestions = [];
    this.hideDropdown();
    this.updateClearButton();
    this.searchInput.focus();
  }

  private executeSearch(): void {
    const queryString = this.fuzzySearchService.buildQueryString(
      this.selectedFilters
    );
    console.log("Executing search with query:", queryString);
    this.callbacks.onSearchExecuted(queryString, this.selectedFilters);
  }  private executeSearchForCleanSlate(): void {
    // For clean slate, set images to empty without making any search request
    console.log("Clean slate detected - clearing images without search");
    
    if (this.callbacks.onCleanSlate) {
      // Use dedicated clean slate callback if provided
      console.log("Using onCleanSlate callback");
      this.callbacks.onCleanSlate();
    } else if (this.callbacks.onClearImages) {
      // Alternative callback for clearing images
      console.log("Using onClearImages callback");
      this.callbacks.onClearImages();
    } else {
      // No search should be made - just log a warning
      console.warn("No clean slate callback provided. Images may not be cleared. Please implement onCleanSlate or onClearImages callback.");
      console.warn("To fix this, add onCleanSlate: () => setImages([]) to your callbacks");
    }
  }
  
  private renderFilters(): void {
    const filtersHtml = Object.keys(this.selectedFilters)
      .filter((attribute) => this.selectedFilters[attribute].length > 0)
      .map((attribute) =>
        this.selectedFilters[attribute]
          .map((value) => {
            const icon = this.fuzzySearchService.getAttributeIcon(attribute);
            const color = this.fuzzySearchService.getAttributeColor(attribute);
            return `
            <div class="flex items-center px-2 py-1 rounded-md border ${color} hover:shadow-md transition-all duration-200 cursor-pointer group filter-tag" data-attribute="${attribute}" data-value="${value}">
              <span class="mr-1 text-sm">${icon}</span>
              <span class="text-xs font-medium">${value}</span>
              <button class="ml-1.5 text-current opacity-60 hover:opacity-100 hover:bg-white hover:bg-opacity-30 rounded-full p-0.5 transition-all duration-200 remove-filter-btn" data-attribute="${attribute}" data-value="${value}">
                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          `;
          })
          .join("")
      )
      .flat()
      .join("");

    this.filtersContainer.innerHTML = filtersHtml;

    // Add event listeners for filter removal
    const removeButtons = this.filtersContainer.querySelectorAll(
      ".remove-filter-btn"
    ) as NodeListOf<HTMLButtonElement>;
    removeButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const attribute = btn.getAttribute("data-attribute")!;
        const value = btn.getAttribute("data-value")!;
        this.removeFilter(attribute, value);
      });
    });
  }  private renderDropdown(): void {
    if (!this.showDropdown) {
      this.hideDropdown();
      return;
    }

    const dropdownContent = this.dropdown.querySelector(
      "#dropdown-content"
    ) as HTMLElement;    // Group suggestions by attribute for better organization
    if (this.suggestions.length > 0) {
      // Group suggestions by attribute
      const suggestionsByAttribute = this.suggestions.reduce((acc, suggestion) => {
        if (!acc[suggestion.attribute]) {
          acc[suggestion.attribute] = [];
        }
        acc[suggestion.attribute].push(suggestion);
        return acc;
      }, {} as Record<string, typeof this.suggestions>);

      let suggestionsHtml = '';
      let currentIndex = 0;

      // Render suggestions grouped by attribute
      Object.keys(suggestionsByAttribute).forEach((attribute) => {
        const attributeSuggestions = suggestionsByAttribute[attribute];
        const icon = this.fuzzySearchService.getAttributeIcon(attribute);
        const displayName = this.fuzzySearchService.getAttributeDisplayName(attribute);
        
        // Add attribute header if we have multiple attributes
        if (Object.keys(suggestionsByAttribute).length > 1) {
          suggestionsHtml += `
            <div class="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100 flex items-center">
              <span class="mr-2">${icon}</span>
              ${displayName}
            </div>
          `;
        }

        // Add suggestions for this attribute
        attributeSuggestions.forEach((suggestion) => {
          const color = this.fuzzySearchService.getAttributeColor(suggestion.attribute);
          suggestionsHtml += `
            <div class="suggestion-option flex items-center px-3 py-2.5 cursor-pointer border-b border-gray-100 last:border-b-0 group hover:bg-blue-50 transition-all duration-200 ${
              this.selectedIndex === currentIndex
                ? "bg-blue-50 border-l-2 border-l-blue-500"
                : ""
            }" data-index="${currentIndex}">
              <div class="flex items-center justify-center w-7 h-7 rounded-lg mr-3 ${color} shadow-sm group-hover:shadow-md transition-shadow duration-200">
                <span class="text-sm">${icon}</span>
              </div>
              <div class="flex-grow">
                <div class="font-medium text-gray-900 group-hover:text-blue-700 transition-colors duration-200 text-sm">${
                  suggestion.text
                }</div>
                <div class="text-xs text-gray-500 flex items-center mt-0.5">
                  <span class="capitalize">
                    Add to ${suggestion.attribute.replace("_", " ")} search
                  </span>
                </div>
              </div>
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-200">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </div>
            </div>
          `;
          currentIndex++;
        });
      });

      dropdownContent.innerHTML = suggestionsHtml;

      // Add click listeners for suggestions
      const suggestionOptions = dropdownContent.querySelectorAll(
        ".suggestion-option"
      ) as NodeListOf<HTMLElement>;
      suggestionOptions.forEach((option, index) => {
        option.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Suggestion div clicked:", this.suggestions[index]);
          this.handleSuggestionClick(this.suggestions[index]);
        });

        option.addEventListener("mousedown", (e) => {
          e.preventDefault(); // Prevent input blur
        });

        option.addEventListener("mouseenter", () => {
          this.selectedIndex = index;
          this.updateDropdownSelection();
        });      });
    } else {
      // Hide dropdown when no suggestions are available
      this.hideDropdown();
      return;
    }

    this.dropdown.classList.remove("hidden");
  }private updateDropdownSelection(): void {
    const options = this.dropdown.querySelectorAll(
      ".suggestion-option"
    ) as NodeListOf<HTMLElement>;
    options.forEach((option, index) => {
      if (index === this.selectedIndex) {
        option.classList.add(
          "bg-blue-50",
          "border-l-2",
          "border-l-blue-500"
        );
      } else {
        option.classList.remove(
          "bg-blue-50",
          "border-l-2",
          "border-l-blue-500"
        );
      }
    });
  }

  private hideDropdown(): void {
    this.showDropdown = false;
    this.dropdown.classList.add("hidden");
  }  private updateAttributeIndicator(): void {
    // This method is no longer needed since we removed attribute selection
    // Keeping it empty for backwards compatibility
  }  private updateClearButton(): void {
    const clearBtn = this.container.querySelector(
      "#clear-input-btn"
    ) as HTMLElement;
    if (this.searchInput.value) {
      clearBtn.classList.remove("hidden");
      clearBtn.classList.add("flex");
    } else {
      clearBtn.classList.add("hidden");
      clearBtn.classList.remove("flex");
    }
  }  public cleanup(): void {
    this.fuzzySearchService.cleanup();
  }

  public getSearchQuery(): string {
    return this.searchInput.value.trim();
  }

  public getCurrentFilters(): SearchFilter {
    return { ...this.selectedFilters };
  }  public clearAllFilters(): void {
    this.selectedFilters = {};
    this.fuzzySearchService.getAvailableAttributes().forEach((attr) => {
      this.selectedFilters[attr] = [];
    });
    this.renderFilters();
    
    // Return to clean slate
    this.executeSearchForCleanSlate();
  }

  /**
   * Check if clean slate callbacks are properly configured
   */
  public hasCleanSlateCallback(): boolean {
    return !!(this.callbacks.onCleanSlate || this.callbacks.onClearImages);
  }
  /**
   * Get debug information about current state
   */
  public getDebugInfo(): object {
    return {
      isCleanSlate: this.isCleanSlate(),
      hasCleanSlateCallback: this.hasCleanSlateCallback(),
      hasFilters: Object.keys(this.selectedFilters).some(
        key => this.selectedFilters[key] && this.selectedFilters[key].length > 0
      ),
      hasSearchInput: this.searchInput?.value?.trim().length > 0,
      searchInputValue: this.searchInput?.value || '',
      filters: { ...this.selectedFilters },
      suggestionsCount: this.suggestions.length,
      dropdownVisible: this.showDropdown,
      callbacksAvailable: {
        onCleanSlate: !!this.callbacks.onCleanSlate,
        onClearImages: !!this.callbacks.onClearImages,
        onSearchExecuted: !!this.callbacks.onSearchExecuted
      }
    };
  }

  /**
   * Force clear everything and return to clean slate
   */
  public forceCleanSlate(): void {
    console.log("Force clearing to clean slate");
    
    // Clear input
    this.searchInput.value = "";
    this.updateClearButton();
    
    // Clear suggestions and dropdown
    this.suggestions = [];
    this.hideDropdown();
    
    // Clear all filters
    this.selectedFilters = {};
    this.fuzzySearchService.getAvailableAttributes().forEach((attr) => {
      this.selectedFilters[attr] = [];
    });
    this.renderFilters();
    
    // Execute clean slate
    this.executeSearchForCleanSlate();
  }

  /**
   * Initialize the component in clean slate mode (empty state)
   * Call this after construction if you want to ensure clean slate state
   */
  public initializeCleanSlate(): void {
    // Clear any existing state
    this.clearAllFilters();
    this.clearInput();
    
    // Trigger clean slate if we're truly empty
    if (this.isCleanSlate() && !this.searchInput.value.trim()) {
      this.executeSearchForCleanSlate();
    }
  }

  /**
   * Public method to trigger clean slate manually
   */
  public triggerCleanSlate(): void {
    this.executeSearchForCleanSlate();
  }
  /**
   * Check if the search is in clean slate state (no filters applied and no search input)
   */
  public isCleanSlate(): boolean {
    const hasFilters = Object.keys(this.selectedFilters).some(
      key => this.selectedFilters[key] && this.selectedFilters[key].length > 0
    );
    const hasSearchInput = this.searchInput?.value?.trim().length > 0;
    
    return !hasFilters && !hasSearchInput;
  }

  /**
   * Public method to add a filter programmatically
   */
  public addFilterExternal(attribute: string, value: string): void {
    this.addFilter(attribute, value);
  }

  /**
   * Public method to execute search programmatically
   */
  public executeSearchExternal(): void {
    this.executeSearch();
  }
}
