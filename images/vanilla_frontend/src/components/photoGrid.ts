// Reusable Photo Grid Component
// This component provides a standardized grid layout for displaying photos across all pages

import { html } from "../utils";

export class PhotoGridComponent {
  /**
   * Get the HTML template for the photo grid container
   * This is extracted from image-search.html for consistency
   */
  static getTemplate(options: {
    containerId?: string;
    loadingId?: string;
    errorId?: string;
    noResultsId?: string;
    gridId?: string;
  } = {}): string {
    const {
      containerId = 'photo-grid-container',
      loadingId = 'loading-indicator',
      errorId = 'error-display',
      noResultsId = 'no-results-message',
      gridId = 'photo-grid'
    } = options;
    return html`
      <!-- Photo Grid Container (reusable component) -->
      <div id="${containerId}">
        <!-- Loading indicator -->
        <div id="${loadingId}" class="hidden justify-center items-center py-4">
          <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden relative">
            <div class="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style="animation: slideRight 1.5s linear infinite;"></div>
            <style>
              @keyframes slideRight {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
            </style>
          </div>
        </div>

        <!-- Error message -->
        <div id="${errorId}" class="hidden bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-2">
              <p class="text-xs text-red-800" id="error-text"></p>
            </div>
          </div>
        </div>

        <!-- No results message -->
        <div id="${noResultsId}" class="hidden text-center py-8">
          <div class="max-w-md mx-auto">
            <svg class="mx-auto h-16 w-16 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No images found</h3>
            <p class="text-gray-500 mb-2 text-sm">We couldn't find any images matching your criteria.</p>
            <p class="text-gray-400 text-xs">Try different search terms or check your filters.</p>
          </div>
        </div>

        <!-- Photo grid -->
        <div id="${gridId}" class="flex  flex-wrap gap-1">
          <!-- Photos will be dynamically inserted here -->
        </div>
      </div>
    `;
  }

  /**
   * Get a template for person-specific no results message
   */  static getPersonNoResultsTemplate(noResultsId: string = 'no-results-message'): string {
    return `
      <!-- No photos message for person -->
      <div id="${noResultsId}" class="hidden text-center py-8">
        <div class="text-gray-400 text-4xl mb-3">📷</div>
        <h3 class="text-md font-medium text-gray-900 mb-1">No photos found</h3>  
        <p class="text-gray-500 text-sm">This person doesn't appear in any photos yet</p>
      </div>
    `;
  }

  /**
   * Initialize a photo grid in the DOM
   * This method should be called after the page content is loaded
   */
  static initialize(
    containerId: string,
    options: {
      loadingId?: string;
      errorId?: string;
      noResultsId?: string;
      gridId?: string;
      personMode?: boolean;
    } = {}
  ): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id '${containerId}' not found`);
    }

    const {
      loadingId = 'loading-indicator',
      errorId = 'error-display', 
      noResultsId = 'no-results-message',
      gridId = 'photo-grid',
      personMode = false
    } = options;

    // Generate template
    let template = this.getTemplate({
      containerId: containerId + '-inner',
      loadingId,
      errorId,
      noResultsId,
      gridId
    });

    // Replace no results message for person mode
    if (personMode) {
      template = template.replace(
        /<div id="${noResultsId}"[^>]*>.*?<\/div>/s,
        this.getPersonNoResultsTemplate(noResultsId)
      );
    }

    container.innerHTML = template;
  }
}
