import "./style.css";
import { Layout } from "./components/layout";

import { endpoints } from "./config";
import { html } from "./utils";
import { PaginationComponent } from "./components/pagination";

// Initialize the layout for the people page
new Layout({
  title: "People - Hachi",
  currentPage: "/people.html",
  showNavbar: true,
});

interface Person {
  id: string;
  name?: string;
}

/**
 * Main PeopleApp class for managing the people page UI and logic.
 * Organized for clarity, maintainability, and separation of concerns.
 */
class PeopleApp {
  // Data
  private people: Person[] = [];
  private filteredPeople: Person[] = [];

  // Pagination
  private readonly itemsPerPage = 100;
  private currentPage = 0;
  private paginationComponent?: PaginationComponent;

  // DOM Elements
  private paginationContainerElement: HTMLElement | null = null;

  constructor() {
    this.waitForDOMReady(() => this.initializeApp());
  }

  // --- Initialization ---

  /**
   * Waits for the DOM to be fully loaded before executing the callback.
   * Ensures that DOM elements are available for manipulation.
   */
  private waitForDOMReady(callback: () => void) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  /**
   * Initializes the app after the DOM is ready.
   * Caches DOM elements, sets up event listeners, and starts the main logic.
   */
  private initializeApp() {
    this.cacheDOMElements();
    this.setupPaginationEventListeners();
    this.init();
  }

  /**
   * Caches frequently accessed DOM elements for performance and convenience.
   * Reduces repeated DOM queries throughout the class.
   */
  private cacheDOMElements() {
    this.paginationContainerElement = document.getElementById("pagination-container");
  }
  /**
   * Main initialization logic for the people page.
   * Reads the current page from the URL (if present) and loads people data.
   * This method is called after DOM is ready and all elements are cached.
   */
  private init() {
    // Parse the current URL to extract query parameters
    const urlParams = new URLSearchParams(window.location.search); // Get URL parameters

    // Attempt to read the "page" parameter from the URL (for pagination)
    const pageParam = urlParams.get("page"); // Get the page parameter

    // If the page parameter exists and is a valid number, set the current page accordingly
    if (pageParam && !isNaN(Number(pageParam))) {
      // Check if pageParam is a valid number
      // Convert to zero-based index (UI is 1-based, internal is 0-based)
      this.currentPage = Math.max(0, Number(pageParam) - 1); // Set currentPage based on pageParam
    }

    // Begin loading people data from the API
    this.loadPeople(); // Load people data
  }

  /**
   * Loads the list of people from the API.
   * Handles loading state, error handling, and initializes people data.
   */
  private async loadPeople() {
    this.showLoading(true); // Show loading indicator while fetching data
    try {
      console.log("Fetching people...");
      // Fetch people data from the API endpoint
      const response = await fetch(endpoints.GET_PEOPLE);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`); // Handle HTTP errors

      // Parse the JSON response (expected to be an array of person IDs)
      const data: string[] = await response.json();

      // Map the array of IDs to Person objects
      this.people = data.map((id) => ({ id }));

      // Initialize filteredPeople with all people (no filtering yet)
      this.filteredPeople = [...this.people];

      // Apply filtering and update UI
      this.filterPeople();
    } catch (error) {
      // Log error and show user-friendly error message
      console.error("Error loading people:", error);
      this.showError("Failed to load people. Please try again.");
    } finally {
      // Hide loading indicator regardless of success or failure
      this.showLoading(false);
    }
  }

  /**
   * Filters the people list (currently no filtering logic, just copies all people).
   * Updates pagination, URL, renders people, and restores scroll position.
   * This method can be extended to support search/filtering in the future.
   */
  private filterPeople() {
    this.setupPagination();
    this.updatePageInUrl();
    this.renderPeople();
    this.restoreScrollPosition();
  }

  /**
   * Sets up event listeners for pagination buttons (previous/next).
   * Handles page navigation and updates the UI accordingly.
   */
  private setupPaginationEventListeners() {
    // No-op: handled by PaginationComponent
  }

  private setupPagination() {
    if (!this.paginationContainerElement) return;
    this.paginationContainerElement.innerHTML = "";
    this.paginationComponent = new PaginationComponent({
      container: this.paginationContainerElement,
      totalItems: this.filteredPeople.length,
      itemsPerPage: this.itemsPerPage,
      initialPage: this.currentPage,
      onPageChange: (page) => {
        this.currentPage = page;
        this.updatePageInUrl();
        this.renderPeople();
        window.scrollTo({ top: 0 });
        this.saveScrollPosition(0);
      },
    });
  }

  /**
   * Updates pagination state variables based on the current filtered people list.
   * Ensures currentPage is within valid bounds after filtering or data changes.
   */


  /**
   * Updates the pagination state and re-renders the people grid.
   * Scrolls to the top of the page and resets the saved scroll position.
   * This is called after changing pages via pagination controls.
   */

  private async updatePaginationAndRender() {
    // No-op: handled by PaginationComponent
  }

  // --- Rendering ---

  /**
   * Renders the people grid for the current page.
   * Handles empty state, pagination, and updates the UI accordingly.
   */
  private renderPeople() {
    const grid = document.getElementById("people-grid");
    const noPeopleMsg = document.getElementById("no-people");
    if (!grid || !noPeopleMsg) return;

    if (this.filteredPeople.length === 0) {
      grid.innerHTML = "";
      noPeopleMsg.classList.remove("hidden");
      return;
    }
    noPeopleMsg.classList.add("hidden");

    const startIdx = this.currentPage * this.itemsPerPage;
    const endIdx = Math.min(startIdx + this.itemsPerPage, this.filteredPeople.length);
    const peopleToShow = this.filteredPeople.slice(startIdx, endIdx);

    grid.innerHTML = peopleToShow.map((person) => this.renderPersonCard(person)).join("");
    this.updatePageInUrl();
  }

  private renderPersonCard(person: Person): string {
    const isAutoDetected = person.id.toLowerCase().startsWith("cluster");
    const displayName = isAutoDetected ? "Unnamed Person" : person.id;
    const avatarUrl = `${endpoints.GET_PERSON_IMAGE}/${person.id}`;
    const hasCustomName = !isAutoDetected;
    return html`
      <div
        class="group bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden relative active:scale-98"
        style="margin:8px;"
        onclick="window.peopleApp.handlePersonClick('${person.id}')"
      >
        <!-- Status badge -->
        ${hasCustomName ? `
        <div class="absolute top-1 sm:top-2 right-1 sm:right-2 z-10">
          <span
            class="inline-flex items-center px-1.5 sm:px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 border border-green-200"
          >
            <svg class="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="hidden sm:inline">${person.id}</span>
            <span class="sm:hidden">${
              person.id.length > 8
                ? person.id.substring(0, 8) + "..."
                : person.id
            }</span>
          </span>
        </div>
        ` : ""}
        <div
          class="aspect-square bg-gray-100 relative overflow-hidden flex items-center justify-center"
        >
          <img
            src="${avatarUrl}"
            alt="${displayName}"
            class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 rounded-t-xl"
            onerror="this.src='./assets/sample_place_bg.jpg'; this.classList.add('opacity-75')"
            loading="lazy"
          />
          <div
            class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-60 transition-opacity duration-200 flex items-center justify-center"
          >
            <div class="flex space-x-2">
              <button
                class="p-1 bg-white/90 rounded-full hover:bg-white transition-colors duration-150 shadow"
                onclick="event.stopPropagation(); window.peopleApp.viewPersonDetails('${person.id}')"
              >
                <svg
                  class="w-4 h-4 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  ></path>
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  ></path>
                </svg>
              </button>
              <button
                class="p-1 bg-white/90 rounded-full hover:bg-white transition-colors duration-150 shadow"
                onclick="event.stopPropagation(); window.peopleApp.editPersonName('${person.id}')"
              >
                <svg
                  class="w-4 h-4 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
      </div>
    `;
  }

  // --- User Actions ---

  public handlePersonClick(personId: string) {
    this.saveScrollPosition(window.scrollY);
    // Pass current page in URL for back navigation
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("page", (this.currentPage + 1).toString());
    window.location.href = `/person-photos.html?id=${encodeURIComponent(
      personId
    )}`;
  }

  // --- Pagination State in URL ---
  private updatePageInUrl() {
    const url = new URL(window.location.href); // Create a new URL object
    url.searchParams.set("page", (this.currentPage + 1).toString()); // Update the page parameter
    window.history.pushState({}, "", url.toString()); // Update the browser's URL without reloading
  }

  // --- Scroll Position Persistence ---
  private saveScrollPosition(pos: number) {
    try {
      // Should I use sessionStorage or localStorage?
      sessionStorage.setItem("peoplePageScroll", String(pos));
    } catch {
      console.error("Failed to save scroll position:", pos);
    }
  }

  // --- Scroll Position Restoration ---
  private restoreScrollPosition() {
    try {
      const pos = sessionStorage.getItem("peoplePageScroll");
      if (pos) {
        // Ensure scroll position is restored after the DOM is fully rendered and painted to the screen
        // For now, I am using timeout. Other approaches could be considered later such as using requestAnimationFrame if the current approach proves insufficient
        setTimeout(() => {
          window.scrollTo(0, parseInt(pos, 10));
          sessionStorage.removeItem("peoplePageScroll");
        }, 0);
      }
    } catch {
      console.error("Failed to restore scroll position");
    }
  }

  public viewPersonDetails(personId: string) {
    window.location.href = `/person-photos.html?id=${encodeURIComponent(
      personId
    )}`;
  }

  public editPersonName(personId: string) {
    const person = this.people.find((p) => p.id === personId);
    const currentName = person?.name || personId;
    const promptText =
      window.innerWidth < 640
        ? `Edit name for person:\n\nCurrent: ${currentName}\n\nEnter new name:`
        : `Edit name for person:`;
    const newName = prompt(promptText, currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      this.renamePersonGlobally(personId, newName.trim())
        .then((success) => {
          if (success) {
            if (window.innerWidth < 640) {
              this.showSuccessMessage("Name updated successfully!");
              setTimeout(() => window.location.reload(), 1000);
            } else {
              window.location.reload();
            }
          }
        })
        .catch((error) => {
          console.error("Failed to rename person:", error);
          this.showError("Failed to rename person. Please try again.");
        });
    }
  }

  private async renamePersonGlobally(
    oldPersonId: string,
    newPersonId: string
  ): Promise<boolean> {
    const formData = new FormData();
    formData.append("old_person_id", oldPersonId);
    formData.append("new_person_id", newPersonId);
    try {
      const response = await fetch(endpoints.TAG_PERSON, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ reason: "Network error or invalid JSON response" }));
        throw new Error(
          errorData.reason || `Error ${response.status}: ${response.statusText}`
        );
      }
      const result = await response.json();
      if (result.success) return true;
      throw new Error(
        result.reason || "Renaming person failed for an unknown reason."
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      throw new Error(errorMessage);
    }
  }

  // --- UI Feedback ---

  private showLoading(show: boolean) {
    const loadingIndicator = document.getElementById("loading-indicator");
    if (!loadingIndicator) return;
    if (show) {
      loadingIndicator.classList.remove("hidden");
      const loadingText = loadingIndicator.querySelector("span");
      if (loadingText) {
        loadingText.textContent =
          window.innerWidth < 640 ? "Loading..." : "Loading people...";
      }
    } else {
      loadingIndicator.classList.add("hidden");
    }
  }

  private showError(message: string) {
    const errorDiv = document.getElementById("error-message");
    const errorText = document.getElementById("error-text");
    if (errorDiv && errorText) {
      const displayMessage =
        window.innerWidth < 640 && message.length > 50
          ? message.substring(0, 50) + "..."
          : message;
      errorText.textContent = displayMessage;
      errorDiv.classList.remove("hidden");
      setTimeout(() => errorDiv.classList.add("hidden"), 5000);
    }
  }

  private showSuccessMessage(message: string) {
    const successDiv = document.createElement("div");
    successDiv.className =
      "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 shadow-lg";
    successDiv.innerHTML = `
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-green-800">${message}</p>
        </div>
      </div>
    `;
    document.body.appendChild(successDiv);
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 3000);
  }
}

// --- App Bootstrap ---
const peopleApp = new PeopleApp();
(window as any).peopleApp = peopleApp;

console.log("People page initialized");
