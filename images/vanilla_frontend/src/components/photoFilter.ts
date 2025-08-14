// Reusable Photo Filter Component
// This component provides filtering functionality for photo grids based on metadata

import type { HachiImageData, ImageMetaData } from "../imageSearch/types";
import { filterPopulateQuery, filterQueryMeta, html } from "../utils";
import { SearchApiService } from "../imageSearch/apiService";
import {
  FuzzySearchService,
  type SearchFilter,
} from "../imageSearch/fuzzySearchService";
import { debounce, transformRawDataChunk } from "../imageSearch/utils";
import { endpoints } from "../config";

export interface FilterCriteria {
  people?: string[];
  years?: number[];
  cameraMakes?: string[];
  cameraModels?: string[];
  places?: string[];
  tags?: string[];
  searchText?: string;
  resourceDirectory?: string[];
  personContext?: string;
}

export interface FilterOptions {
  people: string[];
  years: number[];
  cameraMakes: string[];
  cameraModels: string[];
  places: string[];
  tags: string[];
}

export interface FilterCallbacks {
  onFilterChange: (filteredPhotos: HachiImageData[]) => void;
  onFilterOptionsUpdate?: (options: FilterOptions) => void;
  onSemanticSearch?: (searchResults: HachiImageData[]) => void;
  hideSearchInput?: boolean; // Option to hide search input
}

export class PhotoFilterComponent {
  private photos: HachiImageData[] = [];
  private queryToken: string | null = null;
  private filteredPhotos: HachiImageData[] = [];
  private semanticSearchResults: HachiImageData[] = []; // Store semantic search results
  private filterCriteria: FilterCriteria = {};
  private filterOptions: FilterOptions = {
    people: [],
    years: [],
    cameraMakes: [],
    cameraModels: [],
    places: [],
    tags: [],
  };
  private callbacks: FilterCallbacks;
  private container: HTMLElement | null = null;
  private eventListeners: Map<HTMLElement, (() => void)[]> = new Map(); // Track event listeners
  private peopleCache: Map<string, HTMLElement> = new Map(); // Cache people DOM elements
  private imageObserver: IntersectionObserver | null = null; // Lazy loading observer
  private readonly INITIAL_PEOPLE_LIMIT = 50; // Show only first 50 people initially

  // Semantic search related properties
  private fuzzySearchService: FuzzySearchService;
  private isSemanticSearchMode: boolean = false;
  private currentSearchTerm: string = "";
  private isInitialLoad: boolean = true; // Track if this is initial load
  private isInitializing: boolean = false; // Track if we're in initialization phase

  constructor(callbacks: FilterCallbacks) {
    this.callbacks = callbacks;
    this.fuzzySearchService = new FuzzySearchService();
  }

  public updateQueryToken(token: string | null): void {
    this.queryToken = token;
    // Update filter UI asynchronously when query token changes
    this.updateFilterUI().catch(error => {
      console.error("Error updating filter UI after query token change:", error);
    });
  }

  /**
   * Initialize the filter component in the specified container
   */
  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Filter container with id '${containerId}' not found`);
    }

    this.container = container;
    this.setupImageObserver();
    this.render();
    this.setupEventListeners();
    console.log("Photo filter component initialized");
  }


  /**
   * Reset all filters
   */
  async resetFilters(): Promise<void> {
    // Clear all filters but preserve context
    this.clearAllFiltersExceptContext();
    await this.applyFilters();
    await this.updateFilterUI();
  }

  /**
   * Clean up event listeners and caches
   */

  destroy(): void {
    // Remove all tracked event listeners
    this.eventListeners.forEach((listeners) => {
      listeners.forEach((removeListener) => removeListener()); // Call each removeListener function to clean up
    });
    this.eventListeners.clear(); // Clear the event listeners array, removing all references

    // Disconnect image observer if it exists
    if (this.imageObserver) {
      this.imageObserver.disconnect(); // Stop observing images and disconnect the connection
      this.imageObserver = null; // Set imageObserver to null to ensure it won't be reused
    }

    // Cleanup fuzzy search service resources
    this.fuzzySearchService.cleanup(); // Ensure all resources are properly released for the fuzzy search service
  }

  /**
   * Setup intersection observer for lazy loading images
   */
  private setupImageObserver(): void {
    // Check if the browser supports Intersection Observer API
    if ("IntersectionObserver" in window) {
      // Create a new instance of Intersection Observer with a callback function
      this.imageObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // If the element is intersecting within the viewport
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              // Check if the image has a data-src attribute
              if (img.dataset.src) {
                // Set the src of the image to the value of data-src
                img.src = img.dataset.src;
                // Remove the data-src attribute from the image
                img.removeAttribute("data-src");
                // Stop observing the image once it is loaded
                this.imageObserver?.unobserve(img);
              }
            }
          });
        },
        {
          // Options for Intersection Observer configuration
          rootMargin: "50px 0px", // Adjust how far from the viewport an element needs to be before being considered 'visible'
          threshold: 0.1, // The percentage of an element that must be visible to trigger the callback function
        }
      );
    }
  }

  /**
   * Add an event listener and track it for cleanup
   */
  private addEventListenerTracked<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any
  ): void {
    // Add the provided event listener to the specified element
    element.addEventListener(type, listener);

    // Create a function that removes the event listener from the element
    const removeListener = () => element.removeEventListener(type, listener);

    // Check if this element is already in the eventListeners map
    if (!this.eventListeners.has(element)) {
      // If not, initialize an array for this element's listeners
      this.eventListeners.set(element, []);
    }

    // Add the removeListener function to the list of listeners for this element
    this.eventListeners.get(element)!.push(removeListener);
  }

  /**
   * Generate the HTML template for the filter component
   */
  static getTemplate(
    containerId: string = "photo-filter",
    hideSearchInput: boolean = false
  ): string {
    return html`
      ${PhotoFilterComponent.getStyles()}
      <!-- Photo Filter Component - Horizontal Filter Bar -->
      <div id="${containerId}" class="photo-filter-container sticky z-20">
        ${hideSearchInput
          ? ""
          : html`
              <!-- Filter Header -->
              <div class="w-full py-1">
                <div class="flex w-full items-center space-x-3">
                  <!-- Search Input -->
                  <div class="relative w-full">
                    <input
                      type="search"
                      id="filter-search-text"
                      placeholder="Search photos with AI..."
                      class="w-full px-4 py-2.5 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm hover:shadow-md transition-shadow placeholder-gray-400"
                    />
                    <svg
                      class="absolute left-3 top-3 w-4 h-4 text-gray-400"
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
                  </div>
                </div>
              </div>
            `}

        <!-- Horizontal Filter Tabs -->
        <div class="relative">
          <div
            class="flex items-center py-3 space-x-2 overflow-x-auto scrollbar-hide"
          >
            <!-- People Tab -->
            <div class="flex-shrink-0">
              <button
                class="filter-tab flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                data-filter="people"
                id="people-tab"
              >
                <span>👥 People</span>
                <span
                  id="people-count"
                  class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs min-w-[20px] text-center"
                  >0</span
                >
                <svg
                  class="w-4 h-4 text-gray-400"
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
            </div>

            <!-- Years Tab -->
            <div class="flex-shrink-0">
              <button
                class="filter-tab flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                data-filter="years"
                id="years-tab"
              >
                <span>📅 Years</span>
                <span
                  id="years-count"
                  class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs min-w-[20px] text-center"
                  >0</span
                >
                <svg
                  class="w-4 h-4 text-gray-400"
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
            </div>

            <!-- Tags Tab -->
            <div class="flex-shrink-0">
              <button
                class="filter-tab flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                data-filter="tags"
                id="tags-tab"
              >
                <span>🏷️ Tags</span>
                <span
                  id="tags-count"
                  class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs min-w-[20px] text-center"
                  >0</span
                >
                <svg
                  class="w-4 h-4 text-gray-400"
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
            </div>

            <!-- Camera Makes Tab -->
            <div class="flex-shrink-0">
              <button
                class="filter-tab flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                data-filter="cameraMakes"
                id="cameraMakes-tab"
              >
                <span>📷 Camera</span>
                <span
                  id="cameraMakes-count"
                  class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs min-w-[20px] text-center"
                  >0</span
                >
                <svg
                  class="w-4 h-4 text-gray-400"
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
            </div>

            <!-- Camera Models Tab -->
            <div class="flex-shrink-0">
              <button
                class="filter-tab flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                data-filter="cameraModels"
                id="cameraModels-tab"
              >
                <span>📸 Model</span>
                <span
                  id="cameraModels-count"
                  class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs min-w-[20px] text-center"
                  >0</span
                >
                <svg
                  class="w-4 h-4 text-gray-400"
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
            </div>

            <!-- Places Tab -->
            <div class="flex-shrink-0">
              <button
                class="filter-tab flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                data-filter="places"
                id="places-tab"
              >
                <span>📍 Places</span>
                <span
                  id="places-count"
                  class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs min-w-[20px] text-center"
                  >0</span
                >
                <svg
                  class="w-4 h-4 text-gray-400"
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
            </div>
          </div>
        </div>

        <!-- Dropdown containers positioned outside main container -->
        <div
          id="people-dropdown"
          class="filter-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden"
          style="min-width: 320px; max-width: 400px;"
        >
          <div class="p-3">
            <div class="max-h-64 overflow-y-auto">
              <!-- People content will be inserted here -->
            </div>
          </div>
        </div>

        <div
          id="years-dropdown"
          class="filter-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden"
          style="min-width: 200px; max-width: 300px;"
        >
          <div class="p-3">
            <div class="max-h-48 overflow-y-auto space-y-1">
              <!-- Years content will be inserted here -->
            </div>
          </div>
        </div>

        <div
          id="tags-dropdown"
          class="filter-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden"
          style="min-width: 200px; max-width: 300px;"
        >
          <div class="p-3">
            <div class="max-h-48 overflow-y-auto space-y-1">
              <!-- Tags content will be inserted here -->
            </div>
          </div>
        </div>

        <div
          id="cameraMakes-dropdown"
          class="filter-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden"
          style="min-width: 200px; max-width: 300px;"
        >
          <div class="p-3">
            <div class="max-h-48 overflow-y-auto space-y-1">
              <!-- Camera makes content will be inserted here -->
            </div>
          </div>
        </div>

        <div
          id="cameraModels-dropdown"
          class="filter-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden"
          style="min-width: 200px; max-width: 300px;"
        >
          <div class="p-3">
            <div class="max-h-48 overflow-y-auto space-y-1">
              <!-- Camera models content will be inserted here -->
            </div>
          </div>
        </div>

        <div
          id="places-dropdown"
          class="filter-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden"
          style="min-width: 200px; max-width: 300px;"
        >
          <div class="p-3">
            <div class="max-h-48 overflow-y-auto space-y-1">
              <!-- Places content will be inserted here -->
            </div>
          </div>
        </div>

        <!-- Active Filters - Simplified -->
        <div id="active-filters" class="pb-2 hidden">
          <div class="flex items-center justify-between">
            <div class="flex flex-wrap gap-1.5 flex-1">
              <!-- Active filter badges will be displayed here -->
            </div>
            <button
              class="clear-all-filters text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors ml-3 flex-shrink-0"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get CSS styles for the horizontal filter bar
   */
  static getStyles(): string {
    return `
      <style>
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Filter dropdown improvements */
        .filter-dropdown {
          backdrop-filter: blur(8px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        /* Filter bar positioning */
        .photo-filter-container {
          position: relative;
          z-index: 20;
        }
          /* Responsive improvements */
          @media (max-width: 768px) {
            .filter-tab {
              min-width: max-content;
              font-size: 0.875rem;
              padding: 0.5rem 0.75rem;
            }
            
            .filter-tab span:first-child {
              white-space: nowrap;
            }
            
            .filter-dropdown {
              position: fixed !important;
              left: 1rem !important;
              right: 1rem !important;
              width: auto !important;
              max-width: none !important;
              min-width: auto !important;
            }
            
            /* Adjust search input on mobile */
            #filter-search-text {
              font-size: 0.875rem;
              padding: 0.5rem 0.75rem 0.5rem 2.25rem;
            }
            
            #filter-search-text + svg {
              width: 1rem;
              height: 1rem;
              left: 0.5rem;
              top: 0.75rem;
            }
            
            /* Hide the "Press Enter" hint on mobile */
            #filter-search-text + svg + div {
              display: none !important;
            }
          }
          
          @media (max-width: 640px) {
            .photo-filter-container {
              margin-bottom: 1rem;
            }
            
            .filter-tab {
              padding: 0.375rem 0.625rem;
              font-size: 0.8125rem;
            }
          }
      </style>
    `;
  }

  /**
   * Render the filter component
   */
  private render(): void {
    // Check if the container element exists
    if (!this.container) return;

    // Determine whether to hide the search input based on the callbacks or default value
    const hideSearchInput = this.callbacks.hideSearchInput || false;

    // Use the PhotoFilterComponent.getTemplate method to generate the HTML template
    // This method takes the container's ID and a boolean indicating whether to hide the search input
    this.container.innerHTML = PhotoFilterComponent.getTemplate(
      this.container.id,
      hideSearchInput
    );
  }

  /**
   * Setup event listeners for filter interactions
   */
  private setupEventListeners(): void {
    if (!this.container) return;

    // Search text filter - now with semantic search on Enter key
    const searchInput = this.container.querySelector(
      "#filter-search-text"
    ) as HTMLInputElement;
    if (searchInput) {
      // Handle Enter key press for semantic search
      this.addEventListenerTracked(
        searchInput,
        "keydown",
        (e: KeyboardEvent) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const target = e.target as HTMLInputElement;
            const searchTerm = target.value.trim();

            if (searchTerm) {
              // Use semantic search for non-empty queries
              // TODO: Change this search implementation
              this.performSemanticSearch(searchTerm);
            } else {
              // Clear semantic search and return to normal filtering
              this.clearSemanticSearch();
            }
          }
        }
      );

      // Handle input changes to clear search when input is emptied
      this.addEventListenerTracked(searchInput, "input", (e: Event) => {
        const target = e.target as HTMLInputElement;
        const searchTerm = target.value.trim();

        // Only clear search if input is completely empty
        if (!searchTerm && this.isSemanticSearchMode) {
          this.clearSemanticSearch();
        }
      });
    }

    // Reset filters button
    const resetBtn = this.container.querySelector(
      "#reset-filters"
    ) as HTMLElement;
    if (resetBtn) {
      this.addEventListenerTracked(resetBtn, "click", () => {
        this.resetFilters();
        if (searchInput) searchInput.value = "";
      });
    }

    // Filter tab buttons - new horizontal dropdown interaction
    const filterTabs = this.container.querySelectorAll(".filter-tab");
    filterTabs.forEach((tab) => {
      this.addEventListenerTracked(tab as HTMLElement, "click", (e) => {
        e.preventDefault();
        const button = e.currentTarget as HTMLElement;
        const filterType = button.dataset.filter;
        if (filterType) {
          this.toggleFilterDropdown(filterType);
        }
      });
    });

    // Close dropdowns when clicking outside
    const handleDocumentClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".filter-tab") &&
        !target.closest(".filter-dropdown")
      ) {
        this.closeAllDropdowns();
      }
    };
    document.addEventListener("click", handleDocumentClick);

    // Handle keyboard navigation
    const handleDocumentKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.closeAllDropdowns();
      }
    };
    document.addEventListener("keydown", handleDocumentKeydown);

    // Handle window resize to reposition dropdowns
    const handleWindowResize = () => {
      // Close all dropdowns on resize to avoid positioning issues
      this.closeAllDropdowns();
    };
    window.addEventListener("resize", handleWindowResize);

    // Store cleanup functions for these document listeners
    if (!this.eventListeners.has(document as any)) {
      this.eventListeners.set(document as any, []);
    }
    this.eventListeners.get(document as any)!.push(() => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleDocumentKeydown);
      window.removeEventListener("resize", handleWindowResize);
    });
  }

  /**
   * Toggle filter dropdown visibility based on the specified type.
   */
  private toggleFilterDropdown(filterType: string): void {
    const dropdown = document.querySelector(
      `#${filterType}-dropdown`
    ) as HTMLElement;
    const tab = this.container?.querySelector(
      `#${filterType}-tab`
    ) as HTMLElement;

    // Check if the dropdown or tab elements exist
    if (!dropdown || !tab) return;

    // Close all other dropdowns of the same type first
    this.closeAllDropdowns(filterType);

    // Toggle visibility of the current dropdown
    const isHidden = dropdown.classList.contains("hidden");
    if (isHidden) {
  // Make dropdown temporarily visible (but hidden) for accurate measurement
  dropdown.classList.remove("hidden");
  const previousVisibility = dropdown.style.visibility;
  dropdown.style.visibility = "hidden";
  this.positionDropdown(dropdown, tab); // Position after we can measure
  dropdown.style.visibility = previousVisibility || ""; // Restore visibility
      tab.classList.add(
        "bg-blue-50", // Light blue background for focus
        "border-blue-300", // Blue border
        "text-blue-700" // Dark blue text
      );
    } else {
      dropdown.classList.add("hidden"); // Hide the dropdown
      tab.classList.remove(
        "bg-blue-50", // Remove light blue background
        "border-blue-300", // Remove blue border
        "text-blue-700" // Remove dark blue text
      );
    }
  }

  /**
   * Position dropdown below the corresponding tab
   */
  private positionDropdown(dropdown: HTMLElement, tab: HTMLElement): void {
    const tabRect = tab.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    // Measure width; if hidden (offsetWidth == 0), force a temporary measurement
    let dropdownWidth = dropdown.offsetWidth;
    if (dropdownWidth === 0) {
      const prevDisplay = dropdown.style.display;
      const prevVisibility = dropdown.style.visibility;
      dropdown.style.visibility = "hidden";
      dropdown.style.display = "block";
      dropdownWidth = dropdown.offsetWidth;
      // Revert styles
      dropdown.style.display = prevDisplay;
      dropdown.style.visibility = prevVisibility;
    }
    if (!dropdownWidth || dropdownWidth === 0) {
      dropdownWidth = 300; // fallback width
    }

    // Mobile positioning
    if (viewportWidth <= 768) {
      dropdown.style.position = "fixed";
      dropdown.style.top = `${tabRect.bottom + 4}px`;
      dropdown.style.left = "1rem";
      dropdown.style.right = "1rem";
      dropdown.style.width = "auto";
      dropdown.style.minWidth = "auto";
      dropdown.style.maxWidth = "none";
      return;
    }

    // Desktop positioning - position below the tab
    dropdown.style.position = "fixed";
    dropdown.style.top = `${tabRect.bottom + 4}px`;

    const padding = 16; // 1rem
    // Start left-aligned with tab
    let left = tabRect.left;

    // If overflow right edge, attempt right-align with tab's right edge
    if (left + dropdownWidth > viewportWidth - padding) {
      left = tabRect.right - dropdownWidth;
    }

    // If still overflowing (very wide dropdown or tiny viewport), clamp within viewport
    if (left + dropdownWidth > viewportWidth - padding) {
      left = viewportWidth - dropdownWidth - padding;
    }

    // Ensure not less than padding
    if (left < padding) {
      left = padding;
    }

    dropdown.style.left = `${Math.round(left)}px`;
    dropdown.style.right = "auto";
    dropdown.style.width = "";
  }

  /**
   * Close all filter dropdowns
   */
  private closeAllDropdowns(excludeFilter?: string): void {
    const dropdowns = document.querySelectorAll(
      ".filter-dropdown"
    ) as NodeListOf<HTMLElement>;
    const tabs = this.container?.querySelectorAll(
      ".filter-tab"
    ) as NodeListOf<HTMLElement>;

    dropdowns.forEach((dropdown) => {
      const filterType = dropdown.id.replace("-dropdown", "");
      if (excludeFilter && filterType === excludeFilter) return;

      dropdown.classList.add("hidden");
    });

    tabs.forEach((tab) => {
      const filterType = tab.id.replace("-tab", "");
      if (excludeFilter && filterType === excludeFilter) return;

      tab.classList.remove("bg-blue-50", "border-blue-300", "text-blue-700");
    });
  }

  /**
   * Update tab label to show active filters
   */
  private updateTabLabel(filterType: string): void {
    const tab = this.container?.querySelector(
      `#${filterType}-tab`
    ) as HTMLElement;
    if (!tab) return;

    const currentCriteria = this.filterCriteria[
      filterType as keyof FilterCriteria
    ] as string[] | number[];
    const labelSpan = tab.querySelector("span:first-child") as HTMLElement;

    if (!labelSpan) return;

    const baseLabels: Record<string, string> = {
      people: "👥 People",
      years: "📅 Years",
      tags: "🏷️ Tags",
      cameraMakes: "📷 Camera",
      cameraModels: "📸 Model",
      places: "📍 Places",
    };

    const baseLabel = baseLabels[filterType];
    if (currentCriteria && currentCriteria.length > 0) {
      if (currentCriteria.length === 1) {
        const value = currentCriteria[0];
        const displayValue =
          typeof value === "string"
            ? value.length > 15
              ? value.substring(0, 15) + "..."
              : value
            : value.toString();
        labelSpan.textContent = `${baseLabel}: ${displayValue}`;
      } else {
        labelSpan.textContent = `${baseLabel}: ${currentCriteria.length} selected`;
      }
      tab.classList.add("bg-blue-50", "border-blue-400", "text-blue-700");
    } else {
      labelSpan.textContent = baseLabel;
      tab.classList.remove("bg-blue-50", "border-blue-400", "text-blue-700");
    }
  }

  /**
   * Initialize all tab labels on component load
   */
  private initializeTabLabels(): void {
    [
      "people",
      "years",
      "tags",
      "cameraMakes",
      "cameraModels",
      "places",
    ].forEach((filterType) => {
      this.updateTabLabel(filterType);
    });
  }

  /**
   * Generate filter options from server data when queryToken is available, 
   * or from current photos for client-side filtering
   */
  private async generateFilterOptions(): Promise<void> {
    const options: FilterOptions = {
      people: [],
      years: [],
      cameraMakes: [],
      cameraModels: [],
      places: [],
      tags: [],
    };

    // If we have a query token, get filter options from server
    if (this.queryToken) {
      try {
        console.log("Fetching filter options from server with token:", this.queryToken);
        
        // Fetch options for each filter attribute separately
        // Some requests may fail if the server doesn't support all attributes yet
        const requests = [
          filterPopulateQuery(this.queryToken, "person").catch(err => {
            console.warn("Failed to fetch people options:", err);
            return [];
          }),
          // filterPopulateQuery(this.queryToken, "year").catch(err => {
          //   console.warn("Failed to fetch years options:", err);
          //   return [];
          // }),
          // filterPopulateQuery(this.queryToken, "cameraMake").catch(err => {
          //   console.warn("Failed to fetch camera makes options:", err);
          //   return [];
          // }),
          // filterPopulateQuery(this.queryToken, "cameraModel").catch(err => {
          //   console.warn("Failed to fetch camera models options:", err);
          //   return [];
          // }),
          filterPopulateQuery(this.queryToken, "place").catch(err => {
            console.warn("Failed to fetch places options:", err);
            return [];
          }),
          filterPopulateQuery(this.queryToken, "tags").catch(err => {
            console.warn("Failed to fetch tags options:", err);
            return [];
          })
        ];
        
        // const [peopleData, yearsData, cameraMakesData, cameraModelsData, placesData, tagsData] = await Promise.all(requests);
        const [peopleData, placesData, tagsData] = await Promise.all(requests);
        
        // Parse the server responses to populate filter options
        // Each response contains the options for that specific attribute
        if (peopleData && Array.isArray(peopleData)) {
          options.people = peopleData.filter((person: string) => 
            person && 
            person !== "no_person_detected" && 
            person !== "no_categorical_info"
          );
        }
        
        // if (yearsData && Array.isArray(yearsData)) {
        //   options.years = yearsData.filter((year: any) => 
        //     typeof year === 'number' || !isNaN(parseInt(year))
        //   ).map((year: any) => typeof year === 'number' ? year : parseInt(year));
        // }
        
        // if (cameraMakesData && Array.isArray(cameraMakesData)) {
        //   options.cameraMakes = cameraMakesData.filter((make: string) => make && make.trim());
        // }
        
        // if (cameraModelsData && Array.isArray(cameraModelsData)) {
        //   options.cameraModels = cameraModelsData.filter((model: string) => model && model.trim());
        // }
        
        if (placesData && Array.isArray(placesData)) {
          options.places = placesData.filter((place: string) => place && place.trim());
        }
        
        if (tagsData && Array.isArray(tagsData)) {
          options.tags = tagsData.filter((tag: string) => tag && tag.trim());
        }
        
        console.log("Server filter options:", options);
        
        // If no options were retrieved from server, fall back to client-side generation
        const hasAnyServerOptions = options.people.length > 0 || 
                                   options.years.length > 0 || 
                                   options.cameraMakes.length > 0 || 
                                   options.cameraModels.length > 0 || 
                                   options.places.length > 0 || 
                                   options.tags.length > 0;
        
        if (!hasAnyServerOptions) {
          console.log("No server options available, falling back to client-side generation");
          return this.generateClientSideFilterOptions();
        }
      } catch (error) {
        console.error("Error fetching filter options from server:", error);
        // Fall back to client-side generation if server request fails
        return this.generateClientSideFilterOptions();
      }
    } else {
      // Fall back to client-side filter generation when no query token
      return this.generateClientSideFilterOptions();
    }

    // Sort all options
    options.people.sort();
    options.years.sort((a, b) => b - a); // Most recent first
    options.cameraMakes.sort();
    options.cameraModels.sort();
    options.places.sort();
    options.tags.sort();

    this.filterOptions = options;

    // Notify callback if provided
    if (this.callbacks.onFilterOptionsUpdate) {
      this.callbacks.onFilterOptionsUpdate(options);
    }
  }

  /**
   * Generate filter options from current photos (client-side fallback)
   */
  private generateClientSideFilterOptions(): void {
    const options: FilterOptions = {
      people: [],
      years: [],
      cameraMakes: [],
      cameraModels: [],
      places: [],
      tags: [],
    };

    // Extract unique values from photo metadata
    this.photos.forEach((photo) => {
      const metadata = photo.metadata;
      if (!metadata) return;

      // People
      if (metadata.person && Array.isArray(metadata.person)) {
        metadata.person.forEach((person) => {
          if (
            person &&
            person !== "no_person_detected" &&
            person !== "no_categorical_info" &&
            !options.people.includes(person)
          ) {
            options.people.push(person);
          }
        });
      }

      // Years from taken_at with fallback to modified_at
      const extractYear = (dateString: string): number | null => {
        if (!dateString) return null;

        // Try multiple parsing approaches for different date formats
        let date: Date | null = null;

        // First try direct Date parsing
        date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.getFullYear();
        }

        // Handle Python ctime format: "sun jun 8 03:26:24 2025"
        const ctimeRegex =
          /\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+(\d{4})/i;
        const ctimeMatch = dateString.match(ctimeRegex);
        if (ctimeMatch) {
          const year = parseInt(ctimeMatch[1]);
          if (!isNaN(year) && year > 1900 && year < 3000) {
            return year;
          }
        }

        // Try to extract year from various formats using regex
        const yearRegex = /\b(19|20)\d{2}\b/;
        const yearMatch = dateString.match(yearRegex);
        if (yearMatch) {
          const year = parseInt(yearMatch[0]);
          if (!isNaN(year) && year > 1900 && year < 3000) {
            return year;
          }
        }

        return null;
      };

      // Try taken_at first, then fallback to modified_at
      let year: number | null = null;
      if (metadata.taken_at) {
        year = extractYear(metadata.taken_at);
      }
      if (!year && metadata.modified_at) {
        year = extractYear(metadata.modified_at);
      }

      if (year && !options.years.includes(year)) {
        options.years.push(year);
      }

      // Camera makes
      if (metadata.make && !options.cameraMakes.includes(metadata.make)) {
        options.cameraMakes.push(metadata.make);
      }

      // Camera models
      if (metadata.model && !options.cameraModels.includes(metadata.model)) {
        options.cameraModels.push(metadata.model);
      }

      // Places
      if (metadata.place && !options.places.includes(metadata.place)) {
        options.places.push(metadata.place);
      }

      // Tags
      if (metadata.tags) {
        const tags = Array.isArray(metadata.tags)
          ? metadata.tags
          : [metadata.tags];
        tags.forEach((tag) => {
          if (tag && !options.tags.includes(tag)) {
            options.tags.push(tag);
          }
        });
      }
    });

    // Sort all options
    options.people.sort();
    options.years.sort((a, b) => b - a); // Most recent first
    options.cameraMakes.sort();
    options.cameraModels.sort();
    options.places.sort();
    options.tags.sort();

    this.filterOptions = options;

    // Notify callback if provided
    if (this.callbacks.onFilterOptionsUpdate) {
      this.callbacks.onFilterOptionsUpdate(options);
    }
  }

  /**
   * Update the filter UI with current options
   */
  private async updateFilterUI(): Promise<void> {
    if (!this.container) return;

    // Generate filter options (may be async if using server-side data)
    await this.generateFilterOptions();

    this.updateFilterSection("people", this.filterOptions.people);
    this.updateFilterSection("years", this.filterOptions.years.map(String));
    this.updateFilterSection("cameraMakes", this.filterOptions.cameraMakes);
    this.updateFilterSection("cameraModels", this.filterOptions.cameraModels);
    this.updateFilterSection("places", this.filterOptions.places);
    this.updateFilterSection("tags", this.filterOptions.tags);
    this.updateActiveFilters();
    this.initializeTabLabels();
  }
  /**
   * Update a specific filter section
   */
  private updateFilterSection(filterType: string, options: string[]): void {
    const dropdown = document.querySelector(`#${filterType}-dropdown`);
    const content = dropdown?.querySelector(".max-h-64, .max-h-48");
    const count = this.container?.querySelector(`#${filterType}-count`);

    if (!content || !count) return;

    // Update count
    count.textContent = options.length.toString();

    const currentCriteria =
      (this.filterCriteria[filterType as keyof FilterCriteria] as string[]) ||
      [];

    // Special handling for people filter - use efficient thumbnail grid
    if (filterType === "people") {
      this.updatePeopleFilter(content, options, currentCriteria);
    } else {
      this.updateStandardFilter(content, filterType, options, currentCriteria);
    }

    // Update tab label to show active filters
    this.updateTabLabel(filterType);
  }
  /**
   * Efficiently update people filter with thumbnail grid
   */
  private updatePeopleFilter(
    content: Element,
    options: string[],
    currentCriteria: string[]
  ): void {
    // Filter out system values
    const validPeople = options.filter(
      (personId) =>
        personId !== "no_person_detected" &&
        personId !== "no_categorical_info" &&
        personId !== "" &&
        personId
    );

    if (validPeople.length === 0) {
      content.innerHTML = `
        <div class="py-4 text-xs text-gray-500 text-center italic">
          No people found
        </div>
      `;
      return;
    }

    console.log("VALID PEOPLE", validPeople);

    // Create or update grid container
    let gridContainer = content.querySelector(".people-grid") as HTMLElement;
    if (!gridContainer) {
      gridContainer = document.createElement("div");
      gridContainer.className = "people-grid flex flex-wrap gap-2 py-2";
      content.innerHTML = "";
      content.appendChild(gridContainer);
    }

    // Get existing people elements
    const existingElements = new Map<string, HTMLElement>();
    gridContainer.querySelectorAll(".person-filter-item").forEach((item) => {
      const personId = (item as HTMLElement).dataset.personId;
      if (personId) {
        existingElements.set(personId, item as HTMLElement);
      }
    });

    // Remove people that are no longer in options
    existingElements.forEach((element, personId) => {
      if (!validPeople.includes(personId)) {
        element.remove();
        this.peopleCache.delete(personId);
      }
    });

    // Prioritize selected people first, then show limited initial set
    const selectedPeople = validPeople.filter((p) =>
      currentCriteria.includes(p)
    );
    const unselectedPeople = validPeople.filter(
      (p) => !currentCriteria.includes(p)
    );
    const peopleToShow = [
      ...selectedPeople,
      ...unselectedPeople.slice(
        0,
        Math.max(this.INITIAL_PEOPLE_LIMIT - selectedPeople.length, 16) // Use configurable initial limit
      ),
    ];

    // Add or update people
    const fragment = document.createDocumentFragment();
    peopleToShow.forEach((personId) => {
      let personElement =
        existingElements.get(personId) || this.peopleCache.get(personId);

      if (!personElement) {
        personElement = this.createPersonElement(personId);
        this.peopleCache.set(personId, personElement);
        fragment.appendChild(personElement);
      } else if (!gridContainer.contains(personElement)) {
        fragment.appendChild(personElement);
      }

      // Update selection state
      this.updatePersonElementState(
        personElement,
        currentCriteria.includes(personId)
      );
    });

    if (fragment.children.length > 0) {
      gridContainer.appendChild(fragment);
    }

    // Add "Show more" button if there are more people
    if (validPeople.length > peopleToShow.length) {
      this.addShowMoreButton(
        gridContainer,
        validPeople,
        peopleToShow,
        currentCriteria
      );
    }
  }

  /**
   * Add "Show more" button for people filter
   */
  private addShowMoreButton(
    container: HTMLElement,
    allPeople: string[],
    currentlyShown: string[],
    currentCriteria: string[]
  ): void {
    // Remove existing show more button
    const existingButton = container.querySelector(".show-more-people");
    if (existingButton) {
      existingButton.remove();
    }
    const remainingCount = allPeople.length - currentlyShown.length;
    const buttonElement = document.createElement("div");
    buttonElement.className = "show-more-people w-full mt-2";
    buttonElement.innerHTML = `
      <button class="w-full py-2 px-3 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition-colors">
        +${remainingCount} more
      </button>
    `;

    const button = buttonElement.querySelector("button") as HTMLElement;
    this.addEventListenerTracked(button, "click", (e) => {
      // Prevent event bubbling to avoid closing the dropdown
      e.preventDefault();
      e.stopPropagation();

      // Show next batch of people (pagination)
      const remainingPeople = allPeople.filter(
        (p) => !currentlyShown.includes(p)
      );

      // Show next 50 people (or all remaining if less than 50)
      const batchSize = 50;
      const nextBatch = remainingPeople.slice(0, batchSize);
      const fragment = document.createDocumentFragment();

      nextBatch.forEach((personId) => {
        let personElement = this.peopleCache.get(personId);
        if (!personElement) {
          personElement = this.createPersonElement(personId);
          this.peopleCache.set(personId, personElement);
        }
        this.updatePersonElementState(
          personElement,
          currentCriteria.includes(personId)
        );
        fragment.appendChild(personElement);
      });

      // Insert before the button
      container.insertBefore(fragment, buttonElement);

      // Update currentlyShown array
      currentlyShown.push(...nextBatch);

      // Update button or remove if no more people
      const newRemainingCount = allPeople.length - currentlyShown.length;
      if (newRemainingCount > 0) {
        button.textContent = `+${newRemainingCount} more`;
      } else {
        buttonElement.remove();
      }
    });

    container.appendChild(buttonElement);
  }


  /**
   * Create a person thumbnail element
   */
  private createPersonElement(personId: string): HTMLElement {
    const displayName =
      personId.charAt(0).toUpperCase() + personId.slice(1).toLowerCase();
    const avatarUrl = `${endpoints.GET_PERSON_IMAGE}/${personId}`;

    const element = document.createElement("div");
    element.className = "person-filter-item group cursor-pointer";
    element.dataset.personId = personId;

    element.innerHTML = `
      <div class="relative">
        <img 
          ${
            this.imageObserver
              ? `data-src="${avatarUrl}"`
              : `src="${avatarUrl}"`
          }
          alt="${displayName}"
          class="person-avatar w-14 h-14 rounded-full object-cover border-2 transition-all duration-200 bg-gray-100"
          loading="lazy"
        />
        <div class="person-fallback w-14 h-14 rounded-full bg-gray-200 border-2 border-gray-300 hidden items-center justify-center text-sm text-gray-500 font-medium">
          ${personId.substring(0, 2).toUpperCase()}
        </div>
      </div>
    `;

    const img = element.querySelector(".person-avatar") as HTMLImageElement;
    const fallback = element.querySelector(".person-fallback") as HTMLElement;

    // Add image error handling
    this.addEventListenerTracked(img, "error", () => {
      img.style.display = "none";
      fallback.style.display = "flex";
    });

    // Add to intersection observer for lazy loading
    if (this.imageObserver && img.dataset.src) {
      this.imageObserver.observe(img);
    }

    // Add click handler
    this.addEventListenerTracked(element, "click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handlePersonFilterToggle(personId);
    });

    return element;
  }

  /**
   * Update person element visual state
   */
  private updatePersonElementState(
    element: HTMLElement,
    isSelected: boolean
  ): void {
    const avatar = element.querySelector(".person-avatar") as HTMLElement;
    const fallback = element.querySelector(".person-fallback") as HTMLElement;

    if (isSelected) {
      avatar.className =
        "person-avatar w-14 h-14 rounded-full object-cover border-2 transition-all duration-200 border-blue-500 ring-2 ring-blue-200";
      if (fallback) {
        fallback.className =
          "person-fallback w-14 h-14 rounded-full bg-gray-200 border-2 border-blue-500 ring-2 ring-blue-200 hidden items-center justify-center text-sm text-gray-500 font-medium";
      }
    } else {
      avatar.className =
        "person-avatar w-14 h-14 rounded-full object-cover border-2 transition-all duration-200 border-gray-300 group-hover:border-blue-400";
      if (fallback) {
        fallback.className =
          "person-fallback w-14 h-14 rounded-full bg-gray-200 border-2 border-gray-300 hidden items-center justify-center text-sm text-gray-500 font-medium";
      }
    }
  }

  /**
   * Update standard filter (non-people) with radio buttons for single selection
   */
  private updateStandardFilter(
    content: Element,
    filterType: string,
    options: string[],
    currentCriteria: string[]
  ): void {
    const displayValue = filterType === "years" ? options : options;

    content.innerHTML =
      options.length > 0
        ? options
            .map((option) => {
              const isChecked = currentCriteria.includes(option);
              const display = filterType === "years" ? option : option;
              return `
        <label class="flex items-center space-x-2 py-1.5 px-2 hover:bg-gray-50 rounded cursor-pointer text-sm">
          <input 
            type="radio" 
            name="${filterType}-filter"
            value="${option}" 
            data-filter-type="${filterType}"
            ${isChecked ? "checked" : ""}
            class="filter-radio rounded-full border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <span class="text-gray-700 truncate flex-1">${display}</span>
        </label>
      `;
            })
            .join("")
        : `
      <div class="py-4 text-sm text-gray-500 text-center italic">
        No ${filterType} found
      </div>
    `;

    // Add event listeners to radio buttons
    const radioButtons = content.querySelectorAll(".filter-radio");
    radioButtons.forEach((radio) => {
      this.addEventListenerTracked(radio as HTMLElement, "change", (e) => {
        this.handleFilterChange(e as Event);
        // Close dropdown after selection for better UX
        setTimeout(() => this.closeAllDropdowns(), 100);
      });
    });
  }

  
  /**
   * Handle person filter toggle for thumbnail grid
   */
  private handlePersonFilterToggle(personId: string): void {
    // Clear all existing filters first to enforce single filter selection
    this.clearAllFiltersExceptContext();

    // Initialize people array if needed
    if (!this.filterCriteria.people) {
      this.filterCriteria.people = [];
    }

    const currentValues = this.filterCriteria.people;
    const index = currentValues.indexOf(personId);
    const isSelected = index > -1;

    if (isSelected) {
      // Remove person from filter (deselect)
      currentValues.splice(index, 1);
    } else {
      // Set only this person as selected (single selection)
      this.filterCriteria.people = [personId];
    }

    // Clean up empty arrays
    if (this.filterCriteria.people.length === 0) {
      delete this.filterCriteria.people;
    }

    // Update all person elements visual state
    this.updateAllPersonElementsState();

    this.applyFilters();
    this.updateActiveFilters();
    this.updateAllTabLabels();

    // Close dropdown after selection for better UX
    setTimeout(() => this.closeAllDropdowns(), 100);
  }

  /**
   * Handle filter input changes (radio buttons and checkboxes)
   */
  private handleFilterChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const filterType = input.dataset.filterType as keyof FilterCriteria;
    const value = input.value;

    if (!filterType) return;

    // Clear all existing filters first to enforce single filter selection
    this.clearAllFiltersExceptContext();

    // Only proceed if input is being checked/selected
    if (input.checked) {
      if (filterType === "years") {
        // Special handling for years - convert strings to numbers
        const numericValue = parseInt(value);
        if (!isNaN(numericValue)) {
          this.filterCriteria.years = [numericValue];
        }
      } else {
        // Standard string handling for other filter types
        (this.filterCriteria[filterType] as string[]) = [value];
      }
    }

    // Update all input elements state to reflect single selection
    this.updateAllInputElementsState();

    this.applyFilters();
    this.updateActiveFilters();
    this.updateAllTabLabels();
  }

  /**
   * Clear all filters except context filters (resourceDirectory and personContext)
   */
  private clearAllFiltersExceptContext(): void {
    // Preserve resource directory and person context while clearing user filters
    const resourceDirectory = this.filterCriteria.resourceDirectory;
    const personContext = this.filterCriteria.personContext;

    // Reset all filter criteria except context
    this.filterCriteria = {
      resourceDirectory: resourceDirectory,
      personContext: personContext,
    };
  }

  /**
   * Update all person elements visual state based on current filter criteria
   */
  private updateAllPersonElementsState(): void {
    const personElements = this.container?.querySelectorAll(
      ".person-filter-item"
    ) as NodeListOf<HTMLElement>;
    
    personElements.forEach((element) => {
      const personId = element.dataset.personId;
      if (personId) {
        const isSelected = this.filterCriteria.people?.includes(personId) || false;
        this.updatePersonElementState(element, isSelected);
      }
    });
  }

  /**
   * Update all tab labels
   */
  private updateAllTabLabels(): void {
    [
      "people",
      "years",
      "tags",
      "cameraMakes",
      "cameraModels",
      "places",
    ].forEach((filterType) => {
      this.updateTabLabel(filterType);
    });
  }

  /**
   * Update all input elements (radio buttons and checkboxes) state based on current filter criteria
   */
  private updateAllInputElementsState(): void {
    // Update radio buttons
    const radioButtons = this.container?.querySelectorAll(
      'input[type="radio"]'
    ) as NodeListOf<HTMLInputElement>;
    
    radioButtons.forEach((radio) => {
      const filterType = radio.dataset.filterType as keyof FilterCriteria;
      const value = radio.value;
      
      if (filterType) {
        const currentValues = this.filterCriteria[filterType];
        if (Array.isArray(currentValues)) {
          if (filterType === "years") {
            const numericValue = parseInt(value);
            const yearValues = currentValues as number[];
            radio.checked = !isNaN(numericValue) && yearValues.includes(numericValue);
          } else {
            const stringValues = currentValues as string[];
            radio.checked = stringValues.includes(value);
          }
        } else {
          radio.checked = false;
        }
      }
    });

    // Update any remaining checkboxes (for backward compatibility)
    const checkboxes = this.container?.querySelectorAll(
      'input[type="checkbox"]'
    ) as NodeListOf<HTMLInputElement>;
    
    checkboxes.forEach((checkbox) => {
      const filterType = checkbox.dataset.filterType as keyof FilterCriteria;
      const value = checkbox.value;
      
      if (filterType) {
        const currentValues = this.filterCriteria[filterType];
        if (Array.isArray(currentValues)) {
          if (filterType === "years") {
            const numericValue = parseInt(value);
            const yearValues = currentValues as number[];
            checkbox.checked = !isNaN(numericValue) && yearValues.includes(numericValue);
          } else {
            const stringValues = currentValues as string[];
            checkbox.checked = stringValues.includes(value);
          }
        } else {
          checkbox.checked = false;
        }
      }
    });
  }

  private transformFilterRawData(data: ImageMetaData[]): HachiImageData[] {
    return data.map((item) => ({
      id: item.resource_hash!,
      score: 1,
      metadata: item
    }));
  }

  /**
   * Apply current filters to photos
   */
  private async applyFilters(isInitialLoad: boolean = false): Promise<void> {
    console.log("Applying filters...");
    
    // If we have a query token and user has selected filters, use server-side filtering
    if (this.queryToken && this.hasActiveFilters()) {
      try {
        console.log("Using server-side filtering with criteria:", this.filterCriteria);
        
        // Determine which filter is active and get its attribute and value
        const { attribute, value } = this.getActiveFilterAttributeAndValue();
        
        if (attribute && value) {
          // Get filtered results from server using the actual selected attribute and value
          const results = await filterQueryMeta(this.queryToken, attribute, value);
          this.filteredPhotos = this.transformFilterRawData(results);
          
          console.log("Server filter results:", this.filteredPhotos);
        } else {
          console.warn("No valid filter attribute/value found");
          this.filteredPhotos = [];
        }
      } catch (error) {
        console.error("Error applying server-side filters:", error);
        // Set empty results on server error
        this.filteredPhotos = [];
      }
    } else {
      // Use client-side filtering when no query token or no active filters
      this.filteredPhotos = this.photos.filter((photo) => {
        return this.matchesFilter(photo, this.filterCriteria);
      });
    }

    this.callbacks.onFilterChange(this.filteredPhotos);
    this.updateActiveFilters();

    // Only scroll to top if this is not the initial load
    if (!isInitialLoad && !this.isInitialLoad) {
      this.scrollToTop();
    }
  }

  /**
   * Get the active filter attribute and its value for server-side filtering
   * Since we enforce single selection, only one filter should be active at a time
   */
  private getActiveFilterAttributeAndValue(): { attribute: string | null; value: string | null } {
    // Check each filter type for active selections
    if (this.filterCriteria.people?.length) {
      return { attribute: "person", value: this.filterCriteria.people[0] };
    }
    
    if (this.filterCriteria.years?.length) {
      return { attribute: "year", value: this.filterCriteria.years[0].toString() };
    }
    
    if (this.filterCriteria.cameraMakes?.length) {
      return { attribute: "cameraMake", value: this.filterCriteria.cameraMakes[0] };
    }
    
    if (this.filterCriteria.cameraModels?.length) {
      return { attribute: "cameraModel", value: this.filterCriteria.cameraModels[0] };
    }
    
    if (this.filterCriteria.places?.length) {
      return { attribute: "place", value: this.filterCriteria.places[0] };
    }
    
    if (this.filterCriteria.tags?.length) {
      return { attribute: "tag", value: this.filterCriteria.tags[0] };
    }
    
    // If search text is provided, treat it as a special case
    if (this.filterCriteria.searchText) {
      return { attribute: "searchText", value: this.filterCriteria.searchText };
    }
    
    return { attribute: null, value: null };
  }

  /**
   * Check if user has any active filters (excluding context filters)
   */
  private hasActiveFilters(): boolean {
    return !!(
      this.filterCriteria.people?.length ||
      this.filterCriteria.years?.length ||
      this.filterCriteria.cameraMakes?.length ||
      this.filterCriteria.cameraModels?.length ||
      this.filterCriteria.places?.length ||
      this.filterCriteria.tags?.length ||
      this.filterCriteria.searchText
    );
  }

  /**
   * Build filter parameters for server query based on current filter criteria
   */
  private buildServerFilterParams(): any {
    const params: any = {};

    // Add single filter selection (since we enforce single selection)
    if (this.filterCriteria.people?.length) {
      params.person = this.filterCriteria.people[0]; // Single selection
    }
    
    if (this.filterCriteria.years?.length) {
      params.year = this.filterCriteria.years[0]; // Single selection
    }
    
    if (this.filterCriteria.cameraMakes?.length) {
      params.make = this.filterCriteria.cameraMakes[0]; // Single selection
    }
    
    if (this.filterCriteria.cameraModels?.length) {
      params.model = this.filterCriteria.cameraModels[0]; // Single selection
    }
    
    if (this.filterCriteria.places?.length) {
      params.place = this.filterCriteria.places[0]; // Single selection
    }
    
    if (this.filterCriteria.tags?.length) {
      params.tag = this.filterCriteria.tags[0]; // Single selection
    }
    
    if (this.filterCriteria.searchText) {
      params.searchText = this.filterCriteria.searchText;
    }

    // Include context filters if present
    if (this.filterCriteria.resourceDirectory?.length) {
      params.resourceDirectory = this.filterCriteria.resourceDirectory;
    }
    
    if (this.filterCriteria.personContext) {
      params.personContext = this.filterCriteria.personContext;
    }

    console.log("Built server filter params:", params);
    return params;
  }
  /**
   * Check if a photo matches the current filter criteria
   */
  private matchesFilter(
    photo: HachiImageData,
    criteria: FilterCriteria
  ): boolean {
    const metadata = photo.metadata;
    if (!metadata) return Object.keys(criteria).length === 0; // Resource directory filter (context filter - must match folder context)
    if (criteria.resourceDirectory && criteria.resourceDirectory.length > 0) {
      if (!metadata.resource_directory) {
        console.log("Photo missing resource_directory:", photo.id);
        return false;
      }

      // Normalize paths for comparison (convert to backslashes for Windows)
      const photoPath = metadata.resource_directory
        .replace(/\//g, "\\")
        .toLowerCase();
      const hasMatch = criteria.resourceDirectory.some((dir) => {
        const normalizedDir = dir.replace(/\//g, "\\").toLowerCase();
        const match =
          photoPath.includes(normalizedDir) ||
          normalizedDir.includes(photoPath);

        return match;
      });

      if (!hasMatch) {
        console.log(
          "Photo does not match resource directory filter:",
          photo.id,
          photoPath
        );
        return false;
      }
    }

    // Search text filter
    if (criteria.searchText) {
      const searchFields = [
        metadata.filename,
        metadata.absolute_path,
        metadata.description,
        metadata.place,
        ...(metadata.person || []),
        ...(Array.isArray(metadata.tags)
          ? metadata.tags
          : [metadata.tags].filter(Boolean)),
      ]
        .filter(Boolean)
        .map((field) => field!.toLowerCase());

      const hasMatch = searchFields.some((field) =>
        field.includes(criteria.searchText!)
      );

      if (!hasMatch) return false;
    }

    // People filter
    if (criteria.people && criteria.people.length > 0) {
      if (!metadata.person || !Array.isArray(metadata.person)) return false;
      const hasMatch = criteria.people.some((person) =>
        metadata.person!.includes(person)
      );
      if (!hasMatch) return false;
    }

    // Year filter
    if (criteria.years && criteria.years.length > 0) {
      // Use the same robust year extraction function as in generateFilterOptions
      const extractYear = (dateString: string): number | null => {
        if (!dateString) return null;

        // Try multiple parsing approaches for different date formats
        let date: Date | null = null;

        // First try direct Date parsing
        date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.getFullYear();
        }

        // Handle Python ctime format: "sun jun 8 03:26:24 2025"
        const ctimeRegex =
          /\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+(\d{4})/i;
        const ctimeMatch = dateString.match(ctimeRegex);
        if (ctimeMatch) {
          const year = parseInt(ctimeMatch[1]);
          if (!isNaN(year) && year > 1900 && year < 3000) {
            return year;
          }
        }

        // Try to extract year from various formats using regex
        const yearRegex = /\b(19|20)\d{2}\b/;
        const yearMatch = dateString.match(yearRegex);
        if (yearMatch) {
          const year = parseInt(yearMatch[0]);
          if (!isNaN(year) && year > 1900 && year < 3000) {
            return year;
          }
        }

        return null;
      };

      // Try taken_at first, then fallback to modified_at
      let photoYear: number | null = null;
      if (metadata.taken_at) {
        photoYear = extractYear(metadata.taken_at);
      }
      if (!photoYear && metadata.modified_at) {
        photoYear = extractYear(metadata.modified_at);
      }
      if (!photoYear || !criteria.years.includes(photoYear)) return false;
    }

    // Camera make filter
    if (criteria.cameraMakes && criteria.cameraMakes.length > 0) {
      if (!metadata.make) return false;
      if (!criteria.cameraMakes.includes(metadata.make)) return false;
    }

    // Camera model filter
    if (criteria.cameraModels && criteria.cameraModels.length > 0) {
      if (!metadata.model) return false;
      if (!criteria.cameraModels.includes(metadata.model)) return false;
    }

    // Place filter
    if (criteria.places && criteria.places.length > 0) {
      if (!metadata.place) return false;
      if (!criteria.places.includes(metadata.place)) return false;
    }

    // Tags filter
    if (criteria.tags && criteria.tags.length > 0) {
      if (!metadata.tags) return false;
      const photoTags = Array.isArray(metadata.tags)
        ? metadata.tags
        : [metadata.tags];
      const hasMatch = criteria.tags.some((tag) => photoTags.includes(tag));
      if (!hasMatch) return false;
    }

    return true;
  }
  /**
   * Update active filters display
   */
  private updateActiveFilters(): void {
    const activeFiltersContainer =
      this.container?.querySelector("#active-filters");
    if (!activeFiltersContainer) return;

    const badges: string[] = []; // Compact search text badge
    if (this.filterCriteria.searchText) {
      badges.push(`
        <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors">
          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          "${this.filterCriteria.searchText}"
          <button class="ml-1.5 p-0.5 rounded-full hover:bg-blue-300 transition-colors active-filter-remove" data-type="searchText" data-value="${this.filterCriteria.searchText}">
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </span>
      `);
    } // Other filter badges
    Object.entries(this.filterCriteria).forEach(([filterType, values]) => {
      // Skip search text and resource directory (context parameter), and empty arrays
      if (
        filterType === "searchText" ||
        filterType === "resourceDirectory" ||
        !values ||
        !Array.isArray(values) ||
        values.length === 0
      )
        return;

      const displayNames: Record<string, string> = {
        people: "👥",
        years: "📅",
        cameraMakes: "📷",
        cameraModels: "📸",
        places: "📍",
        tags: "🏷️",
      };

      const colors: Record<string, string> = {
        people:
          "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
        years:
          "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
        cameraMakes:
          "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
        cameraModels:
          "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",
        places: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
        tags: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
      };

      values.forEach((value) => {
        if (filterType === "people") {
          // Special handling for people - show face thumbnail instead of text
          const avatarUrl = `${endpoints.GET_PERSON_IMAGE}/${value}`;
          const displayName =
            value.length > 15 ? value.substring(0, 15) + "..." : value;
          badges.push(`
            <span class="inline-flex items-center px-1.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              colors[filterType]
            }">
              <img 
                src="${avatarUrl}" 
                alt="${displayName}"
                class="w-5 h-5 rounded-full object-cover border border-purple-300 mr-1.5"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              />
              <div class="w-5 h-5 rounded-full bg-purple-200 border border-purple-300 items-center justify-center text-xs text-purple-600 font-medium mr-1.5" style="display:none;">
                ${value.substring(0, 2).toUpperCase()}
              </div>
              <span class="truncate max-w-[80px]" title="${value}">${displayName}</span>
              <button class="ml-1.5 p-0.5 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors active-filter-remove" data-type="${filterType}" data-value="${value}">
                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </span>
          `);
        } else {
          // Standard handling for other filter types
          const displayValue =
            value.length > 20 ? value.substring(0, 20) + "..." : value;
          badges.push(`
            <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
              colors[filterType] ||
              "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"
            }">
              <span class="mr-1">${displayNames[filterType]}</span>
              ${displayValue}
              <button class="ml-1.5 p-0.5 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors active-filter-remove" data-type="${filterType}" data-value="${value}">
                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </span>
          `);
        }
      });
    });
    if (badges.length > 0) {
      activeFiltersContainer.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex flex-wrap gap-1.5 flex-1">${badges.join("")}</div>
          <button class="clear-all-filters text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors ml-3 flex-shrink-0">
            Clear All
          </button>
        </div>
      `;
      activeFiltersContainer.classList.remove("hidden");

      // Add event listeners for individual filter removal
      const removeButtons = activeFiltersContainer.querySelectorAll(
        ".active-filter-remove"
      );
      removeButtons.forEach((button) => {
        this.addEventListenerTracked(button as HTMLElement, "click", (e) => {
          e.stopPropagation();
          const btn = e.target as HTMLElement;
          const closestButton = btn.closest(
            ".active-filter-remove"
          ) as HTMLElement;
          if (closestButton) {
            const filterType = closestButton.dataset.type;
            const filterValue = closestButton.dataset.value;
            if (filterType && filterValue) {
              this.clearFilter(filterType, filterValue);
            }
          }
        });
      });

      // Add event listener for clear all button
      const clearAllButton =
        activeFiltersContainer.querySelector(".clear-all-filters");
      if (clearAllButton) {
        this.addEventListenerTracked(
          clearAllButton as HTMLElement,
          "click",
          () => {
            this.clearAllFilters().catch(error => {
              console.error("Error clearing all filters:", error);
            });
          }
        );
      }
    } else {
      activeFiltersContainer.innerHTML = "";
      activeFiltersContainer.classList.add("hidden");
    }
  }
  /**
   * Clear a specific filter
   */
  private clearFilter(filterType: string, _filterValue: string): void {
    if (filterType === "searchText") {
      this.filterCriteria.searchText = undefined;
      // Clear the search input
      const searchInput = this.container?.querySelector(
        "#filter-search-text"
      ) as HTMLInputElement;
      if (searchInput) {
        searchInput.value = "";
      }
    } else if (this.filterCriteria[filterType as keyof FilterCriteria]) {
      // Clear the entire filter since we only allow single selections
      delete this.filterCriteria[filterType as keyof FilterCriteria];
    }

    // Update all input elements state
    this.updateAllInputElementsState();
    
    // Update all person elements state
    this.updateAllPersonElementsState();

    // Update UI and apply filters
    this.updateActiveFilters();
    this.applyFilters();

    // Update all tab labels
    this.updateAllTabLabels();

    // Scroll to top when a filter is cleared
    this.scrollToTop();
  }
  /**
   * Clear all filters
   */
  private async clearAllFilters(): Promise<void> {
    // Clear all filters including search text but preserve context
    this.clearAllFiltersExceptContext();
    this.filterCriteria.searchText = undefined;

    // Clear search input
    const searchInput = this.container?.querySelector(
      "#filter-search-text"
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.value = "";
    }

    // Clear all input elements
    const radioButtons = this.container?.querySelectorAll(
      'input[type="radio"]'
    ) as NodeListOf<HTMLInputElement>;
    radioButtons.forEach((radio) => {
      radio.checked = false;
    });

    const checkboxes = this.container?.querySelectorAll(
      'input[type="checkbox"]'
    ) as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    // Clear people thumbnail selections - update visual state
    this.updateAllPersonElementsState();

    // Update all tab labels
    this.updateAllTabLabels();

    // Close all dropdowns
    this.closeAllDropdowns();

    // Update UI state and active filters, then apply filters
    await this.updateFilterUI();
    this.updateActiveFilters();
    await this.applyFilters();

    // Scroll to top when all filters are cleared
    this.scrollToTop();
  }
  /**
   * Update search loading state in UI
   */
  private updateSearchLoadingState(isLoading: boolean): void {
    const searchInput = this.container?.querySelector(
      "#filter-search-text"
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.disabled = isLoading;
      if (isLoading) {
        searchInput.placeholder = "Searching...";
        searchInput.classList.add("opacity-50");
      } else {
        searchInput.placeholder = "Search photos... (Press Enter)";
        searchInput.classList.remove("opacity-50");
      }
    }
  }

  /**
   * Handle search errors
   */
  private handleSearchError(error: string | null): void {
    if (error) {
      console.error("Semantic search error:", error);
      // Could show error in UI if needed
    }
  }

  /**
   * Handle search completion
   */
  private handleSearchComplete(isSearchDone: boolean): void {
    if (isSearchDone) {
      console.log("Semantic search completed");
    }
  }
  /**
   * Apply current filters to semantic search results
   */
  private applyFiltersToSemanticResults(): void {
    if (!this.semanticSearchResults.length) {
      console.log("No semantic search results to filter");
      this.callbacks.onFilterChange([]);
      return;
    }

    console.log(
      "Applying filters to",
      this.semanticSearchResults.length,
      "semantic search results"
    );
    console.log("Current filter criteria:", this.filterCriteria);

    // Apply current filter criteria to semantic search results
    const filtered = this.semanticSearchResults.filter((photo) => {
      return this.matchesFilter(photo, this.filterCriteria);
    });

    console.log("Filtered results:", filtered.length, "photos");
    this.filteredPhotos = filtered;
    this.callbacks.onFilterChange(filtered);

    // Notify about semantic search results if callback exists
    if (this.callbacks.onSemanticSearch) {
      this.callbacks.onSemanticSearch(filtered);
    }

    // Scroll to top when semantic search results are filtered
    this.scrollToTop();
  }
  /**
   * Scroll to the very top of the page instantly for performance
   */
  private scrollToTop(): void {
    // Don't scroll if we're currently initializing the component
    if (this.isInitializing) {
      return;
    }

    // Always scroll to the very top of the page instantly
    window.scrollTo(0, 0);
  }
  /**
   * Perform semantic search with the given term
   */
  private async performSemanticSearch(searchTerm: string): Promise<void> {
    this.isSemanticSearchMode = true;
    this.currentSearchTerm = searchTerm;

    // Build search filters object for FuzzySearchService
    const searchFilters: SearchFilter = {};

    // Add the search term as query
    if (searchTerm.trim()) {
      searchFilters.query = [searchTerm];
    }

    // Always include resource directory context if it exists in filter criteria
    // Fix path separators for Windows and use proper directory format
    if (
      this.filterCriteria.resourceDirectory &&
      this.filterCriteria.resourceDirectory.length > 0
    ) {
      searchFilters.resource_directory = this.filterCriteria.resourceDirectory;
    }

    // Always include person context if it exists in filter criteria
    if (this.filterCriteria.personContext) {
      searchFilters.person = [this.filterCriteria.personContext];
    }

    // Use FuzzySearchService to build the query string
    const queryString = this.fuzzySearchService.buildQueryString(searchFilters);

    console.log("Performing semantic search with filters:", searchFilters);
    console.log("Generated query string:", queryString);

    try {
      // Update search loading state
      this.updateSearchLoadingState(true);

      // Call SearchApiService directly to avoid interfering with main image search UI
      const rawData = await SearchApiService.searchImages(queryString, {
        isInitialSearch: true,
      }); // Transform raw data to HachiImageData format using utility function
      const photos = transformRawDataChunk(rawData); // Sort photos by score in descending order (highest scores first)
      photos.sort((a, b) => {
        const scoreA = parseFloat(String(a.score || 0));
        const scoreB = parseFloat(String(b.score || 0));
        return scoreB - scoreA;
      });

      console.log("Semantic search completed:", photos.length, "photos");

      // Store results and apply filters
      this.semanticSearchResults = photos;
      this.applyFiltersToSemanticResults();
    } catch (error) {
      console.error("Failed to perform semantic search:", error);
      this.handleSearchError(
        error instanceof Error ? error.message : "Search failed"
      );
      this.clearSemanticSearch();
    } finally {
      // Update search loading state
      this.updateSearchLoadingState(false);
    }
  }
  /**
   * Clear semantic search and return to normal filtering
   */
  private clearSemanticSearch(): void {
    this.isSemanticSearchMode = false;
    this.currentSearchTerm = "";
    this.semanticSearchResults = [];

    // Clear the search text from filter criteria but preserve resource directory and person context
    this.filterCriteria.searchText = undefined;

    // Apply normal filters to original photos
    this.applyFilters();
  }
  /**
   * Set resource directory context for filtering
   */
  setResourceDirectory(directories: string[]): void {
    // Set as context, not as a user filter - this won't appear in the UI
    this.filterCriteria.resourceDirectory =
      directories.length > 0 ? directories : undefined;

    // If we're in semantic search mode, restart the search to include the new context
    if (this.isSemanticSearchMode && this.currentSearchTerm) {
      this.performSemanticSearch(this.currentSearchTerm);
    } else {
      // Otherwise apply normal filters
      this.applyFilters();
    }
  }

  /**
   * Set person context for filtering (used in person photos pages)
   */
  setPersonContext(personId: string): void {
    // Set as context, not as a user filter - this won't appear in the UI
    this.filterCriteria.personContext = personId;

    // If we're in semantic search mode, restart the search to include the new context
    if (this.isSemanticSearchMode && this.currentSearchTerm) {
      this.performSemanticSearch(this.currentSearchTerm);
    } else {
      // Otherwise apply normal filters
      this.applyFilters();
    }
  }

  /**
   * Get current search mode
   */
  isInSemanticSearchMode(): boolean {
    return this.isSemanticSearchMode;
  }

  /**
   * Get current semantic search term
   */
  getCurrentSearchTerm(): string {
    return this.currentSearchTerm;
  }
}
