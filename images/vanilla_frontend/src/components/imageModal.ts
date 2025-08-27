// Reusable Image Modal Component
// This component provides a standardized modal for viewing images across all pages

import { html } from "../utils";

export class ImageModalComponent {
  /**
   * Get the HTML template for the image modal
   * This is extracted from image-search.html for consistency
   */
  static getTemplate(): string {
    return html`
      <!-- Image Modal (reusable component) -->
      <div
      id="image-modal"
      class="hidden fixed inset-0 z-50 overflow-y-auto animate-in fade-in duration-300"
      >
      <div class="modal-backdrop fixed inset-0" id="modal-backdrop"></div>
      <div class="flex h-screen items-center justify-center">
        <div
        class="relative bg-white rounded-lg shadow-2xl w-full h-full overflow-hidden border border-gray-200"
        >
        <!-- Modal header -->
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-sm"
        >
          <h3
          class="text-lg font-semibold text-gray-900"
          id="modal-title"
          ></h3>
          <div class="flex items-center space-x-1">
          <button
            id="modal-prev-btn"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            disabled
          >
            <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            ></path>
            </svg>
          </button>
          <button
            id="modal-next-btn"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            disabled
          >
            <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            ></path>
            </svg>
          </button>
          <button
            id="modal-info-btn"
            class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
            title="Show Info"
            aria-label="Show info overlay"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
            </svg>
          </button>
          <button
            id="modal-fullscreen-btn"
            class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            title="Fullscreen View"
          >
            <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            ></path>
            </svg>
          </button>
          <button
            id="modal-like-btn"
            class="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Like"
          >
            <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            ></path>
            </svg>
          </button>
          <button
            id="modal-faces-btn"
            class="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
            title="Show Faces"
          >
            <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
            </svg>
          </button>
          <button
            id="modal-close-btn"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
            </svg>
          </button>
          </div>
        </div>
        <!-- Modal content -->
        <div class="flex-1 h-full">
          <div class="flex h-full flex-row" id="modal-main-row">
            <!-- Image container -->
            <div id="modal-image-wrapper" class="flex-1 flex justify-center items-center bg-gradient-to-br from-gray-50 to-gray-100 transition-all duration-300">
              <img
                id="modal-image"
                height=""
                width=""
                src=""
                alt=""
                class="h-auto w-auto max-h-full max-w-full object-contain"
                style="height: 100vh;"
              />
            </div>
            <!-- Metadata sidebar (hidden by default) -->
            <aside id="modal-sidebar" class="relative h-full w-0 overflow-hidden bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ease-out" aria-label="Image details" aria-hidden="true">
              <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white/70 backdrop-blur-sm">
                <h4 class="text-sm font-semibold text-gray-700">Details</h4>
                <button id="modal-info-close-btn" class="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition" title="Close" aria-label="Close details">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div class="flex-1 p-6 overflow-y-auto" id="modal-metadata-scroll">
                <div id="modal-metadata" class="space-y-4 pb-8"></div>
              </div>
            </aside>
          </div>
        </div>
        </div>
      </div>
      </div>
    `;
  }

  /**
   * Get the CSS styles for the modal
   * This is extracted from image-search.html for consistency
   */ static getStyles(): string {
    return `
      .modal-backdrop {
        backdrop-filter: blur(8px);
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.8));
      }
      .photo-hover {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .photo-hover:hover {
        transform: translateY(-2px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }
      @keyframes fade-in {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      .animate-in {
        animation: fade-in 0.3s ease-out;
      }
      /* Sidebar transition states */
      #modal-sidebar { max-width: 24rem; }
      #image-modal.info-open #modal-sidebar { width: 24rem; }
      #image-modal.info-open #modal-sidebar[aria-hidden="true"] { aria-hidden: false; }
      /* Content fade */
      #modal-sidebar > * { opacity: 0; transition: opacity .2s ease .1s; }
      #image-modal.info-open #modal-sidebar > * { opacity: 1; }
      /* Adjust image area when sidebar open */
      #image-modal.info-open #modal-image-wrapper { }
      @media (max-width: 640px) {
        /* On small screens, make sidebar overlay instead of shrinking image too small */
        #modal-sidebar { position: absolute; right:0; top:0; bottom:0; box-shadow: -2px 0 8px rgba(0,0,0,0.08); }
        #modal-main-row { position: relative; }
        #image-modal.info-open #modal-sidebar { width: 80%; max-width: 24rem; }
      }
  #modal-metadata-overlay::-webkit-scrollbar { width: 6px; }
  #modal-metadata-overlay::-webkit-scrollbar-thumb { background: rgba(156,163,175,0.5); border-radius: 3px; }
  #modal-metadata-overlay::-webkit-scrollbar-thumb:hover { background: rgba(156,163,175,0.8); }
  /* Scrollbar for metadata list */
  #modal-metadata::-webkit-scrollbar { width: 6px; }
  #modal-metadata::-webkit-scrollbar-track { background: transparent; }
  #modal-metadata::-webkit-scrollbar-thumb { background: rgba(156,163,175,0.5); border-radius: 3px; }
  #modal-metadata::-webkit-scrollbar-thumb:hover { background: rgba(156,163,175,0.8); }
    `;
  }

  /**
   * Initialize the modal in the DOM
   * This method should be called after the page content is loaded
   */
  static initialize(): void {
    // Check if modal already exists
    if (document.getElementById("image-modal")) {
      return; // Already initialized
    }

    // Add modal to the end of body
    document.body.insertAdjacentHTML("beforeend", this.getTemplate());

    // Add styles to head if not already present
    if (!document.getElementById("image-modal-styles")) {
      const styleEl = document.createElement("style");
      styleEl.id = "image-modal-styles";
      styleEl.textContent = this.getStyles();
      document.head.appendChild(styleEl);
    }

    // Metadata overlay toggle logic
    const infoBtn = document.getElementById("modal-info-btn");
    const sidebar = document.getElementById("modal-sidebar");
    const closeInfoBtn = document.getElementById("modal-info-close-btn");
    const modalRoot = document.getElementById("image-modal");
    if (infoBtn && sidebar && modalRoot) {
      const isOpen = () => modalRoot.classList.contains("info-open");
      const hide = () => {
        modalRoot.classList.remove("info-open");
        sidebar.setAttribute("aria-hidden", "true");
        infoBtn.setAttribute("title", "Show Info");
        infoBtn.setAttribute("aria-label", "Show info sidebar");
      };
      const show = () => {
        modalRoot.classList.add("info-open");
        sidebar.setAttribute("aria-hidden", "false");
        infoBtn.setAttribute("title", "Hide Info");
        infoBtn.setAttribute("aria-label", "Hide info sidebar");
      };
      infoBtn.addEventListener("click", () => { isOpen() ? hide() : show(); });
      closeInfoBtn?.addEventListener("click", hide);
      document.addEventListener("click", (e) => {
        if (!isOpen()) return;
        if (!(e.target instanceof Element)) return;
        if (sidebar.contains(e.target) || infoBtn.contains(e.target)) return;
        // Only hide on outside click for small screens where sidebar overlays
        if (window.matchMedia('(max-width: 640px)').matches) hide();
      });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen()) hide(); });
    }
  }
}
