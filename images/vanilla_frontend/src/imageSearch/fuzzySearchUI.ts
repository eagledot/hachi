// FuzzySearchUI
import {
  FuzzySearchService,
  type SearchFilter,
  type SearchSuggestion,
} from "./fuzzySearchService";

import { fetchWithSession } from "../utils";
import { html } from "../utils";
import { endpoints } from "../config";

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
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;

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
      <div class="mx-auto mt-4 fuzzy-search-container">
        <div class="w-full relative">
          <!-- Modern Search Container -->
          <div class="flex flex-col">
            <!-- Main Search Row -->
            <div class="flex flex-col sm:flex-row sm:space-y-0 mb-2">
              <div id="input-container" class="relative flex-grow">
                <!-- Integrated Input and Button Container -->
                <div
                  class="relative  rounded-xl  bg-white flex items-center h-10 sm:h-12 group overflow-hidden"
                  style="padding-right:0;"
                >
                  <!-- Search Icon -->
                  <!-- <div
                    class="flex items-center justify-center w-12 sm:w-14 h-12 sm:h-14 text-gray-500 group-focus-within:text-blue-400 transition-colors duration-300"
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
                  </div> -->

                  <!-- Modern Input Field -->
                  <input
                    id="fuzzy-search-input"
                    type="text"
                    autocomplete="off"
                    placeholder="Search by people, folders, or keywords..."
                    class="flex-1 h-full px-3 border-2 border-blue-600 text-sm sm:text-base bg-transparent border-r-0 focus:outline-none focus:ring-0 placeholder-gray-800 font-medium rounded-l-xl rounded-r-none transition-all duration-300"
                    style="border-top-right-radius:0;border-bottom-right-radius:0;"
                  />

                  <!-- Filter Toggle Button -->
                  <button
                    disabled
                    id="filter-sidebar-toggle-btn"
                    class="flex cursor-not-allowed items-center justify-center w-16 h-12 sm:w-14 transition-all duration-200 border-t-2 border-b-2 border-blue-600 group focus:outline-none "
                    aria-label="Toggle advanced filters"
                    title="Show/hide advanced search filters"
                  >
                    <?xml version="1.0" encoding="utf-8"?><!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style="width:24px;height:24px;"
                    >
                      <path
                        d="M4 5L10 5M10 5C10 6.10457 10.8954 7 12 7C13.1046 7 14 6.10457 14 5M10 5C10 3.89543 10.8954 3 12 3C13.1046 3 14 3.89543 14 5M14 5L20 5M4 12H16M16 12C16 13.1046 16.8954 14 18 14C19.1046 14 20 13.1046 20 12C20 10.8954 19.1046 10 18 10C16.8954 10 16 10.8954 16 12ZM8 19H20M8 19C8 17.8954 7.10457 17 6 17C4.89543 17 4 17.8954 4 19C4 20.1046 4.89543 21 6 21C7.10457 21 8 20.1046 8 19Z"
                        stroke="#000000"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                    </svg>
                  </button>

                  <!-- Integrated Search Button -->
                  <button
                    id="fuzzy-search-btn"
                    aria-label="Search"
                    class="relative flex items-center justify-center
                          h-10 sm:h-12
                          px-3 sm:px-5 md:px-6
                          bg-gradient-to-r from-blue-600 via-blue-600 to-blue-600
                          hover:from-blue-600 hover:via-blue-600 hover:to-blue-500
                          active:from-blue-600 active:via-blue-600 active:to-blue-500
                          disabled:opacity-60 disabled:cursor-not-allowed
                          text-white font-semibold
                          rounded-r-xl rounded-l-none
                          transition-all duration-300
                          space-x-0 sm:space-x-2
                          text-sm sm:text-base
                          min-w-[52px]
         focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600 focus:z-10"
                    style="border-top-left-radius:0;border-bottom-left-radius:0;margin-left:-1px;"
                  >
                    <svg
                      class="w-5 h-5 sm:w-6 sm:h-6 shrink-0"
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
                    <span
                      id="search-btn-text"
                      class="hidden font-bold tracking-wide"
                      >Search</span
                    >
                  </button>
                </div>

                <!-- Modern Smart Dropdown -->
                <div
                  id="fuzzy-dropdown"
                  class="absolute top-full left-0 right-0 bg-white border-2 border-gray-200 rounded-lg shadow-2xl mt-3 z-50 max-h-64 sm:max-h-80 overflow-y-auto hidden backdrop-blur-sm"
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

  private handleKeyDown(e: KeyboardEvent): void {
    console.log("Key down:", e.key);

    if (e.key === "Enter") {
      e.preventDefault();
      // Enter: Add current input as a search query
      this.handleAddFilter();
    }
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
        /* @Anubhav I made some changes to directly call the `getsuggestions` for backend supported attributes,
        It is one request now, rather than calling multiple times for each attribute, which returns suggestions for all those attributes, you may have to modify UI a bit, 
        each attribute, would have a list of suggestions, some very minor tweaks should be needed on your side.
        `getSuggestionBatch` is still being called somewhere, please check 
        This makes lots of code in `suggestion related code` ub `fuzzySearchService.ts` redundant!
        */

        // get suggestions (for backend supported attributes!)
        this.suggestions = await this.fuzzySearchService.getSuggestions(value);

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

  private async handleInputFocus(): Promise<void> {
    this.selectedIndex = -1; // Reset keyboard navigation

    if (this.searchInput.value.trim()) {
      // Generate suggestions for all attributes
      this.suggestions = await this.fuzzySearchService.getSuggestions(
        this.searchInput.value
      );
      if (this.suggestions.length > 0) {
        this.showDropdown = true;
        this.renderDropdown();
      } else {
        this.hideDropdown();
      }
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
            <div class="flex items-center px-3 py-1 rounded-xl border-1 ${color} hover:shadow-xl cursor-pointer group filter-tag" data-attribute="${attribute}" data-value="${value}">
              <span class="mr-2 sm:mr-3 text-sm sm:text-base">${icon}</span>
              <span class="text-xs font-semibold truncate max-w-[120px] sm:max-w-none">${value}</span>
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
            <div class="suggestion-option flex items-center px-2 sm:px-3 py-1.5 cursor-pointer border-b border-gray-100 last:border-b-0 group hover:bg-blue-50 transition ${
              this.selectedIndex === currentIndex
                ? "bg-blue-50 border-l-2 border-l-blue-500"
                : ""
            }" data-index="${currentIndex}">
              <div class="flex items-center justify-center w-7 sm:w-8 h-7 sm:h-8 rounded-lg mr-2 sm:mr-3 ${color}">
                <span class="text-xs sm:text-sm">${icon}</span>
              </div>
              <div class="flex-grow min-w-0">
                <div class="font-medium text-gray-900 group-hover:text-blue-700 text-xs sm:text-sm truncate">
                  ${suggestion.text}
                </div>
              </div>
              <div class="ml-2 flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m6-6H6"></path>
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
