// FuzzySearchUI
import {
  FuzzySearchService,
  type SearchFilter,
  type SearchSuggestion,
} from "./fuzzySearchService";

import { html } from "../utils";

export interface FuzzySearchCallbacks {
  onSearchExecuted: (query: string) => void;
}

export class FuzzySearchUI {
  private container: HTMLElement;
  private fuzzySearchService: FuzzySearchService;
  private callbacks: FuzzySearchCallbacks;
  // UI Elements
  private filtersContainer!: HTMLElement;
  private inputContainer!: HTMLElement;
  private searchInput!: HTMLInputElement;
  private searchButton!: HTMLButtonElement;
  private dropdown!: HTMLElement;
  private searchTips!: HTMLElement; // State
  private selectedFilters: SearchFilter = { query: [] };
  private suggestions: SearchSuggestion[] = [];
  private showDropdown = false;
  private selectedIndex = -1;
  private hasSearched = false;
  private debounceTimeout: number | null = null;

  /**
   * Initializes a new instance of the fuzzy search UI component.
   *
   * @param container - The HTML element that will contain the fuzzy search UI.
   * @param callbacks - An object containing callback functions for fuzzy search events.
   *
   * Sets up the fuzzy search service, initializes filters, creates the UI, and attaches event listeners.
   * Automatically focuses the search input when the component is initialized.
   */
  constructor(container: HTMLElement, callbacks: FuzzySearchCallbacks) {
    console.log("Initializing FuzzySearchUI");
    this.container = container;
    this.callbacks = callbacks;
    this.fuzzySearchService = new FuzzySearchService();

    this.initializeFilters();
    this.createUI();
    this.setupEventListeners();

    // Auto-focus the search input when the component is initialized
    setTimeout(() => {
      this.searchInput.focus();
      console.log("Search input focused");
      // JUST TESTING IT: TODO: Remove it if not needed
      const { attribute, value } = this.extractSearchQueryParam();
      console.log("Extracted query params:", { attribute, value });
      if (attribute && value) {
        this.addFilter(attribute, value);
        this.executeSearch();
      }

      // Check if last search query exists in local storage TODO: delete it later
      // const lastSearchQuery = localStorage.getItem("lastSearchQuery");
      // if (lastSearchQuery) {
      //   this.callbacks.onSearchExecuted(lastSearchQuery);
      // }
    }, 0);
  }

  /**
   * Initializes the `selectedFilters` object by creating an empty array for each available attribute.
   * This prepares the filter state for all attributes that can be used in the fuzzy search.
   *
   * @private
   */
  private initializeFilters(): void {
    // Initialize filters for all available attributes
    const availableAttributes =
      this.fuzzySearchService.getAvailableAttributes();
    availableAttributes.forEach((attr) => {
      this.selectedFilters[attr] = [];
    });
  }


  private extractSearchQueryParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const person = urlParams.get("person") || "";
    const resourceDirectory = urlParams.get("resource_directory") || "";
    if (person) {
      return { attribute: "person", value: person };
    } else if (resourceDirectory) {
      return { attribute: "resource_directory", value: resourceDirectory };
    }
    return { attribute: null, value: null };
  }

  private createUI(): void {
    this.container.innerHTML = html`
      <div class="w-full mx-auto px-2 mt-4 fuzzy-search-container">
        <div class="w-full relative">
          <!-- Modern Search Container -->
          <div class="flex flex-col space-y-3">
            <!-- Main Search Row -->
            <div
              class="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mb-3"
            >
              <div id="input-container" class="relative flex-grow">
                <!-- Integrated Input and Button Container -->
                <div
                  class="relative border-2 border-gray-200 rounded-xl focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all duration-300 bg-white flex items-center h-12 sm:h-14 group overflow-hidden"
                  style="padding-right:0;"
                >
                  <!-- Search Icon -->
                  <div
                    class="flex items-center justify-center w-12 sm:w-14 h-12 sm:h-14 text-gray-500 group-focus-within:text-blue-600 transition-colors duration-300"
                  >
                    <svg
                      class="w-5 sm:w-6 h-5 sm:h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      stroke-width="2.5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      ></path>
                    </svg>
                  </div>

                  <!-- Modern Input Field -->
                  <input
                    id="fuzzy-search-input"
                    type="text"
                    autocomplete="off"
                    placeholder="Search by people, folders, or keywords..."
                    class="flex-1 h-full px-3 text-sm sm:text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-500 font-medium rounded-l-xl rounded-r-none transition-all duration-300"
                    style="border-top-right-radius:0;border-bottom-right-radius:0;"
                  />

                  <!-- Filter Toggle Button -->
                  <button
                    disabled
                    id="filter-sidebar-toggle-btn"
                    class="flex cursor-not-allowed items-center justify-center w-12 h-full sm:w-14 bg-gradient-to-b from-gray-50 via-gray-100 to-gray-200 hover:from-gray-100 hover:to-gray-300 active:from-gray-200 active:to-gray-400 border-l border-gray-200 hover:border-gray-300 transition-all duration-200 group focus:outline-none shadow-sm hover:shadow-md"
                    aria-label="Toggle advanced filters"
                    title="Show/hide advanced search filters"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24px"
                      viewBox="0 -960 960 960"
                      width="24px"
                    >
                      <path
                        d="M440-160q-17 0-28.5-11.5T400-200v-240L168-736q-15-20-4.5-42t36.5-22h560q26 0 36.5 22t-4.5 42L560-440v240q0 17-11.5 28.5T520-160h-80Zm40-308 198-252H282l198 252Zm0 0Z"
                      />
                    </svg>
                  </button>

                  <!-- Integrated Search Button -->
                  <button
                    id="fuzzy-search-btn"
                    class="h-12 sm:h-14 px-6 sm:px-8 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 active:from-blue-800 active:via-blue-900 active:to-blue-950 disabled:from-blue-300 disabled:via-blue-400 disabled:to-blue-400 text-white font-bold rounded-r-xl rounded-l-none transition-all duration-300 flex items-center justify-center space-x-2 text-sm sm:text-base min-w-[100px] sm:min-w-[120px] border-0 focus:outline-none focus:ring-4 focus:ring-blue-200 focus:z-10 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                    style="border-top-left-radius:0;border-bottom-left-radius:0;margin-left:-1px;"
                  >
                    <svg
                      class="w-5 sm:w-6 h-5 sm:h-6 drop-shadow-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      stroke-width="2.5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      ></path>
                    </svg>
                    <span id="search-btn-text" class="font-bold tracking-wide"
                      >Search</span
                    >
                  </button>
                </div>

                <!-- Modern Smart Dropdown -->
                <div
                  id="fuzzy-dropdown"
                  class="absolute top-full left-0 right-0 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl mt-3 z-50 max-h-64 sm:max-h-80 overflow-y-auto hidden backdrop-blur-sm"
                  style="box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 10px 20px -5px rgba(0, 0, 0, 0.1);"
                >
                  <div id="dropdown-content">
                    <!-- Dropdown content will be rendered here -->
                  </div>
                </div>
              </div>
            </div>

            <!-- Active Filters Display (moved below input) -->
            <div
              id="filters-container"
              class="flex w-full items-center flex-wrap gap-2 sm:gap-3 invisible transition-all duration-300"
            >
              <!-- Filters will be rendered here -->
            </div>

            <!-- Search Tips (shown only before first search) -->
            <div
              id="search-tips"
              class="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 text-sm hidden shadow-lg"
            >
              <h3
                class="font-bold text-blue-900 mb-3 flex items-center text-base"
              >
                <svg
                  class="w-5 h-5 mr-3 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  stroke-width="2.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                💡 Search Tips
              </h3>
              <div class="text-blue-800 space-y-4">
                <div
                  class="bg-white bg-opacity-60 rounded-xl p-4 border border-blue-100"
                >
                  <p class="font-bold text-blue-900 mb-3 flex items-center">
                    🔍 You can search for:
                  </p>
                  <ul class="space-y-2 ml-2">
                    <li class="flex items-center">
                      <span class="mr-2">👥</span><strong>People:</strong> John,
                      Sarah
                    </li>
                    <li class="flex items-center">
                      <span class="mr-2">🏷️</span
                      ><strong>Keywords:</strong> beach, sunset, birthday,
                      vacation
                    </li>
                    <li class="flex items-center">
                      <span class="mr-2">📁</span
                      ><strong>Folders:</strong> 2023, Summer Photos, Wedding
                    </li>
                  </ul>
                </div>

                <div
                  class="bg-white bg-opacity-60 rounded-xl p-4 border border-blue-100"
                >
                  <p class="font-bold text-blue-900 mb-3 flex items-center">
                    ⚡ Multiple filters work together:
                  </p>
                  <ul class="space-y-2 ml-2 text-sm">
                    <li class="flex items-start">
                      <span class="mr-2 mt-0.5">•</span>
                      <span
                        ><strong>Person + Folder</strong> = Photos of that
                        person in that folder</span
                      >
                    </li>
                    <li class="flex items-start">
                      <span class="mr-2 mt-0.5">•</span>
                      <span
                        ><strong>Keyword + Folder</strong> = Photos with that
                        keyword in that folder</span
                      >
                    </li>
                    <li class="flex items-start">
                      <span class="mr-2 mt-0.5">•</span>
                      <span
                        ><strong>Person + Keyword</strong> = Photos of that
                        person with that keyword</span
                      >
                    </li>
                  </ul>
                </div>

                <div class="text-center">
                  <p
                    class="text-blue-700 text-sm font-medium bg-blue-100 rounded-full px-4 py-2 inline-block"
                  >
                    💡 Type to see suggestions, click to add as filters, then
                    search to find photos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

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
    this.searchTips = this.container.querySelector(
      "#search-tips"
    ) as HTMLElement;
  }

  /**
   * Sets up all necessary event listeners for the fuzzy search UI component.
   *
   * This includes:
   * - Handling input events on the search input (input, keydown, focus, blur).
   * - Handling click events on the search and clear buttons.
   * - Closing the dropdown when clicking outside the input container.
   *
   * @private
   */
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
    );

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

    // Debounce the function call
    if (this.debounceTimeout) clearTimeout(this.debounceTimeout);

    this.debounceTimeout = setTimeout(async () => {
      if (value.trim().length > 0) {
        // Generate suggestions for all attributes simultaneously
        this.suggestions =
          await this.fuzzySearchService.generateAllAttributeSuggestions(value);
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
    }, 300); // Adjust as per need
  }

  private handleKeyDown(e: KeyboardEvent): void {
    console.log("Key down:", e.key);
    // if (this.showDropdown && this.suggestions.length > 0) {
    //   if (e.key === "ArrowDown") {
    //     e.preventDefault();
    //     this.selectedIndex =
    //       this.selectedIndex < this.suggestions.length - 1
    //         ? this.selectedIndex + 1
    //         : 0;
    //     this.updateDropdownSelection();
    //   } else if (e.key === "ArrowUp") {
    //     e.preventDefault();
    //     this.selectedIndex =
    //       this.selectedIndex > 0
    //         ? this.selectedIndex - 1
    //         : this.suggestions.length - 1;
    //     this.updateDropdownSelection();
    //   } else if (e.key === "Enter") {
    //     e.preventDefault();

    //     if (
    //       this.selectedIndex >= 0 &&
    //       this.selectedIndex < this.suggestions.length
    //     ) {
    //       // Select the highlighted suggestion
    //       const suggestion = this.suggestions[this.selectedIndex];
    //       this.handleSuggestionClick(suggestion);
    //     } else {
    //       // No item selected, use default enter behavior

    //       // Enter: Add current input as a search query
    //       this.handleAddFilter();
    //     }
    //   } else if (e.key === "Escape") {
    //     this.selectedIndex = -1;
    //     this.hideDropdown();
    //     this.suggestions = [];
    //   }
    // } else {
    //   // Handle keys when dropdown is not shown
    //   if (e.key === "Enter") {
    //     e.preventDefault();
    //     // Enter: Add current input as a search query
    //     this.handleAddFilter();
    //   }
    // }
    if (e.key === "Enter") {
        e.preventDefault();
        // Enter: Add current input as a search query
        this.handleAddFilter();
      }
  }

  private handleInputFocus(): void {
    this.selectedIndex = -1; // Reset keyboard navigation

    if (this.searchInput.value.trim()) {
      // Generate suggestions for all attributes
      this.fuzzySearchService
        .generateAllAttributeSuggestions(this.searchInput.value)
        .then((suggestions) => {
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

      // Execute search immediately for consistency with other actions
      this.executeSearch();
    }
  }

  private async handleSuggestionClick(
    suggestion: SearchSuggestion
  ): Promise<void> {
    // Add the suggestion as a filter
    this.addFilter(suggestion.attribute, suggestion.text);
    // Clear input but keep attribute selected
    this.searchInput.value = "";
    this.suggestions = [];
    this.hideDropdown();

    // Execute search immediately
    this.executeSearch();
  }

  private async handleSearchClick(): Promise<void> {
    // Add current input to filters if not empty
    if (this.searchInput.value.trim()) {
      await this.handleAddFilter();
    } else {
      this.executeSearch();
    }
  }

  private addFilter(attribute: string, value: string): void {
    if (!this.selectedFilters[attribute]) {
      this.selectedFilters[attribute] = [];
    }

    if (!this.selectedFilters[attribute].includes(value)) {
      // If attribute is query or resource_directory replace it
      if (attribute === "query" || attribute === "resource_directory") {
        this.selectedFilters[attribute] = [value];
      } else {
        this.selectedFilters[attribute].push(value);
      }
      this.renderFilters();
    }
  }

  private removeFilter(attribute: string, value: string): void {
    if (this.selectedFilters[attribute]) {
      this.selectedFilters[attribute] = this.selectedFilters[attribute].filter(
        (v) => v !== value
      );
      this.renderFilters();

      // Check if we have any filters left
      const hasAnyFilters = Object.keys(this.selectedFilters).some(
        (key) =>
          this.selectedFilters[key] && this.selectedFilters[key].length > 0
      );

      // Also check if there's any search input
      const hasSearchInput = this.searchInput.value.trim().length > 0;

      if (hasAnyFilters || hasSearchInput) {
        // Trigger a fresh search with remaining filters/input
        this.executeSearch();
      }
    }
  }

  private executeSearch(): void {
    const queryString = this.fuzzySearchService.buildQueryString(
      this.selectedFilters
    );
    console.log("Executing search with query:", queryString);

    // Hide search tips after first search
    if (!this.hasSearched) {
      this.hasSearched = true;
      this.hideSearchTips();
    }

    // Save it local storage. TODO: for debugging, remove it later may be
    localStorage.setItem("lastSearchQuery", queryString);

    this.callbacks.onSearchExecuted(queryString);
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
            <div class="flex items-center px-3 py-2 rounded-2xl border-2 ${color} hover:shadow-xl cursor-pointer group filter-tag" data-attribute="${attribute}" data-value="${value}">
              <span class="mr-2 sm:mr-3 text-sm sm:text-base">${icon}</span>
              <span class="text-sm font-semibold truncate max-w-[120px] sm:max-w-none">${value}</span>
              <button class="ml-2 sm:ml-3 text-current opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-40 rounded-full p-1.5 transition-all duration-300 remove-filter-btn hover:scale-110 active:scale-90" data-attribute="${attribute}" data-value="${value}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
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

    // Show or hide the filters container based on whether any filters are selected
    if (filtersHtml.length > 0) {
      this.filtersContainer.classList.remove("invisible");
    } else {
      this.filtersContainer.classList.add("invisible");
    }

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
    ) as HTMLElement;

    // Group suggestions by attribute for better organization
    if (this.suggestions.length > 0) {
      // Group suggestions by attribute
      const suggestionsByAttribute = this.suggestions.reduce(
        (acc, suggestion) => {
          if (!acc[suggestion.attribute]) {
            acc[suggestion.attribute] = [];
          }
          acc[suggestion.attribute].push(suggestion);
          return acc;
        },
        {} as Record<string, typeof this.suggestions>
      );

      let suggestionsHtml = "";
      let currentIndex = 0;

      // Render suggestions grouped by attribute
      Object.keys(suggestionsByAttribute).forEach((attribute) => {
        const attributeSuggestions = suggestionsByAttribute[attribute];
        const icon = this.fuzzySearchService.getAttributeIcon(attribute);
        const displayName =
          this.fuzzySearchService.getAttributeDisplayName(attribute);

        // Add attribute header if we have multiple attributes
        if (Object.keys(suggestionsByAttribute).length > 1) {
          suggestionsHtml += `
            <div class="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600 bg-gray-50 border-b border-gray-100 flex items-center">
              <span class="mr-2 sm:mr-3">${icon}</span>
              ${displayName}
            </div>
          `;
        }

        // Add suggestions for this attribute
        attributeSuggestions.forEach((suggestion) => {
          const color = this.fuzzySearchService.getAttributeColor(
            suggestion.attribute
          );
          suggestionsHtml += `
            <div class="suggestion-option flex items-center px-3 sm:px-4 py-2 sm:py-3 cursor-pointer border-b border-gray-100 last:border-b-0 group hover:bg-blue-50 transition-all duration-200 ${
              this.selectedIndex === currentIndex
                ? "bg-blue-50 border-l-4 border-l-blue-500"
                : ""
            }" data-index="${currentIndex}">
              <div class="flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 rounded-xl mr-3 sm:mr-4 ${color} shadow-sm group-hover:shadow-md transition-shadow duration-200">
                <span class="text-sm sm:text-base">${icon}</span>
              </div>
              <div class="flex-grow min-w-0">
                <div class="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200 text-sm sm:text-base truncate">${
                  suggestion.text
                }</div>
                <div class="text-xs sm:text-sm text-gray-500 flex items-center mt-1">
                  <span class="capitalize">
                    Add to ${suggestion.attribute.replace("_", " ")} search
                  </span>
                </div>
              </div>
              <div class="flex items-center justify-center w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-200">
                <svg class="w-3 sm:w-4 h-3 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        });
      });
    } else {
      // Hide dropdown when no suggestions are available
      this.hideDropdown();
      return;
    }

    this.dropdown.classList.remove("hidden");
  }

  private updateDropdownSelection(): void {
    const options = this.dropdown.querySelectorAll(
      ".suggestion-option"
    ) as NodeListOf<HTMLElement>;
    options.forEach((option, index) => {
      if (index === this.selectedIndex) {
        option.classList.add("bg-blue-50", "border-l-4", "border-l-blue-500");
      } else {
        option.classList.remove(
          "bg-blue-50",
          "border-l-4",
          "border-l-blue-500"
        );
      }
    });
  }

  private hideDropdown(): void {
    this.showDropdown = false;
    this.dropdown.classList.add("hidden");
  }

  public cleanup(): void {
    this.fuzzySearchService.cleanup();
  }

  public clearAllFilters(): void {
    this.selectedFilters = {};
    this.fuzzySearchService.getAvailableAttributes().forEach((attr) => {
      this.selectedFilters[attr] = [];
    });
    this.renderFilters();
  }

  private hideSearchTips(): void {
    if (this.searchTips) {
      this.searchTips.style.display = "none";
    }
  }

  /**
   * Disable all input elements and show loading state
   */
  public disableInputs(): void {
    console.log("Disabling inputs and showing loading state...");
    // Disable search input
    this.searchInput.disabled = true;
    this.searchInput.classList.add("opacity-50", "cursor-not-allowed");

    // Disable search button and show loading state
    this.searchButton.disabled = true;
    this.searchButton.classList.add("opacity-50", "cursor-not-allowed");

    // Update button text to show loading
    const buttonText = this.searchButton.querySelector("#search-btn-text");
    if (buttonText) {
      buttonText.textContent = "Searching...";
    }

    // Hide dropdown
    this.hideDropdown();

    // Disable all filter remove buttons
    const removeButtons = this.filtersContainer.querySelectorAll(
      ".remove-filter-btn"
    ) as NodeListOf<HTMLButtonElement>;
    removeButtons.forEach((btn) => {
      btn.disabled = true;
      btn.classList.add("opacity-50", "cursor-not-allowed");
    });
  }

  /**
   * Enable all input elements and restore normal state
   */
  public enableInputs(): void {
    // Enable search input
    this.searchInput.disabled = false;
    this.searchInput.classList.remove("opacity-50", "cursor-not-allowed");

    // Enable search button and restore normal state
    this.searchButton.disabled = false;
    this.searchButton.classList.remove("opacity-50", "cursor-not-allowed");

    // Restore button text
    const buttonText = this.searchButton.querySelector("#search-btn-text");
    if (buttonText) {
      buttonText.textContent = "Search";
    }

    // Enable all filter remove buttons
    const removeButtons = this.filtersContainer.querySelectorAll(
      ".remove-filter-btn"
    ) as NodeListOf<HTMLButtonElement>;
    removeButtons.forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove("opacity-50", "cursor-not-allowed");
    });
  }
}
