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
  name?: string; // Optional name property
}

// People page functionality
class PeopleApp {
  private people: Person[] = [];
  private filteredPeople: Person[] = [];
  private currentPage = 1;
  private itemsPerPage = 100;
  private searchTerm = "";

  constructor() {
    this.setupEventListeners();
    this.init();
  }

  private init(): void {
    console.log("People page initialized");
    this.loadPeople();
  }

  private setupEventListeners(): void {
    // Search functionality with debouncing for better mobile performance
    const searchInput = document.getElementById(
      "people-search"
    ) as HTMLInputElement;
    if (searchInput) {
      // let searchTimeout: NodeJS.Timeout;
      let searchTimeout: number;
      searchInput.addEventListener("input", (e) => {
        const query = (e.target as HTMLInputElement).value.toLowerCase();
        
        // Clear previous timeout
        clearTimeout(searchTimeout);
        
        // Debounce search for better performance on mobile
        searchTimeout = setTimeout(() => {
          this.setSearchTerm(query);
        }, 300);
      });

      // Add touch-friendly focus styles for mobile
      searchInput.addEventListener("focus", () => {
        searchInput.classList.add("ring-2", "ring-blue-500", "border-blue-500");
      });

      searchInput.addEventListener("blur", () => {
        searchInput.classList.remove("ring-2", "ring-blue-500", "border-blue-500");
      });
    }

    // Load more button with touch improvements
    const loadMoreBtn = document.getElementById("load-more-btn");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        this.loadMorePeople();
      });

      // Add touch feedback
      loadMoreBtn.addEventListener("touchstart", () => {
        loadMoreBtn.classList.add("scale-95");
      });

      loadMoreBtn.addEventListener("touchend", () => {
        loadMoreBtn.classList.remove("scale-95");
      });
    }

    // Save name button
    const saveNameBtn = document.getElementById("save-name-btn");
    if (saveNameBtn) {
      saveNameBtn.addEventListener("click", () => this.savePersonName());
    }

    // Add responsive resize listener
    window.addEventListener("resize", () => {
      this.handleResize();
    });

    // Initial resize handling
    this.handleResize();
  }

  private handleResize(): void {
    // Adjust items per page based on screen size for better mobile experience
    const width = window.innerWidth;
    if (width < 640) { // sm
      this.itemsPerPage = 50;
    } else if (width < 1024) { // lg
      this.itemsPerPage = 75;
    } else {
      this.itemsPerPage = 100;
    }
    
    // Re-render if we have people loaded
    if (this.people.length > 0) {
      this.renderPeople();
    }
  }

  private setSearchTerm(term: string): void {
    this.searchTerm = term;
    this.filterPeople();

    // Update the search input if it doesn't match
    const searchInput = document.getElementById(
      "people-search"
    ) as HTMLInputElement;
    if (searchInput && searchInput.value !== term) {
      searchInput.value = term;
    }
  }

  private async loadPeople(): Promise<void> {
    this.showLoading(true);

    try {
      console.log("Fetching people...");
      const response = await fetch(endpoints.GET_PEOPLE);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data: string[] = await response.json();
      this.people = data.map((id) => ({ id }));
      this.filteredPeople = [...this.people];

      this.filterPeople(); // Apply current search term and sorting
    } catch (error) {
      console.error("Error loading people:", error);
      this.showError("Failed to load people. Please try again.");
    } finally {
      this.showLoading(false);
    }
  }

  private filterPeople(): void {
    if (!this.searchTerm) {
      this.filteredPeople = [...this.people];
    } else {
      const lowerSearchTerm = this.searchTerm.toLowerCase();
      this.filteredPeople = this.people.filter((person) => {
        const idMatch = person.id.toLowerCase().includes(lowerSearchTerm);
        const nameMatch = person.name
          ? person.name.toLowerCase().includes(lowerSearchTerm)
          : false;
        return idMatch || nameMatch;
      });
    }
    this.currentPage = 1; // Reset to first page when filtering
    this.sortPeopleByNamedFirst(); // Always sort with named people first
    this.renderPeople();
    this.showLoadMoreButton();
  }

  private sortPeopleByNamedFirst(): void {
    // Always sort to show named people first, then non-cluster IDs, then cluster IDs
    this.filteredPeople.sort((a, b) => {
      const aIsCluster = a.id.toLowerCase().startsWith('cluster');
      const bIsCluster = b.id.toLowerCase().startsWith('cluster');
      const aHasName = !aIsCluster;
      const bHasName = !bIsCluster;
      
      // If one has a custom name and the other doesn't, prioritize the named one
      if (aHasName && !bHasName) return -1;
      if (!aHasName && bHasName) return 1;
      
      // If both have custom names, sort alphabetically by ID (which is the name)
      if (aHasName && bHasName) {
        return a.id.localeCompare(b.id);
      }
      
      // If neither has custom names (both are clusters), sort by ID
      if (!aHasName && !bHasName) {
        return a.id.localeCompare(b.id);
      }
      
      return 0;
    });
  }

  private renderPeople(): void {
    const grid = document.getElementById("people-grid");
    const noPeopleMsg = document.getElementById("no-people");

    if (!grid || !noPeopleMsg) return;

    if (this.filteredPeople.length === 0) {
      grid.innerHTML = "";
      noPeopleMsg.classList.remove("hidden");
      this.updateSearchStats(0, 0);
      return;
    }

    noPeopleMsg.classList.add("hidden");

    // When searching, show all results. When not searching, use pagination
    const peopleToShow = this.searchTerm
      ? this.filteredPeople
      : this.filteredPeople.slice(0, this.currentPage * this.itemsPerPage);

    // Update search stats
    this.updateSearchStats(peopleToShow.length, this.filteredPeople.length);

    grid.innerHTML = peopleToShow
      .map((person) => {
        // If ID starts with "cluster", it's auto-detected, otherwise it's a custom name
        const isAutoDetected = person.id.toLowerCase().startsWith('cluster');
        const displayName = isAutoDetected ? "Unnamed Person" : person.id;
        const avatarUrl = `${endpoints.GET_PERSON_IMAGE}/${person.id}`;
        
        // Person has custom name if ID doesn't start with "cluster"
        const hasCustomName = !isAutoDetected;
        return html`
        <div class="group bg-white rounded-lg shadow-sm sm:shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 hover:scale-[1.01] relative active:scale-95" 
             onclick="window.peopleApp.handlePersonClick('${person.id}')">
            <!-- Status badge -->
          <div class="absolute top-1 sm:top-2 right-1 sm:right-2 z-10">
            <span class="inline-flex items-center px-1.5 sm:px-2 py-0.5 text-xs font-medium ${hasCustomName ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'} rounded-md border">
              ${hasCustomName ? `
                <svg class="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="hidden sm:inline">${person.id}</span>
                <span class="sm:hidden">${person.id.length > 8 ? person.id.substring(0, 8) + '...' : person.id}</span>
              ` : ""}
            </span>
          </div>

          <!-- Enhanced image container with overlay effects -->
          <div class="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
            <!-- Shimmer loading effect placeholder -->
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 opacity-20"></div>
            
            <img src="${avatarUrl}" 
                 alt="${displayName}" 
                 class="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                 onerror="this.src='./assets/sample_place_bg.jpg'; this.classList.add('opacity-75')"
                 loading="lazy">
            
            <!-- Gradient overlay for better text readability -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <!-- Hover actions overlay -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div class="flex space-x-1 sm:space-x-2">
                <button class="p-1 sm:p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors duration-200 shadow-md" onclick="event.stopPropagation(); window.peopleApp.viewPersonDetails('${person.id}')">
                  <svg class="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>                </button>
                <button class="p-1 sm:p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors duration-200 shadow-md" onclick="event.stopPropagation(); window.peopleApp.editPersonName('${person.id}')">
                  <svg class="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Subtle border accent -->
          <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
        </div>
      `;
      })
      .join("");
    this.showLoadMoreButton();
  }

  private loadMorePeople(): void {
    this.currentPage++;
    this.renderPeople();
    this.showLoadMoreButton();
  }

  private showLoadMoreButton(): void {
    const loadMoreContainer = document.getElementById("load-more-container");
    if (loadMoreContainer) {
      // Hide load more button when searching (since we show all results)
      // Or when there are no more people to load
      if (this.searchTerm) {
        loadMoreContainer.classList.add("hidden");
      } else {
        const hasMorePeople =
          this.filteredPeople.length > this.currentPage * this.itemsPerPage;
        if (hasMorePeople) {
          loadMoreContainer.classList.remove("hidden");
        } else {
          loadMoreContainer.classList.add("hidden");
        }
      }
    }
  }

  public handlePersonClick(personId: string): void {
    // Navigate to person photos page
    window.location.href = `/person-photos.html?id=${encodeURIComponent(
      personId
    )}`;
  }

  private async savePersonName(): Promise<void> {
    const nameInput = document.getElementById(
      "person-name-input"
    ) as HTMLInputElement;
    if (!nameInput || !(nameInput as any).personId) return;

    const personId = (nameInput as any).personId;
    const newName = nameInput.value.trim();

    if (!newName) {
      this.showError("Please enter a valid name");
      return;
    }

    if (newName === personId) {
      this.showError("New name is the same as the current name");
      return;
    }

    // Show loading state
    const saveBtn = document.getElementById(
      "save-name-btn"
    ) as HTMLButtonElement;
    const originalText = saveBtn?.textContent || "Save Name";
    if (saveBtn) {
      saveBtn.textContent = "Saving...";
      saveBtn.disabled = true;
    }

    try {
      // Call the API to rename person globally (like React's renamePersonGlobally)
      const success = await this.renamePersonGlobally(personId, newName);
      if (success) {
        // Refresh the page to show updated data
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to save person name:", error);
      this.showError("Failed to save person name. Please try again.");
    } finally {
      // Restore button state
      if (saveBtn) {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      }
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
      const response = await fetch(`${API_URL}/tagPerson`, {
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
      if (result.success) {
        return true;
      } else {
        throw new Error(
          result.reason || "Renaming person failed for an unknown reason."
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      throw new Error(errorMessage);
    }
  }

  private showLoading(show: boolean): void {
    const loadingIndicator = document.getElementById("loading-indicator");
    if (loadingIndicator) {
      if (show) {
        loadingIndicator.classList.remove("hidden");
        // Add responsive loading text
        const loadingText = loadingIndicator.querySelector("span");
        if (loadingText) {
          loadingText.textContent = window.innerWidth < 640 ? "Loading..." : "Loading people...";
        }
      } else {
        loadingIndicator.classList.add("hidden");
      }
    }
  }

  private showError(message: string): void {
    const errorDiv = document.getElementById("error-message");
    const errorText = document.getElementById("error-text");

    if (errorDiv && errorText) {
      // Truncate long error messages on mobile
      const displayMessage = window.innerWidth < 640 && message.length > 50 
        ? message.substring(0, 50) + "..." 
        : message;
      
      errorText.textContent = displayMessage;
      errorDiv.classList.remove("hidden");

      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorDiv.classList.add("hidden");
      }, 5000);
    }
  }

  private updateSearchStats(shown: number, total: number): void {
    const currentCount = document.getElementById("current-count");
    const totalCount = document.getElementById("total-count");
    
    if (currentCount) currentCount.textContent = shown.toString();
    if (totalCount) totalCount.textContent = total.toString();
  }

  public viewPersonDetails(personId: string): void {
    // Navigate to person photos page
    window.location.href = `/person-photos.html?id=${encodeURIComponent(personId)}`;
  }

  public editPersonName(personId: string): void {
    const person = this.people.find(p => p.id === personId);
    const currentName = person?.name || personId;
    
    // Use a more mobile-friendly approach for name editing
    if (window.innerWidth < 640) {
      // On mobile, use a simple prompt but with better UX
      const newName = prompt(`Edit name for person:\n\nCurrent: ${currentName}\n\nEnter new name:`, currentName);
      if (newName && newName.trim() && newName.trim() !== currentName) {
        this.renamePersonGlobally(personId, newName.trim())
          .then(success => {
            if (success) {
              // Show success message before reload
              this.showSuccessMessage("Name updated successfully!");
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
          })
          .catch(error => {
            console.error("Failed to rename person:", error);
            this.showError("Failed to rename person. Please try again.");
          });
      }
    } else {
      // On desktop, use the existing prompt
      const newName = prompt(`Edit name for person:`, currentName);
      if (newName && newName.trim() && newName.trim() !== currentName) {
        this.renamePersonGlobally(personId, newName.trim())
          .then(success => {
            if (success) {
              // Refresh the page to show updated data
              window.location.reload();
            }
          })
          .catch(error => {
            console.error("Failed to rename person:", error);
            this.showError("Failed to rename person. Please try again.");
          });
      }
    }
  }

  private showSuccessMessage(message: string): void {
    // Create a temporary success message element
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
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 3000);
  }
}

// Initialize the people app
const peopleApp = new PeopleApp();

// Make it globally accessible for onclick handlers
(window as any).peopleApp = peopleApp;

console.log("People page initialized");
