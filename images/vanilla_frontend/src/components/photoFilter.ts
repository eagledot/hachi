// Reusable Photo Filter Component
// This component provides filtering functionality for photo grids based on metadata

import type { HachiImageData } from "../imageSearch/types";
import { html } from "../utils";
import { SearchApiService } from "../imageSearch/apiService";
import {
  FuzzySearchService,
  type SearchFilter,
} from "../imageSearch/fuzzySearchService";
import { debounce, transformRawDataChunk } from "../imageSearch/utils";

export interface FilterCriteria {
  people?: string[];
  years?: number[];
  cameraMakes?: string[];
  cameraModels?: string[];
  places?: string[];
  tags?: string[];
  searchText?: string;
  resourceDirectory?: string[];
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
}

export class PhotoFilterComponent {
  private photos: HachiImageData[] = [];
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
  private container: HTMLElement | null = null;  private eventListeners: Map<HTMLElement, (() => void)[]> = new Map(); // Track event listeners
  private peopleCache: Map<string, HTMLElement> = new Map(); // Cache people DOM elements
  private imageObserver: IntersectionObserver | null = null; // Lazy loading observer
  private readonly INITIAL_PEOPLE_LIMIT = 20; // Show only first 20 people initially

  // Semantic search related properties
  private fuzzySearchService: FuzzySearchService;  private isSemanticSearchMode: boolean = false;
  private currentSearchTerm: string = "";
  private isInitialLoad: boolean = true; // Track if this is initial load
  private isInitializing: boolean = false; // Track if we're in initialization phase

  constructor(callbacks: FilterCallbacks) {
    this.callbacks = callbacks;
    this.fuzzySearchService = new FuzzySearchService();
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
  }  /**
   * Update the photos and regenerate filter options
   */
  updatePhotos(photos: HachiImageData[]): void {
    this.isInitializing = true; // Mark that we're starting initialization
    this.photos = [...photos];
    this.generateFilterOptions();
    this.applyFilters(true); // Pass true to indicate this is initial load
    this.updateFilterUI();
    this.isInitialLoad = false; // Mark that initial load is complete
    
    // Use setTimeout to allow any pending calls to complete before clearing initializing flag
    setTimeout(() => {
      this.isInitializing = false;
    }, 100);
  }

  /**
   * Get the currently filtered photos
   */
  getFilteredPhotos(): HachiImageData[] {
    return [...this.filteredPhotos];
  }
  /**
   * Reset all filters
   */  resetFilters(): void {
    // Preserve resource directory context when resetting
    const resourceDirectory = this.filterCriteria.resourceDirectory;
    this.filterCriteria = { resourceDirectory };
    this.applyFilters();
    this.updateFilterUI();
    
    // Scroll to top when filters are reset
    this.scrollToTop();
  }

  /**
   * Clean up event listeners and caches
   */ destroy(): void {
    // Remove all tracked event listeners
    this.eventListeners.forEach((listeners) => {
      listeners.forEach((removeListener) => removeListener());
    });
    this.eventListeners.clear(); // Clear caches
    this.peopleCache.clear();

    // Disconnect image observer
    if (this.imageObserver) {
      this.imageObserver.disconnect();
      this.imageObserver = null;
    }

    // Cleanup fuzzy search service
    this.fuzzySearchService.cleanup();
  }

  /**
   * Setup intersection observer for lazy loading images
   */
  private setupImageObserver(): void {
    if ("IntersectionObserver" in window) {
      this.imageObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute("data-src");
                this.imageObserver?.unobserve(img);
              }
            }
          });
        },
        {
          rootMargin: "50px 0px",
          threshold: 0.1,
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
    element.addEventListener(type, listener);

    const removeListener = () => element.removeEventListener(type, listener);

    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, []);
    }
    this.eventListeners.get(element)!.push(removeListener);
  }
  /**
   * Generate the HTML template for the filter component
   */
  static getTemplate(containerId: string = "photo-filter"): string {    return html`
      <!-- Photo Filter Component - Compact Sidebar Style -->
      <div
        id="${containerId}"
        class="bg-white border border-gray-200 rounded-lg shadow-sm sticky top-4 max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
      >
        <!-- Compact Header -->
        <div
          class="flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100"
        >          <h3 class="text-base font-semibold text-gray-900 flex items-center">
            <svg
              class="w-4 h-4 mr-2 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"
              ></path>
            </svg>
            Filters
          </h3>          <button
            id="reset-filters"
            class="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium flex items-center space-x-1"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>Reset</span>
          </button>
        </div>        <!-- Compact Scrollable Content -->
        <div class="flex-1 overflow-y-auto">
          <div class="p-3 space-y-4">
            <!-- Compact Search Text Filter -->
            <div class="filter-group">
              <label class="block text-xs font-medium text-gray-700 mb-2"
                >Search</label
              >
              <input
                type="text"
                id="filter-search-text"
                placeholder="Search photos... (Press Enter)"
                class="w-full px-2.5 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>            <!-- Compact Filter Sections -->
            <div class="space-y-3">              <!-- Compact People Filter -->
              <div class="filter-section">
                <button
                  class="filter-toggle w-full flex items-center justify-between py-1.5 text-left group"
                  data-filter="people"
                >
                  <span class="flex items-center space-x-2">
                    <span
                      class="text-xs font-medium text-gray-700 group-hover:text-gray-900"
                      >👥 People</span
                    >
                    <span
                      id="people-count"
                      class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      >0</span
                    >
                  </span>
                  <svg
                    class="filter-chevron w-3.5 h-3.5 text-gray-400 transform transition-transform group-hover:text-gray-600"
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
                <div
                  id="people-filter-content"
                  class="filter-content hidden mt-1.5 ml-3"
                >
                  <div
                    class="max-h-40 overflow-y-auto border-l-2 border-gray-100 pl-2"
                  >
                    <!-- People thumbnails grid will be inserted here -->
                  </div>
                </div>
              </div>              <!-- Compact Years Filter -->
              <div class="filter-section">
                <button
                  class="filter-toggle w-full flex items-center justify-between py-1.5 text-left group"
                  data-filter="years"
                >
                  <span class="flex items-center space-x-2">
                    <span
                      class="text-xs font-medium text-gray-700 group-hover:text-gray-900"
                      >📅 Years</span
                    >
                    <span
                      id="years-count"
                      class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      >0</span
                    >
                  </span>
                  <svg
                    class="filter-chevron w-3.5 h-3.5 text-gray-400 transform transition-transform group-hover:text-gray-600"
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
                <div
                  id="years-filter-content"
                  class="filter-content hidden mt-1.5 ml-3"
                >
                  <div
                    class="max-h-28 overflow-y-auto space-y-0.5 border-l-2 border-gray-100 pl-2"
                  >
                    <!-- Years checkboxes will be inserted here -->
                  </div>
                </div>
              </div>              <!-- Compact Camera Make Filter -->
              <div class="filter-section">
                <button
                  class="filter-toggle w-full flex items-center justify-between py-1.5 text-left group"
                  data-filter="cameraMakes"
                >
                  <span class="flex items-center space-x-2">
                    <span
                      class="text-xs font-medium text-gray-700 group-hover:text-gray-900"
                      >📷 Camera</span
                    >
                    <span
                      id="cameraMakes-count"
                      class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      >0</span
                    >
                  </span>
                  <svg
                    class="filter-chevron w-3.5 h-3.5 text-gray-400 transform transition-transform group-hover:text-gray-600"
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
                <div
                  id="cameraMakes-filter-content"
                  class="filter-content hidden mt-1.5 ml-3"
                >
                  <div
                    class="max-h-28 overflow-y-auto space-y-0.5 border-l-2 border-gray-100 pl-2"
                  >
                    <!-- Camera makes checkboxes will be inserted here -->
                  </div>
                </div>
              </div>              <!-- Compact Camera Model Filter -->
              <div class="filter-section">
                <button
                  class="filter-toggle w-full flex items-center justify-between py-1.5 text-left group"
                  data-filter="cameraModels"
                >
                  <span class="flex items-center space-x-2">
                    <span
                      class="text-xs font-medium text-gray-700 group-hover:text-gray-900"
                      >📸 Model</span
                    >
                    <span
                      id="cameraModels-count"
                      class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      >0</span
                    >
                  </span>
                  <svg
                    class="filter-chevron w-3.5 h-3.5 text-gray-400 transform transition-transform group-hover:text-gray-600"
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
                <div
                  id="cameraModels-filter-content"
                  class="filter-content hidden mt-1.5 ml-3"
                >
                  <div
                    class="max-h-28 overflow-y-auto space-y-0.5 border-l-2 border-gray-100 pl-2"
                  >
                    <!-- Camera models checkboxes will be inserted here -->
                  </div>
                </div>
              </div>              <!-- Compact Places Filter -->
              <div class="filter-section">
                <button
                  class="filter-toggle w-full flex items-center justify-between py-1.5 text-left group"
                  data-filter="places"
                >
                  <span class="flex items-center space-x-2">
                    <span
                      class="text-xs font-medium text-gray-700 group-hover:text-gray-900"
                      >📍 Places</span
                    >
                    <span
                      id="places-count"
                      class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      >0</span
                    >
                  </span>
                  <svg
                    class="filter-chevron w-3.5 h-3.5 text-gray-400 transform transition-transform group-hover:text-gray-600"
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
                <div
                  id="places-filter-content"
                  class="filter-content hidden mt-1.5 ml-3"
                >
                  <div
                    class="max-h-28 overflow-y-auto space-y-0.5 border-l-2 border-gray-100 pl-2"
                  >
                    <!-- Places checkboxes will be inserted here -->
                  </div>
                </div>
              </div>              <!-- Compact Tags Filter -->
              <div class="filter-section">
                <button
                  class="filter-toggle w-full flex items-center justify-between py-1.5 text-left group"
                  data-filter="tags"
                >
                  <span class="flex items-center space-x-2">
                    <span
                      class="text-xs font-medium text-gray-700 group-hover:text-gray-900"
                      >🏷️ Tags</span
                    >
                    <span
                      id="tags-count"
                      class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      >0</span
                    >
                  </span>
                  <svg
                    class="filter-chevron w-3.5 h-3.5 text-gray-400 transform transition-transform group-hover:text-gray-600"
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
                <div
                  id="tags-filter-content"
                  class="filter-content hidden mt-1.5 ml-3"
                >
                  <div
                    class="max-h-28 overflow-y-auto space-y-0.5 border-l-2 border-gray-100 pl-2"
                  >
                    <!-- Tags checkboxes will be inserted here -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Filters Footer -->
        <div id="active-filters" class="border-t border-gray-200 bg-gray-50">
          <!-- Active filter badges will be displayed here -->
        </div>
      </div>
    `;
  }

  /**
   * Render the filter component
   */
  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = PhotoFilterComponent.getTemplate().replace(
      /id="photo-filter"/,
      `id="${this.container.id}"`
    );
  }

  /**
   * Setup event listeners for filter interactions
   */
  private setupEventListeners(): void {
    if (!this.container) return; // Search text filter - now with semantic search on Enter key
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
              console.log("1. Calling performSemanticSearch with:", searchTerm);
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

    // Toggle filter sections
    const toggleBtns = this.container.querySelectorAll(".filter-toggle");
    toggleBtns.forEach((btn) => {
      this.addEventListenerTracked(btn as HTMLElement, "click", (e) => {
        const button = e.currentTarget as HTMLElement;
        const filterType = button.dataset.filter;
        if (filterType) {
          this.toggleFilterSection(filterType);
        }
      });
    });
  }

  /**
   * Generate filter options from current photos
   */
  private generateFilterOptions(): void {
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
      if (!metadata) return; // People
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
      } // Years from taken_at with fallback to modified_at
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
  private updateFilterUI(): void {
    if (!this.container) return;

    this.updateFilterSection("people", this.filterOptions.people);
    this.updateFilterSection("years", this.filterOptions.years.map(String));
    this.updateFilterSection("cameraMakes", this.filterOptions.cameraMakes);
    this.updateFilterSection("cameraModels", this.filterOptions.cameraModels);
    this.updateFilterSection("places", this.filterOptions.places);
    this.updateFilterSection("tags", this.filterOptions.tags);
    this.updateActiveFilters();
  }
  /**
   * Update a specific filter section
   */  private updateFilterSection(filterType: string, options: string[]): void {
    const content = this.container?.querySelector(
      `#${filterType}-filter-content .max-h-40, #${filterType}-filter-content .max-h-28`
    );
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
        personId !== "no_person_detected" && personId !== "no_categorical_info"
    );

    if (validPeople.length === 0) {
      content.innerHTML = `
        <div class="py-4 text-xs text-gray-500 text-center italic">
          No people found
        </div>
      `;
      return;
    }

    // Create or update grid container
    let gridContainer = content.querySelector(".people-grid") as HTMLElement;
    if (!gridContainer) {
      gridContainer = document.createElement("div");
      gridContainer.className = "people-grid grid grid-cols-3 gap-2 py-2";
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
        this.INITIAL_PEOPLE_LIMIT - selectedPeople.length
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
    }    const remainingCount = allPeople.length - currentlyShown.length;
    const buttonElement = document.createElement("div");
    buttonElement.className = "show-more-people col-span-3 mt-1.5";
    buttonElement.innerHTML = `
      <button class="w-full py-1.5 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition-colors">
        Show ${remainingCount} more people...
      </button>
    `;

    const button = buttonElement.querySelector("button") as HTMLElement;
    this.addEventListenerTracked(button, "click", () => {
      // Show all remaining people
      const remainingPeople = allPeople.filter(
        (p) => !currentlyShown.includes(p)
      );
      const fragment = document.createDocumentFragment();

      remainingPeople.forEach((personId) => {
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
      buttonElement.remove();
    });

    container.appendChild(buttonElement);
  }
  /**
   * Create a person thumbnail element
   */
  private createPersonElement(personId: string): HTMLElement {
    const displayName =
      personId.charAt(0).toUpperCase() + personId.slice(1).toLowerCase();
    const avatarUrl = SearchApiService.getPersonImageUrl(personId);

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
          class="person-avatar w-12 h-12 rounded-full object-cover border-2 transition-all duration-200 bg-gray-100"
          loading="lazy"
        />
        <div class="person-fallback w-12 h-12 rounded-full bg-gray-200 border-2 border-gray-300 hidden items-center justify-center text-xs text-gray-500 font-medium">
          ${personId.substring(0, 2).toUpperCase()}
        </div>
        <div class="person-checkmark absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full hidden items-center justify-center">
          <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
        </div>
      </div>
      <div class="text-xs text-center mt-1 text-gray-600 truncate max-w-[48px]" title="${displayName}">
        ${displayName}
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
    const checkmark = element.querySelector(".person-checkmark") as HTMLElement;

    if (isSelected) {
      avatar.className =
        "person-avatar w-12 h-12 rounded-full object-cover border-2 transition-all duration-200 border-blue-500 ring-2 ring-blue-200";
      checkmark.style.display = "flex";
    } else {
      avatar.className =
        "person-avatar w-12 h-12 rounded-full object-cover border-2 transition-all duration-200 border-gray-300 group-hover:border-blue-400";
      checkmark.style.display = "none";
    }
  }

  /**
   * Update standard filter (non-people) with checkboxes
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
              const display = filterType === "years" ? option : option;              return `
        <label class="flex items-center space-x-1.5 py-0.5 hover:bg-gray-50 rounded cursor-pointer text-xs">
          <input 
            type="checkbox" 
            value="${option}" 
            data-filter-type="${filterType}"
            ${isChecked ? "checked" : ""}
            class="filter-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
          />
          <span class="text-gray-700 truncate flex-1">${display}</span>
        </label>
      `;
            })
            .join("")
        : `
      <div class="py-2 text-xs text-gray-500 text-center italic">
        No ${filterType} found
      </div>
    `;

    // Add event listeners to checkboxes
    const checkboxes = content.querySelectorAll(".filter-checkbox");
    checkboxes.forEach((checkbox) => {
      this.addEventListenerTracked(checkbox as HTMLElement, "change", (e) => {
        this.handleFilterChange(e as Event);
      });
    });
  }
  /**
   * Handle person filter toggle for thumbnail grid
   */
  private handlePersonFilterToggle(personId: string): void {
    // Initialize people array if needed
    if (!this.filterCriteria.people) {
      this.filterCriteria.people = [];
    }

    const currentValues = this.filterCriteria.people;
    const index = currentValues.indexOf(personId);
    const isSelected = index > -1;

    if (isSelected) {
      // Remove person from filter
      currentValues.splice(index, 1);
    } else {
      // Add person to filter
      currentValues.push(personId);
    }

    // Clean up empty arrays
    if (currentValues.length === 0) {
      delete this.filterCriteria.people;
    }

    // Update visual state for this specific person only
    const personElement = this.container?.querySelector(
      `[data-person-id="${personId}"]`
    ) as HTMLElement;
    if (personElement) {
      this.updatePersonElementState(personElement, !isSelected);
    }

    this.applyFilters();
    this.updateActiveFilters();
  }

  /**
   * Handle filter checkbox changes
   */ private handleFilterChange(e: Event): void {
    const checkbox = e.target as HTMLInputElement;
    const filterType = checkbox.dataset.filterType as keyof FilterCriteria;
    const value = checkbox.value;

    if (!filterType) return;

    // Initialize array if needed
    if (!this.filterCriteria[filterType]) {
      (this.filterCriteria[filterType] as any) = [];
    }

    if (filterType === "years") {
      // Special handling for years - convert strings to numbers
      const currentValues = this.filterCriteria[filterType] as number[];
      const numericValue = parseInt(value);

      if (isNaN(numericValue)) return; // Skip invalid numbers

      if (checkbox.checked) {
        // Add filter
        if (!currentValues.includes(numericValue)) {
          currentValues.push(numericValue);
        }
      } else {
        // Remove filter
        const index = currentValues.indexOf(numericValue);
        if (index > -1) {
          currentValues.splice(index, 1);
        }
      }

      // Clean up empty arrays
      if (currentValues.length === 0) {
        delete this.filterCriteria[filterType];
      }
    } else {
      // Standard string handling for other filter types
      const currentValues = this.filterCriteria[filterType] as string[];

      if (checkbox.checked) {
        // Add filter
        if (!currentValues.includes(value)) {
          currentValues.push(value);
        }
      } else {
        // Remove filter
        const index = currentValues.indexOf(value);
        if (index > -1) {
          currentValues.splice(index, 1);
        }
      }

      // Clean up empty arrays
      if (currentValues.length === 0) {
        delete this.filterCriteria[filterType];
      }
    }

    this.applyFilters();
    this.updateActiveFilters();
  }

  /**
   * Toggle filter section visibility
   */
  private toggleFilterSection(filterType: string): void {
    const content = this.container?.querySelector(
      `#${filterType}-filter-content`
    );
    const chevron = this.container?.querySelector(
      `[data-filter="${filterType}"] .filter-chevron`
    );

    if (!content || !chevron) return;

    const isHidden = content.classList.contains("hidden");

    if (isHidden) {
      content.classList.remove("hidden");
      chevron.classList.add("rotate-180");
    } else {
      content.classList.add("hidden");
      chevron.classList.remove("rotate-180");
    }
  }  /**
   * Apply current filters to photos
   */
  private applyFilters(isInitialLoad: boolean = false): void {
    this.filteredPhotos = this.photos.filter((photo) => {
      return this.matchesFilter(photo, this.filterCriteria);
    });

    this.callbacks.onFilterChange(this.filteredPhotos);
    this.updateActiveFilters();
    
    // Only scroll to top if this is not the initial load
    if (!isInitialLoad && !this.isInitialLoad) {
      this.scrollToTop();
    }
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
    } // Year filter
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

    const badges: string[] = [];    // Compact search text badge
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
    }// Other filter badges
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
        const displayValue =
          filterType === "people"
            ? value.length > 20
              ? value.substring(0, 20) + "..."
              : value
            : value;        badges.push(`
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
      });
    });    if (badges.length > 0) {
      activeFiltersContainer.innerHTML = `
        <div class="p-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-1.5">
              <svg class="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"></path>
              </svg>
              <span class="text-xs font-semibold text-gray-700">Active Filters (${
                badges.length
              })</span>
            </div>
            <button class="clear-all-filters text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">
              Clear All
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5">${badges.join("")}</div>
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
            this.clearAllFilters();
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
  private clearFilter(filterType: string, filterValue: string): void {
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
      if (filterType === "years") {
        // Special handling for years - convert string back to number for removal
        const filterArray = this.filterCriteria[filterType] as number[];
        const numericValue = parseInt(filterValue);
        if (!isNaN(numericValue)) {
          const index = filterArray.indexOf(numericValue);
          if (index > -1) {
            filterArray.splice(index, 1);
          }
        }
      } else {
        // Standard string handling for other filter types
        const filterArray = this.filterCriteria[
          filterType as keyof FilterCriteria
        ] as string[];
        const index = filterArray.indexOf(filterValue);
        if (index > -1) {
          filterArray.splice(index, 1);
        }
      }
    }    // Update UI and apply filters
    this.updateActiveFilters();
    this.applyFilters();
    
    // Scroll to top when a filter is cleared
    this.scrollToTop();
  }
  /**
   * Clear all filters
   */
  private clearAllFilters(): void {
    // Preserve resource directory context while clearing user filters
    const resourceDirectory = this.filterCriteria.resourceDirectory;

    // Reset all filter criteria
    this.filterCriteria = {
      searchText: undefined,
      people: [],
      years: [],
      cameraMakes: [],
      cameraModels: [],
      places: [],
      tags: [],
      resourceDirectory: resourceDirectory, // Preserve context
    };

    // Clear search input
    const searchInput = this.container?.querySelector(
      "#filter-search-text"
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.value = "";
    }

    // Clear all checkboxes
    const checkboxes = this.container?.querySelectorAll(
      'input[type="checkbox"]'
    ) as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    // Clear people thumbnail selections
    const selectedThumbnails = this.container?.querySelectorAll(
      ".person-thumbnail.selected"
    ) as NodeListOf<HTMLElement>;
    selectedThumbnails.forEach((thumbnail) => {
      thumbnail.classList.remove("selected");
      const checkmark = thumbnail.querySelector(".checkmark");
      if (checkmark) {
        checkmark.classList.add("hidden");
      }
    });    // Update UI state and active filters, then apply filters
    this.updateFilterUI();
    this.updateActiveFilters();
    this.applyFilters();
    
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
  }  /**
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
  }  /**
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
      const resourceDirs = this.filterCriteria.resourceDirectory.map((dir) =>
        dir.replace(/\//g, "\\")
      );
      // Convert forward slashes to backslashes for Windows
      

      searchFilters.resource_directory = resourceDirs;
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
      });      // Transform raw data to HachiImageData format using utility function
      const photos = transformRawDataChunk(rawData);      // Sort photos by score in descending order (highest scores first)
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

    // Clear the search text from filter criteria but preserve resource directory context
    this.filterCriteria.searchText = undefined;

    // Apply normal filters to original photos
    this.applyFilters();
  }
  /**
   * Set resource directory context for filtering
   */
  setResourceDirectory(directories: string[]): void {
    // Convert forward slashes to backslashes for Windows paths
    const normalizedDirectories = directories.map((dir) =>
      dir.replace(/\//g, "\\")
    );

    // Set as context, not as a user filter - this won't appear in the UI
    this.filterCriteria.resourceDirectory =
      normalizedDirectories.length > 0 ? normalizedDirectories : undefined;

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
