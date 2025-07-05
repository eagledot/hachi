// Vanilla JS/TS implementation of the Indexing component
// Refactored: Centralized state, grouped responsibilities, reduced DOM queries, improved organization.

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

interface IndexingState {
  isIndexing: boolean;
  isCancelling: boolean;
  indexProgress: number;
  extraDetails: string;
  eta: number;
  // New structure: instead of indexDirectoryPath, we now use:
  uri: string[];      // Array of path components (e.g., ["Users", "John", "Pictures"])
  location: string;   // "LOCAL" or cloud service name (e.g., "google_photos")
  identifier: string; // Drive letter for local (e.g., "C:") or service identifier
  completeRescan: boolean;
  selectedProtocol: string;
  error: string | null;
  simulateIndexing: boolean;
}

const initialState: IndexingState = {
  isIndexing: false,
  isCancelling: false,
  indexProgress: 0,
  extraDetails: "",
  eta: 0,
  uri: [],
  location: "",
  identifier: "",
  completeRescan: false,
  selectedProtocol: "none",
  error: null,
  simulateIndexing: false,
};

export class IndexingComponent {
  // --- State ---
  private state = new Signal<IndexingState>({ ...initialState });
  private root: HTMLElement;
  private apiUrl: string;
  private pollingTimeout: number | null = null;
  private pageLoaded: boolean = true;
  private partitions: Partition[] = [];
  private folderSelector: SelectFolder | null = null;
  private subscriptions: (() => void)[] = [];

  // --- DOM refs ---
  private refs: { [key: string]: HTMLElement | null } = {};

  constructor(options: IndexingComponentOptions) {
    this.root = options.root;
    this.apiUrl = options.apiUrl;
    this.render();
    this.cacheDomRefs();
    this.setupReactiveSystem();
    this.updateSelectedPathDisplay(""); // Initialize display
    this.pollIndexStatus(this.pageLoaded);
    IndexingService.getPartitions()
      .then((partitions) => {
        this.partitions = partitions;
      })
      .catch((error) => {
        console.error("Error fetching partitions:", error);
      });
  }

  // --- State helpers ---
  private setState(partial: Partial<IndexingState>) {
    this.state.value = { ...this.state.value, ...partial };
  }

  private hasValidSelection(): boolean {
    const { identifier, selectedProtocol } = this.state.value;
    return identifier !== "" && identifier !== "none" && (
      selectedProtocol === "none" || selectedProtocol !== "none"
    );
  }

  // --- DOM refs caching ---
  private cacheDomRefs() {
    this.refs = {
      protocolSelect: this.root.querySelector<HTMLSelectElement>("#protocol-select"),
      rescanCheckbox: this.root.querySelector<HTMLInputElement>("#complete-rescan"),
      browseBtn: this.root.querySelector<HTMLButtonElement>("#browse-btn"),
      simulateIndexingCheckbox: this.root.querySelector<HTMLInputElement>("#simulate-indexing"),
      scanBtn: this.root.querySelector<HTMLButtonElement>("#scan-btn"),
      cancelBtn: this.root.querySelector<HTMLButtonElement>("#cancel-btn"),
    };
  }

  // --- Reactive system setup ---
  private setupReactiveSystem() {
    this.subscriptions.push(
      useEffect(this.updateActionButtons.bind(this), [this.state]),
      useEffect(this.updateProgressSection.bind(this), [this.state]),
      useEffect(this.updateErrorSection.bind(this), [this.state]),
      useEffect(this.updateInputsState.bind(this), [this.state])
    );
  }

  // --- UI Rendering ---
  private render() {
    this.root.innerHTML = "";
    const card = document.createElement("div");
    card.className =
      "bg-white rounded-lg shadow-md p-6 border border-gray-200 max-w-2xl mx-auto";
    card.innerHTML = html`
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            📁 Select Folder on Your Computer
          </label>
          <div class="flex space-x-2">
            <div class="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm min-h-[42px] flex items-center">
              <span id="selected-path">No folder selected</span>
            </div>
            <button
              id="browse-btn"
              type="button"
              class="px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
            >
              📁 Browse...
            </button>
          </div>
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
    this.cacheDomRefs();
    this.attachEvents();
  }

  // --- UI Update Methods ---
  private updateProgressSection() {
    const { isIndexing, indexProgress, eta, extraDetails } = this.state.value;
    const existingProgress = this.root.querySelector(".bg-blue-50");
    if (isIndexing) {
      const progressHtml = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-700">Scan Progress</span>
            <span class="text-sm font-semibold text-blue-600">${(
              indexProgress * 100
            ).toFixed(1)}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${
              indexProgress * 100
            }%"></div>
          </div>
          <div class="space-y-1 text-sm text-gray-600">
            ${eta ? `<div><span class="font-medium">Time left:</span> ${eta}</div>` : ""}
            ${extraDetails ? `<div><span class="font-medium">Status:</span> ${extraDetails}</div>` : ""}
          </div>
        </div>
      `;
      if (existingProgress) {
        existingProgress.outerHTML = progressHtml;
      } else {
        const selectDiv = this.root.querySelector("select")?.parentElement;
        if (selectDiv) {
          selectDiv.insertAdjacentHTML("afterend", progressHtml);
        }
      }
    } else {
      if (existingProgress) existingProgress.remove();
    }
  }

  private updateErrorSection() {
    const { error } = this.state.value;
    const existingError = this.root.querySelector(".bg-red-50");
    if (error) {
      const errorHtml = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div class="flex">
            <span class="text-red-400 mr-2">⚠️</span>
            <span class="text-red-800">${error}</span>
          </div>
        </div>
      `;
      if (existingError) {
        existingError.outerHTML = errorHtml;
      } else {
        const title = this.root.querySelector("h2");
        if (title) title.insertAdjacentHTML("afterend", errorHtml);
      }
    } else {
      if (existingError) existingError.remove();
    }
  }

  private updateInputsState() {
    const { isIndexing, selectedProtocol } = this.state.value;
    const { protocolSelect, rescanCheckbox, browseBtn, simulateIndexingCheckbox } = this.refs;
    if (browseBtn) (browseBtn as HTMLButtonElement).disabled = isIndexing || selectedProtocol !== "none";
    if (protocolSelect) (protocolSelect as HTMLSelectElement).disabled = isIndexing;
    if (rescanCheckbox) (rescanCheckbox as HTMLInputElement).disabled = isIndexing;
    if (simulateIndexingCheckbox) (simulateIndexingCheckbox as HTMLInputElement).disabled = isIndexing;
  }

  private updateActionButtons() {
    const { isIndexing, isCancelling } = this.state.value;
    const { scanBtn, cancelBtn } = this.refs;
    const hasSelection = this.hasValidSelection();
    if (scanBtn) {
      (scanBtn as HTMLButtonElement).style.display = !isIndexing ? "flex" : "none";
      (scanBtn as HTMLButtonElement).disabled = isIndexing || !hasSelection;
    }
    if (cancelBtn) {
      (cancelBtn as HTMLButtonElement).style.display = isIndexing ? "flex" : "none";
      (cancelBtn as HTMLButtonElement).disabled = !isIndexing;
      const icon = isCancelling ? "⏳" : "⏹️";
      const text = isCancelling ? "Stopping..." : "Stop Scan";
      (cancelBtn as HTMLButtonElement).innerHTML = `<span class="mr-2">${icon}</span>${text}`;
    }
  }

  // --- Event Handlers ---
  private attachEvents() {
    this.root.addEventListener("change", (e) => {
      console.log("Attaching change event to root");
      const target = e.target as HTMLElement;
      if (target.id === "simulate-indexing") {
        this.setState({ simulateIndexing: (target as HTMLInputElement).checked });
      } else if (target.id === "protocol-select") {
        const value = (target as HTMLSelectElement).value;
        this.setState({ selectedProtocol: value });
        if (value === "none") {
          this.setState({ identifier: "", uri: [], location: "" });
          this.updateSelectedPathDisplay("");
        } else {
          this.setState({ identifier: value, uri: [], location: value });
          this.updateSelectedPathDisplay(this.getDisplayPath());
        }
      } else if (target.id === "complete-rescan") {
        this.setState({ completeRescan: (target as HTMLInputElement).checked });
      }
    });
    if (this.refs.browseBtn) {
      console.log("Attaching click event to browse button");
      (this.refs.browseBtn as HTMLButtonElement).addEventListener("click", () => this.openFolderSelector());
    }
    if (this.refs.scanBtn) {
      console.log("Attaching click event to scan button");
      (this.refs.scanBtn as HTMLButtonElement).addEventListener("click", () => this.startIndexing());
    }
    if (this.refs.cancelBtn) {
      console.log("Attaching click event to cancel button");
      (this.refs.cancelBtn as HTMLButtonElement).addEventListener("click", () => this.cancelIndexing());
    }
  }

  // --- API/Service Calls ---
  private async startIndexing() {
    const { identifier, uri, location } = this.state.value;
    
    if (!identifier || identifier === "" || identifier === "none") {
      this.setState({ error: "Please choose a folder or connect a cloud service." });
      return;
    }

    this.setState({ error: null, isIndexing: true, isCancelling: false });
    this.showNotification("Preparing to scan...", "info");
    try {
      const requestData = {
        location: location,
        identifier: identifier,
        uri: uri,
        complete_rescan: this.state.value.completeRescan,
        simulate_indexing: this.state.value.simulateIndexing,
      };
      const resp = await fetch(endpoints.INDEX_START, {
        method: "POST",
        body: JSON.stringify(requestData),
        headers: { "Content-Type": "application/json" },
      });
      const data = (await resp.json()) as IndexStartResponse;
      if (!data.error) {
        this.showNotification("Photo scan started successfully!", "success");
        this.pollIndexStatus();
      } else {
        this.setState({ error: data.details || "Failed to start scanning photos.", isIndexing: false });
        this.showNotification(this.state.value.error!, "error");
      }
    } catch (e) {
      this.setState({ error: "Could not start scanning. Please check the folder path or service.", isIndexing: false });
      this.showNotification(this.state.value.error!, "error");
    }
  }

  private async pollIndexStatus(pageLoaded: boolean = false) {
    if (!pageLoaded && !this.state.value.isIndexing) return;
    try {
      const resp = await fetch(`${this.apiUrl}/getIndexStatus`);
      const data: IndexStatusResponse = await resp.json();
      if (data.done) {
        if (this.state.value.isCancelling) {
          this.showNotification("Scan stopped successfully", "warning");
        }
        this.setState({
          isIndexing: false,
          isCancelling: false,
          indexProgress: 0,
          extraDetails: "",
          eta: 0,
        });
        this.pollingTimeout = null;
        this.clearAllInputs();
        return;
      }
      if (this.pageLoaded) {
        this.setState({ isIndexing: true });
      }
      this.setState({
        indexProgress: (data.processed ?? 0) / (data.total || 1),
        eta: data.eta,
        extraDetails: data.details || "",
        error: null,
      });
      this.pollingTimeout = window.setTimeout(() => this.pollIndexStatus(), 1000);
    } catch (e) {
      this.setState({ error: "Couldn't check scan progress. Will retry..." });
      this.pollingTimeout = window.setTimeout(() => this.pollIndexStatus(), 5000);
    } finally {
      this.pageLoaded = false;
    }
  }

  private async cancelIndexing() {
    if (!this.state.value.isIndexing) return;
    this.setState({ isCancelling: true });
    this.showNotification("Stopping scan...", "warning");
    try {
      await fetch(`${this.apiUrl}/indexCancel`);
      this.pollIndexStatus();
    } catch (e) {
      this.setState({ error: "Could not stop the scan. Please contact administrator.", isCancelling: false });
      this.showNotification(this.state.value.error!, "error");
    }
  }

  // --- Helpers ---
  private updateSelectedPathDisplay(path: string) {
    const selectedPathSpan = this.root.querySelector("#selected-path");
    if (selectedPathSpan) {
      selectedPathSpan.textContent = path || "No folder selected";
    }
  }

  private getDisplayPath(): string {
    const { identifier, uri, location, selectedProtocol } = this.state.value;
    if (!identifier || identifier === "none") {
      return "";
    }
    
    if (selectedProtocol === "none" && location === "LOCAL") {
      // For local paths, reconstruct the full path
      return uri.length > 0 ? `${identifier}\\${uri.join("\\")}` : identifier;
    } else {
      // For cloud services, return the service name
      return selectedProtocol;
    }
  }

  private showNotification(
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) {
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

  private clearAllInputs() {
    if (this.refs.simulateIndexingCheckbox) (this.refs.simulateIndexingCheckbox as HTMLInputElement).checked = false;
    if (this.refs.protocolSelect) (this.refs.protocolSelect as HTMLSelectElement).value = "none";
    if (this.refs.rescanCheckbox) (this.refs.rescanCheckbox as HTMLInputElement).checked = false;
    this.setState({
      uri: [],
      location: "",
      identifier: "",
      simulateIndexing: false,
      selectedProtocol: "none",
      completeRescan: false,
    });
    this.updateSelectedPathDisplay("");
  }

  private openFolderSelector(): void {
    console.log("Opening folder selector");
    const modal = document.getElementById("folder-selector-modal");
    const content = document.getElementById("folder-selector-content");
    if (!modal || !content) return;
    content.innerHTML = "";
    const availableDrives = this.partitions
      .filter((partition) => partition.location === "LOCAL")
      .map((partition) => partition.identifier);
    this.folderSelector = new SelectFolder("folder-selector-content", {
      title: "Select Photo Directory",
      drives: availableDrives.length > 0 ? availableDrives : ["C:", "D:", "E:"],
      onFolderSelect: (path: {
        identifier: string;
        uri: string[];
        location: string;
      }) => {
        // Update state with the received path object
        this.setState({ 
          identifier: path.identifier,
          uri: path.uri,
          location: path.location
        });
        // Create a display-friendly path string
        const displayPath = path.uri.length > 0 ? `${path.identifier}/${path.uri.join("/")}` : path.identifier;
        this.updateSelectedPathDisplay(displayPath);
        this.closeFolderSelector();
      },
      onCancel: () => {
        this.closeFolderSelector();
      },
      showOkButton: true,
      showCancelButton: true,
    });
    modal.classList.remove("hidden");
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.closeFolderSelector();
      }
    });
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
    if (modal) modal.classList.add("hidden");
    if (this.folderSelector) {
      this.folderSelector.destroy();
      this.folderSelector = null;
    }
  }

  // --- Cleanup ---
  public destroy() {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions = [];
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
    if (this.folderSelector) {
      this.folderSelector.destroy();
      this.folderSelector = null;
    }
    const modal = document.getElementById("folder-selector-modal");
    if (modal) modal.remove();
    this.root.innerHTML = "";
  }
}

// Usage (example):
// import { IndexingComponent } from './components/IndexingComponent';
// const root = document.getElementById('indexing-root');
// new IndexingComponent({ root, apiUrl: 'http://localhost:8000' });
