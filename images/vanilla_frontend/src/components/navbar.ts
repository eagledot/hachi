// Shared Navbar Component
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

export class Navbar {
  private container: HTMLElement;
  private currentPage: string;
  private showOnlyIcons: boolean = true;
  private navItems: NavItem[] = [
    { label: 'Home', href: '/', icon: '🏠' },
    { label: 'Image Search', href: '/image-search.html', icon: '🔍' },
    { label: 'People', href: '/people.html', icon: '👥' },
    { label: 'Folders', href: '/folders.html', icon: '📁' },
    { label: 'Add Photos', href: '/indexing.html', icon: '🖼️' },
    { label: "Extensions", href: "/extensions.html", icon: "🧩" },
    // { label: "Google Photos", href: "/google-photos.html", icon: "🖼️" }
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
  // Narrow width on small screens (icon-only), full width with labels on md+
  const navWidthClass = this.showOnlyIcons ? "w-16" : 'w-16 md:w-[14rem]';
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
  <nav class="z-40 ${navWidthClass} flex-shrink-0 bg-white border-r border-gray-200 flex flex-col min-h-screen transition-all duration-300 md:fixed md:top-0 md:left-0 md:h-screen" id="sidebar-nav">
        <div class="flex items-center h-12 px-4 border-b border-gray-100 relative">
          <div class="flex items-center space-x-2 text-lg font-bold text-gray-900">
            ${canGoBack
              ? `<button id="nav-back-btn" type="button" class="flex cursor-pointer items-center space-x-2 text-gray-800 hover:text-blue-600 transition-colors" aria-label="Go Back">
                   <span class="text-sm md:hidden text-gray-700">←</span>
                   <span class="hidden md:inline text-gray-600 text-sm">Back</span>
                 </button>`
              : `<a href="/" class="flex items-center space-x-2 hover:text-blue-600 transition-colors" aria-label="Home">
                   <span class="text-2xl">📸</span>
                   <span class="hidden">Hachi</span>
                 </a>`}
          </div>
        </div>
        <div class="flex-1 overflow-y-auto py-4 px-2">
          <div class="space-y-2">
            ${this.navItems.map(item => this.renderNavItem(item)).join('')}
          </div>
        </div>
      </nav>
    `;
    this.setupEventListeners();
  }

  private renderNavItem(item: NavItem): string {
    const isActive = this.isCurrentPage(item.href);
  const baseClasses = "flex items-center justify-center md:justify-start px-2 py-2 rounded-md text-base font-medium transition-colors duration-200 md:space-x-3";
    const activeClasses = "bg-blue-100 text-blue-700 font-semibold";
    const inactiveClasses = "text-gray-600 text-sm hover:bg-gray-100 hover:text-blue-700";
    // Let's show labels only if this.showOnlyIcons is false
    return `
      <a href="${item.href}"
     class="${baseClasses} ${isActive ? activeClasses : inactiveClasses}"
     title="${item.label}"
     aria-label="${item.label}"
     aria-current="${isActive ? 'page' : 'false'}">
        ${item.icon ? `<span class='text-xl flex-shrink-0 text-center w-6'>${item.icon}</span>` : ''}
      <span class="${this.showOnlyIcons ? 'hidden' : 'md:inline'}">${item.label}</span>
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
  const backBtn = document.getElementById('nav-back-btn') as HTMLButtonElement | null;

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
