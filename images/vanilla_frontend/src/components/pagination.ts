
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

  // Add global keyboard event listener for left/right arrow keys
  this.handleKeyDown = this.handleKeyDown.bind(this);
  window.addEventListener('keydown', this.handleKeyDown);
  }
  // Clean up event listener if needed
  public destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Only trigger if the pagination container is visible (not hidden)
    if (this.container.classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') {
      this.prevPage();
    } else if (e.key === 'ArrowRight') {
      this.nextPage();
    }
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

  public update(props: Partial<Omit<PaginationProps, 'container'>>) {
    console.log("Updating pagination props:", props);
    if (typeof props.totalItems === 'number') this.totalItems = props.totalItems;
    if (typeof props.itemsPerPage === 'number') this.itemsPerPage = props.itemsPerPage;
    if (props.onPageChange) this.onPageChange = props.onPageChange;
    if (typeof props.initialPage === 'number') this.currentPage = props.initialPage;
    if (typeof props.totalPages === 'number') this.totalPages = props.totalPages;

    this.render();
  }

  private getTotalPages() {
    // If totalPages is explicitly provided, prefer it; otherwise compute from totals
    if (typeof this.totalPages === 'number') {
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

    this.container.innerHTML = `
      <div class="flex items-center justify-between mx-auto px-3 sm:px-4 py-2">
        <!-- Pagination Info -->
        <div class="text-xs text-gray-600">
          <span id="pagination-info">Showing ${this.totalItems === 0 ? 0 : startIndex + 1}-${endIndex} of ${this.totalItems} photos</span>
        </div>

        <!-- Pagination Controls -->
        <div class="flex items-center space-x-3">
          <button id="prev-page-btn"
            class="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            ${this.currentPage <= 0 ? 'disabled' : ''}>
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 19l-7-7 7-7"></path>
            </svg>
            Previous
          </button>
          <span id="page-info" class="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg">
            Page ${totalPages === 0 ? 0 : this.currentPage + 1} of ${totalPages}
          </span>
          <button id="next-page-btn"
            class="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}>
            Next
            <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    const prevBtn = this.container.querySelector('#prev-page-btn') as HTMLButtonElement;
    const nextBtn = this.container.querySelector('#next-page-btn') as HTMLButtonElement;
    prevBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.prevPage();
    });
    nextBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.nextPage();
    });
  }
}
