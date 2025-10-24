import "./style.css";
import { Layout } from "./components";
import { endpoints } from "./config";
import {
  createElementFromString,
  fetchWithSession,
  fitTiles,
  html,
} from "./utils";
import { PaginationComponent } from "./components/pagination";

// Initialize the layout
new Layout({
  title: "People - Hachi",
  currentPage: "/people.html",
  showNavbar: true,
});

interface Person {
  id: string;
  count: number;
}

class PeopleApp {
  private people: Person[] = [];
  private totalPages = 0;
  // Paginatiom
  private itemsPerPage = 10;
  private currentPage = 0;
  private paginationComponent: PaginationComponent | null = null;
  private imageHeight = 0;
  private imageWidth = 0;

  // Cache of preloaded images to avoid duplicate network fetches
  private imagePreloadCache: Map<string, HTMLImageElement> = new Map();

  private paginationContainerElement: HTMLElement | null = null;

  constructor() {
    this.findGallarySize();
    this.cacheDOMElements();
    this.init();
  }

  private findGallarySize() {
    // Get photo-gallery element
    const photoGallery = document.getElementById("people-grid");

    // Get the photo gallery height
    const photoGalleryHeight = photoGallery?.clientHeight!;

    // Get photo-gallery width
    const photoGalleryWidth = photoGallery?.clientWidth!;

    // Set static dimensions
    let side = 120;

    // If we are on mobile screens, reduce side length
    if (window.innerWidth < 768) {
      side = 100;
    }

    const { rows, cols, tileWidth, tileHeight } = fitTiles(
      photoGalleryHeight!,
      photoGalleryWidth,
      side
    );

    this.itemsPerPage = rows * cols;
    this.imageHeight = tileHeight - 1;
    this.imageWidth = tileWidth - 1;
  }

  private cacheDOMElements() {
    this.paginationContainerElement = document.getElementById(
      "pagination-container"
    );
  }

  private setupCurrentPageFromQueryParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get("page");
    if (pageParam && !isNaN(Number(pageParam))) {
      this.currentPage = Math.max(0, Number(pageParam) - 1);
    }
  }

  private async init() {
    this.setupCurrentPageFromQueryParam();
    this.updatePageInUrl();
    await this.loadPeople();
    this.setupPagination();
    this.renderPeople();
  }

  private async loadPeople() {
    // TODO: Show loading
    try {
      const response = await fetchWithSession(endpoints.GET_PEOPLE);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: { person: string; count: number }[] = await response.json();
      this.people = data.map(({ person, count }) => ({ id: person, count }));
      console.log(this.people);
      // Sort people by count descending
      this.people.sort((a, b) => b.count - a.count);
      this.totalPages = Math.ceil(this.people.length / this.itemsPerPage);
    } catch (error) {
      console.error("Error loading people:", error);
      // TODO: Show some error to the user
    } finally {
      // TODO: Hide loading
    }
  }

  private updatePersonCard(card: HTMLElement, person: Person) {
    // I want to update the person card with new information in place without re-rendering the entire card
    const isAutoDetected = person.id.toLowerCase().startsWith("cluster");
    const displayName = person.id;
    const avatarUrl = `${endpoints.GET_PERSON_IMAGE}/${person.id}`;
    const hasCustomName = !isAutoDetected;

    // First update the badge
    const badge = card.querySelector(".badge");
    // If not auto-detected, set its visibility style to "hidden"

    // Update count badge
    const countBadge = card.querySelector(
      "div.count-badge"
    ) as HTMLElement;
    if (countBadge) {
      countBadge.textContent = `${person.count} ${
        person.count === 1 ? "photo" : "photos"
      }`;
    }

    if (hasCustomName) {
      if (badge) {
        (badge as HTMLElement).style.visibility = "visible";
      }
      const avatarNameEl = card.querySelector(".avatar-name");
      if (avatarNameEl) {
        avatarNameEl.textContent =
          displayName.length > 8
            ? displayName.substring(0, 8) + "..."
            : displayName;
      }
      // Similarly for avatarNameMobile
      const avatarNameMobileEl = card.querySelector(".avatar-name-mobile");
      if (avatarNameMobileEl) {
        avatarNameMobileEl.textContent =
          displayName.length > 8
            ? displayName.substring(0, 8) + "..."
            : displayName;
      }
    } else {
      // If not auto-detected, set its visibility style to "hidden"
      if (badge) {
        console.log("Hiding badge for person:", person.id);
        (badge as HTMLElement).style.visibility = "hidden";
      }
    }

    // Update data-person-id for buttons person-edit-btn and person-details-btn
    const personEditBtn = card.querySelector(".person-edit-btn");
    if (personEditBtn) {
      console.log("Setting person ID for edit button:", person.id);
      (personEditBtn as HTMLElement).dataset.personId = person.id;
    }

    const personDetailsBtn = card.querySelector(".person-details-btn");
    if (personDetailsBtn) {
      console.log("Setting person ID for details button:", person.id);
      (personDetailsBtn as HTMLElement).dataset.personId = person.id;
    }

    // Remove and add event listeners for for person-edit-btn and person-details-btn
    if (personEditBtn) {
      personEditBtn.removeEventListener("click", this.editPersonName);
      personEditBtn.addEventListener("click", this.editPersonName);
    }

    if (personDetailsBtn) {
      personDetailsBtn.removeEventListener("click", this.handlePersonClick);
      personDetailsBtn.addEventListener("click", this.handlePersonClick);
    }

    const img = card.querySelector("img");
    if (img) {
      img.src = avatarUrl;
      img.alt = displayName;
    }
  }

  private renderPersonCard(person: Person): string {
    const isAutoDetected = person.id.toLowerCase().startsWith("cluster");
    const displayName = person.id;
    const avatarUrl = `${endpoints.GET_PERSON_IMAGE}/${person.id}`;
    const hasCustomName = !isAutoDetected;
    return html`
      <div
        style="height: ${this.imageHeight}px; width: ${this.imageWidth}px;"
        class="group duration-200 cursor-pointer relative active:scale-98"
      >
        <!-- Count badge at top-left -->
        <div
          class="count-badge absolute bottom-0 left-0 z-10 bg-gray-200 text-black text-xs font-semibold px-1.5 py-0.5 rounded-sm"
        >
          ${person.count} ${person.count === 1 ? "photo" : "photos"}
        </div>
        <!-- Status badge -->
        <div
          style="${hasCustomName
            ? "visibility: visible;"
            : "visibility: hidden;"}"
          class="badge hidden m-0 sm:block absolute -top-1 right-0 z-10"
        >
          <span
            class="inline-flex items-center px-1.5 sm:px-2 py-0.5 text-xs font-medium bg-gray-200 text-black rounded-sm"
          >
            <svg
              class="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
            <span title="${person.id}" class="hidden avatar-name sm:block"
              >${person.id.length > 12
                ? person.id.substring(0, 12) + "..."
                : person.id}</span
            >
            <span class="sm:hidden avatar-name-mobile"
              >${person.id.length > 8
                ? person.id.substring(0, 8) + "..."
                : person.id}</span
            >
          </span>
        </div>
        <div class="bg-gray-100 relative flex items-center justify-center">
          <img
            src="${avatarUrl}"
            alt="${displayName}"
            style="height: ${this.imageHeight}px; width: ${this.imageWidth}px;"
            class="transition-transform rounded-md duration-200 group-hover:scale-105"
            onerror="this.src='./assets/sample_place_bg.jpg'; this.classList.add('opacity-75')"
            loading="lazy"
          />
          <div
            class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-60 transition-opacity duration-200 flex items-center justify-center"
          >
            <div class="flex space-x-2">
              <button
                data-person-id="${person.id}"
                class="p-1 person-details-btn bg-white/90 rounded-full hover:bg-white transition-colors duration-150 shadow"
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
                class="p-1 person-edit-btn bg-white/90 rounded-full hover:bg-white transition-colors duration-150 shadow"
                data-person-id="${person.id}"
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

  private ensureCardsInGrid() {
    const grid = document.getElementById("people-cards");
    if (!grid) return;

    const existingCards = grid.children;
    const totalCards = this.itemsPerPage;

    // If we have fewer cards than people, add more cards
    while (existingCards.length < totalCards) {
      console.log("Adding more cards");
      const card = document.createElement("div");
      card.className = "person-card";
      grid.appendChild(card);
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

  // Use arrow functions so 'this' stays bound to the PeopleApp instance when used as event listeners
  public editPersonName = (event: Event) => {
    event.stopPropagation();
    const target = event.target as HTMLElement;
    const personId = (target.closest(".person-card") as HTMLElement | null)
      ?.dataset.personId;
    if (!personId) return;

    const person = this.people.find((p) => p.id === personId);
    const currentName = personId;
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
  };

  private async renamePersonGlobally(
    oldPersonId: string,
    newPersonId: string
  ): Promise<boolean> {
    const formData = new FormData();
    formData.append("old_person_id", oldPersonId);
    formData.append("new_person_id", newPersonId);
    try {
      const response = await fetchWithSession(endpoints.TAG_PERSON, {
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

  public viewPersonDetails(personId: string) {
    window.location.href = `/person-photos.html?id=${encodeURIComponent(
      personId
    )}`;
  }

  public handlePersonClick = (event: Event) => {
    event.stopPropagation();
    const target = event.target as HTMLElement;
    const personId = (target.closest(".person-card") as HTMLElement | null)
      ?.dataset.personId;
    if (personId) {
      // Pass current page in URL for back navigation
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set("page", (this.currentPage + 1).toString());
      // window.location.href = `/person-photos.html?id=${encodeURIComponent(personId)}`;
      window.location.href = `/image-search.html?person=${personId}`;
    }
  };

  private async renderPeople() {
    const grid = document.getElementById("people-cards");
    const noPeopleMsg = document.getElementById("no-people");
    if (!grid || !noPeopleMsg) return;

    if (this.people.length === 0) {
      grid.innerHTML = "";
      noPeopleMsg.classList.remove("hidden");
      return;
    }
    noPeopleMsg.classList.add("hidden");

    const startIdx = this.currentPage * this.itemsPerPage;
    const endIdx = Math.min(startIdx + this.itemsPerPage, this.people.length);
    const peopleToShow = this.people.slice(startIdx, endIdx);

    // First ensure if we have enough cards in the grid
    this.ensureCardsInGrid();

    for (let i = 0; i < peopleToShow.length; i++) {
      const card = grid.children[i] as HTMLElement;
      card.classList.add("person-card"); // ensure base class

      const person = peopleToShow[i];
      const avatarUrl = `${endpoints.GET_PERSON_IMAGE}/${person.id}`;
      // Make sure card is visible when reused
      card.style.visibility = "visible";
      console.log("Preloading image for", i, person.id);
      // card.innerHTML = this.renderPersonCard(person);
      // If the card has person data, then update else re-render
      if (card.dataset.personId) {
        this.updatePersonCard(card, person);
      } else {
        card.innerHTML = this.renderPersonCard(person);
        // Add event listener for person card click
        card.addEventListener("click", (event) =>
          this.handlePersonClick(event)
        );
        // Also for person details button
        const personDetailsBtn = card.querySelector(".person-details-btn");
        if (personDetailsBtn) {
          personDetailsBtn.addEventListener("click", (event) =>
            this.handlePersonClick(event)
          );
        }
        const personEditBtn = card.querySelector(".person-edit-btn");
        if (personEditBtn) {
          personEditBtn.addEventListener("click", (event) =>
            this.editPersonName(event)
          );
        }
      }
      card.dataset.personId = person.id;
    }

    // First make extra cards invisible
    for (let i = peopleToShow.length; i < grid.children.length; i++) {
      const card = grid.children[i] as HTMLElement;
      card.style.visibility = "hidden";
      // Also any badge
      const badge = card.querySelector(".badge");
      if (badge) (badge as HTMLElement).style.visibility = "hidden";
      delete card.dataset.personId;
    }
    this.updatePageInUrl();

    // After rendering, schedule preload of adjacent pages to make navigation smoother
    this.schedulePreloadAdjacent();
  }

  // --- Pagination State in URL ---
  private updatePageInUrl() {
    const url = new URL(window.location.href); // Create a new URL object
    url.searchParams.set("page", (this.currentPage + 1).toString()); // Update the page parameter
    window.history.pushState({}, "", url.toString()); // Update the browser's URL without reloading
  }

  // --- Image Preloading for Smooth Pagination ---
  private preloadPage(pageIndex: number) {
    if (pageIndex < 0 || pageIndex >= this.totalPages) return;
    const start = pageIndex * this.itemsPerPage;
    if (start >= this.people.length) return;
    const end = Math.min(start + this.itemsPerPage, this.people.length);
    const slice = this.people.slice(start, end);

    for (const p of slice) {
      const url = `${endpoints.GET_PERSON_IMAGE}/${p.id}`;
      if (this.imagePreloadCache.has(p.id)) continue; // already preloaded. TODO: implement cache eviction strategy
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      img.src = url;
      this.imagePreloadCache.set(p.id, img);
    }
  }

  private schedulePreloadAdjacent() {
    const nextPage = this.currentPage + 1;
    const prevPage = this.currentPage - 1; // warm previous for quick back nav
    const task = () => {
      this.preloadPage(nextPage);
      this.preloadPage(prevPage);
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(task, { timeout: 120 });
    } else {
      setTimeout(task, 120);
    }
  }

  private setupPagination() {
    if (!this.paginationContainerElement) return;
    this.paginationContainerElement.innerHTML = "";
    this.paginationComponent = new PaginationComponent({
      container: this.paginationContainerElement,
      totalItems: this.people.length,
      itemsPerPage: this.itemsPerPage,
      initialPage: this.currentPage,
      onPageChange: (page) => {
        this.currentPage = page;
        this.updatePageInUrl();
        this.renderPeople();
        window.scrollTo({ top: 0 });
      },
    });
  }
}

declare global {
  interface Window {
    peopleApp: PeopleApp;
  }
}

const peopleApp = new PeopleApp();
window.peopleApp = peopleApp;
