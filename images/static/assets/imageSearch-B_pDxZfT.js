var m=Object.defineProperty;var y=(a,e,t)=>e in a?m(a,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):a[e]=t;var r=(a,e,t)=>y(a,typeof e!="symbol"?e+"":e,t);import{e as p,L as b}from"./config-Tz74n_gY.js";/* empty css              */import{I as w,P as v,a as f,U as S}from"./photoFilter-DmxItXNa.js";import{h as x}from"./utils-cLygY5EC.js";import{P}from"./pagination-C2tzTPy9.js";function I(a){return!a.data_hash||!a.score||!a.meta_data||!(a.data_hash.length===a.score.length&&a.score.length===a.meta_data.length)?(console.error("Malformed rawData in transformRawDataChunk:",a),[]):a.data_hash.map((t,s)=>({id:t,score:a.score[s],metadata:a.meta_data[s]}))}class C{async startSearch(e,t){let s=new FormData;s.append("query_start",String(!0)),s.append("query",e),s.append("page_size",String(t));try{const o=await fetch(p.IMAGE_SEARCH,{method:"POST",body:s});if(!o.ok)throw new Error(`Image search error: ${o.status}`);return await o.json()}catch(o){throw console.error("Search request failed:",o),o}}async fetchSearchResults(e,t){try{const s=`${p.COLLECT_QUERY_META}/${e}/${String(t)}`;console.log(s);const o=await fetch(s);if(!o.ok)throw new Error(`Query results fetch error: ${o.status}`);const i=await o.json();return I(i)}catch(s){throw console.error(s),s}}}const g={person:{icon:"👤",color:"bg-green-100 text-green-800 border-green-200",examples:["john","sarah","mike"],description:"Search for people in your photos",displayName:"People"},query:{icon:"🔍",color:"bg-purple-100 text-purple-800 border-purple-200",examples:["sunset","birthday party","vacation"],description:"Search photo descriptions and content",displayName:"Keywords"},resource_directory:{icon:"📁",color:"bg-yellow-100 text-yellow-800 border-yellow-200",examples:["vacation","photos","2023"],description:"Browse photos by folder or album",displayName:"Folders"}};class z{constructor(){r(this,"currentSuggestionController",null)}async getSuggestionBatch(e,t){console.log("getSuggestionBatch called with:",{attribute:e,query:t});try{const s=new FormData;s.append("attribute",e),s.append("query",t);const o=await fetch(`${p.GET_SUGGESTIONS}`,{method:"POST",body:s});if(console.log("API response status for",e,":",o.status),o.ok){const i=await o.json();return console.log("API response data for",e,":",i),i[e]||[]}else console.error("API response not ok for",e,":",o.status,o.statusText)}catch(s){console.warn(`Failed to fetch suggestions for ${e}:`,s)}return[]}async getSuggestion(e,t){console.log("getSuggestion called with:",{attribute:e,query:t}),this.currentSuggestionController&&this.currentSuggestionController.abort(),this.currentSuggestionController=new AbortController;try{const s=new FormData;s.append("attribute",e),s.append("query",t);const o=await fetch(`${p.GET_SUGGESTIONS}`,{method:"POST",body:s,signal:this.currentSuggestionController.signal});if(console.log("API response status:",o.status),o.ok){const i=await o.json();return console.log("API response data:",i),i[e]||[]}else console.error("API response not ok:",o.status,o.statusText)}catch(s){s instanceof Error&&s.name==="AbortError"?console.log("Suggestion request was cancelled"):console.warn(`Failed to fetch suggestions for ${e}:`,s)}finally{this.currentSuggestionController=null}return[]}async generateAllAttributeSuggestions(e){if(console.log("generateAllAttributeSuggestions called with:",e),!e.trim())return[];const s=this.getAvailableAttributes().filter(o=>o!=="query").map(async o=>{try{const i=(await this.getSuggestionBatch(o,e)).flat();return Array.from(new Set(i)).map(l=>({text:l,attribute:o,type:"suggestion"}))}catch(i){return console.warn(`Failed to fetch suggestions for ${o}:`,i),[]}});try{const n=(await Promise.all(s)).flat().filter(d=>d.text&&d.text.trim()),l=n.filter(d=>d.attribute==="person"),h=n.filter(d=>d.attribute==="resource_directory"),u=n.filter(d=>d.attribute!=="person"&&d.attribute!=="resource_directory");return[...l,...h,...u].slice(0,15)}catch(o){return console.error("Error generating all attribute suggestions:",o),[]}}async generateSuggestions(e,t){if(console.log("generateSuggestions called with:",{attribute:e,value:t}),!t.trim())return[];try{return(await this.getSuggestion(e,t)).map(i=>({text:i,attribute:e,type:"suggestion"}))}catch(s){return console.error("Error generating suggestions:",s),[]}}buildQueryString(e,t,s){const o={...e};t&&s&&(o[t]=[...o[t]||[],s]);let i="";const n=Object.keys(o).filter(l=>o[l].length>0);for(let l=0;l<n.length;l++){const h=n[l],u=o[h];i+=h+"=";for(let c=0;c<u.length;c++)i+=u[c],c!==u.length-1&&(i+="?");l!==n.length-1&&(i+="&")}return i}getAttributeIcon(e){const t=g[e];return t?t.icon:"#️⃣"}getAttributeColor(e){const t=g[e];return t?t.color:"bg-gray-100 text-gray-800 border-gray-200"}getAttributeDisplayName(e){const t=g[e];return t?t.displayName:e.charAt(0).toUpperCase()+e.slice(1).replace("_"," ")}getAttributeDescription(e){const t=g[e];return t?t.description:"Search attribute"}getAvailableAttributes(){return Object.keys(g)}cleanup(){this.currentSuggestionController&&(this.currentSuggestionController.abort(),this.currentSuggestionController=null)}}class k{constructor(e,t){r(this,"container");r(this,"fuzzySearchService");r(this,"callbacks");r(this,"filtersContainer");r(this,"inputContainer");r(this,"searchInput");r(this,"searchButton");r(this,"dropdown");r(this,"searchTips");r(this,"selectedFilters",{query:[]});r(this,"suggestions",[]);r(this,"showDropdown",!1);r(this,"selectedIndex",-1);r(this,"hasSearched",!1);r(this,"debounceTimeout",null);this.container=e,this.callbacks=t,this.fuzzySearchService=new z,this.initializeFilters(),this.createUI(),this.setupEventListeners(),setTimeout(()=>{this.searchInput.focus()},0)}initializeFilters(){this.fuzzySearchService.getAvailableAttributes().forEach(t=>{this.selectedFilters[t]=[]})}createUI(){this.container.innerHTML=x`
      <div class="w-full mx-auto p-2 sm:p-4 fuzzy-search-container">
        <div class="w-full relative">
          <!-- Modern Search Container -->
          <div class="flex flex-col space-y-3">
            <!-- Main Search Row -->
            <div
              class="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3"
            >
              <div id="input-container" class="relative flex-grow">
                <!-- Integrated Input and Button Container -->
                <div
                  class="relative border border-gray-200 rounded-xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all duration-200 bg-white flex items-center h-12 sm:h-12 shadow-sm hover:shadow-md group"
                  style="padding-right:0;"
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
                    class="flex-1 h-full px-0 text-sm sm:text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400 font-normal rounded-l-xl rounded-r-none"
                    style="border-top-right-radius:0;border-bottom-right-radius:0;"
                  />

                  <!-- Integrated Search Button -->
                  <button
                    id="fuzzy-search-btn"
                    class="h-10 sm:h-12 px-4 sm:px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-400 text-white font-semibold rounded-r-xl rounded-l-none transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base min-w-[80px] sm:min-w-auto border-0 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:z-10"
                    style="border-top-left-radius:0;border-bottom-left-radius:0;height:48px;margin-left:-1px;box-shadow:none;"
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
            </div>

            <!-- Active Filters Display (moved below input) -->
            <div
              id="filters-container"
              class="flex w-full items-center mb-3 sm:mb-4 flex-wrap gap-1 sm:gap-2 min-h-[2rem] hidden"
            >
              <!-- Filters will be rendered here -->
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
    `,this.filtersContainer=this.container.querySelector("#filters-container"),this.inputContainer=this.container.querySelector("#input-container"),this.searchInput=this.container.querySelector("#fuzzy-search-input"),this.searchButton=this.container.querySelector("#fuzzy-search-btn"),this.dropdown=this.container.querySelector("#fuzzy-dropdown"),this.searchTips=this.container.querySelector("#search-tips")}setupEventListeners(){this.searchInput.addEventListener("input",this.handleInputChange.bind(this)),this.searchInput.addEventListener("keydown",this.handleKeyDown.bind(this)),this.searchInput.addEventListener("focus",this.handleInputFocus.bind(this)),this.searchInput.addEventListener("blur",this.handleInputBlur.bind(this)),this.searchButton.addEventListener("click",this.handleSearchClick.bind(this)),document.addEventListener("click",e=>{this.inputContainer.contains(e.target)||this.hideDropdown()})}async handleInputChange(e){const s=e.target.value;console.log("Input changed to:",s),this.selectedIndex=-1,this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout(async()=>{s.trim().length>0?(this.suggestions=await this.fuzzySearchService.generateAllAttributeSuggestions(s),this.suggestions.length>0?(this.showDropdown=!0,this.renderDropdown()):this.hideDropdown()):(this.suggestions=[],this.hideDropdown())},300)}handleKeyDown(e){if(this.showDropdown&&this.suggestions.length>0)if(e.key==="ArrowDown")e.preventDefault(),this.selectedIndex=this.selectedIndex<this.suggestions.length-1?this.selectedIndex+1:0,this.updateDropdownSelection();else if(e.key==="ArrowUp")e.preventDefault(),this.selectedIndex=this.selectedIndex>0?this.selectedIndex-1:this.suggestions.length-1,this.updateDropdownSelection();else if(e.key==="Enter")if(e.preventDefault(),this.selectedIndex>=0&&this.selectedIndex<this.suggestions.length){const t=this.suggestions[this.selectedIndex];this.handleSuggestionClick(t)}else this.handleAddFilter();else e.key==="Escape"&&(this.selectedIndex=-1,this.hideDropdown(),this.suggestions=[]);else e.key==="Enter"&&(e.preventDefault(),this.handleAddFilter())}handleInputFocus(){this.selectedIndex=-1,this.searchInput.value.trim()&&this.fuzzySearchService.generateAllAttributeSuggestions(this.searchInput.value).then(e=>{this.suggestions=e,this.suggestions.length>0?(this.showDropdown=!0,this.renderDropdown()):this.hideDropdown()})}handleInputBlur(){setTimeout(()=>{this.suggestions=[],this.selectedIndex=-1,this.hideDropdown()},200)}async handleAddFilter(){var e;if(this.searchInput.value.trim()){const t=this.searchInput.value.trim();(e=this.selectedFilters.query)!=null&&e.includes(t)||this.addFilter("query",t),this.searchInput.value="",this.suggestions=[],this.hideDropdown(),this.executeSearch()}}async handleSuggestionClick(e){this.addFilter(e.attribute,e.text),this.searchInput.value="",this.suggestions=[],this.hideDropdown(),this.executeSearch()}async handleSearchClick(){this.searchInput.value.trim()?await this.handleAddFilter():this.executeSearch()}addFilter(e,t){this.selectedFilters[e]||(this.selectedFilters[e]=[]),this.selectedFilters[e].includes(t)||(e==="query"?this.selectedFilters[e]=[t]:this.selectedFilters[e].push(t),this.renderFilters())}removeFilter(e,t){if(this.selectedFilters[e]){this.selectedFilters[e]=this.selectedFilters[e].filter(i=>i!==t),this.renderFilters();const s=Object.keys(this.selectedFilters).some(i=>this.selectedFilters[i]&&this.selectedFilters[i].length>0),o=this.searchInput.value.trim().length>0;(s||o)&&this.executeSearch()}}executeSearch(){const e=this.fuzzySearchService.buildQueryString(this.selectedFilters);console.log("Executing search with query:",e),this.hasSearched||(this.hasSearched=!0,this.hideSearchTips()),this.callbacks.onSearchExecuted(e)}renderFilters(){const e=Object.keys(this.selectedFilters).filter(s=>this.selectedFilters[s].length>0).map(s=>this.selectedFilters[s].map(o=>{const i=this.fuzzySearchService.getAttributeIcon(s);return`
            <div class="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border-2 ${this.fuzzySearchService.getAttributeColor(s)} hover:shadow-lg transition-all duration-200 cursor-pointer group filter-tag" data-attribute="${s}" data-value="${o}">
              <span class="mr-1 sm:mr-2 text-xs sm:text-sm">${i}</span>
              <span class="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-none">${o}</span>
              <button class="ml-1 sm:ml-2 text-current opacity-60 hover:opacity-100 hover:bg-white hover:bg-opacity-30 rounded-lg p-1 transition-all duration-200 remove-filter-btn" data-attribute="${s}" data-value="${o}">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          `}).join("")).flat().join("");this.filtersContainer.innerHTML=e,e.length>0?this.filtersContainer.classList.remove("hidden"):this.filtersContainer.classList.add("hidden"),this.filtersContainer.querySelectorAll(".remove-filter-btn").forEach(s=>{s.addEventListener("click",o=>{o.stopPropagation();const i=s.getAttribute("data-attribute"),n=s.getAttribute("data-value");this.removeFilter(i,n)})})}renderDropdown(){if(!this.showDropdown){this.hideDropdown();return}const e=this.dropdown.querySelector("#dropdown-content");if(this.suggestions.length>0){const t=this.suggestions.reduce((n,l)=>(n[l.attribute]||(n[l.attribute]=[]),n[l.attribute].push(l),n),{});let s="",o=0;Object.keys(t).forEach(n=>{const l=t[n],h=this.fuzzySearchService.getAttributeIcon(n),u=this.fuzzySearchService.getAttributeDisplayName(n);Object.keys(t).length>1&&(s+=`
            <div class="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600 bg-gray-50 border-b border-gray-100 flex items-center">
              <span class="mr-2 sm:mr-3">${h}</span>
              ${u}
            </div>
          `),l.forEach(c=>{const d=this.fuzzySearchService.getAttributeColor(c.attribute);s+=`
            <div class="suggestion-option flex items-center px-3 sm:px-4 py-2 sm:py-3 cursor-pointer border-b border-gray-100 last:border-b-0 group hover:bg-blue-50 transition-all duration-200 ${this.selectedIndex===o?"bg-blue-50 border-l-4 border-l-blue-500":""}" data-index="${o}">
              <div class="flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 rounded-xl mr-3 sm:mr-4 ${d} shadow-sm group-hover:shadow-md transition-shadow duration-200">
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
          `,o++})}),e.innerHTML=s,e.querySelectorAll(".suggestion-option").forEach((n,l)=>{n.addEventListener("click",h=>{h.preventDefault(),h.stopPropagation(),console.log("Suggestion div clicked:",this.suggestions[l]),this.handleSuggestionClick(this.suggestions[l])}),n.addEventListener("mousedown",h=>{h.preventDefault()}),n.addEventListener("mouseenter",()=>{this.selectedIndex=l,this.updateDropdownSelection()})})}else{this.hideDropdown();return}this.dropdown.classList.remove("hidden")}updateDropdownSelection(){this.dropdown.querySelectorAll(".suggestion-option").forEach((t,s)=>{s===this.selectedIndex?t.classList.add("bg-blue-50","border-l-4","border-l-blue-500"):t.classList.remove("bg-blue-50","border-l-4","border-l-blue-500")})}hideDropdown(){this.showDropdown=!1,this.dropdown.classList.add("hidden")}cleanup(){this.fuzzySearchService.cleanup()}clearAllFilters(){this.selectedFilters={},this.fuzzySearchService.getAvailableAttributes().forEach(e=>{this.selectedFilters[e]=[]}),this.renderFilters()}hideSearchTips(){this.searchTips&&(this.searchTips.style.display="none")}disableInputs(){console.log("Disabling inputs and showing loading state..."),this.searchInput.disabled=!0,this.searchInput.classList.add("opacity-50","cursor-not-allowed"),this.searchButton.disabled=!0,this.searchButton.classList.add("opacity-50","cursor-not-allowed");const e=this.searchButton.querySelector("#search-btn-text");e&&(e.textContent="Searching..."),this.hideDropdown(),this.filtersContainer.querySelectorAll(".remove-filter-btn").forEach(s=>{s.disabled=!0,s.classList.add("opacity-50","cursor-not-allowed")})}enableInputs(){this.searchInput.disabled=!1,this.searchInput.classList.remove("opacity-50","cursor-not-allowed"),this.searchButton.disabled=!1,this.searchButton.classList.remove("opacity-50","cursor-not-allowed");const e=this.searchButton.querySelector("#search-btn-text");e&&(e.textContent="Search"),this.filtersContainer.querySelectorAll(".remove-filter-btn").forEach(s=>{s.disabled=!1,s.classList.remove("opacity-50","cursor-not-allowed")})}}class A{constructor(){r(this,"searchService");r(this,"uiService");r(this,"fuzzySearchUI");r(this,"photoFilter");r(this,"filteredPhotos",[]);r(this,"displayedPhotos",[]);r(this,"selectedPhoto",null);r(this,"currentPage",0);r(this,"totalPages",0);r(this,"totalResults",0);r(this,"queryToken","");r(this,"resultsPerPage",100);r(this,"paginationComponent");r(this,"paginationContainerElement",null);r(this,"filterContainer",null);this.cacheDOMElements(),w.initialize(),v.initialize("photo-grid-container",{loadingId:"loading-indicator",errorId:"error-display",noResultsId:"no-results-message",gridId:"photo-grid"});const e=document.getElementById("fuzzy-search-container");this.fuzzySearchUI=new k(e,{onSearchExecuted:t=>this.handleSearch(t)}),this.photoFilter=new f({onFilterChange:t=>this.handleFilteredPhotosUpdate(t)}),this.filterContainer&&(this.filterContainer.classList.add("hidden"),this.filterContainer.innerHTML=f.getTemplate("photo-filter"),this.photoFilter.initialize("photo-filter")),this.uiService=new S("photo-grid-container"),this.searchService=new C,this.setupEventListeners(),this.init()}cacheDOMElements(){this.paginationContainerElement=document.getElementById("pagination-container"),this.filterContainer=document.getElementById("photo-filter-container")}init(){console.log("ImageSearch app initialized"),this.setupPagination()}handleFilteredPhotosUpdate(e){if(console.log("Filtered photos updated:",e.length),this.currentPage=0,e.length===0){this.filteredPhotos=[],this.updatePaginationComponent(this.totalResults,this.totalPages,0),this.updatePaginationAndRenderPhotos();return}this.filteredPhotos=[...e],this.displayedPhotos=[...e];const t=Math.ceil(this.filteredPhotos.length/this.resultsPerPage);this.updatePaginationComponent(this.filteredPhotos.length,t,0),this.updatePaginationAndRenderPhotos()}updatePaginationComponent(e,t,s){var o;(o=this.paginationComponent)==null||o.update({totalItems:e,itemsPerPage:this.resultsPerPage,initialPage:s,totalPages:t})}setupEventListeners(){this.uiService.setupEventListeners({onPhotoClick:e=>this.handlePhotoClick(e),onModalClose:()=>this.handleModalClose(),onModalNext:()=>this.handleModalNext(),onModalPrevious:()=>this.handleModalPrevious()})}async handleSearch(e){var t;if(!e.trim()){this.uiService.updateError("Please enter a search term");return}console.log("Starting search for:",e);try{this.handleLoadingChange(!0),this.currentPage=0;const s=await this.searchService.startSearch(e,this.resultsPerPage);this.totalPages=s.n_pages||1,this.totalResults=s.n_matches,this.queryToken=s.query_token,this.updatePaginationComponent(this.totalResults,this.totalPages,this.currentPage),(t=this.paginationContainerElement)==null||t.classList.remove("hidden"),this.filteredPhotos=[],await this.updatePaginationAndRenderPhotos(),this.photoFilter.updateQueryToken(this.queryToken),this.handleLoadingChange(!1),this.handleSearchDoneChange(!0)}catch(s){this.handleLoadingChange(!1),console.error("Search failed:",s),this.handleErrorChange(s instanceof Error?s.message:"Search failed. Please try again.")}}setupPagination(){if(!this.paginationContainerElement){console.warn("Pagination container element is missing");return}this.paginationComponent=new P({container:this.paginationContainerElement,totalItems:this.totalResults,itemsPerPage:this.resultsPerPage,initialPage:this.currentPage,totalPages:this.totalPages,onPageChange:async e=>{this.currentPage=e,await this.updatePaginationAndRenderPhotos(),window.scrollTo({top:0})}}),this.paginationContainerElement.classList.add("hidden")}async updatePaginationAndRenderPhotos(){this.filteredPhotos.length?this.displayedPhotos=this.filteredPhotos.slice(this.currentPage*this.resultsPerPage,(this.currentPage+1)*this.resultsPerPage):this.displayedPhotos=await this.searchService.fetchSearchResults(this.queryToken,this.currentPage),console.log("Displayed photos updated:",this.displayedPhotos.length),this.toggleFilterContainer(this.displayedPhotos.length>0),this.renderDisplayedPhotos(),window.scrollTo({top:0})}toggleFilterContainer(e){const t=document.getElementById("photo-filter-container");t&&t.classList.toggle("hidden",!e)}renderDisplayedPhotos(){this.uiService.updatePhotos([...this.displayedPhotos])}handleLoadingChange(e){console.log("Loading state changed:",e),this.uiService.updateLoading(e),e?this.fuzzySearchUI.disableInputs():this.fuzzySearchUI.enableInputs()}handleErrorChange(e){console.log("Error state changed:",e),this.uiService.updateError(e)}handleSearchDoneChange(e){this.displayedPhotos.length===0&&e&&this.uiService.showNoResults(!0)}handlePhotoClick(e){console.log("Photo clicked:",e);const t=this.displayedPhotos.findIndex(i=>i.id===e.id);if(t===-1)return;this.selectedPhoto=e;const s=t>0,o=t<this.displayedPhotos.length-1;this.uiService.showModal(e,s,o)}handleModalClose(){console.log("Modal closed"),this.selectedPhoto=null,this.uiService.hideModal()}handleModalNext(){if(!this.selectedPhoto)return;const e=this.displayedPhotos.findIndex(t=>t.id===this.selectedPhoto.id);if(e!==-1&&e<this.displayedPhotos.length-1){console.log("Modal next");const t=this.displayedPhotos[e+1];this.selectedPhoto=t;const s=e+1>0,o=e+1<this.displayedPhotos.length-1;this.uiService.showModal(t,s,o)}}handleModalPrevious(){if(!this.selectedPhoto)return;const e=this.displayedPhotos.findIndex(t=>t.id===this.selectedPhoto.id);if(e!==-1&&e>0){console.log("Modal previous");const t=this.displayedPhotos[e-1];this.selectedPhoto=t;const s=e-1>0,o=e-1<this.displayedPhotos.length-1;this.uiService.showModal(t,s,o)}}}new b({title:"Image Search - Hachi",currentPage:"/image-search.html",showNavbar:!0});document.addEventListener("DOMContentLoaded",()=>{console.log("DOM loaded, initializing ImageSearch app"),window.imageSearchApp=new A});
