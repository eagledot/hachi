// Vanilla JS/TS implementation of the Indexing component
// Standalone module to be imported in a vanilla JS/TS SPA or HTML page.
// It assumes the existence of a root element to mount the UI, and uses fetch for API calls.

import type {
  IndexStartResponse,
  IndexStatusResponse,
} from "../types/indexing";

import { html } from "../utils";
import IndexingService from "../services/indexing";
import type { Partition } from "../types/indexing";
import SelectFolder from "./SelectFolder";
import { endpoints } from "../config";
import { Signal, useEffect } from "../reactive";

interface IndexingComponentOptions {
  root: HTMLElement;
  apiUrl: string;
}

export class IndexingComponent {
  private root: HTMLElement;
  private apiUrl: string;
  private pollingTimeout: number | null = null;
  private pageLoaded: boolean = true;
  

  // Reactive state signals
  private isIndexing = new Signal<boolean>(false);
  private isCancelling = new Signal<boolean>(false);
  private indexProgress = new Signal<number>(0);
  private extraDetails = new Signal<string>("");
  private eta = new Signal<number>(0);
  private indexDirectoryPath = new Signal<string>("");
  private completeRescan = new Signal<boolean>(false);
  private selectedProtocol = new Signal<string>("none");
  private error = new Signal<string | null>(null);
  private simulateIndexing = new Signal<boolean>(false);

  // Non-reactive state
  private partitions: Partition[] = [];
  private folderSelector: SelectFolder | null = null;
  private subscriptions: (() => void)[] = [];

  

  constructor(options: IndexingComponentOptions) {
    this.root = options.root;
    this.apiUrl = options.apiUrl;
    this.render();

    // Set up reactive dependencies
    this.setupReactiveSystem();
    this.pollIndexStatus(this.pageLoaded); // To check if an indexing operation is already in progress

    IndexingService.getPartitions()
      .then((partitions) => {
        console.log("Fetched partitions:", partitions);
        this.partitions = partitions;
        // Update the state later in the render cycle
      })
      .catch((error) => {
        console.error("Error fetching partitions:", error);
      });
  }  /**
   * Sets up reactive dependencies using simple subscriptions
   * The reactive system handles batching and scheduling automatically
   */
  private setupReactiveSystem() {

    // Subscribe to any signal that will trigger these effects
    // The reactive system will batch calls automatically
    this.subscriptions.push(
      useEffect(this.updateActionButtons.bind(this), [
            this.isIndexing,
            this.indexDirectoryPath,
            this.isCancelling,
            this.simulateIndexing
        ]),
        useEffect(this.updateProgressSection.bind(this), [
            this.isIndexing,
            this.indexProgress,
            this.eta,
            this.extraDetails
        ]),
        useEffect(this.updateErrorSection.bind(this), [
            this.error
        ]),
        useEffect(this.updateInputsState.bind(this), [
            this.isIndexing,
            this.selectedProtocol
        ])
    );
  }

  private showNotification(
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) {
    // Simple notification system - in a real app you might use a toast library
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            max-width: 400px;
            word-wrap: break-word;
        `;

    switch (type) {
      case "success":
        notification.style.backgroundColor = "#10b981";
        break;
      case "error":
        notification.style.backgroundColor = "#ef4444";
        break;
      case "warning":
        notification.style.backgroundColor = "#f59e0b";
        break;
      default:
        notification.style.backgroundColor = "#3b82f6";
    }

    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
  private render() {
    this.root.innerHTML = "";
    const card = document.createElement("div");
    card.className =
      "bg-white rounded-lg shadow-md p-6 border border-gray-200 max-w-2xl mx-auto";

    card.innerHTML = html`
      <div class="space-y-4">
        <div>
          <label
            for="directory-input"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            📁 Folder on Your Computer
          </label>
          <div class="flex space-x-2">
            <input
              id="directory-input"
              type="text"
              placeholder="e.g., C:\\Users\\YourName\\Pictures"
              value=""
              class="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed text-sm"
            />
            <button
              id="browse-btn"
              type="button"
              class="px-4 py-2.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Browse...
            </button>
          </div>

          <!-- Simulate Indexing Checkbox -->
          <div class="flex items-center space-x-2 mt-4">
            <input type="checkbox" id="simulate-indexing" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed" />
            <label
              for="simulate-indexing"
              class="block text-sm font-medium text-gray-700"
            >
              Simulate Indexing
            </label>
          </div>
        </div>

        <div>
          <label
            for="protocol-select"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            ☁️ Or, Connect a Cloud Service
          </label>
          <select
            id="protocol-select"
            class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed text-sm"
          >
            <option value="none" selected>None (Use folder on computer)</option>
            <option value="google_photos">Google Photos</option>
          </select>
        </div>

        <div class="flex items-start space-x-3">
          <input
            type="checkbox"
            id="complete-rescan"
            class="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div>
            <label
              for="complete-rescan"
              class="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Re-scan All Photos
            </label>
            <p class="text-xs text-gray-500 mt-1 leading-relaxed">
              Scans all photos again, even if already added. Use this if photos
              were missed, changed, or for a more thorough update.
            </p>
          </div>
        </div>

        <div class="flex space-x-3 pt-4">
          <button
            id="scan-btn"
            disabled
            class="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 transition-colors"
          >
            <span class="mr-2">🔍</span>
            Scan Photos
          </button>
          <button
            id="cancel-btn"
            disabled
            style="display:none"
            class="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 transition-colors"
          >
            <span class="mr-2">⏹️</span>
            Stop Scan
          </button>
        </div>
      </div>
    `;
    this.root.appendChild(card);

    // Add folder selector modal container
    const modalContainer = document.createElement("div");
    modalContainer.id = "folder-selector-modal";
    modalContainer.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden";
    modalContainer.innerHTML = `
      <div class="rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div id="folder-selector-content"></div>
      </div>
    `;
    document.body.appendChild(modalContainer);

    this.attachEvents();
  }
  private attachEvents() {
    const dirInput =
      this.root.querySelector<HTMLInputElement>("#directory-input");
    if (dirInput) {
      dirInput.addEventListener("input", (e) => {
        this.indexDirectoryPath.value = (e.target as HTMLInputElement).value;
      });
      dirInput.addEventListener("keydown", (e) => {
        if (
          e.key === "Enter" &&
          !this.isIndexing.value &&
          this.indexDirectoryPath.value
        ) {
          this.startIndexing();
        }
      });
    }

    // Simulate indexing checkbox event handler
    const simulateIndexingCheckbox =
      this.root.querySelector<HTMLInputElement>("#simulate-indexing");
    if (simulateIndexingCheckbox) {
      simulateIndexingCheckbox.addEventListener("change", (e) => {
        this.simulateIndexing.value = (e.target as HTMLInputElement).checked;
        console.log("Simulate indexing checkbox changed to:", this.simulateIndexing.value);
      });
    }

    const protocolSelect =
      this.root.querySelector<HTMLSelectElement>("#protocol-select");
    if (protocolSelect) {
      protocolSelect.addEventListener("change", (e) => {
        this.selectedProtocol.value = (e.target as HTMLSelectElement).value;
        if (this.selectedProtocol.value === "none") {
          this.indexDirectoryPath.value = "";
          // Update the input field value
          const dirInput =
            this.root.querySelector<HTMLInputElement>("#directory-input");
          if (dirInput) {
            dirInput.value = "";
          }
        } else {
          this.indexDirectoryPath.value = this.selectedProtocol.value;
          // Update the input field value
          const dirInput =
            this.root.querySelector<HTMLInputElement>("#directory-input");
          if (dirInput) {
            dirInput.value = this.selectedProtocol.value;
          }
        }
      });
    }
    const rescanCheckbox =
      this.root.querySelector<HTMLInputElement>("#complete-rescan");
    if (rescanCheckbox) {
      rescanCheckbox.addEventListener("change", (e) => {
        this.completeRescan.value = (e.target as HTMLInputElement).checked;
      });
    }

    // Browse button event handler
    const browseBtn = this.root.querySelector<HTMLButtonElement>("#browse-btn");
    if (browseBtn) {
      browseBtn.addEventListener("click", () => this.openFolderSelector());
    }

    const scanBtn = this.root.querySelector<HTMLButtonElement>("#scan-btn");
    if (scanBtn) {
      scanBtn.addEventListener("click", () => this.startIndexing());
    }
    const cancelBtn = this.root.querySelector<HTMLButtonElement>("#cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.cancelIndexing());
    }
  }
  private updateProgressSection() {
    console.log("Updating progress section based on indexing status", {
      isIndexing: this.isIndexing.value,
      indexProgress: this.indexProgress.value,
      eta: this.eta.value,
      extraDetails: this.extraDetails.value,
    });
    // Find the existing progress section or create placeholder
    const existingProgress = this.root.querySelector(".bg-blue-50");

    if (this.isIndexing.value) {
      const progressHtml = `
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium text-gray-700">Scan Progress</span>
                        <span class="text-sm font-semibold text-blue-600">${(
                          this.indexProgress.value * 100
                        ).toFixed(1)}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${
                          this.indexProgress.value * 100
                        }%"></div>
                    </div>
                    <div class="space-y-1 text-sm text-gray-600">
                        ${
                          this.eta.value
                            ? `<div><span class="font-medium">Time left:</span> ${this.eta.value}</div>`
                            : ""
                        }
                        ${
                          this.extraDetails.value
                            ? `<div><span class="font-medium">Status:</span> ${this.extraDetails.value}</div>`
                            : ""
                        }
                    </div>
                </div>
            `;

      if (existingProgress) {
        existingProgress.outerHTML = progressHtml;
      } else {
        // Insert after the select element's parent div
        const selectDiv = this.root.querySelector("select")?.parentElement;
        if (selectDiv) {
          selectDiv.insertAdjacentHTML("afterend", progressHtml);
        }
      }
    } else {
      // Remove progress section if not indexing
      if (existingProgress) {
        existingProgress.remove();
      }
    }
  }

  private updateErrorSection() {
    console.log("Updating error section based on error state", {
      error: this.error.value,
    });
    const existingError = this.root.querySelector(".bg-red-50");

    if (this.error.value) {
      const errorHtml = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div class="flex">
                        <span class="text-red-400 mr-2">⚠️</span>
                        <span class="text-red-800">${this.error.value}</span>
                    </div>
                </div>
            `;

      if (existingError) {
        existingError.outerHTML = errorHtml;
      } else {
        // Insert after the title
        const title = this.root.querySelector("h2");
        if (title) {
          title.insertAdjacentHTML("afterend", errorHtml);
        }
      }
    } else {
      // Remove error section if no error
      if (existingError) {
        existingError.remove();
      }
    }
  }

  // Clear all inputs
  private clearAllInputs() {
    // Directory input
    const dirInput =
      this.root.querySelector<HTMLInputElement>("#directory-input");
    if (dirInput) {
      dirInput.value = "";
    }
    // Simulate indexing checkbox
    const simulateIndexingCheckbox =
      this.root.querySelector<HTMLInputElement>("#simulate-indexing");
    if (simulateIndexingCheckbox) {
      simulateIndexingCheckbox.checked = false;
    }
    // Protocol select
    const protocolSelect =
      this.root.querySelector<HTMLSelectElement>("#protocol-select");
    if (protocolSelect) {
      protocolSelect.value = "none";
    }
    // Rescan checkbox
    const rescanCheckbox =
      this.root.querySelector<HTMLInputElement>("#complete-rescan");
    if (rescanCheckbox) {
      rescanCheckbox.checked = false;
    }
  }
  
  private updateInputsState() {
    console.log("Updating inputs state based on indexing status and protocol selection", {
      isIndexing: this.isIndexing.value,
      selectedProtocol: this.selectedProtocol.value,
    });
    const dirInput =
      this.root.querySelector<HTMLInputElement>("#directory-input");
    const protocolSelect =
      this.root.querySelector<HTMLSelectElement>("#protocol-select");
    const rescanCheckbox =
      this.root.querySelector<HTMLInputElement>("#complete-rescan");
    const browseBtn = this.root.querySelector<HTMLButtonElement>("#browse-btn");
    const simulateIndexingCheckbox =
      this.root.querySelector<HTMLInputElement>("#simulate-indexing");

    if (dirInput) {
      dirInput.disabled =
        this.isIndexing.value || this.selectedProtocol.value !== "none";
    }

    if (browseBtn) {
      browseBtn.disabled =
        this.isIndexing.value || this.selectedProtocol.value !== "none";
    }

    if (protocolSelect) {
      protocolSelect.disabled = this.isIndexing.value;
    }

    if (rescanCheckbox) {
      rescanCheckbox.disabled = this.isIndexing.value;
    }

    if (simulateIndexingCheckbox) {
      simulateIndexingCheckbox.disabled = this.isIndexing.value;
    }
  }

  private updateActionButtons() {
    console.log("Updating action buttons based on indexing status", {
      isIndexing: this.isIndexing.value,
      isCancelling: this.isCancelling.value,
      indexDirectoryPath: this.indexDirectoryPath.value,
    });
    const scanBtn = this.root.querySelector<HTMLButtonElement>("#scan-btn");
    const cancelBtn = this.root.querySelector<HTMLButtonElement>("#cancel-btn");

    if (scanBtn) {
      scanBtn.style.display = !this.isIndexing.value  ? "flex" : "none";
      scanBtn.disabled =
        this.isIndexing.value || (!this.indexDirectoryPath.value.trim() && !this.simulateIndexing.value);
    }

    if (cancelBtn) {
      cancelBtn.style.display = this.isIndexing.value ? "flex" : "none";
      cancelBtn.disabled = !this.isIndexing.value;
      // Update button content properly
      const icon = this.isCancelling.value ? "⏳" : "⏹️";
      const text = this.isCancelling.value ? "Stopping..." : "Stop Scan";
      cancelBtn.innerHTML = `<span class="mr-2">${icon}</span>${text}`;
    }
  }

  
  private async startIndexing() {
    // Preparing data as per new requirements
    const parts = IndexingService.processDirectoryPath(
      this.indexDirectoryPath.value.trim()
    );

    if (!parts.length && !this.simulateIndexing.value) {
      this.error.value = "Please choose a folder or connect a cloud service.";
      return;
    }

    const identifier = parts.length > 0 ? parts[0] : "";
    const uri = parts.length > 1 ? parts.slice(1) : [];

    // If simulate indexing is true, then we need to set the location to "" or null
    const location = this.simulateIndexing.value ? "" : this.selectedProtocol.value === "none" ? "LOCAL" : this.selectedProtocol.value;

    this.error.value = null;
    this.isIndexing.value = true;
    this.isCancelling.value = false;
    this.showNotification("Preparing to scan...", "info");

    try {
      const requestData = {
        location: location,
        identifier: identifier,
        uri: uri,
        complete_rescan: this.completeRescan.value,
        simulate_indexing: this.simulateIndexing.value,
      };

      const resp = await fetch(endpoints.INDEX_START, {
        method: "POST",
        body: JSON.stringify(requestData),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = (await resp.json()) as IndexStartResponse;

      if (!data.error) {
        this.showNotification("Photo scan started successfully!", "success");
        this.pollIndexStatus();
      } else {
        this.error.value = data.details || "Failed to start scanning photos.";
        this.isIndexing.value = false;
        this.showNotification(this.error.value, "error");
      }
    } catch (e) {
      this.error.value =
        "Could not start scanning. Please check the folder path or service.";
      this.isIndexing.value = false;
      this.showNotification(this.error.value, "error");
    }
  }
  private async pollIndexStatus(pageLoaded: boolean = false) {
    if (!pageLoaded && !this.isIndexing.value) return; // Don't poll if not indexing and if not at start
    try {
      const resp = await fetch(`${this.apiUrl}/getIndexStatus`);
      const data: IndexStatusResponse = await resp.json();
      if (data.done) {
        if (this.isCancelling.value) {
          this.showNotification("Scan stopped successfully", "warning");
        } 
        
        this.isIndexing.value = false;
        this.isCancelling.value = false;
        this.pollingTimeout = null;
        this.indexProgress.value = 0;
        this.extraDetails.value = "";
        this.eta.value = 0;
        this.clearAllInputs();
        return;
      }
      if (this.pageLoaded) {
         this.isIndexing.value = true; // Ensure indexing is true while polling since just in case it is not set as true
      }
      this.indexProgress.value = (data.processed ?? 0) / (data.total || 1); // Avoid division by zero
      this.eta.value = data.eta;
      this.extraDetails.value = data.details || "";
      this.error.value = null;
      this.pollingTimeout = window.setTimeout(
        () => this.pollIndexStatus(),
        1000
      );
    } catch (e) {
      this.error.value = "Couldn't check scan progress. Will retry...";
      this.pollingTimeout = window.setTimeout(
        () => this.pollIndexStatus(),
        5000
      );
    } finally {
      this.pageLoaded = false; // Set pageLoaded to false after the first call
    }
  }

  private async cancelIndexing() {
    if (!this.isIndexing.value) return;
    this.isCancelling.value = true;
    this.showNotification("Stopping scan...", "warning");
    try {
      await fetch(`${this.apiUrl}/indexCancel`);
      this.pollIndexStatus();
    } catch (e) {
      this.error.value =
        "Could not stop the scan. Please contact administrator.";
      this.isCancelling.value = false;
      this.showNotification(this.error.value, "error");
    }
  }
  private openFolderSelector(): void {
    const modal = document.getElementById("folder-selector-modal");
    const content = document.getElementById("folder-selector-content");

    if (!modal || !content) return;

    // Clear previous content
    content.innerHTML = "";

    // Extract drive identifiers from partitions
    const availableDrives = this.partitions
      .filter((partition) => partition.location === "LOCAL")
      .map((partition) => partition.identifier); // Create folder selector
    this.folderSelector = new SelectFolder("folder-selector-content", {
      title: "Select Photo Directory",
      drives: availableDrives.length > 0 ? availableDrives : ["C:", "D:", "E:"], // Fallback to default drives
      onFolderSelect: (path: string) => {
        this.indexDirectoryPath.value = path;

        // Update the input field
        const dirInput =
          this.root.querySelector<HTMLInputElement>("#directory-input");
        if (dirInput) {
          dirInput.value = path;
        }

        this.closeFolderSelector();
      },
      onCancel: () => {
        this.closeFolderSelector();
      },
      showOkButton: true,
      showCancelButton: true,
    });

    // Show modal
    modal.classList.remove("hidden");

    // Add click outside to close
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.closeFolderSelector();
      }
    });

    // Add escape key to close
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.closeFolderSelector();
        document.removeEventListener("keydown", escapeHandler);
      }
    };
    document.addEventListener("keydown", escapeHandler);
  }
  private closeFolderSelector(): void {
    const modal = document.getElementById("folder-selector-modal");
    if (modal) {
      modal.classList.add("hidden");
    }

    if (this.folderSelector) {
      this.folderSelector.destroy();
      this.folderSelector = null;
    }
  }

  public destroy() {
    // Clean up all subscriptions
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions = [];

    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }

    // Clean up folder selector
    if (this.folderSelector) {
      this.folderSelector.destroy();
      this.folderSelector = null;
    }

    // Remove modal from DOM
    const modal = document.getElementById("folder-selector-modal");
    if (modal) {
      modal.remove();
    }

    this.root.innerHTML = "";
  }
}

// Usage (example):
// import { IndexingComponent } from './components/IndexingComponent';
// const root = document.getElementById('indexing-root');
// new IndexingComponent({ root, apiUrl: 'http://localhost:8000' });
