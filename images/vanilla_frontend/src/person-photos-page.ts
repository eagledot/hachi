// Person photos page functionality - handles displaying a person's photos
import { Layout } from './components/layout';
import { UIService } from './imageSearch/uiService';
import type { HachiImageData } from './imageSearch/types';
import { ImageModalComponent, PhotoGridComponent, PhotoFilterComponent } from './components';
import Config from './config';

// API base URL
const API_URL = Config.apiUrl;

interface PersonPhotosData {
  data_hash: string[];
  meta_data: any[];
  score: number[];
}

class PersonPhotosApp {
  private uiService!: UIService; // Using definite assignment assertion since we initialize in init()
  private personId: string | null = null;
  private personPhotosData: PersonPhotosData | null = null;
  private currentPhotoIndex: number | null = null;
  private photoFilter!: PhotoFilterComponent;
  private allPhotos: HachiImageData[] = [];
  private filteredPhotos: HachiImageData[] = [];
  private displayedPhotos: HachiImageData[] = []; // Currently displayed photos (for pagination)
  
  // Pagination properties
  private readonly PAGE_SIZE = 100; // Display 100 photos per page for good performance
  private currentPage = 1;
  private totalPages = 0;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    // Initialize layout first
    new Layout({ 
      title: 'Person Photos - Hachi',
      currentPage: 'person-photos'
    });
      // Initialize reusable components before UIService
    this.initializeComponents();
    
    // Now create UIService after components are in the DOM
    // Use photo-grid-container since that's where the photo grid elements are created
    this.uiService = new UIService('photo-grid-container');
    
    // Get person ID from URL parameters
    this.personId = this.getPersonIdFromUrl();
    
    if (!this.personId) {
      this.showError('No person ID specified');
      return;
    }

    this.setupEventListeners();
    await this.loadPersonData();
  }
  private initializeComponents(): void {
    // Initialize reusable components
    ImageModalComponent.initialize();
    PhotoGridComponent.initialize('photo-grid-container', {
      loadingId: 'loading-indicator',
      errorId: 'error-display',
      noResultsId: 'no-results-message',
      gridId: 'photo-grid',
      personMode: true
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
  private getPersonIdFromUrl(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
  }
  private setupEventListeners(): void {
    // Back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = '/people.html';
      });
    }

    // Edit name button - shows inline edit form
    const editNameBtn = document.getElementById('edit-name-btn');
    if (editNameBtn) {
      editNameBtn.addEventListener('click', () => this.showEditForm());
    }

    // Save name button
    const saveNameBtn = document.getElementById('save-name-btn');
    if (saveNameBtn) {
      saveNameBtn.addEventListener('click', () => this.savePersonName());
    }

    // Cancel edit button
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => this.hideEditForm());
    }

    // Person name input - handle Enter and Esc keys
    const nameInput = document.getElementById('person-name-input') as HTMLInputElement;
    if (nameInput) {
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.savePersonName();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.hideEditForm();
        }
      });
    }

    // Person name display - click to edit
    const personNameDisplay = document.getElementById('person-name-display');
    if (personNameDisplay) {
      personNameDisplay.addEventListener('click', () => this.showEditForm());
    }

    // Setup event listeners
    this.uiService.setupEventListeners({
      onPhotoClick: (photo: HachiImageData) => this.handlePhotoClick(photo),
      onModalClose: () => this.closeModal(),
      onModalNext: () => this.nextPhoto(),
      onModalPrevious: () => this.previousPhoto()
    });
  }

  private async loadPersonData(): Promise<void> {
    if (!this.personId) return;

    this.showLoading(true);
    
    try {
      // Load person photos
      const response = await fetch(`${API_URL}/getMeta/person/${this.personId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      this.personPhotosData = await response.json();
      
      this.updatePersonInfo();
      this.renderPhotos();
      
    } catch (error) {
      console.error('Failed to load person data:', error);
      this.showError('Failed to load person data. Please try again.');
    } finally {
      this.showLoading(false);
    }
  }
  private updatePersonInfo(): void {
    if (!this.personId || !this.personPhotosData) return;

    // Update person avatar
    const avatar = document.getElementById('person-avatar') as HTMLImageElement;
    if (avatar) {
      avatar.src = `${API_URL}/getPreviewPerson/${this.personId}`;
      avatar.alt = this.personId;
      avatar.onerror = () => { avatar.src = './assets/sample_place_bg.jpg'; };
    }

    // Update person name
    const nameElement = document.getElementById('person-name');
    if (nameElement) {
      // Use personId as display name for now - this could be enhanced to fetch custom names
      const displayName = this.personId.charAt(0).toUpperCase() + this.personId.slice(1).toLowerCase();
      nameElement.textContent = displayName;
    }

    // Update photo count
    const photoCountElement = document.getElementById('person-photo-count');
    if (photoCountElement) {
      const photoCount = this.personPhotosData.data_hash ? this.personPhotosData.data_hash.length : 0;
      photoCountElement.textContent = `${photoCount} photos`;
    }

    // Initialize name input with current name
    const nameInput = document.getElementById('person-name-input') as HTMLInputElement;
    if (nameInput) {
      const displayName = this.personId.charAt(0).toUpperCase() + this.personId.slice(1).toLowerCase();
      nameInput.value = displayName;
    }
  }

  private showEditForm(): void {
    const displayDiv = document.getElementById('person-name-display');
    const editDiv = document.getElementById('person-name-edit');
    const nameInput = document.getElementById('person-name-input') as HTMLInputElement;

    if (displayDiv && editDiv && nameInput) {
      displayDiv.classList.add('hidden');
      editDiv.classList.remove('hidden');
      
      // Focus and select the input text
      nameInput.focus();
      nameInput.select();
    }
  }

  private hideEditForm(): void {
    const displayDiv = document.getElementById('person-name-display');
    const editDiv = document.getElementById('person-name-edit');
    const nameInput = document.getElementById('person-name-input') as HTMLInputElement;

    if (displayDiv && editDiv && nameInput) {
      displayDiv.classList.remove('hidden');
      editDiv.classList.add('hidden');
      
      // Reset input to current name
      if (this.personId) {
        const displayName = this.personId.charAt(0).toUpperCase() + this.personId.slice(1).toLowerCase();
        nameInput.value = displayName;
      }
    }
  }  private renderPhotos(): void {
    const photoGrid = document.getElementById('photo-grid');
    const noPhotosMessage = document.getElementById('no-results-message');
    
    if (!photoGrid || !noPhotosMessage || !this.personPhotosData) return;

    if (!this.personPhotosData.data_hash || this.personPhotosData.data_hash.length === 0) {
      photoGrid.innerHTML = '';
      noPhotosMessage.classList.remove('hidden');
      return;
    }

    noPhotosMessage.classList.add('hidden');

    // Convert API data to HachiImageData format for UIService
    const photosForGrid: HachiImageData[] = this.personPhotosData.data_hash.map((hash, index) => ({
      id: hash,
      score: this.personPhotosData!.score[index] || 0,
      metadata: this.personPhotosData!.meta_data[index] || {}
    }));

    // Store all photos for filtering
    this.allPhotos = photosForGrid;
    this.filteredPhotos = [...this.allPhotos];
    
    // Update photo filter with loaded photos
    this.photoFilter.updatePhotos(this.allPhotos);
    
    // Set person context for semantic search
    if (this.personId) {
      this.photoFilter.setPersonContext(this.personId);
    }
    
    // Show filter container if we have photos
    const filterContainer = document.getElementById('photo-filter-container');
    if (filterContainer) {
      if (this.allPhotos.length > 0) {
        filterContainer.classList.remove('hidden');
        filterContainer.classList.add('lg:block');
      } else {
        filterContainer.classList.remove('lg:block');
        filterContainer.classList.add('hidden');
      }
    }

    // Initialize pagination
    this.updatePagination();
    this.renderDisplayedPhotos();
    
    // Setup pagination event listeners after pagination UI is rendered
    this.setupPaginationEventListeners();
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredPhotos.length / this.PAGE_SIZE);
    
    // Calculate displayed photos for current page
    const startIndex = (this.currentPage - 1) * this.PAGE_SIZE;
    const endIndex = Math.min(startIndex + this.PAGE_SIZE, this.filteredPhotos.length);
    this.displayedPhotos = this.filteredPhotos.slice(startIndex, endIndex);
    
    this.updatePaginationUI();
  }

  private updatePaginationUI(): void {
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
    this.renderDisplayedPhotos();
    
    // Scroll to the top of the page instantly for performance
    window.scrollTo(0, 0);
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
  }

  private setupPaginationEventListeners(): void {
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

  private renderDisplayedPhotos(): void {
    // Use UIService to update photos with ONLY the displayed photos (pagination)
    this.uiService.updatePhotos(this.displayedPhotos, (photo: HachiImageData) => {
      this.handlePhotoClick(photo);
    });
  }
  private handleFilteredPhotosUpdate(filteredPhotos: HachiImageData[]): void {
    console.log('Filtered photos updated:', filteredPhotos.length);
    this.filteredPhotos = filteredPhotos;
    
    // Reset to page 1 when filters change
    this.currentPage = 1;
    
    this.updatePagination(); // Update pagination first
    this.renderDisplayedPhotos();
    
    // Re-setup pagination event listeners to ensure they work correctly
    this.setupPaginationEventListeners();
  }
  private handlePhotoClick(photo: HachiImageData): void {
    if (!this.personPhotosData) return;

    // Find the index in the FILTERED photos (not just displayed photos)
    const photoIndex = this.filteredPhotos.findIndex(p => p.id === photo.id);
    if (photoIndex === -1) return;

    this.currentPhotoIndex = photoIndex;
    
    // Determine navigation capabilities based on filtered photos
    const canGoPrevious = photoIndex > 0;
    const canGoNext = photoIndex < this.filteredPhotos.length - 1;
    
    // Show modal using UIService
    this.uiService.showModal(photo, canGoPrevious, canGoNext);
  }  private closeModal(): void {
    // Use UIService to properly hide the modal and restore scroll
    this.uiService.hideModal();
    this.currentPhotoIndex = null;
  }
  private nextPhoto(): void {
    if (this.currentPhotoIndex !== null && 
        this.currentPhotoIndex < this.filteredPhotos.length - 1) {
      this.currentPhotoIndex++;
      this.showPhotoAtIndex(this.currentPhotoIndex);
    }
  }

  private previousPhoto(): void {
    if (this.currentPhotoIndex !== null && this.currentPhotoIndex > 0) {
      this.currentPhotoIndex--;
      this.showPhotoAtIndex(this.currentPhotoIndex);
    }
  }

  private showPhotoAtIndex(index: number): void {
    if (index < 0 || index >= this.filteredPhotos.length) return;

    const photo = this.filteredPhotos[index];
    this.currentPhotoIndex = index;
    
    const canGoPrevious = index > 0;
    const canGoNext = index < this.filteredPhotos.length - 1;
    
    this.uiService.showModal(photo, canGoPrevious, canGoNext);
  }private async savePersonName(): Promise<void> {
    if (!this.personId) return;

    const nameInput = document.getElementById('person-name-input') as HTMLInputElement;
    if (!nameInput) return;

    const newName = nameInput.value.trim();
    if (!newName) {
      this.showError('Please enter a valid name');
      return;
    }

    if (newName === this.personId) {
      this.hideEditForm();
      return;
    }

    // Show loading state
    const saveBtn = document.getElementById('save-name-btn') as HTMLButtonElement;
    const cancelBtn = document.getElementById('cancel-edit-btn') as HTMLButtonElement;
    
    if (saveBtn && cancelBtn) {
      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
      cancelBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }    try {
      const result = await this.renamePersonGlobally(this.personId, newName);
      
      if (result.success) {
        console.log(`Person name updated from ${this.personId} to: ${newName}`);
        
        // Redirect to the new URL with the updated person ID
        const newUrl = `/person-photos.html?id=${encodeURIComponent(newName)}`;
        window.location.href = newUrl;
      } else {
        // Show the specific error message from the API
        this.showError(result.reason || 'Failed to save name. Please try again.');
        
        // Restore button states on error
        if (saveBtn && cancelBtn) {
          saveBtn.disabled = false;
          cancelBtn.disabled = false;
          saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          cancelBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      }
    } catch (error) {
      console.error('Failed to save person name:', error);
      this.showError(error instanceof Error ? error.message : 'Failed to save name. Please try again.');
      
      // Restore button states on error
      if (saveBtn && cancelBtn) {
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
        saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        cancelBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  }  private async renamePersonGlobally(oldPersonId: string, newPersonId: string): Promise<{success: boolean, reason?: string}> {
    const formData = new FormData();
    formData.append('old_person_id', oldPersonId);
    formData.append('new_person_id', newPersonId);

    try {
      const response = await fetch(`${API_URL}/tagPerson`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ reason: 'Network error or invalid JSON response' }));
        throw new Error(errorData.reason || `Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: result.success || false,
        reason: result.reason
      };
    } catch (error) {
      console.error('Error renaming person:', error);
      throw error; // Re-throw to be handled by the calling method
    }
  }

  private showLoading(show: boolean): void {
    const loadingIndicator = document.getElementById('loading-indicator');
    const photoGrid = document.getElementById('photo-grid');
      if (loadingIndicator) {
      if (show) {
        loadingIndicator.classList.remove('hidden');
        loadingIndicator.classList.add('flex');
      } else {
        loadingIndicator.classList.add('hidden');
        loadingIndicator.classList.remove('flex');
      }
    }
    
    if (photoGrid && show) {
      photoGrid.innerHTML = '';
    }
  }
  private showError(message: string): void {
    const errorMessage = document.getElementById('error-display');
    const errorText = document.getElementById('error-text');
    
    if (errorMessage && errorText) {
      errorText.textContent = message;
      errorMessage.classList.remove('hidden');
      
      // Auto-hide error after 5 seconds
      setTimeout(() => {
        errorMessage.classList.add('hidden');
      }, 5000);
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PersonPhotosApp();
});

// Make it available globally for debugging
(window as any).personPhotosApp = PersonPhotosApp;
