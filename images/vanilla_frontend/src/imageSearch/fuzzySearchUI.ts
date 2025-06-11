// FuzzySearchUI
import { FuzzySearchService, ATTRIBUTE_PATTERNS } from "./fuzzySearchService";
import type { SearchFilter, SearchSuggestion } from "./fuzzySearchService";
import { html } from "../utils";

export interface FuzzySearchCallbacks {
  onSearchExecuted: (query: string, filters: SearchFilter) => void;
  onFilterAdded: (attribute: string, value: string) => void;
  onFilterRemoved: (attribute: string, value: string) => void;
}

export class FuzzySearchUI {
  private container: HTMLElement;
  private fuzzySearchService: FuzzySearchService;
  private callbacks: FuzzySearchCallbacks;
  // UI Elements
  private searchContainer!: HTMLElement;
  private filtersContainer!: HTMLElement;
  private inputContainer!: HTMLElement;
  private searchInput!: HTMLInputElement;
  private searchButton!: HTMLButtonElement;
  private dropdown!: HTMLElement;
  private tabsContainer!: HTMLElement; // State
  private selectedFilters: SearchFilter = { query: [] };
  private selectedAttribute: string | null = "query"; // Default to 'query'
  private suggestions: SearchSuggestion[] = [];
  private showDropdown = false;
  private selectedIndex = -1;

  constructor(container: HTMLElement, callbacks: FuzzySearchCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.fuzzySearchService = new FuzzySearchService();

    this.initializeFilters();
    this.createUI();
    this.setupEventListeners();

    // Initialize UI state with default selected attribute
    this.updateTabSelection();
    this.updateAttributeIndicator();

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
                >
                  <!-- Compact Attribute Button -->
                  <button
                    id="attribute-selector-btn"
                    class="flex items-center px-2 py-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-l-lg transition-all duration-200 border-r border-gray-300 group-focus-within:border-blue-300"
                  >
                    <span id="attribute-btn-icon" class="mr-1 text-sm">🔍</span>
                    <span id="attribute-btn-label" class="font-medium text-xs"
                      >Query</span
                    >
                    <svg
                      class="w-3 h-3 ml-1 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </button>

                  <!-- Compact Input Field -->
                  <input
                    id="fuzzy-search-input"
                    type="text"
                    autocomplete="off"
                    placeholder="Search photos..."
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
                <span id="search-btn-text">Search</span>
              </button>
            </div>

            <!-- Compact Attribute Tabs -->
            <div
              id="tabs-container"
              class="flex items-center space-x-1 overflow-x-auto scrollbar-hide p-0.5 bg-gray-100 rounded-lg"
            >
              ${[
                "query",
                ...Object.keys(ATTRIBUTE_PATTERNS).filter(
                  (attr) => attr !== "query"
                ),
              ]
                .map((attribute) => {
                  const pattern = ATTRIBUTE_PATTERNS[attribute];
                  return html`<button
                    class="attribute-tab flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap ${attribute ===
                    "query"
                      ? "bg-white text-blue-700 border border-blue-200 shadow-sm"
                      : "text-gray-600 hover:text-blue-600 hover:bg-white hover:shadow-sm"}"
                    data-attribute="${attribute}"
                  >
                    <span class="mr-1 text-sm">${pattern.icon}</span>
                    <span class="font-medium"
                      >${pattern.displayName ||
                      attribute.charAt(0).toUpperCase() +
                        attribute.slice(1).replace("_", " ")}</span
                    >
                  </button> `;
                })
                .join("")}
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
    ) as HTMLButtonElement;
    this.dropdown = this.container.querySelector(
      "#fuzzy-dropdown"
    ) as HTMLElement;
    
    this.tabsContainer = this.container.querySelector(
      "#tabs-container"
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
    ); // Clear input button
    const clearBtn = this.container.querySelector(
      "#clear-input-btn"
    ) as HTMLButtonElement;
    clearBtn.addEventListener("click", this.clearInput.bind(this));

    // Attribute button (inside input container)
    const attributeBtn = this.container.querySelector(
      "#attribute-selector-btn"
    ) as HTMLButtonElement;
    if (attributeBtn) {
      attributeBtn.addEventListener("click", () => {
        // Show/hide help panel or cycle through attributes
      });
    } // Attribute tab buttons
    const attributeTabBtns = this.container.querySelectorAll(
      ".attribute-tab"
    ) as NodeListOf<HTMLButtonElement>;
    attributeTabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const attribute = btn.getAttribute("data-attribute");
        if (attribute) {
          this.handleAttributeChange(attribute);
        }
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.inputContainer.contains(e.target as Node)) {
        this.hideDropdown();
      }
    });
  }
  private async handleInputChange(e: Event): Promise<void> {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    console.log("Input changed to:", value);

    this.selectedIndex = -1; // Reset keyboard navigation
    this.updateClearButton();

    if (this.selectedAttribute === "query") {
      this.suggestions = [];
      this.hideDropdown();
      return;
    }

    if (value.trim()) {
      // Generate suggestions for the currently selected attribute (not 'query')
      await this.generateSuggestions(this.selectedAttribute!, value);
      this.showDropdown = true;
      this.renderDropdown();
    } else {
      // Clear suggestions if input is empty
      this.suggestions = [];
      this.hideDropdown();
    }
  }

  private async generateSuggestions(
    attribute: string,
    value: string
  ): Promise<void> {
    this.suggestions = await this.fuzzySearchService.generateSuggestions(
      attribute,
      value
    );
    console.log("Generated suggestions:", this.suggestions);
  }
  private handleKeyDown(e: KeyboardEvent): void {
    const availableAttributes = [
      "query",
      ...Object.keys(ATTRIBUTE_PATTERNS).filter((attr) => attr !== "query"),
    ];
    const currentAttributeIndex = availableAttributes.indexOf(
      this.selectedAttribute!
    );

    // Handle left/right arrows for attribute navigation when input is empty and no dropdown is shown
    if (
      (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
      !this.showDropdown &&
      this.searchInput.value.trim() === ""
    ) {
      e.preventDefault();
      console.log("Arrow key pressed for attribute navigation:", e.key);

      if (e.key === "ArrowLeft") {
        const prevIndex =
          (currentAttributeIndex - 1 + availableAttributes.length) %
          availableAttributes.length;
        console.log(
          "Changing to previous attribute:",
          availableAttributes[prevIndex]
        );
        this.handleAttributeChange(availableAttributes[prevIndex]);
      } else if (e.key === "ArrowRight") {
        const nextIndex =
          (currentAttributeIndex + 1) % availableAttributes.length;
        console.log(
          "Changing to next attribute:",
          availableAttributes[nextIndex]
        );
        this.handleAttributeChange(availableAttributes[nextIndex]);
      }

      return;
    }

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
            // Enter: Add current input as filter
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
          // Enter: Add current input as filter
          this.handleAddFilter();
        }
      }
    }
  }
  private handleInputFocus(): void {
    this.selectedIndex = -1; // Reset keyboard navigation

    if (this.selectedAttribute === "query") {
      this.hideDropdown();
      return;
    }

    if (this.searchInput.value.trim()) {
      // Generate suggestions for the currently selected attribute (not 'query')
      // Note: generateSuggestions is async, but not awaited here, matching existing pattern.
      this.generateSuggestions(this.selectedAttribute!, this.searchInput.value);
      this.showDropdown = true;
      this.renderDropdown();
    }
  }
  private handleInputBlur(): void {
    setTimeout(() => {
      this.suggestions = [];
      this.selectedIndex = -1;
      this.hideDropdown();
    }, 200); // Timeout to allow suggestion clicks
  }
  private async handleAttributeChange(attribute: string): Promise<void> {
    this.selectedAttribute = attribute;
    this.selectedIndex = -1; // Reset keyboard navigation

    // Update tab visual state
    this.updateTabSelection();

    // Clear suggestions when attribute changes
    this.suggestions = [];

    if (attribute === "query") {
      this.hideDropdown();
    } else {
      // If there's already input value, generate suggestions (for non-'query' attributes)
      if (this.searchInput.value.trim()) {
        await this.generateSuggestions(
          attribute,
          this.searchInput.value.trim()
        );
        this.showDropdown = true;
        this.renderDropdown();
      } else {
        this.hideDropdown();
      }
    }

    this.updateAttributeIndicator();
    this.searchInput.focus();
  }
  private async handleAddFilter(): Promise<void> {
    if (this.searchInput.value.trim() && this.selectedAttribute) {
      const trimmedValue = this.searchInput.value.trim();

      // Check if the value isn't already in the filters
      if (
        !this.selectedFilters[this.selectedAttribute]?.includes(trimmedValue)
      ) {
        this.addFilter(this.selectedAttribute, trimmedValue);
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
    if (this.searchInput.value.trim() && this.selectedAttribute) {
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
  }

  private removeFilter(attribute: string, value: string): void {
    if (this.selectedFilters[attribute]) {
      this.selectedFilters[attribute] = this.selectedFilters[attribute].filter(
        (v) => v !== value
      );
      this.renderFilters();
      this.callbacks.onFilterRemoved(attribute, value);
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
  }
  private renderDropdown(): void {
    if (!this.showDropdown) {
      this.hideDropdown();
      return;
    }

    const dropdownContent = this.dropdown.querySelector(
      "#dropdown-content"
    ) as HTMLElement;    // Only show suggestions now (no attribute selection)
    if (this.suggestions.length > 0) {
      const suggestionsHtml = this.suggestions
        .map((suggestion, index) => {
          const icon = this.fuzzySearchService.getAttributeIcon(
            suggestion.attribute
          );
          const color = this.fuzzySearchService.getAttributeColor(
            suggestion.attribute
          );
          return `
          <div class="suggestion-option flex items-center px-3 py-2.5 cursor-pointer border-b border-gray-100 last:border-b-0 group hover:bg-blue-50 transition-all duration-200 ${
            this.selectedIndex === index
              ? "bg-blue-50 border-l-2 border-l-blue-500"
              : ""
          }" data-index="${index}">
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
        })
        .join("");

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
        });
      });    } else {
      dropdownContent.innerHTML =
        '<div class="p-3 text-gray-500 text-center text-sm">No suggestions available</div>';
    }

    this.dropdown.classList.remove("hidden");
  }  private updateDropdownSelection(): void {
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
  }
  private updateAttributeIndicator(): void {
    // Update the attribute button inside the input container
    const attributeBtnIcon = this.container.querySelector(
      "#attribute-btn-icon"
    ) as HTMLElement;
    const attributeBtnLabel = this.container.querySelector(
      "#attribute-btn-label"
    ) as HTMLElement;

    if (this.selectedAttribute && attributeBtnIcon && attributeBtnLabel) {
      const icon = this.fuzzySearchService.getAttributeIcon(
        this.selectedAttribute
      );
      attributeBtnIcon.textContent = icon;
      attributeBtnLabel.textContent =
        this.fuzzySearchService.getAttributeDisplayName(this.selectedAttribute);
    }
  }
  private updateClearButton(): void {
    const clearBtn = this.container.querySelector(
      "#clear-input-btn"
    ) as HTMLElement;
    if (this.searchInput.value || this.selectedAttribute) {
      clearBtn.classList.remove("hidden");
      clearBtn.classList.add("flex");
    } else {
      clearBtn.classList.add("hidden");
      clearBtn.classList.remove("flex");
    }
  }
  

    private updateTabSelection(): void {
    const tabs = this.container.querySelectorAll(
      ".attribute-tab"
    ) as NodeListOf<HTMLButtonElement>;
    tabs.forEach((tab) => {
      const attribute = tab.getAttribute("data-attribute");

      // Aggressively remove focus from all tabs to prevent outline trails
      tab.blur();

      if (attribute === this.selectedAttribute) {
        tab.className =
          "attribute-tab flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap bg-white text-blue-700 border border-blue-200 shadow-sm focus:outline-none focus:ring-0 focus:border-transparent";
        tab.setAttribute("tabindex", "-1");
        tab.setAttribute(
          "style",
          "outline: none !important; box-shadow: none !important;"
        );
      } else {
        tab.className =
          "attribute-tab flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap text-gray-600 hover:text-blue-600 hover:bg-white hover:shadow-sm focus:outline-none focus:ring-0 focus:border-transparent";
        tab.setAttribute("tabindex", "-1");
        tab.setAttribute(
          "style",
          "outline: none !important; box-shadow: none !important;"
        );
      }
    });
  }

  public cleanup(): void {
    this.fuzzySearchService.cleanup();
  }

  public getSearchQuery(): string {
    return this.searchInput.value.trim();
  }

  public getCurrentFilters(): SearchFilter {
    return { ...this.selectedFilters };
  }
  public clearAllFilters(): void {
    this.selectedFilters = {};
    this.fuzzySearchService.getAvailableAttributes().forEach((attr) => {
      this.selectedFilters[attr] = [];
    });
    this.renderFilters();
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
