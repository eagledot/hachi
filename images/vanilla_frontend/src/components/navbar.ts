// Shared Navbar Component
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

export class Navbar {
  private container: HTMLElement;
  private currentPage: string;    
  private navItems: NavItem[] = [
    { label: 'Home', href: '/', icon: '🏠' },
    { label: 'Image Search', href: '/image-search.html', icon: '🔍' },
    { label: 'People', href: '/people.html', icon: '👥' },
    { label: 'Folders', href: '/folders.html', icon: '📁' },
    { label: 'Add Photos', href: '/indexing.html', icon: '🖼️' },
    // { label: "Google Photos", href: "/google-photos.html", icon: "🖼️" }
  ];
  private collapsed = false;

  constructor(containerId: string, currentPage: string = '') {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Navbar container with id "${containerId}" not found`);
    }
    this.container = container;
    this.currentPage = currentPage;
    // restore collapsed preference
    this.collapsed = localStorage.getItem('hachi_nav_collapsed') === '1';
    this.render();
  }
  private render(): void {
    const navWidthClass = this.collapsed ? 'w-16' : 'w-[14rem]';
    const labelVisibilityClass = this.collapsed ? 'sr-only' : '';
    const justifyItem = this.collapsed ? 'justify-center' : '';
    const atRoot = window.location.pathname === '/' || window.location.pathname === '/index.html';
    // Determine if we should show a back button.
    // Cases:
    // 1. Direct deep link (history length == 1 and not at root) -> show (goes to root when pressed)
    // 2. There is history (length > 1) and previous page likely different -> show
    // 3. At root: only show if there is history and referrer within same origin & not root (avoid pointless back to same root or external blank)
    let canGoBack = false;
    const hasHistory = window.history.length > 1;
    const ref = document.referrer ? (() => { try { return new URL(document.referrer); } catch { return null; } })() : null;
    const sameOriginRef = ref && ref.origin === window.location.origin;
    const refAtRoot = sameOriginRef && (ref!.pathname === '/' || ref!.pathname === '/index.html');
    if (!atRoot && window.history.length === 1) {
      // Deep link direct load
      canGoBack = true;
    } else if (!atRoot && hasHistory) {
      canGoBack = true;
    } else if (atRoot && hasHistory && sameOriginRef && !refAtRoot) {
      canGoBack = true;
    }
    this.container.innerHTML = `
  <nav class="fixed top-0 left-0 z-40 ${navWidthClass} h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 transform -translate-x-full md:translate-x-0" id="sidebar-nav" data-collapsed="${this.collapsed}">
        <div class="flex items-center h-12 px-4 border-b border-gray-100 relative">
          <div class="flex items-center ${this.collapsed ? 'justify-center w-full' : 'space-x-2'} text-lg font-bold text-gray-900">
            ${canGoBack
              ? `<button id="nav-back-btn" type="button" class="flex  cursor-pointer items-center ${this.collapsed ? 'justify-center w-full' : 'space-x-2'} text-gray-800 hover:text-blue-600 transition-colors" aria-label="Go Back">
                   <span class="text-sm text-gray-700">←</span>
                   <span class="${labelVisibilityClass} text-gray-600 text-sm">Back</span>
                 </button>`
              : `<a href="/" class="flex items-center ${this.collapsed ? 'justify-center w-full' : 'space-x-2'} hover:text-blue-600 transition-colors" aria-label="Home">
                   <span class="text-2xl">📸</span>
                   <span class="${labelVisibilityClass}">Hachi</span>
                 </a>`}
          </div>
          <button id="sidebar-collapse" class="absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="${this.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}"
            aria-pressed="${this.collapsed}">
            <span>${this.collapsed ? '›' : '‹'}</span>
          </button>
          <button id="sidebar-close" class="ml-auto md:hidden p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${this.collapsed ? 'hidden' : ''}" aria-label="Close sidebar">
            <svg class="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto py-4 px-2">
          <div class="space-y-2">
            ${this.navItems.map(item => this.renderNavItem(item, { collapsed: this.collapsed, labelVisibilityClass, justifyItem })).join('')}
          </div>
        </div>
      </nav>
      <div id="sidebar-overlay" class="fixed inset-0 bg-black bg-opacity-30 z-30 hidden md:hidden"></div>
      <button id="sidebar-open" class="fixed top-4 left-4 z-50 p-2 rounded bg-white shadow-md border border-gray-200 text-gray-700 md:hidden" aria-label="Open sidebar">
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
    `;
    this.applyLayoutState();
    this.setupEventListeners();
  }

  private renderNavItem(item: NavItem, opts?: { collapsed: boolean; labelVisibilityClass: string; justifyItem: string }): string {
    const isActive = this.isCurrentPage(item.href);
    const collapsed = opts?.collapsed;
    // Remove space-x-* and heavy horizontal padding when collapsed
    const baseClassesExpanded = "flex items-center px-2 py-2 rounded-md text-base font-medium transition-colors duration-200 space-x-3";
    const baseClassesCollapsed = "flex items-center justify-center p-3 rounded-lg font-medium transition-colors duration-200";
    const baseClasses = collapsed ? baseClassesCollapsed : baseClassesExpanded;
    const activeClasses = "bg-blue-100 text-blue-700 font-semibold";
    const inactiveClasses = "text-gray-600 text-sm hover:bg-gray-100 hover:text-blue-700";
    const labelClass = opts?.labelVisibilityClass || '';
    return `
      <a href="${item.href}"
         class="${baseClasses} ${isActive ? activeClasses : inactiveClasses}"
         title="${collapsed ? item.label : ''}"
         aria-current="${isActive ? 'page' : 'false'}">
        ${item.icon ? `<span class='text-xl flex-shrink-0 text-center w-6'>${item.icon}</span>` : ''}
        <span class="${labelClass}">${item.label}</span>
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
    const sidebar = document.getElementById('sidebar-nav');
    const sidebarOpen = document.getElementById('sidebar-open');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
  const collapseBtn = document.getElementById('sidebar-collapse');
  const backBtn = document.getElementById('nav-back-btn') as HTMLButtonElement | null;

    const openSidebar = () => {
      sidebar?.classList.remove('-translate-x-full');
      sidebarOverlay?.classList.remove('hidden');
    };
    const closeSidebar = () => {
      sidebar?.classList.add('-translate-x-full');
      sidebarOverlay?.classList.add('hidden');
    };

    sidebarOpen?.addEventListener('click', openSidebar);
    sidebarClose?.addEventListener('click', closeSidebar);
    sidebarOverlay?.addEventListener('click', closeSidebar);

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) closeSidebar();
    });

    collapseBtn?.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      localStorage.setItem('hachi_nav_collapsed', this.collapsed ? '1' : '0');
      this.render(); // applyLayoutState invoked inside render
    });

    // Back button logic now in header replacing logo icon
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/';
        }
      });
      // Re-render when history changes (popstate) to potentially restore logo
      window.addEventListener('popstate', () => this.render());
    }
  }

  private applyLayoutState(): void {
    const root = document.body;
    if (this.collapsed) {
      root.classList.add('sidebar-collapsed');
    } else {
      root.classList.remove('sidebar-collapsed');
    }
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
