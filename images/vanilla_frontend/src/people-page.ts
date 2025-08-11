
import "./style.css";
import { Layout } from "./components/layout";
import Config, { endpoints } from "./config";
import { html } from "./utils";

const API_URL = Config.apiUrl;

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
  private itemsPerPage = 100;
  private currentPage = 0;
  private totalPages = 0;
  private totalResults = 0;
  private resultsPerPage = 0;

  // DOM Elements
  private prevBtnElement: HTMLButtonElement | null = null;
  private nextBtnElement: HTMLButtonElement | null = null;
  private pageInfoElement: HTMLElement | null = null;
  private paginationInfoElement: HTMLElement | null = null;
  private paginationContainerElement: HTMLElement | null = null;

  constructor() {
    this.waitForDOMReady(() => this.initializeApp());
  }

  // --- Initialization ---

  private waitForDOMReady(callback: () => void) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  private initializeApp() {
    this.cacheDOMElements();
    this.setupPaginationEventListeners();
    this.init();
  }

  private cacheDOMElements() {
    this.paginationInfoElement = document.getElementById("pagination-info");
    this.pageInfoElement = document.getElementById("page-info");
    this.nextBtnElement = document.getElementById("next-page-btn") as HTMLButtonElement;
    this.prevBtnElement = document.getElementById("prev-page-btn") as HTMLButtonElement;
    this.paginationContainerElement = document.getElementById("pagination-container");
  }

  private init() {
    console.log("People page initialized");
    this.loadPeople();
  }

  // --- Data Fetching & Filtering ---

  private async loadPeople() {
    this.showLoading(true);
    try {
      console.log("Fetching people...");
      const response = await fetch(endpoints.GET_PEOPLE);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: string[] = await response.json();
      this.people = data.map((id) => ({ id }));
      this.filteredPeople = [...this.people];
      this.filterPeople();
    } catch (error) {
      console.error("Error loading people:", error);
      this.showError("Failed to load people. Please try again.");
    } finally {
      this.showLoading(false);
    }
  }

  private filterPeople() {
    this.currentPage = 0;
    this.updatePagination();
    this.renderPeople();
  }

  // --- Pagination ---

  private setupPaginationEventListeners() {
    if (this.prevBtnElement) {
      this.prevBtnElement.addEventListener("click", async (e) => {
        e.preventDefault();
        this.currentPage -= 1;
        await this.updatePaginationAndRender();
      });
    }
    if (this.nextBtnElement) {
      this.nextBtnElement.addEventListener("click", async (e) => {
        e.preventDefault();
        this.currentPage += 1;
        await this.updatePaginationAndRender();
      });
    }
  }

  private updatePagination() {
    this.resultsPerPage = this.itemsPerPage;
    this.totalResults = this.filteredPeople.length;
    this.totalPages = Math.ceil(this.totalResults / this.resultsPerPage);
    if (this.currentPage >= this.totalPages) {
      this.currentPage = Math.max(0, this.totalPages - 1);
    }
  }

  private updatePaginationUI() {
    if (this.paginationInfoElement) {
      const startIndex = this.currentPage * this.resultsPerPage;
      const endIndex = Math.min((this.currentPage + 1) * this.resultsPerPage, this.totalResults);
      this.paginationInfoElement.textContent = `Showing ${startIndex + 1}-${endIndex} of ${this.totalResults} photos`;
    }
    if (this.prevBtnElement) {
      this.prevBtnElement.disabled = this.currentPage <= 0;
    }
    if (this.nextBtnElement) {
      this.nextBtnElement.disabled = this.currentPage >= this.totalPages - 1;
    }
    if (this.pageInfoElement) {
      this.pageInfoElement.textContent = `Page ${this.currentPage + 1} of ${this.totalPages}`;
    }
    if (this.paginationContainerElement) {
      if (this.totalPages && this.totalPages > 1) {
        this.paginationContainerElement.classList.remove("hidden");
      } else {
        this.paginationContainerElement.classList.add("hidden");
      }
    }
  }

  private async updatePaginationAndRender() {
    this.renderPeople();
    window.scrollTo({ top: 0 });
  }

  // --- Rendering ---

  private renderPeople() {
    const grid = document.getElementById("people-grid");
    const noPeopleMsg = document.getElementById("no-people");
    if (!grid || !noPeopleMsg) return;

    if (this.filteredPeople.length === 0) {
      grid.innerHTML = "";
      noPeopleMsg.classList.remove("hidden");
      this.updatePaginationUI();
      return;
    }
    noPeopleMsg.classList.add("hidden");

    const startIdx = this.currentPage * this.itemsPerPage;
    const endIdx = Math.min(startIdx + this.itemsPerPage, this.filteredPeople.length);
    const peopleToShow = this.filteredPeople.slice(startIdx, endIdx);

    grid.innerHTML = peopleToShow
      .map((person) => this.renderPersonCard(person))
      .join("");
    this.updatePaginationUI();
  }

  private renderPersonCard(person: Person): string {
    const isAutoDetected = person.id.toLowerCase().startsWith("cluster");
    const displayName = isAutoDetected ? "Unnamed Person" : person.id;
    const avatarUrl = `${endpoints.GET_PERSON_IMAGE}/${person.id}`;
    const hasCustomName = !isAutoDetected;
    return html`
      <div
        class="group bg-white shadow-sm sm:shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 hover:scale-[1.01] relative active:scale-95"
        onclick="window.peopleApp.handlePersonClick('${person.id}')"
      >
        <!-- Status badge -->
        <div class="absolute top-1 sm:top-2 right-1 sm:right-2 z-10">
          <span
            class="inline-flex items-center px-1.5 sm:px-2 py-0.5 text-xs font-medium ${hasCustomName
              ? "bg-green-100 text-green-800 border-green-200"
              : "bg-amber-100 text-amber-800 border-amber-200"} border"
          >
            ${hasCustomName
              ? `
            <svg class="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="hidden sm:inline">${person.id}</span>
            <span class="sm:hidden">${
              person.id.length > 8 ? person.id.substring(0, 8) + "..." : person.id
            }</span>
          `
              : ""}
          </span>
        </div>
        <div class="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 opacity-20"></div>
          <img
            src="${avatarUrl}"
            alt="${displayName}"
            class="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
            onerror="this.src='./assets/sample_place_bg.jpg'; this.classList.add('opacity-75')"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div class="flex space-x-1 sm:space-x-2">
              <button
                class="p-1 sm:p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors duration-200 shadow-md"
                onclick="event.stopPropagation(); window.peopleApp.viewPersonDetails('${person.id}')"
              >
                <svg class="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              </button>
              <button
                class="p-1 sm:p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors duration-200 shadow-md"
                onclick="event.stopPropagation(); window.peopleApp.editPersonName('${person.id}')"
              >
                <svg class="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
      </div>
    `;
  }

  // --- User Actions ---

  public handlePersonClick(personId: string) {
    window.location.href = `/person-photos.html?id=${encodeURIComponent(personId)}`;
  }

  public viewPersonDetails(personId: string) {
    window.location.href = `/person-photos.html?id=${encodeURIComponent(personId)}`;
  }

  public editPersonName(personId: string) {
    const person = this.people.find((p) => p.id === personId);
    const currentName = person?.name || personId;
    const promptText = window.innerWidth < 640
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

  private async renamePersonGlobally(oldPersonId: string, newPersonId: string): Promise<boolean> {
    const formData = new FormData();
    formData.append("old_person_id", oldPersonId);
    formData.append("new_person_id", newPersonId);
    try {
      const response = await fetch(`${API_URL}/tagPerson`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ reason: "Network error or invalid JSON response" }));
        throw new Error(errorData.reason || `Error ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      if (result.success) return true;
      throw new Error(result.reason || "Renaming person failed for an unknown reason.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
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
        loadingText.textContent = window.innerWidth < 640 ? "Loading..." : "Loading people...";
      }
    } else {
      loadingIndicator.classList.add("hidden");
    }
  }

  private showError(message: string) {
    const errorDiv = document.getElementById("error-message");
    const errorText = document.getElementById("error-text");
    if (errorDiv && errorText) {
      const displayMessage = window.innerWidth < 640 && message.length > 50
        ? message.substring(0, 50) + "..."
        : message;
      errorText.textContent = displayMessage;
      errorDiv.classList.remove("hidden");
      setTimeout(() => errorDiv.classList.add("hidden"), 5000);
    }
  }

  private showSuccessMessage(message: string) {
    const successDiv = document.createElement("div");
    successDiv.className = "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 shadow-lg";
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
