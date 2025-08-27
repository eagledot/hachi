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
    // Add any global CSS classes to body
    document.body.classList.add('bg-gray-50', 'min-h-screen');


    // Remove sidebar padding from main, since flex handles adjacency
    const mainContent = document.querySelector('main');
    if (mainContent instanceof HTMLElement) {
      mainContent.classList.remove('pt-4', 'md:pl-64', 'transition-all', 'duration-300');
      mainContent.classList.add('flex-1', 'min-w-0');
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
