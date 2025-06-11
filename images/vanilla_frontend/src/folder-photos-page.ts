import './style.css';
import { Layout } from './components/layout';
import Config from './config';
import { UIService } from './imageSearch/uiService';
import type { HachiImageData } from './imageSearch/types';
import { ImageModalComponent, PhotoGridComponent, PhotoFilterComponent } from './components';
import { folderCache } from './services/folder-cache';

const API_URL = Config.apiUrl;

// Interface for folder photo data matching the actual API response
interface FolderPhotoData {
  meta_data: any[];
  score: number[];
  data_hash: string[];
}

// Folder photos page functionality
class FolderPhotosApp {  
  private photos: HachiImageData[] = [];
  private filteredPhotos: HachiImageData[] = [];
  private displayedPhotos: HachiImageData[] = []; // Currently displayed photos (for pagination)
  private currentPhotoIndex: number = -1;
  private folderPath: string = '';
  private folderName: string = '';
  private uiService!: UIService;
  private photoFilter!: PhotoFilterComponent;
  
  // Pagination properties
  private readonly PAGE_SIZE = 100; // Display 100 photos per page for good performance
  private currentPage = 1;
  private totalPages = 0;

  constructor() {
    this.init();
  }  private async init(): Promise<void> {
    // Initialize layout first
    new Layout({
      title: 'Folder Photos - Hachi',
      currentPage: '/folder-photos.html',
      showNavbar: true
    });
    
    // Initialize reusable components before UIService
    this.initializeComponents();
    
    // Now create UIService after components are in the DOM
    // Use photo-grid-container since that's where the photo grid elements are created
    this.uiService = new UIService('photo-grid-container');
    
    this.extractFolderPath();
    this.setupEventListeners();
    await this.loadFolderPhotos();
  }
  private initializeComponents(): void {
    // Initialize reusable components
    ImageModalComponent.initialize();
    PhotoGridComponent.initialize('photo-grid-container', {
      loadingId: 'loading-indicator',
      errorId: 'error-display',
      noResultsId: 'no-results-message',
      gridId: 'photo-grid'
    });

    // Initialize photo filter component
    this.photoFilter = new PhotoFilterComponent({
      onFilterChange: (filteredPhotos) => this.handleFilteredPhotosUpdate(filteredPhotos)
    });    // Initialize filter UI
    const filterContainer = document.getElementById('photo-filter-container');
    if (filterContainer) {
      // Ensure filter starts completely hidden until photos are loaded
      filterContainer.classList.remove('lg:block');
      filterContainer.classList.add('hidden');
      
      filterContainer.innerHTML = PhotoFilterComponent.getTemplate('photo-filter');
      this.photoFilter.initialize('photo-filter');
    }
  }

  private extractFolderPath(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const pathParam = urlParams.get('path');
    
    if (pathParam) {
      this.folderPath = decodeURIComponent(pathParam);
      this.folderName = this.getDisplayName(this.folderPath);
      this.updateHeader();
    } else {
      this.showError('No folder path specified');
    }
  }

  private getDisplayName(fullPath: string): string {
    const pathParts = fullPath.split(/[/\\]/);
    return pathParts[pathParts.length - 1] || fullPath;
  }

  private updateHeader(): void {
    const folderNameEl = document.getElementById('folder-name');
    const folderPathEl = document.getElementById('folder-path');
    
    if (folderNameEl) {
      folderNameEl.textContent = this.folderName;
    }
    
    if (folderPathEl) {
      folderPathEl.textContent = this.folderPath;
    }
  }  private setupEventListeners(): void {
    // Back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = '/folders.html';
      });
    }    // Mobile filter toggle
    this.setupMobileFilterToggle();

    // Setup UI service event listeners
    this.uiService.setupEventListeners({
      onPhotoClick: (photo: HachiImageData) => this.handlePhotoClick(photo),
      onModalClose: () => this.closeModal(),
      onModalNext: () => this.nextPhoto(),
      onModalPrevious: () => this.previousPhoto()
    });
  }

  private async loadFolderPhotos(): Promise<void> {
    if (!this.folderPath) {
      this.showError('No folder path specified');
      return;
    }

    this.showLoading(true);
    this.hideError();    try {
      // Preprocess filename according to backend requirements
      const filename = this.folderPath.toString().toLowerCase().replace(/\//g, '|');
      const response = await fetch(`${API_URL}/getMeta/resource_directory/${filename}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch folder photos: ${response.status}`);
      }      const data: FolderPhotoData = await response.json();        if (data && data.meta_data && Array.isArray(data.meta_data)) {        // Convert API data to HachiImageData format for UIService
        this.photos = data.data_hash.map((hash: string, index: number) => ({
          id: hash,
          score: data.score[index] || 0,
          metadata: data.meta_data[index] || {}
        }));
        this.filteredPhotos = [...this.photos];        // Update photo filter with loaded photos
        this.photoFilter.updatePhotos(this.photos);
        
        // Set the current folder path as resource directory context for semantic search
        this.photoFilter.setResourceDirectory([this.folderPath]);
        
        // Show filter container if we have photos
        const filterContainer = document.getElementById('photo-filter-container');
        if (filterContainer) {
          if (this.photos.length > 0) {
            filterContainer.classList.remove('hidden');
            filterContainer.classList.add('lg:block');
          } else {
            filterContainer.classList.remove('lg:block');
            filterContainer.classList.add('hidden');
          }
        }        this.updatePhotoCount();
        this.updatePagination(); // Initialize pagination
        this.renderPhotos();
        
        // Setup pagination event listeners after pagination UI is rendered
        this.setupPaginationEventListeners();
        
        // Update the folder cache with accurate photo count and preview
        this.updateFolderCache(data.data_hash[0] || undefined);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error loading folder photos:', error);
      this.showError(`Failed to load photos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.showLoading(false);
    }
  }  private updatePhotoCount(): void {
    const photoCountEl = document.getElementById('folder-photo-count');
    if (photoCountEl) {
      const totalCount = this.photos.length;
      const filteredCount = this.filteredPhotos.length;
      
      if (filteredCount === totalCount) {
        photoCountEl.textContent = `${totalCount} photo${totalCount !== 1 ? 's' : ''}`;
      } else {
        photoCountEl.textContent = `${filteredCount} of ${totalCount} photo${totalCount !== 1 ? 's' : ''} (filtered)`;
      }
    }
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredPhotos.length / this.PAGE_SIZE);
    
    // Calculate displayed photos for current page
    const startIndex = (this.currentPage - 1) * this.PAGE_SIZE;
    const endIndex = Math.min(startIndex + this.PAGE_SIZE, this.filteredPhotos.length);
    this.displayedPhotos = this.filteredPhotos.slice(startIndex, endIndex);
    
    this.updatePaginationUI();
  }  private updatePaginationUI(): void {
    // Update pagination info
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) {
      const startIndex = (this.currentPage - 1) * this.PAGE_SIZE + 1;
      const endIndex = Math.min(this.currentPage * this.PAGE_SIZE, this.filteredPhotos.length);
      paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${this.filteredPhotos.length} photos`;
    }

    // Update pagination buttons
    const prevBtn = document.getElementById('prev-page-btn') as HTMLButtonElement;
    const nextBtn = document.getElementById('next-page-btn') as HTMLButtonElement;
    const pageInfo = document.getElementById('page-info');

    if (prevBtn) {
      prevBtn.disabled = this.currentPage <= 1;
    }
    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= this.totalPages;
    }
    if (pageInfo) {
      pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    }

    // Show/hide pagination controls based on whether pagination is needed
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
      if (this.totalPages > 1) {
        paginationContainer.classList.remove('hidden');
      } else {
        paginationContainer.classList.add('hidden');
      }
    }
  }  private goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    
    this.currentPage = page;
    this.updatePagination();
    this.renderPhotos();
    
    // Scroll to the filter level for better UX
    this.scrollToFilterLevel();
  }

  private scrollToFilterLevel(): void {
    // Find the filter container or photos section to scroll to
    const filterContainer = document.getElementById('photo-filter-container');
    const photosSection = document.querySelector('section');
    
    // Use the filter container if visible, otherwise use the photos section
    const targetElement = filterContainer?.classList.contains('lg:block') ? filterContainer : photosSection;
    
    if (targetElement) {
      // Use requestAnimationFrame to ensure DOM updates are complete
      requestAnimationFrame(() => {
        const rect = targetElement.getBoundingClientRect();
        const offsetTop = window.pageYOffset + rect.top - 20; // 20px padding from top
        
        window.scrollTo({
          top: offsetTop,
          behavior: 'instant'
        });
      });
    }
  }private setupPaginationEventListeners(): void {
    const prevBtn = document.getElementById('prev-page-btn') as HTMLButtonElement;
    const nextBtn = document.getElementById('next-page-btn') as HTMLButtonElement;

    if (prevBtn) {
      // Remove any existing listeners first
      const newPrevBtn = prevBtn.cloneNode(true) as HTMLButtonElement;
      prevBtn.parentNode?.replaceChild(newPrevBtn, prevBtn);
      
      newPrevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!newPrevBtn.disabled) {
          this.goToPage(this.currentPage - 1);
        }
      });
    }

    if (nextBtn) {
      // Remove any existing listeners first
      const newNextBtn = nextBtn.cloneNode(true) as HTMLButtonElement;
      nextBtn.parentNode?.replaceChild(newNextBtn, nextBtn);
      
      newNextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!newNextBtn.disabled) {
          this.goToPage(this.currentPage + 1);
        }
      });
    }
  }
  private renderPhotos(): void {
    const container = document.getElementById('photo-grid-container');
    const noPhotos = document.getElementById('no-photos');
    
    if (!container || !noPhotos) return;

    if (this.filteredPhotos.length === 0) {
      container.innerHTML = '';
      noPhotos.classList.remove('hidden');
      return;
    }

    noPhotos.classList.add('hidden');

    // Use UIService to update the photo grid with ONLY the displayed photos (pagination)
    this.uiService.updatePhotos(this.displayedPhotos, (photo: HachiImageData) => this.handlePhotoClick(photo));
  }  private handleFilteredPhotosUpdate(filteredPhotos: HachiImageData[]): void {
    console.log('Filtered photos updated:', filteredPhotos.length);
    this.filteredPhotos = filteredPhotos;
    
    // Reset to page 1 when filters change
    this.currentPage = 1;
    
    this.updatePhotoCount();
    this.updatePagination(); // Update pagination first
    this.renderPhotos();
    
    // Re-setup pagination event listeners to ensure they work correctly
    this.setupPaginationEventListeners();
  }
  private handlePhotoClick(photo: HachiImageData): void {
    // Find the index in the FILTERED photos (not just displayed photos)
    this.currentPhotoIndex = this.filteredPhotos.findIndex(p => 
      p.id === photo.id
    );
    
    if (this.currentPhotoIndex !== -1) {
      this.openModal(photo);
    }
  }
  private openModal(photo: HachiImageData): void {
    const canGoPrevious = this.currentPhotoIndex > 0;
    const canGoNext = this.currentPhotoIndex < this.filteredPhotos.length - 1;
    
    this.uiService.showModal(photo, canGoPrevious, canGoNext);
  }

  private closeModal(): void {
    this.uiService.hideModal();
    this.currentPhotoIndex = -1;
  }

  private nextPhoto(): void {
    if (this.currentPhotoIndex < this.filteredPhotos.length - 1) {
      this.currentPhotoIndex++;
      const nextPhoto = this.filteredPhotos[this.currentPhotoIndex];
      this.openModal(nextPhoto);
    }
  }

  private previousPhoto(): void {
    if (this.currentPhotoIndex > 0) {
      this.currentPhotoIndex--;
      const prevPhoto = this.filteredPhotos[this.currentPhotoIndex];
      this.openModal(prevPhoto);
    }
  }
  private showLoading(show: boolean): void {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
      if (show) {
        indicator.classList.remove('hidden');
        indicator.classList.add('flex');
      } else {
        indicator.classList.add('hidden');
        indicator.classList.remove('flex');
      }
    }
  }

  private showError(message: string): void {
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    if (errorDiv && errorText) {
      errorText.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  }
  private hideError(): void {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  }
  private async updateFolderCache(previewImageHash?: string): Promise<void> {
    try {
      // Update the folder's photo count and preview image in cache
      const cachedFolder = await folderCache.getCachedFolder(this.folderPath);
      
      if (cachedFolder) {
        // Update the existing cache entry with accurate data
        await folderCache.updateFolderData(this.folderPath, {
          imageCount: this.photos.length,
          previewImageHash: previewImageHash || cachedFolder.previewImageHash
        });
        
        console.log(`Updated cache for folder ${this.folderName}: ${this.photos.length} photos`);
      } else {
        // Create a new cache entry if it doesn't exist
        const displayName = this.getDisplayName(this.folderPath);
        await folderCache.cacheFolderData([{
          name: displayName,
          fullPath: this.folderPath,
          imageCount: this.photos.length,
          previewImageHash: previewImageHash,
          lastUpdated: Date.now()
        }]);
        
        console.log(`Created cache entry for folder ${this.folderName}: ${this.photos.length} photos`);
      }
    } catch (error) {
      console.warn('Failed to update folder cache:', error);
    }
  }
  private setupMobileFilterToggle(): void {
    const mobileToggle = document.getElementById('mobile-filter-toggle');
    const filterContainer = document.getElementById('photo-filter-container');
    
    if (mobileToggle && filterContainer) {
      mobileToggle.addEventListener('click', () => {
        filterContainer.classList.toggle('hidden');
        
        // Update toggle button icon
        const chevron = mobileToggle.querySelector('svg:last-child');
        if (chevron) {
          chevron.classList.toggle('rotate-180');
        }
      });
    }
  }
}

// Initialize the folder photos app
const folderPhotosApp = new FolderPhotosApp();

// Make it globally accessible for onclick handlers
(window as any).folderPhotosApp = folderPhotosApp;

console.log('Folder photos page initialized');
