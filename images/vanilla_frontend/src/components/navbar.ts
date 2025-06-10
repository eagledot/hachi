// Shared Navbar Component
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

export class Navbar {
  private container: HTMLElement;
  private currentPage: string;    private navItems: NavItem[] = [
    { label: 'Home', href: '/', icon: '🏠' },
    { label: 'Image Search', href: '/image-search.html', icon: '🔍' },
    { label: 'People', href: '/people.html', icon: '👥' },
    { label: 'Folders', href: '/folders.html', icon: '📁' },
    { label: 'Add Photos', href: '/indexing.html', icon: '🖼️' },
  ];

  constructor(containerId: string, currentPage: string = '') {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Navbar container with id "${containerId}" not found`);
    }
    this.container = container;
    this.currentPage = currentPage;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <nav class="bg-white shadow-lg border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <!-- Logo/Brand -->
            <div class="flex items-center">
              <a href="/" class="flex items-center space-x-3 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                <span class="text-2xl">📸</span>
                <span>Hachi</span>
              </a>
            </div>

            <!-- Navigation Links -->
            <div class="hidden md:block">
              <div class="ml-10 flex items-baseline space-x-4">
                ${this.navItems.map(item => this.renderNavItem(item)).join('')}
              </div>
            </div>

            <!-- Mobile menu button -->
            <div class="md:hidden">
              <button id="mobile-menu-button" type="button" class="bg-gray-50 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500" aria-controls="mobile-menu" aria-expanded="false">
                <span class="sr-only">Open main menu</span>
                <!-- Menu icon -->
                <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Mobile menu -->
          <div class="md:hidden hidden" id="mobile-menu">
            <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              ${this.navItems.map(item => this.renderMobileNavItem(item)).join('')}
            </div>
          </div>
        </div>
      </nav>
    `;

    this.setupEventListeners();
  }

  private renderNavItem(item: NavItem): string {
    const isActive = this.isCurrentPage(item.href);
    const baseClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2";
    const activeClasses = "bg-blue-100 text-blue-700";
    const inactiveClasses = "text-gray-500 hover:bg-gray-100 hover:text-gray-700";
    
    return `
      <a href="${item.href}" class="${baseClasses} ${isActive ? activeClasses : inactiveClasses}">
        ${item.icon ? `<span class="text-lg">${item.icon}</span>` : ''}
        <span>${item.label}</span>
      </a>
    `;
  }

  private renderMobileNavItem(item: NavItem): string {
    const isActive = this.isCurrentPage(item.href);
    const baseClasses = "block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200";
    const activeClasses = "bg-blue-100 text-blue-700";
    const inactiveClasses = "text-gray-500 hover:bg-gray-100 hover:text-gray-700";
    
    return `
      <a href="${item.href}" class="${baseClasses} ${isActive ? activeClasses : inactiveClasses}">
        <div class="flex items-center space-x-2">
          ${item.icon ? `<span class="text-lg">${item.icon}</span>` : ''}
          <span>${item.label}</span>
        </div>
      </a>
    `;
  }

  private isCurrentPage(href: string): boolean {
    if (href === '/' && (this.currentPage === '' || this.currentPage === '/' || this.currentPage === '/index.html')) {
      return true;
    }
    return this.currentPage === href || window.location.pathname === href;
  }

  private setupEventListeners(): void {
    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
      mobileMenuButton.addEventListener('click', () => {
        const isHidden = mobileMenu.classList.contains('hidden');
        if (isHidden) {
          mobileMenu.classList.remove('hidden');
          mobileMenuButton.setAttribute('aria-expanded', 'true');
        } else {
          mobileMenu.classList.add('hidden');
          mobileMenuButton.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', (event) => {
      if (mobileMenu && !mobileMenu.contains(event.target as Node) && 
          !mobileMenuButton?.contains(event.target as Node)) {
        mobileMenu.classList.add('hidden');
        mobileMenuButton?.setAttribute('aria-expanded', 'false');
      }
    });

    // Close mobile menu on window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768 && mobileMenu) { // md breakpoint
        mobileMenu.classList.add('hidden');
        mobileMenuButton?.setAttribute('aria-expanded', 'false');
      }
    });
  }

  public updateCurrentPage(page: string): void {
    this.currentPage = page;
    this.render();
  }

  public addNavItem(item: NavItem): void {
    this.navItems.push(item);
    this.render();
  }

  public removeNavItem(href: string): void {
    this.navItems = this.navItems.filter(item => item.href !== href);
    this.render();
  }
}
