// IndexingOverlay.ts - Simplified floating indexing indicator (left-positioned)

import type { IndexStatusResponse } from "../types/indexing";
import { html } from "../utils";

interface IndexingOverlayState {
  isVisible: boolean;
  isIndexing: boolean;
  details: string;
  progress: number;
}

export class IndexingOverlay {
  private state: IndexingOverlayState = {
    isVisible: false,
    isIndexing: false,
    details: "",
    progress: 0
  };

  private container: HTMLElement | null = null;

  constructor() {
    this.createOverlay();
  }

  private createOverlay(): void {
    // Remove existing overlay if present
    const existing = document.getElementById('indexing-overlay');
    if (existing) {
      existing.remove();
    }

    // Create simple floating tab on the left - start hidden
    this.container = document.createElement('div');
    this.container.id = 'indexing-overlay';
    this.container.className = 'fixed bottom-4 left-4 z-40';
    this.container.style.display = 'none'; // Start hidden
    
    this.render();
    document.body.appendChild(this.container);
  }

  private render(): void {
    if (!this.container) return;

    const { details, progress } = this.state;
    
    this.container.innerHTML = html`
      <div class="bg-gray-800 text-white rounded-lg shadow-lg px-4 py-3 flex items-center space-x-3 max-w-sm">
        <!-- Static indicator (no pulse animation) -->
        <div class="w-3 h-3 bg-blue-200 rounded-full"></div>
        
        <!-- Status text -->
        <div class="flex-1 text-sm">
          ${details ? html`<div class="text-blue-100 text-xs">${details}</div>` : ''}
        </div>
        
        <!-- Simple progress indicator -->
        <div class="text-xs font-semibold">
          ${(progress * 100).toFixed(0)}%
        </div>
      </div>
    `;
  }

  // Public methods for external control
  public updateStatus(status: IndexStatusResponse): void {
    const wasIndexing = this.state.isIndexing;
    
    this.state.isIndexing = !status.done;
    this.state.progress = (status.processed || 0) / (status.total || 1);
    this.state.details = status.details || "";
    
    // Show when indexing is in progress
    if (this.state.isIndexing) {
      this.show();
    }
    
    // Hide when indexing finishes
    if (wasIndexing && !this.state.isIndexing) {
      setTimeout(() => this.hide(), 1500);
    }
    
    this.render();
  }

  public show(): void {
    if (!this.container) return;
    
    this.state.isVisible = true;
    this.container.style.display = 'block';
  }

  public hide(): void {
    if (!this.container) return;
    
    this.state.isVisible = false;
    this.container.style.display = 'none';
  }

  public destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}