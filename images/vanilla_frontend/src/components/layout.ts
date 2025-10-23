import { endpoints } from '../config';
import { Navbar } from './navbar';
import { fetchWithSession } from '../utils';
import { IndexingOverlay } from './IndexingOverlay';
import type { IndexStatusResponse } from '../types/indexing';

export interface PageConfig {
  title: string;
  currentPage: string;
  showNavbar?: boolean;
}

export class Layout {
  private navbar: Navbar | null = null;
  private indexingOverlay: IndexingOverlay | null = null;
  private serverCheckInterval: ReturnType<typeof setInterval> | null = null;
  private indexingCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: PageConfig) {
    this.checkServerAndSetup(config);
  }

  private async checkServerAndSetup(config: PageConfig): Promise<void> {
    const isServerRunning = await this.checkServerStatus();
    if (isServerRunning) {
      this.setupPage(config);
      this.hideServerErrorOverlay();
      this.initializeIndexingOverlay();
      this.startIndexingStatusPolling();
    } else {
      this.showServerErrorOverlay();
      this.startServerStatusPolling(config);
    }
  }

  private initializeIndexingOverlay(): void {
    if (this.indexingOverlay) {
      this.indexingOverlay.destroy();
    }
    
    this.indexingOverlay = new IndexingOverlay();
    

  }

  private startIndexingStatusPolling(): void {
    // Clear any existing interval
    if (this.indexingCheckInterval) {
      clearInterval(this.indexingCheckInterval);
    }

    // Initial check
    this.checkIndexingStatus();

    // Poll indexing status every 3 seconds
    this.indexingCheckInterval = setInterval(() => {
      this.checkIndexingStatus();
    }, 3000);
  }

  private async checkIndexingStatus(): Promise<void> {
    if (!this.indexingOverlay) return;

    try {
      const response = await fetchWithSession(endpoints.GET_INDEX_STATUS);
      if (response.ok) {
        const data: IndexStatusResponse = await response.json();
        this.indexingOverlay.updateStatus(data);
      }
    } catch (error) {
      // Silently fail - indexing status is not critical for app functionality
      console.debug("Could not fetch indexing status:", error);
    }
  }

  private showServerErrorOverlay(): void {
    // Remove existing overlay if present
    this.hideServerErrorOverlay();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'server-error-overlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';

    // Create overlay content
    const content = document.createElement('div');
    content.className = 'bg-white rounded-lg p-8 max-w-md mx-4 text-center';

    // Title
    const title = document.createElement('h2');
    title.className = 'text-2xl font-bold text-red-600 mb-4';
    title.textContent = 'Server Not Started';

    // Message
    const message = document.createElement('p');
    message.className = 'text-gray-700 mb-6';
    message.textContent = 'The server has not started yet. Please wait while we check for server availability...';

    // Loading indicator
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'flex items-center justify-center space-x-2';

    const spinner = document.createElement('div');
    spinner.className = 'animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600';

    const loadingText = document.createElement('span');
    loadingText.className = 'text-blue-600';
    loadingText.textContent = 'Checking server status...';

    loadingContainer.appendChild(spinner);
    loadingContainer.appendChild(loadingText);

    // Assemble content
    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(loadingContainer);
    overlay.appendChild(content);

    // Add to document
    document.body.appendChild(overlay);
  }

  private hideServerErrorOverlay(): void {
    const existingOverlay = document.getElementById('server-error-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
  }

  private startServerStatusPolling(config: PageConfig): void {
    // Clear any existing interval
    if (this.serverCheckInterval) {
      clearInterval(this.serverCheckInterval);
    }

    // Poll server status every 2 seconds
    this.serverCheckInterval = setInterval(async () => {
      const isServerRunning = await this.checkServerStatus();

      if (isServerRunning) {
        this.hideServerErrorOverlay();
        this.setupPage(config);

        // Clear the polling interval
        if (this.serverCheckInterval) {
          clearInterval(this.serverCheckInterval);
          this.serverCheckInterval = null;
        }
      }
    }, 2000);
  }

  private async checkServerStatus(): Promise<boolean> {
    try {
      const response = await fetchWithSession(endpoints.PING)
      if (response.ok) {
        const text = await response.text();
        return text.trim() === "ok";
      }
      return false;
    } catch (error) {
      console.error("Error checking server status:", error);
      return false;
    }
  }

  private setupPage(config: PageConfig): void {
    // Update page title
    document.title = config.title;

    // Wrap sidebar and main in a flex container for adjacent layout
    let flexWrapper = document.getElementById('hachi-flex-wrapper');
    if (!flexWrapper) {
      flexWrapper = document.createElement('div');
      flexWrapper.id = 'hachi-flex-wrapper';
      flexWrapper.className = 'flex flex-row min-h-screen';

      // Move all body children except scripts into the wrapper
      const children = Array.from(document.body.childNodes).filter(
        node => !(node.nodeName === 'SCRIPT' || (node instanceof HTMLElement && node.id === 'hachi-flex-wrapper'))
      );
  children.forEach(child => (flexWrapper!).appendChild(child));
  document.body.appendChild(flexWrapper!);
    }

    // Initialize navbar if enabled (default: true)
    if (config.showNavbar !== false) {
      this.initializeNavbar(config.currentPage);
    }

    // Add any global styles or behaviors here
    this.setupGlobalStyles();
  }

  private initializeNavbar(currentPage: string): void {
    // Create navbar container if it doesn't exist
    let navbarContainer = document.getElementById('navbar-container');
    let flexWrapper = document.getElementById('hachi-flex-wrapper');
    if (!navbarContainer) {
      navbarContainer = document.createElement('div');
      navbarContainer.id = 'navbar-container';
      // Insert as first child of flex wrapper
      if (flexWrapper) {
        flexWrapper.insertBefore(navbarContainer, flexWrapper.firstChild);
      } else {
        document.body.insertBefore(navbarContainer, document.body.firstChild);
      }
    }
    this.navbar = new Navbar('navbar-container', currentPage);
  }

  private setupGlobalStyles(): void {
    // Remove sidebar padding from main, since flex handles adjacency
    const mainContent = document.querySelector('main');
    if (mainContent instanceof HTMLElement) {
      mainContent.classList.add('flex-1');
    }
  }
}
