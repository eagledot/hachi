var x=Object.defineProperty;var b=(l,e,t)=>e in l?x(l,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):l[e]=t;var r=(l,e,t)=>b(l,typeof e!="symbol"?e+"":e,t);import{L as I}from"./config-C3qbAENF.js";/* empty css              */import{t as v,m as P,S as E,F as S,I as z,P as k,a as f,U as C,C as p}from"./photoFilter-Cn5TW9Pc.js";import{h as F}from"./utils-B3qE-N8V.js";class L{constructor(e){r(this,"state",{photos:[],isLoading:!1,isSearchDone:!1,error:null,selectedPhoto:null,currentPhotoIndex:null,pollingSearchTerm:"",clientId:null,query_token:null,n_pages:null,n_matches_found:null});r(this,"events");this.events=e}getState(){return{...this.state}}updateState(e){const t={...this.state};this.state={...this.state,...e},e.photos!==void 0&&e.photos!==t.photos&&this.state.query_token!==null&&this.state.n_pages!==null&&this.state.n_matches_found!==null&&this.events.onPhotosUpdate(this.state.photos,this.state.query_token,this.state.n_pages,this.state.n_matches_found),e.isLoading!==void 0&&e.isLoading!==t.isLoading&&this.events.onLoadingChange(this.state.isLoading),e.error!==void 0&&this.events.onErrorChange(this.state.error),e.isSearchDone!==void 0&&e.isSearchDone!==t.isSearchDone&&this.events.onSearchDoneChange(this.state.isSearchDone)}async startSearch(e){this.updateState({isLoading:!0,error:null,isSearchDone:!1,photos:[],pollingSearchTerm:e.trim(),clientId:null});let t="/api/query",s=new FormData;s.append("query_start",String(!0)),s.append("query",e),s.append("page_size",String(20));const o=await fetch(t,{method:"POST",body:s});if(!o.ok)throw new Error("Network response was not ok");const i=await o.json(),n=i.query_token,a=i.n_pages,h=i.n_matches,d="/api/collectQueryMeta/"+n+"/"+String(0),c=await fetch(d,{method:"GET"});if(!c.ok)throw new Error("Network response was not ok");let u=await c.json();this.updateState({isLoading:!1});const g=v(u),y=P(this.state.photos,g);g.length&&this.updateState({photos:y,isLoading:!1,isSearchDone:!0,query_token:n,n_pages:a,n_matches_found:h})}async performSearch(e,t){console.log("perform search was called ..");try{const s=await E.searchImages(e,{...t,clientId:this.state.clientId||void 0});console.log("after performing search: ",s),s.query_completed=!1,s.query_completed?(console.log("querying is done.."),this.updateState({isLoading:!1,isSearchDone:!0})):t.isInitialSearch&&this.startPolling()}catch(s){const o=s instanceof Error?s.message:"An unknown error occurred";this.updateState({error:o,isLoading:!1,isSearchDone:!0}),console.error("Search error:",s)}}async startPolling(){for(;this.state.pollingSearchTerm&&!this.state.isSearchDone;)await this.performSearch(this.state.pollingSearchTerm,{isInitialSearch:!1})}selectPhoto(e){const t=this.state.photos.findIndex(s=>s.id===e.id);t!==-1&&this.updateState({selectedPhoto:e,currentPhotoIndex:t})}clearSelection(){this.updateState({selectedPhoto:null,currentPhotoIndex:null})}nextPhoto(){const{currentPhotoIndex:e,photos:t}=this.state;if(e!==null&&e<t.length-1){const s=e+1;this.updateState({currentPhotoIndex:s,selectedPhoto:t[s]})}}previousPhoto(){const{currentPhotoIndex:e,photos:t}=this.state;if(e!==null&&e>0){const s=e-1;this.updateState({currentPhotoIndex:s,selectedPhoto:t[s]})}}canGoNext(){const{currentPhotoIndex:e,photos:t}=this.state;return e!==null&&e<t.length-1}canGoPrevious(){const{currentPhotoIndex:e}=this.state;return e!==null&&e>0}destroy(){}}class D{constructor(e,t){r(this,"container");r(this,"fuzzySearchService");r(this,"callbacks");r(this,"filtersContainer");r(this,"inputContainer");r(this,"searchInput");r(this,"searchButton");r(this,"dropdown");r(this,"searchTips");r(this,"selectedFilters",{query:[]});r(this,"suggestions",[]);r(this,"showDropdown",!1);r(this,"selectedIndex",-1);r(this,"hasSearched",!1);this.container=e,this.callbacks=t,this.fuzzySearchService=new S,this.initializeFilters(),this.createUI(),this.setupEventListeners(),setTimeout(()=>{this.searchInput.focus()},0)}initializeFilters(){this.fuzzySearchService.getAvailableAttributes().forEach(t=>{this.selectedFilters[t]=[]})}createUI(){this.container.innerHTML=F`
            <div class="w-full max-w-5xl mx-auto p-2 sm:p-4 fuzzy-search-container">
        <div class="w-full relative">
          <!-- Active Filters Display -->
          <div
            id="filters-container"
            class="flex w-full items-center mb-3 sm:mb-4 flex-wrap gap-1 sm:gap-2 min-h-[2rem]"
          >
            <!-- Filters will be rendered here -->
          </div>

          <!-- Modern Search Container -->
          <div class="flex flex-col space-y-3">
            <!-- Main Search Row -->
            <div
              class="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3"
            >
              <div id="input-container" class="relative flex-grow">
                <!-- Modern Input Container -->
                <div
                  class="relative border border-gray-200 rounded-xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all duration-200 bg-white flex items-center h-12 sm:h-12 shadow-sm hover:shadow-md group"
                >
                  <!-- Search Icon -->
                  <div
                    class="flex items-center justify-center w-10 sm:w-12 h-12 text-gray-400 group-focus-within:text-blue-500"
                  >
                    <svg
                      class="w-4 sm:w-5 h-4 sm:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      ></path>
                    </svg>
                  </div>

                  <!-- Modern Input Field -->
                  <input
                    id="fuzzy-search-input"
                    type="text"
                    autocomplete="off"
                    placeholder="Search by people, folders, or keywords..."
                    class="flex-1 h-full px-0 text-sm sm:text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400 font-normal"
                  />

                  
                </div>

                <!-- Modern Smart Dropdown -->
                <div
                  id="fuzzy-dropdown"
                  class="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl mt-2 z-50 max-h-64 sm:max-h-80 overflow-y-auto hidden"
                  style="box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);"
                >
                  <div id="dropdown-content">
                    <!-- Dropdown content will be rendered here -->
                  </div>
                </div>
              </div>

              <!-- Modern Search Button -->
              <button
                id="fuzzy-search-btn"
                class="h-12 px-4 sm:px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 text-sm sm:text-base min-w-[100px] sm:min-w-auto"
              >
                <svg
                  class="w-4 sm:w-5 h-4 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  ></path>
                </svg>
                <span id="search-btn-text">Search</span>
              </button>
            </div>

            <!-- Search Tips (shown only before first search) -->
            <div
              id="search-tips"
              class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm"
            >
              <h3 class="font-medium text-blue-900 mb-2 flex items-center">
                <svg
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                Search Tips
              </h3>
              <div class="text-blue-800 space-y-2">
                <p class="font-medium">You can search for:</p>
                <ul class="space-y-1 ml-4">
                  <li><strong>People:</strong> John, Sarah</li>
                  <li>
                    <strong>Keywords:</strong> beach, sunset, birthday, vacation
                  </li>
                  <li>
                    <strong>Folders:</strong> 2023, Summer Photos, Wedding
                  </li>
                </ul>
                <p class="font-medium mt-3">Multiple filters work together:</p>
                <ul class="space-y-1 ml-4 text-sm">
                  <li>
                    • Person + Folder = Photos of that person in that folder
                  </li>
                  <li>
                    • Keyword + Folder = Photos with that keyword in that folder
                  </li>
                  <li>
                    • Person + Keyword = Photos of that person with that keyword
                  </li>
                </ul>
                <p class="text-blue-700 text-xs mt-2 italic">
                  Tip: Type to see suggestions, click to add as filters, then
                  search to find photos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,this.filtersContainer=this.container.querySelector("#filters-container"),this.inputContainer=this.container.querySelector("#input-container"),this.searchInput=this.container.querySelector("#fuzzy-search-input"),this.searchButton=this.container.querySelector("#fuzzy-search-btn"),this.dropdown=this.container.querySelector("#fuzzy-dropdown"),this.searchTips=this.container.querySelector("#search-tips")}setupEventListeners(){this.searchInput.addEventListener("input",this.handleInputChange.bind(this)),this.searchInput.addEventListener("keydown",this.handleKeyDown.bind(this)),this.searchInput.addEventListener("focus",this.handleInputFocus.bind(this)),this.searchInput.addEventListener("blur",this.handleInputBlur.bind(this)),this.searchButton.addEventListener("click",this.handleSearchClick.bind(this)),document.addEventListener("click",e=>{this.inputContainer.contains(e.target)||this.hideDropdown()})}async handleInputChange(e){const s=e.target.value;console.log("Input changed to:",s),this.selectedIndex=-1,s.trim()?(this.suggestions=await this.fuzzySearchService.generateAllAttributeSuggestions(s),this.suggestions.length>0?(this.showDropdown=!0,this.renderDropdown()):this.hideDropdown()):(this.suggestions=[],this.hideDropdown())}handleKeyDown(e){if(this.showDropdown&&this.suggestions.length>0)if(e.key==="ArrowDown")e.preventDefault(),this.selectedIndex=this.selectedIndex<this.suggestions.length-1?this.selectedIndex+1:0,this.updateDropdownSelection();else if(e.key==="ArrowUp")e.preventDefault(),this.selectedIndex=this.selectedIndex>0?this.selectedIndex-1:this.suggestions.length-1,this.updateDropdownSelection();else if(e.key==="Enter")if(e.preventDefault(),this.selectedIndex>=0&&this.selectedIndex<this.suggestions.length){const t=this.suggestions[this.selectedIndex];this.handleSuggestionClick(t)}else this.handleAddFilter();else e.key==="Escape"&&(this.selectedIndex=-1,this.hideDropdown(),this.suggestions=[]);else e.key==="Enter"&&(e.preventDefault(),this.handleAddFilter())}handleInputFocus(){this.selectedIndex=-1,this.searchInput.value.trim()&&this.fuzzySearchService.generateAllAttributeSuggestions(this.searchInput.value).then(e=>{this.suggestions=e,this.suggestions.length>0?(this.showDropdown=!0,this.renderDropdown()):this.hideDropdown()})}handleInputBlur(){setTimeout(()=>{this.suggestions=[],this.selectedIndex=-1,this.hideDropdown()},200)}async handleAddFilter(){var e;if(this.searchInput.value.trim()){const t=this.searchInput.value.trim();(e=this.selectedFilters.query)!=null&&e.includes(t)||this.addFilter("query",t),this.searchInput.value="",this.suggestions=[],this.hideDropdown(),this.executeSearch()}}async handleSuggestionClick(e){this.addFilter(e.attribute,e.text),this.searchInput.value="",this.suggestions=[],this.hideDropdown(),this.executeSearch()}async handleSearchClick(){this.searchInput.value.trim()?await this.handleAddFilter():this.executeSearch()}addFilter(e,t){this.selectedFilters[e]||(this.selectedFilters[e]=[]),this.selectedFilters[e].includes(t)||(e==="query"?this.selectedFilters[e]=[t]:this.selectedFilters[e].push(t),this.renderFilters())}removeFilter(e,t){if(this.selectedFilters[e]){this.selectedFilters[e]=this.selectedFilters[e].filter(i=>i!==t),this.renderFilters();const s=Object.keys(this.selectedFilters).some(i=>this.selectedFilters[i]&&this.selectedFilters[i].length>0),o=this.searchInput.value.trim().length>0;(s||o)&&this.executeSearch()}}executeSearch(){const e=this.fuzzySearchService.buildQueryString(this.selectedFilters);console.log("Executing search with query:",e),this.hasSearched||(this.hasSearched=!0,this.hideSearchTips()),this.callbacks.onSearchExecuted(e)}renderFilters(){const e=Object.keys(this.selectedFilters).filter(s=>this.selectedFilters[s].length>0).map(s=>this.selectedFilters[s].map(o=>{const i=this.fuzzySearchService.getAttributeIcon(s);return`
            <div class="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border-2 ${this.fuzzySearchService.getAttributeColor(s)} hover:shadow-lg transition-all duration-200 cursor-pointer group filter-tag" data-attribute="${s}" data-value="${o}">
              <span class="mr-1 sm:mr-2 text-xs sm:text-sm">${i}</span>
              <span class="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-none">${o}</span>
              <button class="ml-1 sm:ml-2 text-current opacity-60 hover:opacity-100 hover:bg-white hover:bg-opacity-30 rounded-lg p-1 transition-all duration-200 remove-filter-btn" data-attribute="${s}" data-value="${o}">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          `}).join("")).flat().join("");this.filtersContainer.innerHTML=e,this.filtersContainer.querySelectorAll(".remove-filter-btn").forEach(s=>{s.addEventListener("click",o=>{o.stopPropagation();const i=s.getAttribute("data-attribute"),n=s.getAttribute("data-value");this.removeFilter(i,n)})})}renderDropdown(){if(!this.showDropdown){this.hideDropdown();return}const e=this.dropdown.querySelector("#dropdown-content");if(this.suggestions.length>0){const t=this.suggestions.reduce((n,a)=>(n[a.attribute]||(n[a.attribute]=[]),n[a.attribute].push(a),n),{});let s="",o=0;Object.keys(t).forEach(n=>{const a=t[n],h=this.fuzzySearchService.getAttributeIcon(n),d=this.fuzzySearchService.getAttributeDisplayName(n);Object.keys(t).length>1&&(s+=`
            <div class="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600 bg-gray-50 border-b border-gray-100 flex items-center">
              <span class="mr-2 sm:mr-3">${h}</span>
              ${d}
            </div>
          `),a.forEach(c=>{const u=this.fuzzySearchService.getAttributeColor(c.attribute);s+=`
            <div class="suggestion-option flex items-center px-3 sm:px-4 py-2 sm:py-3 cursor-pointer border-b border-gray-100 last:border-b-0 group hover:bg-blue-50 transition-all duration-200 ${this.selectedIndex===o?"bg-blue-50 border-l-4 border-l-blue-500":""}" data-index="${o}">
              <div class="flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 rounded-xl mr-3 sm:mr-4 ${u} shadow-sm group-hover:shadow-md transition-shadow duration-200">
                <span class="text-sm sm:text-base">${h}</span>
              </div>
              <div class="flex-grow min-w-0">
                <div class="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200 text-sm sm:text-base truncate">${c.text}</div>
                <div class="text-xs sm:text-sm text-gray-500 flex items-center mt-1">
                  <span class="capitalize">
                    Add to ${c.attribute.replace("_"," ")} search
                  </span>
                </div>
              </div>
              <div class="flex items-center justify-center w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-200">
                <svg class="w-3 sm:w-4 h-3 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </div>
            </div>
          `,o++})}),e.innerHTML=s,e.querySelectorAll(".suggestion-option").forEach((n,a)=>{n.addEventListener("click",h=>{h.preventDefault(),h.stopPropagation(),console.log("Suggestion div clicked:",this.suggestions[a]),this.handleSuggestionClick(this.suggestions[a])}),n.addEventListener("mousedown",h=>{h.preventDefault()}),n.addEventListener("mouseenter",()=>{this.selectedIndex=a,this.updateDropdownSelection()})})}else{this.hideDropdown();return}this.dropdown.classList.remove("hidden")}updateDropdownSelection(){this.dropdown.querySelectorAll(".suggestion-option").forEach((t,s)=>{s===this.selectedIndex?t.classList.add("bg-blue-50","border-l-4","border-l-blue-500"):t.classList.remove("bg-blue-50","border-l-4","border-l-blue-500")})}hideDropdown(){this.showDropdown=!1,this.dropdown.classList.add("hidden")}cleanup(){this.fuzzySearchService.cleanup()}clearAllFilters(){this.selectedFilters={},this.fuzzySearchService.getAvailableAttributes().forEach(e=>{this.selectedFilters[e]=[]}),this.renderFilters()}hideSearchTips(){this.searchTips&&(this.searchTips.style.display="none")}disableInputs(){console.log("Disabling inputs and showing loading state..."),this.searchInput.disabled=!0,this.searchInput.classList.add("opacity-50","cursor-not-allowed"),this.searchButton.disabled=!0,this.searchButton.classList.add("opacity-50","cursor-not-allowed");const e=this.searchButton.querySelector("#search-btn-text");e&&(e.textContent="Searching..."),this.hideDropdown(),this.filtersContainer.querySelectorAll(".remove-filter-btn").forEach(s=>{s.disabled=!0,s.classList.add("opacity-50","cursor-not-allowed")})}enableInputs(){this.searchInput.disabled=!1,this.searchInput.classList.remove("opacity-50","cursor-not-allowed"),this.searchButton.disabled=!1,this.searchButton.classList.remove("opacity-50","cursor-not-allowed");const e=this.searchButton.querySelector("#search-btn-text");e&&(e.textContent="Search"),this.filtersContainer.querySelectorAll(".remove-filter-btn").forEach(s=>{s.disabled=!1,s.classList.remove("opacity-50","cursor-not-allowed")})}}class w{constructor(){r(this,"searchService");r(this,"uiService");r(this,"fuzzySearchService");r(this,"fuzzySearchUI");r(this,"photoFilter");r(this,"allPhotos",[]);r(this,"filteredPhotos",[]);r(this,"displayedPhotos",[]);r(this,"currentModal",null);r(this,"queryToken","");r(this,"nMatchesFound",0);r(this,"PAGE_SIZE",20);r(this,"currentPage",0);r(this,"totalPages",0);z.initialize(),k.initialize("photo-grid-container",{loadingId:"loading-indicator",errorId:"error-display",noResultsId:"no-results-message",gridId:"photo-grid"}),this.photoFilter=new f({onFilterChange:s=>this.handleFilteredPhotosUpdate(s),hideSearchInput:!0});const e=document.getElementById("photo-filter-container");e&&(e.classList.add("hidden"),e.innerHTML=f.getTemplate("photo-filter",!0),this.photoFilter.initialize("photo-filter")),this.fuzzySearchService=new S;const t=document.getElementById("fuzzy-search-container");if(!t)throw new Error("Fuzzy search container not found");this.fuzzySearchUI=new D(t,{onSearchExecuted:s=>this.handleSearch(s)}),this.uiService=new C("photo-grid-container"),this.searchService=new L({onPhotosUpdate:(s,o,i,n)=>this.handlePhotosUpdate(s,o,i,n),onLoadingChange:s=>this.handleLoadingChange(s),onErrorChange:s=>this.handleErrorChange(s),onSearchDoneChange:s=>this.handleSearchDoneChange(s)}),this.setupEventListeners(),this.init()}init(){console.log("ImageSearch app initialized")}setupEventListeners(){console.log("Setting up event listeners for ImageSearchApp"),this.uiService.setupEventListeners({onPhotoClick:e=>this.handlePhotoClick(e),onModalClose:()=>this.handleModalClose(),onModalNext:()=>this.handleModalNext(),onModalPrevious:()=>this.handleModalPrevious()}),this.setupGlobalSearchListener()}setupGlobalSearchListener(){console.log("Setting up global search listener"),document.addEventListener("imageSearch",e=>{const{query:t}=e.detail;t&&this.handleSearch(t)})}async handleSearch(e){if(console.log("Function handleSearch called with query:",e),!e.trim()){this.uiService.updateError("Please enter a search term");return}if(e.length<p.MIN_SEARCH_LENGTH){this.uiService.updateError(`Search term must be at least ${p.MIN_SEARCH_LENGTH} character(s) long`);return}console.log("Starting search for:",e);try{await this.searchService.startSearch(e)}catch(t){console.error("Search failed:",t),this.uiService.updateError(t instanceof Error?t.message:p.ERROR_MESSAGES.UNKNOWN_ERROR)}}handlePhotosUpdate(e,t,s,o){console.log("query token: ",t),this.allPhotos=e,this.filteredPhotos=[...e],this.currentPage=0,this.queryToken=t,this.totalPages=s,this.nMatchesFound=o,this.photoFilter.updatePhotos(e);const i=document.getElementById("photo-filter-container");i&&(e.length>0?i.classList.remove("hidden"):i.classList.add("hidden")),this.setupPaginationEventListenersNew(),this.updatePaginationNewAndRender(0);const n=this.searchService.getState();e.length===0&&n.isSearchDone&&!n.isLoading&&!n.error?this.uiService.showNoResults(!0):this.uiService.showNoResults(!1)}handleFilteredPhotosUpdate(e){console.log("Filtered photos updated:",e.length)}updatePaginationNewAndRender(e){const t=e*this.PAGE_SIZE,s=Math.min((e+1)*this.PAGE_SIZE,this.nMatchesFound);e!==this.currentPage?fetch("/api/collectQueryMeta/"+this.queryToken+"/"+String(e)).then(o=>{if(o.ok)o.json().then(i=>{if(i){console.log("Yeah ok!!!");const a=v(i);this.displayedPhotos=a,this.updatePaginationUINew(),this.renderDisplayedPhotos()}});else throw Error}):(this.displayedPhotos=this.allPhotos.slice(t,s),console.log(this.displayedPhotos.length),this.updatePaginationUINew(),this.renderDisplayedPhotos()),this.currentPage=e}updatePaginationUINew(){const e=document.getElementById("pagination-info");if(e){const n=this.currentPage*this.PAGE_SIZE,a=Math.min((this.currentPage+1)*this.PAGE_SIZE,this.nMatchesFound);e.textContent=`Showing ${n}-${a} of ${this.nMatchesFound} photos`}const t=document.getElementById("prev-page-btn"),s=document.getElementById("next-page-btn"),o=document.getElementById("page-info");t&&(t.disabled=this.currentPage<=0),s&&(s.disabled=this.currentPage>=this.totalPages-1),o&&(o.textContent=`Page ${this.currentPage} of ${this.totalPages-1}`);const i=document.getElementById("pagination-container");i&&(this.totalPages>1?i.classList.remove("hidden"):i.classList.add("hidden"))}scrollToFilterLevel(){const e=document.getElementById("photo-filter-container"),t=document.getElementById("results-section"),s=e&&!e.classList.contains("hidden")?e:t;s&&requestAnimationFrame(()=>{const o=s.getBoundingClientRect(),i=window.pageYOffset+o.top-20;window.scrollTo({top:i,behavior:"instant"})})}setupPaginationEventListenersNew(){var s,o;const e=document.getElementById("prev-page-btn"),t=document.getElementById("next-page-btn");if(e){const i=e.cloneNode(!0);(s=e.parentNode)==null||s.replaceChild(i,e),i.addEventListener("click",n=>{n.preventDefault(),console.log("prev button clicked! displaying: ",this.currentPage),this.updatePaginationNewAndRender(this.currentPage-1)})}if(t){const i=t.cloneNode(!0);(o=t.parentNode)==null||o.replaceChild(i,t),i.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation(),console.log("prev button clicked! displaying: ",this.currentPage),this.updatePaginationNewAndRender(this.currentPage+1)})}}renderDisplayedPhotos(){this.uiService.updatePhotos(this.displayedPhotos,e=>this.handlePhotoClick(e))}handleLoadingChange(e){console.log("Loading state changed:",e),this.uiService.updateLoading(e),e?this.fuzzySearchUI.disableInputs():this.fuzzySearchUI.enableInputs()}handleErrorChange(e){console.log("Error state changed:",e),this.uiService.updateError(e)}handleSearchDoneChange(e){console.log("Search done state changed:",e),e&&this.fuzzySearchUI.enableInputs();const t=this.searchService.getState();t.photos.length===0&&e&&!t.isLoading&&!t.error&&this.uiService.showNoResults(!0)}handlePhotoClick(e){console.log("Photo clicked:",e.id);const t=this.filteredPhotos.findIndex(i=>i.id===e.id);if(t===-1)return;this.searchService.selectPhoto(e);const s=t>0,o=t<this.filteredPhotos.length-1;this.uiService.showModal(e,s,o)}handleModalClose(){console.log("Modal closed"),this.searchService.clearSelection(),this.uiService.hideModal()}handleModalNext(){const e=this.searchService.getState();if(!e.selectedPhoto)return;const t=this.filteredPhotos.findIndex(s=>s.id===e.selectedPhoto.id);if(t!==-1&&t<this.filteredPhotos.length-1){console.log("Modal next");const s=this.filteredPhotos[t+1];this.searchService.selectPhoto(s);const o=t+1>0,i=t+1<this.filteredPhotos.length-1;this.uiService.showModal(s,o,i)}}handleModalPrevious(){const e=this.searchService.getState();if(!e.selectedPhoto)return;const t=this.filteredPhotos.findIndex(s=>s.id===e.selectedPhoto.id);if(t!==-1&&t>0){console.log("Modal previous");const s=this.filteredPhotos[t-1];this.searchService.selectPhoto(s);const o=t-1>0,i=t-1<this.filteredPhotos.length-1;this.uiService.showModal(s,o,i)}}search(e){this.handleSearch(e)}getState(){return this.searchService.getState()}destroy(){this.searchService.destroy(),this.fuzzySearchUI.cleanup()}}document.addEventListener("DOMContentLoaded",()=>{console.log("DOM loaded, initializing ImageSearch app"),window.imageSearchApp=new w});window.addEventListener("beforeunload",()=>{window.imageSearchApp&&window.imageSearchApp.destroy()});new I({title:"Image Search - Hachi",currentPage:"/image-search.html",showNavbar:!0});function m(){try{new w}catch(l){console.error("Failed to initialize image search:",l)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",m):m();console.log("Image search page initialized");
