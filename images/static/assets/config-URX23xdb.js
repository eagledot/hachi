var c=Object.defineProperty;var l=(r,e,t)=>e in r?c(r,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):r[e]=t;var i=(r,e,t)=>l(r,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))a(s);new MutationObserver(s=>{for(const n of s)if(n.type==="childList")for(const d of n.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&a(d)}).observe(document,{childList:!0,subtree:!0});function t(s){const n={};return s.integrity&&(n.integrity=s.integrity),s.referrerPolicy&&(n.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?n.credentials="include":s.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function a(s){if(s.ep)return;s.ep=!0;const n=t(s);fetch(s.href,n)}})();class u{constructor(e,t=""){i(this,"container");i(this,"currentPage");i(this,"navItems",[{label:"Home",href:"/",icon:"🏠"},{label:"Image Search",href:"/image-search.html",icon:"🔍"},{label:"People",href:"/people.html",icon:"👥"},{label:"Folders",href:"/folders.html",icon:"📁"},{label:"Add Photos",href:"/indexing.html",icon:"🖼️"}]);const a=document.getElementById(e);if(!a)throw new Error(`Navbar container with id "${e}" not found`);this.container=a,this.currentPage=t,this.render()}render(){this.container.innerHTML=`
      <nav class="bg-white shadow-md border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-14">
            <!-- Logo/Brand -->
            <div class="flex items-center">
              <a href="/" class="flex items-center space-x-2 text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">
                <span class="text-xl">📸</span>
                <span>Hachi</span>
              </a>
            </div>

            <!-- Navigation Links -->
            <div class="hidden md:block">
              <div class="ml-10 flex items-baseline space-x-4">
                ${this.navItems.map(e=>this.renderNavItem(e)).join("")}
              </div>
            </div>

            <!-- Mobile menu button -->
            <div class="md:hidden">              <button id="mobile-menu-button" type="button" class="bg-gray-50 inline-flex items-center justify-center p-1.5 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500" aria-controls="mobile-menu" aria-expanded="false">
                <span class="sr-only">Open main menu</span>
                <!-- Menu icon -->
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Mobile menu -->
          <div class="md:hidden hidden" id="mobile-menu">
            <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              ${this.navItems.map(e=>this.renderMobileNavItem(e)).join("")}
            </div>
          </div>
        </div>
      </nav>
    `,this.setupEventListeners()}renderNavItem(e){const t=this.isCurrentPage(e.href);return`
      <a href="${e.href}" class="px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${t?"bg-blue-100 text-blue-700":"text-gray-500 hover:bg-gray-100 hover:text-gray-700"}">
        ${e.icon?`<span class="text-lg">${e.icon}</span>`:""}
        <span>${e.label}</span>
      </a>
    `}renderMobileNavItem(e){const t=this.isCurrentPage(e.href);return`
      <a href="${e.href}" class="block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${t?"bg-blue-100 text-blue-700":"text-gray-500 hover:bg-gray-100 hover:text-gray-700"}">
        <div class="flex items-center space-x-2">
          ${e.icon?`<span class="text-lg">${e.icon}</span>`:""}
          <span>${e.label}</span>
        </div>
      </a>
    `}isCurrentPage(e){return e==="/"&&(this.currentPage===""||this.currentPage==="/"||this.currentPage==="/index.html")?!0:this.currentPage===e||window.location.pathname===e}setupEventListeners(){const e=document.getElementById("mobile-menu-button"),t=document.getElementById("mobile-menu");e&&t&&e.addEventListener("click",()=>{t.classList.contains("hidden")?(t.classList.remove("hidden"),e.setAttribute("aria-expanded","true")):(t.classList.add("hidden"),e.setAttribute("aria-expanded","false"))}),document.addEventListener("click",a=>{t&&!t.contains(a.target)&&!(e!=null&&e.contains(a.target))&&(t.classList.add("hidden"),e==null||e.setAttribute("aria-expanded","false"))}),window.addEventListener("resize",()=>{window.innerWidth>=768&&t&&(t.classList.add("hidden"),e==null||e.setAttribute("aria-expanded","false"))})}updateCurrentPage(e){this.currentPage=e,this.render()}addNavItem(e){this.navItems.push(e),this.render()}removeNavItem(e){this.navItems=this.navItems.filter(t=>t.href!==e),this.render()}}class p{constructor(e){i(this,"navbar",null);this.setupPage(e)}setupPage(e){document.title=e.title,e.showNavbar!==!1&&this.initializeNavbar(e.currentPage),this.setupGlobalStyles()}initializeNavbar(e){let t=document.getElementById("navbar-container");t||(t=document.createElement("div"),t.id="navbar-container",document.body.insertBefore(t,document.body.firstChild)),this.navbar=new u("navbar-container",e)}setupGlobalStyles(){if(document.body.classList.add("bg-gray-50","min-h-screen"),this.navbar){const e=document.querySelector("main")||document.body.children[1];e instanceof HTMLElement&&e.classList.add("pt-4")}}getNavbar(){return this.navbar}updateCurrentPage(e){this.navbar&&this.navbar.updateCurrentPage(e)}}class v{static get apiUrl(){var e;return((e=window.config)==null?void 0:e.apiUrl)||"http://localhost:5000/api"}static get endpoints(){return{GET_PARTITIONS:"/getPartitions"}}}const o="";class h{constructor(){i(this,"GET_PARTITIONS",o+"/getPartitions");i(this,"GET_SUGGESTION_PATH",o+"/getSuggestionPath");i(this,"SELECT_FOLDER",o+"/select-folder");i(this,"INDEX_START",o+"/indexStart")}}const b=new h;export{v as C,p as L,b as e};
