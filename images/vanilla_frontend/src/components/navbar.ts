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
  <nav class="fixed top-0 left-0 z-40 w-64 h-screen bg-white shadow-lg border-r border-gray-200 flex flex-col transition-transform duration-300 transform -translate-x-full md:translate-x-0 md:fixed md:top-0 md:left-0" id="sidebar-nav">
        <div class="flex items-center h-16 px-6 border-b border-gray-100">
          <a href="/" class="flex items-center space-x-2 text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">
            <span class="text-2xl">📸</span>
            <span>Hachi</span>
          </a>
          <button id="sidebar-close" class="ml-auto md:hidden p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Close sidebar">
            <svg class="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto py-4 px-2">
          <div class="space-y-2">
            ${this.navItems.map(item => this.renderNavItem(item)).join('')}
          </div>
        </div>
      </nav>

      <!-- Sidebar overlay for mobile -->
      <div id="sidebar-overlay" class="fixed inset-0 bg-black bg-opacity-30 z-30 hidden md:hidden"></div>

      <!-- Sidebar open button for mobile -->
      <button id="sidebar-open" class="fixed top-4 left-4 z-50 p-2 rounded bg-white shadow-md border border-gray-200 text-gray-700 md:hidden" aria-label="Open sidebar">
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
    `;

    this.setupEventListeners();
  }

  private renderNavItem(item: NavItem): string {
    const isActive = this.isCurrentPage(item.href);
    const baseClasses = "flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 space-x-3";
    const activeClasses = "bg-blue-100 text-blue-700 font-semibold";
    const inactiveClasses = "text-gray-600 hover:bg-gray-100 hover:text-blue-700";
    return `
      <a href="${item.href}" class="${baseClasses} ${isActive ? activeClasses : inactiveClasses}">
        ${item.icon ? `<span class='text-xl'>${item.icon}</span>` : ''}
        <span>${item.label}</span>
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
    // Sidebar open/close for mobile
    const sidebar = document.getElementById('sidebar-nav');
    const sidebarOpen = document.getElementById('sidebar-open');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function openSidebar() {
      if (sidebar) sidebar.classList.remove('-translate-x-full');
      if (sidebarOverlay) sidebarOverlay.classList.remove('hidden');
    }
    function closeSidebar() {
      if (sidebar) sidebar.classList.add('-translate-x-full');
      if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
    }

    sidebarOpen?.addEventListener('click', openSidebar);
    sidebarClose?.addEventListener('click', closeSidebar);
    sidebarOverlay?.addEventListener('click', closeSidebar);

    // Close sidebar on resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) {
        closeSidebar();
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
