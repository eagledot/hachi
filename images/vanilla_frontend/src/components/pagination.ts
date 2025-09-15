import { html } from "../utils";

export interface PaginationProps {
  container: HTMLElement;
  totalItems: number;
  itemsPerPage: number;
  initialPage?: number; // zero-based, default 0
  onPageChange?: (page: number) => void;
  totalPages?: number;
}

export class PaginationComponent {
  private container: HTMLElement;
  private totalItems: number;
  private itemsPerPage: number;
  private currentPage: number;
  private onPageChange?: (page: number) => void;
  private totalPages?: number;

  constructor(props: PaginationProps) {
    this.container = props.container;
    this.totalItems = props.totalItems;
    this.itemsPerPage = props.itemsPerPage;
    this.currentPage = props.initialPage ?? 0;
    this.onPageChange = props.onPageChange;
    this.totalPages = props.totalPages;
    this.render();
    this.addKeyboardNavigation();
  }

  // Add event listener for arrow down and up for pagination
  private addKeyboardNavigation() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        this.prevPage();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.nextPage();
      }
    });
  }

  public setPage(page: number) {
    const totalPages = this.getTotalPages();
    const newPage = Math.max(0, Math.min(page, totalPages - 1));
    if (newPage !== this.currentPage) {
      this.currentPage = newPage;
      this.render();
      this.onPageChange?.(this.currentPage);
    }
  }

  public nextPage() {
    console.log("Going to next page", this.currentPage + 1);
    this.setPage(this.currentPage + 1);
  }

  public prevPage() {
    console.log("Going to previous page", this.currentPage - 1);
    this.setPage(this.currentPage - 1);
  }

  public getCurrentPage() {
    return this.currentPage;
  }

  public update(props: Partial<Omit<PaginationProps, "container">>) {
    console.log("Updating pagination props:", props);
    if (typeof props.totalItems === "number")
      this.totalItems = props.totalItems;
    if (typeof props.itemsPerPage === "number")
      this.itemsPerPage = props.itemsPerPage;
    if (props.onPageChange) this.onPageChange = props.onPageChange;
    if (typeof props.initialPage === "number")
      this.currentPage = props.initialPage;
    if (typeof props.totalPages === "number")
      this.totalPages = props.totalPages;

    this.render();
  }

  private getTotalPages() {
    // If totalPages is explicitly provided, prefer it; otherwise compute from totals
    if (typeof this.totalPages === "number") {
      return Math.max(0, this.totalPages);
    }
    if (this.itemsPerPage <= 0) return 0;
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  private render() {
    const totalPages = this.getTotalPages();
    const startIndex = this.currentPage * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.totalItems);

    // Remove hidden class from pagination container
    this.container.classList.remove("hidden");

    this.container.innerHTML = html`
      <div class="mx-auto w-full px-3 sm:px-4 py-2
                  flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        
        <!-- Left: Info + Hint (stack) -->
        <div class="flex flex-col md:flex-row md:items-center gap-1 xs:gap-3 min-w-0">
          <div class="text-[11px] xs:text-xs text-gray-600 leading-snug min-w-0">
            <span id="pagination-info" class="block truncate max-w-[220px] sm:max-w-xs">
              Showing ${this.totalItems === 0 ? 0 : startIndex + 1}-${endIndex}
              <span class="hidden md:inline">of ${this.totalItems} photos</span>
            </span>
          </div>
          <!-- <span class="hidden md:inline text-[11px] text-gray-500 select-none" aria-hidden="true">
            ↑ / ↓ to change page
          </span> -->
        </div>

        <!-- Right: Controls -->
        <div class="flex items-stretch gap-2 sm:gap-3 w-full sm:w-auto">
          <button id="prev-page-btn"
            class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1
                   px-3 sm:px-3.5 py-2 text-xs font-medium
                   text-gray-700 bg-white border border-gray-300 rounded-md
                   hover:bg-gray-50 hover:text-gray-900
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60
                   transition-colors"
            ${this.currentPage <= 0 ? "disabled" : ""}>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 19l-7-7 7-7"></path>
            </svg>
            <span class="hidden xs:inline">Previous</span>
            <span class="xs:hidden sr-only">Previous page</span>
          </button>

          <span id="page-info"
            class="hidden sm:inline-flex items-center px-2.5 py-2 text-[11px] font-medium
                   text-gray-700 bg-gray-50 border border-gray-200 rounded-md">
            Page ${totalPages === 0 ? 0 : this.currentPage + 1}
            <span class="ml-1">/ ${totalPages}</span>
          </span>

          <button id="next-page-btn"
            class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1
                   px-3 sm:px-3.5 py-2 text-xs font-medium
                   text-gray-700 bg-white border border-gray-300 rounded-md
                   hover:bg-gray-50 hover:text-gray-900
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60
                   transition-colors"
            ${this.currentPage >= totalPages - 1 ? "disabled" : ""}>
            <span class="hidden xs:inline">Next</span>
            <span class="xs:hidden sr-only">Next page</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    const prevBtn = this.container.querySelector(
      "#prev-page-btn"
    ) as HTMLButtonElement;
    const nextBtn = this.container.querySelector(
      "#next-page-btn"
    ) as HTMLButtonElement;
    prevBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.prevPage();
    });
    nextBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.nextPage();
    });
  }
}
