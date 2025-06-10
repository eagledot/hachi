import { Navbar } from './navbar';

export interface PageConfig {
  title: string;
  currentPage: string;
  showNavbar?: boolean;
}

export class Layout {
  private navbar: Navbar | null = null;

  constructor(config: PageConfig) {
    this.setupPage(config);
  }

  private setupPage(config: PageConfig): void {
    // Update page title
    document.title = config.title;

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
    if (!navbarContainer) {
      navbarContainer = document.createElement('div');
      navbarContainer.id = 'navbar-container';
      
      // Insert at the beginning of body
      document.body.insertBefore(navbarContainer, document.body.firstChild);
    }

    this.navbar = new Navbar('navbar-container', currentPage);
  }

  private setupGlobalStyles(): void {
    // Add any global CSS classes to body
    document.body.classList.add('bg-gray-50', 'min-h-screen');
    
    // Ensure main content has proper spacing when navbar is present
    if (this.navbar) {
      // Add top padding to account for navbar
      const mainContent = document.querySelector('main') || document.body.children[1];
      if (mainContent instanceof HTMLElement) {
        mainContent.classList.add('pt-4');
      }
    }
  }

  public getNavbar(): Navbar | null {
    return this.navbar;
  }

  public updateCurrentPage(page: string): void {
    if (this.navbar) {
      this.navbar.updateCurrentPage(page);
    }
  }
}
