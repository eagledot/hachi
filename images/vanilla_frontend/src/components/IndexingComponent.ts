// Vanilla JS/TS implementation of the Indexing component
// Standalone module to be imported in a vanilla JS/TS SPA or HTML page.
// It assumes the existence of a root element to mount the UI, and uses fetch for API calls.

import type { IndexStartResponse, IndexStatusResponse } from "../types/indexing";
import { folderCache } from "../services/folder-cache";
import { html } from "../utils";
import IndexingService from "../services/indexing";
import type { Partition } from "../types/indexing";
import SelectFolder from "./SelectFolder";
import { endpoints } from "../config";

interface IndexingComponentOptions {
  root: HTMLElement;
  apiUrl: string;
}

export class IndexingComponent {
  private root: HTMLElement;
  private apiUrl: string;
  private pollingTimeout: number | null = null;
  private isIndexing: boolean = false;
  private isCancelling: boolean = false;
  private indexProgress: number = 0;
  // private directoryBeingIndexed: string = "";
  private extraDetails: string = "";
  private eta: number = 0;
  private indexDirectoryPath: string = "";
  private completeRescan: boolean = false;
  private selectedProtocol: string = "none";
  private error: string | null = null;
  private partitions: Partition[] = [];
  private folderSelector: SelectFolder | null = null;
  private initialPageLoad: boolean = true;

  constructor(options: IndexingComponentOptions) {
    this.root = options.root;
    this.apiUrl = options.apiUrl;
    this.render();

    
    this.isIndexing = true;
    this.pollIndexStatus();
    

    IndexingService.getPartitions()
      .then((partitions) => {
        console.log("Fetched partitions:", partitions);
        this.partitions = partitions;
        // Update the state later in the render cycle
      })
      .catch((error) => {
        console.error("Error fetching partitions:", error);
      });
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
      ${this.error
        ? `<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div class="flex">
                    <span class="text-red-400 mr-2">⚠️</span>
                    <span class="text-red-800">${this.error}</span>
                </div>
            </div>`
        : ""}

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
              value="${this.indexDirectoryPath}"
              ${this.isIndexing || this.selectedProtocol !== "none"
                ? "disabled"
                : ""}
              class="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed text-sm"
            />
            <button
              id="browse-btn"
              type="button"
              ${this.isIndexing || this.selectedProtocol !== "none"
                ? "disabled"
                : ""}
              class="px-4 py-2.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Browse...
            </button>
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
            ${this.isIndexing ? "disabled" : ""}
            class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed text-sm"
          >
            <option
              value="none"
              ${this.selectedProtocol === "none" ? "selected" : ""}
            >
              None (Use folder on computer)
            </option>
            <option
              value="google_photos"
              ${this.selectedProtocol === "google_photos" ? "selected" : ""}
            >
              Google Photos
            </option>
          </select>
        </div>

        ${this.isIndexing
          ? `
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium text-gray-700">Scan Progress</span>
                        <span class="text-sm font-semibold text-blue-600">${(
                          this.indexProgress * 100
                        ).toFixed(1)}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${
                          this.indexProgress * 100
                        }%"></div>
                    </div>
                    <div class="space-y-1 text-sm text-gray-600">
                        ${
                          this.eta
                            ? `<div><span class="font-medium">Time left:</span> ${this.eta}</div>`
                            : ""
                        }
                        ${
                          this.extraDetails
                            ? `<div><span class="font-medium">Status:</span> ${this.extraDetails}</div>`
                            : ""
                        }
                    </div>
                </div>
                `
          : ""}

        <div class="flex items-start space-x-3">
          <input
            type="checkbox"
            id="complete-rescan"
            ${this.completeRescan ? "checked" : ""}
            ${this.isIndexing ? "disabled" : ""}
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
            ${this.isIndexing || !this.indexDirectoryPath.trim()
              ? "disabled"
              : ""}
            style="display:${!this.isIndexing ? "flex" : "none"}"
            class="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 transition-colors"
          >
            <span class="mr-2">🔍</span>
            Scan Photos
          </button>
          <button
            id="cancel-btn"
            ${!this.isIndexing ? "disabled" : ""}
            style="display:${this.isIndexing ? "flex" : "none"}"
            class="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 transition-colors"
          >
            <span class="mr-2">${this.isCancelling ? "⏳" : "⏹️"}</span>
            ${this.isCancelling ? "Stopping..." : "Stop Scan"}
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
        this.indexDirectoryPath = (e.target as HTMLInputElement).value;
        this.updateActionButtons();
      });
      dirInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !this.isIndexing && this.indexDirectoryPath) {
          this.startIndexing();
        }
      });
    }
    const protocolSelect =
      this.root.querySelector<HTMLSelectElement>("#protocol-select");
    if (protocolSelect) {
      protocolSelect.addEventListener("change", (e) => {
        this.selectedProtocol = (e.target as HTMLSelectElement).value;
        if (this.selectedProtocol === "none") {
          this.indexDirectoryPath = "";
          // Update the input field value
          const dirInput =
            this.root.querySelector<HTMLInputElement>("#directory-input");
          if (dirInput) {
            dirInput.value = "";
          }
        } else {
          this.indexDirectoryPath = this.selectedProtocol;
          // Update the input field value
          const dirInput =
            this.root.querySelector<HTMLInputElement>("#directory-input");
          if (dirInput) {
            dirInput.value = this.selectedProtocol;
          }
        }
        this.updateActionButtons();
      });
    }
    const rescanCheckbox =
      this.root.querySelector<HTMLInputElement>("#complete-rescan");
    if (rescanCheckbox) {
      rescanCheckbox.addEventListener("change", (e) => {
        this.completeRescan = (e.target as HTMLInputElement).checked;
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
    // Find the existing progress section or create placeholder
    const existingProgress = this.root.querySelector(".bg-blue-50");

    if (this.isIndexing) {
      const progressHtml = `
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium text-gray-700">Scan Progress</span>
                        <span class="text-sm font-semibold text-blue-600">${(
                          this.indexProgress * 100
                        ).toFixed(1)}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${
                          this.indexProgress * 100
                        }%"></div>
                    </div>
                    <div class="space-y-1 text-sm text-gray-600">
                        ${
                          this.eta
                            ? `<div><span class="font-medium">Time left:</span> ${this.eta}</div>`
                            : ""
                        }
                        ${
                          this.extraDetails
                            ? `<div><span class="font-medium">Status:</span> ${this.extraDetails}</div>`
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
    const existingError = this.root.querySelector(".bg-red-50");

    if (this.error) {
      const errorHtml = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div class="flex">
                        <span class="text-red-400 mr-2">⚠️</span>
                        <span class="text-red-800">${this.error}</span>
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

  private updateInputsState() {
    const dirInput =
      this.root.querySelector<HTMLInputElement>("#directory-input");
    const protocolSelect =
      this.root.querySelector<HTMLSelectElement>("#protocol-select");
    const rescanCheckbox =
      this.root.querySelector<HTMLInputElement>("#complete-rescan");
    const browseBtn = this.root.querySelector<HTMLButtonElement>("#browse-btn");

    if (dirInput) {
      dirInput.disabled = this.isIndexing || this.selectedProtocol !== "none";
    }

    if (browseBtn) {
      browseBtn.disabled = this.isIndexing || this.selectedProtocol !== "none";
    }

    if (protocolSelect) {
      protocolSelect.disabled = this.isIndexing;
    }

    if (rescanCheckbox) {
      rescanCheckbox.disabled = this.isIndexing;
    }
  }
  private updateActionButtons() {
    const scanBtn = this.root.querySelector<HTMLButtonElement>("#scan-btn");
    const cancelBtn = this.root.querySelector<HTMLButtonElement>("#cancel-btn");

    if (scanBtn) {
      scanBtn.style.display = !this.isIndexing ? "flex" : "none";
      scanBtn.disabled = this.isIndexing || !this.indexDirectoryPath.trim();
    }

    if (cancelBtn) {
      cancelBtn.style.display = this.isIndexing ? "flex" : "none";
      cancelBtn.disabled = !this.isIndexing;
      // Update button content properly
      const icon = this.isCancelling ? "⏳" : "⏹️";
      const text = this.isCancelling ? "Stopping..." : "Stop Scan";
      cancelBtn.innerHTML = `<span class="mr-2">${icon}</span>${text}`;
    }
  }

  private async startIndexing() {
    // Preparing data as per new requirements
    const parts = IndexingService.processDirectoryPath(this.indexDirectoryPath.trim());

    if (!parts.length) {
      this.error = "Please choose a folder or connect a cloud service.";
      this.updateErrorSection();
      return;
    }

    const identifier = parts[0];
    const uri = parts.slice(1);
    const location = this.selectedProtocol === "none" ? "LOCAL" : this.selectedProtocol;


    this.error = null;
    this.isIndexing = true;
    this.isCancelling = false;
    this.showNotification("Preparing to scan...", "info");
    this.updateErrorSection();
    this.updateProgressSection();
    this.updateActionButtons();
    this.updateInputsState();

    try {
      const requestData = {
        location: location,
        identifier: identifier,
        uri: uri,
        complete_rescan: this.completeRescan,
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
        this.error = data.details || "Failed to start scanning photos.";
        this.isIndexing = false;
        this.showNotification(this.error, "error");
        this.updateErrorSection();
        this.updateProgressSection();
        this.updateActionButtons();
        this.updateInputsState();
      }
    } catch (e) {
      this.error =
        "Could not start scanning. Please check the folder path or service.";
      this.isIndexing = false;
      this.showNotification(this.error, "error");
      this.updateErrorSection();
      this.updateProgressSection();
      this.updateActionButtons();
      this.updateInputsState();
    }
  }

  private async pollIndexStatus() {
    if (!this.isIndexing) return;
    try {
      const resp = await fetch(
        `${this.apiUrl}/getIndexStatus`
      );
      const data: IndexStatusResponse = await resp.json();
      if (data.done) {
        if (!this.initialPageLoad) {
          this.showNotification(`Scan complete! ${data.details}`, "success");
        } else if (this.isCancelling) {
          this.showNotification("Scan stopped successfully", "warning");
        }
        this.isIndexing = false;
        this.isCancelling = false;
        this.pollingTimeout = null;
        this.indexProgress = 0;
        this.extraDetails = "";
        this.eta = 0;
        this.updateProgressSection();
        this.updateActionButtons();
        this.updateInputsState();
        return;
      }
      this.indexProgress = (data.processed ?? 0) / (data.total || 1); // Avoid division by zero
      this.eta = data.eta;
      this.extraDetails = data.details || "";
      this.error = null;
      this.updateProgressSection();
      this.updateErrorSection();
      if (this.initialPageLoad) {
        this.updateActionButtons();
        this.updateInputsState();
      }
      this.pollingTimeout = window.setTimeout(
        () => this.pollIndexStatus(),
        1000
      );
    } catch (e) {
      this.error = "Couldn't check scan progress. Will retry...";
      this.updateErrorSection();
      this.pollingTimeout = window.setTimeout(
        () => this.pollIndexStatus(),
        5000
      );
    } finally {
      if (!this.initialPageLoad) {
        this.initialPageLoad = false;
      }
    }
  }

  private async cancelIndexing() {
    if (!this.isIndexing) return;
    this.isCancelling = true;
    this.showNotification("Stopping scan...", "warning");
    this.updateActionButtons();
    try {
      await fetch(`${this.apiUrl}/indexCancel`);
      this.pollIndexStatus();
    } catch (e) {
      this.error = "Could not stop the scan. Please contact administrator.";
      this.isCancelling = false;
      this.showNotification(this.error, "error");
      this.updateErrorSection();
      this.updateActionButtons();
      this.updateInputsState();
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
      .map((partition) => partition.identifier);

    // Create folder selector
    this.folderSelector = new SelectFolder("folder-selector-content", {
      title: "Select Photo Directory",
      drives: availableDrives.length > 0 ? availableDrives : ["C:", "D:", "E:"], // Fallback to default drives
      onFolderSelect: (path: string) => {
        this.indexDirectoryPath = path;

        // Update the input field
        const dirInput =
          this.root.querySelector<HTMLInputElement>("#directory-input");
        if (dirInput) {
          dirInput.value = path;
        }

        this.updateActionButtons();
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
