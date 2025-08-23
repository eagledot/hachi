var y=Object.defineProperty;var v=(d,e,t)=>e in d?y(d,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):d[e]=t;var n=(d,e,t)=>v(d,typeof e!="symbol"?e+"":e,t);import{e as p,L as x}from"./config-BqZhBBhP.js";/* empty css              */import{I as w,P as S,U as P}from"./photoGrid-D16qe0J1.js";import{h as C,f as I,a as k,b as E}from"./utils-DPM9xUNI.js";import{P as F}from"./pagination-DaQXTFIt.js";function A(d){return!d.data_hash||!d.score||!d.meta_data||!(d.data_hash.length===d.score.length&&d.score.length===d.meta_data.length)?(console.error("Malformed rawData in transformRawDataChunk:",d),[]):d.data_hash.map((t,s)=>({id:t,score:d.score[s],metadata:d.meta_data[s]}))}class z{async startSearch(e,t){console.log("Starting search:",e);let s=new FormData;s.append("query_start",String(!0)),s.append("query",e),s.append("page_size",String(t));try{const r=await fetch(p.IMAGE_SEARCH,{method:"POST",body:s});if(!r.ok)throw new Error(`Image search error: ${r.status}`);return await r.json()}catch(r){throw console.error("Search request failed:",r),r}}async fetchSearchResults(e,t){console.log("Fetching search results for token:",e,"page:",t);try{const s=`${p.COLLECT_QUERY_META}/${e}/${String(t)}`;console.log(s);const r=await fetch(s);if(!r.ok)throw new Error(`Query results fetch error: ${r.status}`);const o=await r.json();return A(o)}catch(s){throw console.error(s),s}}}const g={person:{icon:"👤",color:"bg-green-100 text-green-800 border-green-200",examples:["john","sarah","mike"],description:"Search for people in your photos",displayName:"People"},query:{icon:"🔍",color:"bg-purple-100 text-purple-800 border-purple-200",examples:["sunset","birthday party","vacation"],description:"Search photo descriptions and content",displayName:"Keywords"},resource_directory:{icon:"📁",color:"bg-yellow-100 text-yellow-800 border-yellow-200",examples:["vacation","photos","2023"],description:"Browse photos by folder or album",displayName:"Folders"}};class T{constructor(){n(this,"currentSuggestionController",null)}async getSuggestionBatch(e,t){console.log("getSuggestionBatch called with:",{attribute:e,query:t});try{const s=new FormData;s.append("attribute",e),s.append("query",t);const r=await fetch(`${p.GET_SUGGESTIONS}`,{method:"POST",body:s});if(console.log("API response status for",e,":",r.status),r.ok){const o=await r.json();return console.log("API response data for",e,":",o),o[e]||[]}else console.error("API response not ok for",e,":",r.status,r.statusText)}catch(s){console.warn(`Failed to fetch suggestions for ${e}:`,s)}return[]}async getSuggestion(e,t){console.log("getSuggestion called with:",{attribute:e,query:t}),this.currentSuggestionController&&this.currentSuggestionController.abort(),this.currentSuggestionController=new AbortController;try{const s=new FormData;s.append("attribute",e),s.append("query",t);const r=await fetch(`${p.GET_SUGGESTIONS}`,{method:"POST",body:s,signal:this.currentSuggestionController.signal});if(console.log("API response status:",r.status),r.ok){const o=await r.json();return console.log("API response data:",o),o[e]||[]}else console.error("API response not ok:",r.status,r.statusText)}catch(s){s instanceof Error&&s.name==="AbortError"?console.log("Suggestion request was cancelled"):console.warn(`Failed to fetch suggestions for ${e}:`,s)}finally{this.currentSuggestionController=null}return[]}async generateAllAttributeSuggestions(e){if(console.log("generateAllAttributeSuggestions called with:",e),!e.trim())return[];const s=this.getAvailableAttributes().filter(r=>r!=="query").map(async r=>{try{const o=(await this.getSuggestionBatch(r,e)).flat();return Array.from(new Set(o)).map(a=>({text:a,attribute:r,type:"suggestion"}))}catch(o){return console.warn(`Failed to fetch suggestions for ${r}:`,o),[]}});try{const i=(await Promise.all(s)).flat().filter(u=>u.text&&u.text.trim()),a=i.filter(u=>u.attribute==="person"),c=i.filter(u=>u.attribute==="resource_directory"),l=i.filter(u=>u.attribute!=="person"&&u.attribute!=="resource_directory");return[...a,...c,...l].slice(0,15)}catch(r){return console.error("Error generating all attribute suggestions:",r),[]}}async generateSuggestions(e,t){if(console.log("generateSuggestions called with:",{attribute:e,value:t}),!t.trim())return[];try{return(await this.getSuggestion(e,t)).map(o=>({text:o,attribute:e,type:"suggestion"}))}catch(s){return console.error("Error generating suggestions:",s),[]}}buildQueryString(e,t,s){const r={...e};t&&s&&(r[t]=[...r[t]||[],s]);let o="";const i=Object.keys(r).filter(a=>r[a].length>0);for(let a=0;a<i.length;a++){const c=i[a],l=r[c];o+=c+"=";for(let h=0;h<l.length;h++)o+=l[h],h!==l.length-1&&(o+="?");a!==i.length-1&&(o+="&")}return o}getAttributeIcon(e){const t=g[e];return t?t.icon:"#️⃣"}getAttributeColor(e){const t=g[e];return t?t.color:"bg-gray-100 text-gray-800 border-gray-200"}getAttributeDisplayName(e){const t=g[e];return t?t.displayName:e.charAt(0).toUpperCase()+e.slice(1).replace("_"," ")}getAttributeDescription(e){const t=g[e];return t?t.description:"Search attribute"}getAvailableAttributes(){return Object.keys(g)}cleanup(){this.currentSuggestionController&&(this.currentSuggestionController.abort(),this.currentSuggestionController=null)}}class L{constructor(e,t){n(this,"container");n(this,"fuzzySearchService");n(this,"callbacks");n(this,"filtersContainer");n(this,"inputContainer");n(this,"searchInput");n(this,"searchButton");n(this,"dropdown");n(this,"searchTips");n(this,"selectedFilters",{query:[]});n(this,"suggestions",[]);n(this,"showDropdown",!1);n(this,"selectedIndex",-1);n(this,"hasSearched",!1);n(this,"debounceTimeout",null);console.log("Initializing FuzzySearchUI"),this.container=e,this.callbacks=t,this.fuzzySearchService=new T,this.initializeFilters(),this.createUI(),this.setupEventListeners(),setTimeout(()=>{this.searchInput.focus(),console.log("Search input focused");const{attribute:s,value:r}=this.extractSearchQueryParam();console.log("Extracted query params:",{attribute:s,value:r}),s&&r&&(this.addFilter(s,r),this.executeSearch())},0)}initializeFilters(){this.fuzzySearchService.getAvailableAttributes().forEach(t=>{this.selectedFilters[t]=[]})}extractSearchQueryParam(){const e=new URLSearchParams(window.location.search),t=e.get("person")||"",s=e.get("resource_directory")||"";return t?{attribute:"person",value:t}:s?{attribute:"resource_directory",value:s}:{attribute:null,value:null}}createUI(){this.container.innerHTML=C`
      <div class="w-full mx-auto px-2 mt-4 fuzzy-search-container">
        <div class="w-full relative">
          <!-- Modern Search Container -->
          <div class="flex flex-col space-y-3">
            <!-- Main Search Row -->
            <div
              class="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mb-3"
            >
              <div id="input-container" class="relative flex-grow">
                <!-- Integrated Input and Button Container -->
                <div
                  class="relative  rounded-xl  bg-white flex items-center h-12 sm:h-14 group overflow-hidden"
                  style="padding-right:0;"
                >
                  <!-- Search Icon -->
                  <!-- <div
                    class="flex items-center justify-center w-12 sm:w-14 h-12 sm:h-14 text-gray-500 group-focus-within:text-blue-400 transition-colors duration-300"
                  >
                    <svg
                      class="w-5 sm:w-6 h-5 sm:h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      stroke-width="2.5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      ></path>
                    </svg>
                  </div> -->

                  <!-- Modern Input Field -->
                  <input
                    id="fuzzy-search-input"
                    type="text"
                    autocomplete="off"
                    placeholder="Search by people, folders, or keywords..."
                    class="flex-1 h-full px-3 border-2 border-gray-200 text-sm sm:text-base bg-transparent border-r-0 focus:outline-none focus:ring-0 placeholder-gray-500 font-medium rounded-l-xl rounded-r-none transition-all duration-300"
                    style="border-top-right-radius:0;border-bottom-right-radius:0;"
                  />

                  <!-- Filter Toggle Button -->
                  <button
                    disabled
                    id="filter-sidebar-toggle-btn"
                    class="flex cursor-not-allowed bg-gray-600 items-center justify-center w-12 h-full sm:w-14  hover:border-gray-300 transition-all duration-200 group focus:outline-none "
                    aria-label="Toggle advanced filters"
                    title="Show/hide advanced search filters"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24px"
                      viewBox="0 -960 960 960"
                      width="24px"
                    >
                      <path
                      fill="white"
                        d="M440-160q-17 0-28.5-11.5T400-200v-240L168-736q-15-20-4.5-42t36.5-22h560q26 0 36.5 22t-4.5 42L560-440v240q0 17-11.5 28.5T520-160h-80Zm40-308 198-252H282l198 252Zm0 0Z"
                      />
                    </svg>
                  </button>

                  <!-- Integrated Search Button -->
                  <button
                    id="fuzzy-search-btn"
                    class="h-12 sm:h-14 px-6 sm:px-8 bg-gradient-to-r from-blue-400 via-blue-400 to-blue-400 hover:from-blue-400 hover:via-blue-400 hover:to-blue-400 active:from-blue-400 active:via-blue-400 active:to-blue-450 disabled:from-blue-400 disabled:via-blue-400 disabled:to-blue-400 text-white font-bold rounded-r-xl rounded-l-none transition-all duration-300 flex items-center justify-center space-x-2 text-sm sm:text-base min-w-[100px] sm:min-w-[120px] border-0 focus:outline-none focus:ring-4 focus:ring-blue-400 focus:z-10"
                    style="border-top-left-radius:0;border-bottom-left-radius:0;margin-left:-1px;"
                  >
                    <svg
                      class="w-5 sm:w-6 h-5 sm:h-6 drop-shadow-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      stroke-width="2.5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      ></path>
                    </svg>
                    <span id="search-btn-text" class="font-bold tracking-wide"
                      >Search</span
                    >
                  </button>
                </div>

                <!-- Modern Smart Dropdown -->
                <div
                  id="fuzzy-dropdown"
                  class="absolute top-full left-0 right-0 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl mt-3 z-50 max-h-64 sm:max-h-80 overflow-y-auto hidden backdrop-blur-sm"
                  style="box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 10px 20px -5px rgba(0, 0, 0, 0.1);"
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
              class="flex w-full items-center flex-wrap gap-2 sm:gap-3 invisible transition-all duration-300"
            >
              <!-- Filters will be rendered here -->
            </div>

            <!-- Search Tips (shown only before first search) -->
            <div
              id="search-tips"
              class="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 text-sm hidden shadow-lg"
            >
              <h3
                class="font-bold text-blue-900 mb-3 flex items-center text-base"
              >
                <svg
                  class="w-5 h-5 mr-3 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  stroke-width="2.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                💡 Search Tips
              </h3>
              <div class="text-blue-800 space-y-4">
                <div
                  class="bg-white bg-opacity-60 rounded-xl p-4 border border-blue-100"
                >
                  <p class="font-bold text-blue-900 mb-3 flex items-center">
                    🔍 You can search for:
                  </p>
                  <ul class="space-y-2 ml-2">
                    <li class="flex items-center">
                      <span class="mr-2">👥</span><strong>People:</strong> John,
                      Sarah
                    </li>
                    <li class="flex items-center">
                      <span class="mr-2">🏷️</span
                      ><strong>Keywords:</strong> beach, sunset, birthday,
                      vacation
                    </li>
                    <li class="flex items-center">
                      <span class="mr-2">📁</span
                      ><strong>Folders:</strong> 2023, Summer Photos, Wedding
                    </li>
                  </ul>
                </div>

                <div
                  class="bg-white bg-opacity-60 rounded-xl p-4 border border-blue-100"
                >
                  <p class="font-bold text-blue-900 mb-3 flex items-center">
                    ⚡ Multiple filters work together:
                  </p>
                  <ul class="space-y-2 ml-2 text-sm">
                    <li class="flex items-start">
                      <span class="mr-2 mt-0.5">•</span>
                      <span
                        ><strong>Person + Folder</strong> = Photos of that
                        person in that folder</span
                      >
                    </li>
                    <li class="flex items-start">
                      <span class="mr-2 mt-0.5">•</span>
                      <span
                        ><strong>Keyword + Folder</strong> = Photos with that
                        keyword in that folder</span
                      >
                    </li>
                    <li class="flex items-start">
                      <span class="mr-2 mt-0.5">•</span>
                      <span
                        ><strong>Person + Keyword</strong> = Photos of that
                        person with that keyword</span
                      >
                    </li>
                  </ul>
                </div>

                <div class="text-center">
                  <p
                    class="text-blue-700 text-sm font-medium bg-blue-100 rounded-full px-4 py-2 inline-block"
                  >
                    💡 Type to see suggestions, click to add as filters, then
                    search to find photos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,this.filtersContainer=this.container.querySelector("#filters-container"),this.inputContainer=this.container.querySelector("#input-container"),this.searchInput=this.container.querySelector("#fuzzy-search-input"),this.searchButton=this.container.querySelector("#fuzzy-search-btn"),this.dropdown=this.container.querySelector("#fuzzy-dropdown"),this.searchTips=this.container.querySelector("#search-tips")}setupEventListeners(){this.searchInput.addEventListener("input",this.handleInputChange.bind(this)),this.searchInput.addEventListener("keydown",this.handleKeyDown.bind(this)),this.searchInput.addEventListener("focus",this.handleInputFocus.bind(this)),this.searchInput.addEventListener("blur",this.handleInputBlur.bind(this)),this.searchButton.addEventListener("click",this.handleSearchClick.bind(this)),document.addEventListener("click",e=>{this.inputContainer.contains(e.target)||this.hideDropdown()})}async handleInputChange(e){const s=e.target.value;console.log("Input changed to:",s),this.selectedIndex=-1,this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout(async()=>{s.trim().length>0?(this.suggestions=await this.fuzzySearchService.generateAllAttributeSuggestions(s),this.suggestions.length>0?(this.showDropdown=!0,this.renderDropdown()):this.hideDropdown()):(this.suggestions=[],this.hideDropdown())},300)}handleKeyDown(e){console.log("Key down:",e.key),e.key==="Enter"&&(e.preventDefault(),this.handleAddFilter())}handleInputFocus(){this.selectedIndex=-1,this.searchInput.value.trim()&&this.fuzzySearchService.generateAllAttributeSuggestions(this.searchInput.value).then(e=>{this.suggestions=e,this.suggestions.length>0?(this.showDropdown=!0,this.renderDropdown()):this.hideDropdown()})}handleInputBlur(){setTimeout(()=>{this.suggestions=[],this.selectedIndex=-1,this.hideDropdown()},200)}async handleAddFilter(){var e;if(this.searchInput.value.trim()){const t=this.searchInput.value.trim();(e=this.selectedFilters.query)!=null&&e.includes(t)||this.addFilter("query",t),this.searchInput.value="",this.suggestions=[],this.hideDropdown(),this.executeSearch()}}async handleSuggestionClick(e){this.addFilter(e.attribute,e.text),this.searchInput.value="",this.suggestions=[],this.hideDropdown(),this.executeSearch()}async handleSearchClick(){this.searchInput.value.trim()?await this.handleAddFilter():this.executeSearch()}addFilter(e,t){this.selectedFilters[e]||(this.selectedFilters[e]=[]),this.selectedFilters[e].includes(t)||(e==="query"||e==="resource_directory"?this.selectedFilters[e]=[t]:this.selectedFilters[e].push(t),this.renderFilters())}removeFilter(e,t){if(this.selectedFilters[e]){this.selectedFilters[e]=this.selectedFilters[e].filter(o=>o!==t),this.renderFilters();const s=Object.keys(this.selectedFilters).some(o=>this.selectedFilters[o]&&this.selectedFilters[o].length>0),r=this.searchInput.value.trim().length>0;(s||r)&&this.executeSearch()}}executeSearch(){const e=this.fuzzySearchService.buildQueryString(this.selectedFilters);console.log("Executing search with query:",e),this.hasSearched||(this.hasSearched=!0,this.hideSearchTips()),localStorage.setItem("lastSearchQuery",e),this.callbacks.onSearchExecuted(e)}renderFilters(){const e=Object.keys(this.selectedFilters).filter(s=>this.selectedFilters[s].length>0).map(s=>this.selectedFilters[s].map(r=>{const o=this.fuzzySearchService.getAttributeIcon(s);return`
            <div class="flex items-center px-3 py-2 rounded-2xl border-2 ${this.fuzzySearchService.getAttributeColor(s)} hover:shadow-xl cursor-pointer group filter-tag" data-attribute="${s}" data-value="${r}">
              <span class="mr-2 sm:mr-3 text-sm sm:text-base">${o}</span>
              <span class="text-sm font-semibold truncate max-w-[120px] sm:max-w-none">${r}</span>
              <button class="ml-2 sm:ml-3 text-current opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-40 rounded-full p-1.5 transition-all duration-300 remove-filter-btn hover:scale-110 active:scale-90" data-attribute="${s}" data-value="${r}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          `}).join("")).flat().join("");this.filtersContainer.innerHTML=e,e.length>0?this.filtersContainer.classList.remove("invisible"):this.filtersContainer.classList.add("invisible"),this.filtersContainer.querySelectorAll(".remove-filter-btn").forEach(s=>{s.addEventListener("click",r=>{r.stopPropagation();const o=s.getAttribute("data-attribute"),i=s.getAttribute("data-value");this.removeFilter(o,i)})})}renderDropdown(){if(!this.showDropdown){this.hideDropdown();return}const e=this.dropdown.querySelector("#dropdown-content");if(this.suggestions.length>0){const t=this.suggestions.reduce((i,a)=>(i[a.attribute]||(i[a.attribute]=[]),i[a.attribute].push(a),i),{});let s="",r=0;Object.keys(t).forEach(i=>{const a=t[i],c=this.fuzzySearchService.getAttributeIcon(i),l=this.fuzzySearchService.getAttributeDisplayName(i);Object.keys(t).length>1&&(s+=`
            <div class="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600 bg-gray-50 border-b border-gray-100 flex items-center">
              <span class="mr-2 sm:mr-3">${c}</span>
              ${l}
            </div>
          `),a.forEach(h=>{const u=this.fuzzySearchService.getAttributeColor(h.attribute);s+=`
            <div class="suggestion-option flex items-center px-3 sm:px-4 py-2 sm:py-3 cursor-pointer border-b border-gray-100 last:border-b-0 group hover:bg-blue-50 transition-all duration-200 ${this.selectedIndex===r?"bg-blue-50 border-l-4 border-l-blue-500":""}" data-index="${r}">
              <div class="flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 rounded-xl mr-3 sm:mr-4 ${u} shadow-sm group-hover:shadow-md transition-shadow duration-200">
                <span class="text-sm sm:text-base">${c}</span>
              </div>
              <div class="flex-grow min-w-0">
                <div class="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200 text-sm sm:text-base truncate">${h.text}</div>
                <div class="text-xs sm:text-sm text-gray-500 flex items-center mt-1">
                  <span class="capitalize">
                    Add to ${h.attribute.replace("_"," ")} search
                  </span>
                </div>
              </div>
              <div class="flex items-center justify-center w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-200">
                <svg class="w-3 sm:w-4 h-3 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </div>
            </div>
          `,r++})}),e.innerHTML=s,e.querySelectorAll(".suggestion-option").forEach((i,a)=>{i.addEventListener("click",c=>{c.preventDefault(),c.stopPropagation(),console.log("Suggestion div clicked:",this.suggestions[a]),this.handleSuggestionClick(this.suggestions[a])}),i.addEventListener("mousedown",c=>{c.preventDefault()}),i.addEventListener("mouseenter",()=>{this.selectedIndex=a,this.updateDropdownSelection()})})}else{this.hideDropdown();return}this.dropdown.classList.remove("hidden")}updateDropdownSelection(){this.dropdown.querySelectorAll(".suggestion-option").forEach((t,s)=>{s===this.selectedIndex?t.classList.add("bg-blue-50","border-l-4","border-l-blue-500"):t.classList.remove("bg-blue-50","border-l-4","border-l-blue-500")})}hideDropdown(){this.showDropdown=!1,this.dropdown.classList.add("hidden")}cleanup(){this.fuzzySearchService.cleanup()}clearAllFilters(){this.selectedFilters={},this.fuzzySearchService.getAvailableAttributes().forEach(e=>{this.selectedFilters[e]=[]}),this.renderFilters()}hideSearchTips(){this.searchTips&&(this.searchTips.style.display="none")}disableInputs(){console.log("Disabling inputs and showing loading state..."),this.searchInput.disabled=!0,this.searchInput.classList.add("opacity-50","cursor-not-allowed"),this.searchButton.disabled=!0,this.searchButton.classList.add("opacity-50","cursor-not-allowed");const e=this.searchButton.querySelector("#search-btn-text");e&&(e.textContent="Searching..."),this.hideDropdown(),this.filtersContainer.querySelectorAll(".remove-filter-btn").forEach(s=>{s.disabled=!0,s.classList.add("opacity-50","cursor-not-allowed")})}enableInputs(){this.searchInput.disabled=!1,this.searchInput.classList.remove("opacity-50","cursor-not-allowed"),this.searchButton.disabled=!1,this.searchButton.classList.remove("opacity-50","cursor-not-allowed");const e=this.searchButton.querySelector("#search-btn-text");e&&(e.textContent="Search"),this.filtersContainer.querySelectorAll(".remove-filter-btn").forEach(s=>{s.disabled=!1,s.classList.remove("opacity-50","cursor-not-allowed")})}}const M='<svg  xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"><path d="M440-160q-17 0-28.5-11.5T400-200v-240L168-736q-15-20-4.5-42t36.5-22h560q26 0 36.5 22t-4.5 42L560-440v240q0 17-11.5 28.5T520-160h-80Zm40-308 198-252H282l198 252Zm0 0Z"/></svg>',B={people:"People",cameraMakes:"Camera Makes",cameraModels:"Camera Models",places:"Places",tags:"Tags"},m={people:"person",cameraMakes:"make",cameraModels:"model",places:"place",tags:"tags"};class D{constructor(e,t){n(this,"sidebarElement");n(this,"overlayElement");n(this,"filters",{});n(this,"queryToken",null);n(this,"filteredImages",[]);n(this,"onFilterChange");n(this,"toggleButtonId");n(this,"isInitialized",!1);this.overlayElement=this.createOverlay(),this.sidebarElement=this.createSidebar(),this.onFilterChange=e,this.toggleButtonId=t,document.body.appendChild(this.overlayElement),document.body.appendChild(this.sidebarElement),this.addToggleListener(),this.createPhotoFiltersUI()}async initialize(){await this.populateAllPhotoFilters(),this.renderFilters()}async setFilteredImages(e,t){if(!this.queryToken)return;const r=(await I(this.queryToken,e,t)).map(o=>({id:o.resource_hash,score:1,metadata:o}));this.filteredImages=r,this.onFilterChange(this.filteredImages),console.log("Filtered images:",this.filteredImages)}async updateQueryToken(e){console.log("Updating query token:",e),this.queryToken=e,this.enableToggleButton(),this.isInitialized=!1}enableToggleButton(){const e=document.getElementById(this.toggleButtonId);e&&(e.classList.remove("cursor-not-allowed"),e.classList.add("cursor-pointer"),e.removeAttribute("disabled"))}removeAllFilterPills(){const e=document.getElementById("filters-container");if(!e)return;const t=e.getElementsByClassName("filter-pill");for(;t.length>0;)t[0].remove()}clearFilters(){this.filteredImages=[],this.uncheckAllImages(),this.uncheckEveryCheckbox(),this.removeAllFilterPills(),this.onFilterChange(this.filteredImages)}addFilterPill(e,t){var f;const s=document.getElementById("filters-container");if(!s)return;const r="linear-gradient(135deg, #667eea 0%, #764ba2 100%)",o="0 4px 15px rgba(102, 126, 234, 0.3)",i=document.createElement("div");i.className="filter-pill flex items-center px-2 py-1 rounded-xl border-0 shadow-lg",i.style.background=r,i.style.boxShadow=o,i.style.transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",i.style.cursor="pointer",i.style.color="#ffffff",i.style.fontWeight="500",i.style.letterSpacing="0.025em",i.style.backdropFilter="blur(10px)",i.style.border="1px solid rgba(255, 255, 255, 0.2)",i.setAttribute("data-attribute",e),i.setAttribute("data-value",t);const a=document.createElement("span");a.className="mr-2 sm:mr-3 text-sm sm:text-base",a.innerHTML=M,(f=a.querySelector("svg"))==null||f.setAttribute("fill","#ffffff"),i.appendChild(a);const c=document.createElement("span");c.className="text-xs font-semibold truncate",c.style.maxWidth="140px",c.style.textShadow="0 1px 2px rgba(0, 0, 0, 0.1)",c.style.lineHeight="1.4",c.textContent=t,i.appendChild(c);const l=document.createElement("button");l.className="ml-3 sm:ml-4 text-white opacity-80 hover:opacity-100 cursor-pointer hover:bg-gray-100 hover:text-black hover:bg-opacity-20 rounded-full p-2 transition-all duration-300 remove-filter-btn",l.style.display="flex",l.style.alignItems="center",l.style.justifyContent="center",l.style.minWidth="28px",l.style.minHeight="28px",l.style.backdropFilter="blur(5px)",l.setAttribute("data-attribute",e),l.setAttribute("data-value",t),l.addEventListener("click",b=>{b.stopPropagation(),this.clearFilters()});const h=document.createElementNS("http://www.w3.org/2000/svg","svg");h.setAttribute("class","w-4 h-4"),h.setAttribute("fill","none"),h.setAttribute("stroke","currentColor"),h.setAttribute("viewBox","0 0 24 24"),h.setAttribute("stroke-width","2.5"),h.style.filter="drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))";const u=document.createElementNS("http://www.w3.org/2000/svg","path");u.setAttribute("stroke-linecap","round"),u.setAttribute("stroke-linejoin","round"),u.setAttribute("d","M6 18L18 6M6 6l12 12"),h.appendChild(u),l.appendChild(h),i.appendChild(l),s==null||s.appendChild(i)}createDummyPhotoFilters(){this.filters={people:["Alice","Bob","Charlie"],cameraMakes:["Canon","Nikon","Sony"],cameraModels:["Model A","Model B","Model C"],places:["Beach","Mountain","City"],tags:["Sunset","Portrait","Landscape"]}}addToggleListener(){const e=document.getElementById("filter-sidebar-toggle-btn");e==null||e.addEventListener("click",async()=>{this.toggleSidebar(),this.isInitialized||(await this.initialize(),this.isInitialized=!0)})}createSidebar(){const e=document.createElement("div");return e.id="photo-filter-sidebar",this.createSidebarStyles(e),e}createOverlay(){const e=document.createElement("div");return e.id="photo-filter-overlay",this.createOverlayStyles(e),e.addEventListener("click",()=>{this.closeSidebar()}),e}createOverlayStyles(e){e.style.position="fixed",e.style.top="0",e.style.left="0",e.style.width="100%",e.style.height="100%",e.style.backgroundColor="rgba(0, 0, 0, 0.0)",e.style.zIndex="999",e.style.display="none"}closeSidebar(){this.overlayElement.style.display="none",this.sidebarElement.style.display="none"}showSidebar(){this.overlayElement.style.display="block",this.sidebarElement.style.display="flex"}toggleSidebar(){this.sidebarElement.style.display==="flex"?this.closeSidebar():this.showSidebar()}createSidebarStyles(e){e.style.width="320px",e.style.height="100%",e.style.position="fixed",e.style.top="0",e.style.right="0",e.style.backgroundColor="#fff",e.style.boxShadow="-2px 0 5px rgba(0,0,0,0.5)",e.style.zIndex="1000",e.style.display="none",e.style.flexDirection="column"}createPeopleFilterUI(){const e=this.filters.people||[],t=document.createElement("div");t.className="filter-container mb-2";const s=document.createElement("h4");s.textContent="People",s.className="text-base font-semibold text-blue-700 mb-2 tracking-wide capitalize border-b border-blue-200 pb-0.5",t.appendChild(s);const r=document.createElement("div");return r.className="flex flex-wrap overflow-y-auto",r.style.height="360px",r.style.display="flex",r.style.flexWrap="wrap",r.style.overflowY="auto",r.style.padding="2px",e.forEach(o=>{const i=document.createElement("div");i.className="flex flex-col items-center cursor-pointer hover:bg-blue-50 rounded transition",i.style.padding="2px",i.style.alignItems="center",i.style.justifyContent="center";const a=document.createElement("img");a.className="w-12 h-12 bg-gray-200 rounded-full object-cover",a.src=`${p.GET_PERSON_IMAGE}/${o}`,a.alt=o,a.style.marginBottom="2px",a.addEventListener("click",()=>{this.onImageClick(a,o)}),i.appendChild(a),r.appendChild(i)}),t.appendChild(r),t}async populateSinglePhotoFilter(e){const t=m[e];if(!t)return;const s=await k(this.queryToken,t);this.filters[e]=s.filter(r=>r)}async populateAllPhotoFilters(){const e=Object.keys(m);for(const t of e)await this.populateSinglePhotoFilter(t)}uncheckAllImages(){document.querySelectorAll("#photo-filters img").forEach(t=>{delete t.dataset.personId,t.parentElement.style.border="none",t.parentElement.style.borderRadius="0"})}onImageClick(e,t){const s=e.dataset.personId;if(this.uncheckAllImages(),this.removeAllFilterPills(),this.uncheckEveryCheckbox(),s===t){console.log(`Image is already selected: ${e.alt}`),this.filteredImages=[],this.onFilterChange(this.filteredImages);return}this.addFilterPill("person",t),e.parentElement.style.border="3px solid #2563eb",e.parentElement.style.borderRadius="8px",e.dataset.personId=t,this.setFilteredImages("person",t)}onCheckboxClick(e,t,s,r){if(this.uncheckEveryCheckbox(r),this.uncheckAllImages(),this.removeAllFilterPills(),!s){this.filteredImages=[],this.onFilterChange(this.filteredImages);return}this.addFilterPill(e,t),this.setFilteredImages(m[e],t)}uncheckEveryCheckbox(e){document.querySelectorAll('input[type="checkbox"]').forEach(s=>{s!==e&&(s.checked=!1,s.parentElement.classList.remove("bg-blue-100","font-semibold","text-blue-700"))})}createSingleFilterUI(e,t){if(e==="people")return this.createPeopleFilterUI();const s=document.createElement("div");s.className="filter-container mb-4";const r=document.createElement("h4");r.textContent=B[e],r.className="text-lg font-semibold text-blue-700 mb-3 tracking-wide capitalize border-b border-blue-200 pb-1",s.appendChild(r);const o=document.createElement("ul");return o.className="space-y-1",t.forEach(i=>{const a=document.createElement("li"),c=document.createElement("label");c.className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-blue-50 transition";const l=document.createElement("input");l.type="checkbox",l.name=e,l.value=i,l.className="mr-2 accent-blue-600 w-4 h-4 rounded border-gray-300",l.addEventListener("change",h=>{l.checked?c.classList.add("bg-blue-100","font-semibold","text-blue-700"):c.classList.remove("bg-blue-100","font-semibold","text-blue-700");const u=h.target;this.onCheckboxClick(e,i,u.checked,l)}),c.appendChild(l),c.appendChild(document.createTextNode(i)),a.appendChild(c),o.appendChild(a)}),s.appendChild(o),s}createSidebarHeader(){const e=document.createElement("div");e.className="flex items-center justify-between p-4 border-b border-gray-200 bg-white",e.style.borderBottom="1px solid #e5e7eb";const t=document.createElement("h3");t.textContent="Filters",t.className="text-lg font-semibold text-gray-800";const s=document.createElement("button");return s.innerHTML="×",s.className="text-gray-500 hover:text-gray-700 text-2xl font-bold cursor-pointer bg-transparent border-none",s.style.fontSize="24px",s.style.lineHeight="1",s.style.padding="0",s.style.width="24px",s.style.height="24px",s.style.display="flex",s.style.alignItems="center",s.style.justifyContent="center",s.addEventListener("click",()=>{this.closeSidebar()}),e.appendChild(t),e.appendChild(s),e}createSidebarFooter(){const e=document.createElement("div");e.className="p-4 border-t border-gray-200 bg-white",e.style.borderTop="1px solid #e5e7eb";const t=document.createElement("button");return t.textContent="Clear All Filters",t.className="w-full py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium",t.style.cursor="pointer",t.style.border="none",t.addEventListener("click",()=>{this.clearAllFilters()}),e.appendChild(t),e}clearAllFilters(){this.uncheckAllImages(),this.uncheckEveryCheckbox(),this.filteredImages=[],this.onFilterChange(this.filteredImages)}renderFilters(){const e=document.getElementById("photo-filters");if(e){e.innerHTML="";for(const[t,s]of Object.entries(this.filters))if(s.length>0){const r=this.createSingleFilterUI(t,s);e.appendChild(r)}}}createPhotoFiltersUI(){this.sidebarElement.innerHTML="";const e=this.createSidebarHeader();this.sidebarElement.appendChild(e);const t=document.createElement("div");t.id="photo-filters",t.className="p-4 space-y-6 flex-1 overflow-y-auto",this.sidebarElement.appendChild(t);const s=this.createSidebarFooter();this.sidebarElement.appendChild(s)}}class q{constructor(){n(this,"searchService");n(this,"uiService");n(this,"fuzzySearchUI");n(this,"filteredPhotos",[]);n(this,"displayedPhotos",[]);n(this,"selectedPhoto",null);n(this,"currentPage",0);n(this,"totalPages",0);n(this,"totalResults",0);n(this,"queryToken","");n(this,"resultsPerPage",10);n(this,"paginationComponent");n(this,"paginationContainerElement",null);n(this,"filterContainer",null);n(this,"imageHeight",0);n(this,"imageWidth",0);n(this,"photoFilterSidebar",null);n(this,"preloadedData",{});n(this,"imagePreloadCache",new Map);this.cacheDOMElements(),w.initialize(),S.initialize("photo-grid-container",{loadingId:"loading-indicator",errorId:"error-display",noResultsId:"no-results-message",gridId:"photo-grid"}),this.findGallerySize();const e=document.getElementById("fuzzy-search-container");this.fuzzySearchUI=new L(e,{onSearchExecuted:t=>this.handleSearch(t)}),this.photoFilterSidebar=new D(t=>this.handleFilteredPhotosUpdate(t),"filter-sidebar-toggle-btn"),this.uiService=new P("photo-grid-container",this.imageHeight,this.imageWidth,this.resultsPerPage),this.searchService=new z,this.setupEventListeners(),this.init()}findGallerySize(){const e=window.innerHeight,t=document.getElementById("photo-gallery"),s=e-224;console.log(`Photo gallery height: ${s}px`);const r=t==null?void 0:t.clientWidth,o=180,{rows:i,cols:a,tileWidth:c,tileHeight:l}=E(s,r,o);this.resultsPerPage=i*a,this.imageHeight=l-10,this.imageWidth=c-6}cacheDOMElements(){this.paginationContainerElement=document.getElementById("pagination-container"),this.filterContainer=document.getElementById("photo-filter-container")}init(){console.log("ImageSearch app initialized"),this.setupPagination()}handleFilteredPhotosUpdate(e){if(console.log("Filtered photos updated:",e.length),this.currentPage=0,this.clearPreloadedCache(),e.length===0){this.filteredPhotos=[],this.updatePaginationComponent(this.totalResults,this.totalPages,0),this.updatePaginationAndRenderPhotos();return}this.filteredPhotos=[...e],this.displayedPhotos=[...e];const t=Math.ceil(this.filteredPhotos.length/this.resultsPerPage);this.updatePaginationComponent(this.filteredPhotos.length,t,0),this.updatePaginationAndRenderPhotos()}updatePaginationComponent(e,t,s){var r;(r=this.paginationComponent)==null||r.update({totalItems:e,itemsPerPage:this.resultsPerPage,initialPage:s,totalPages:t})}setupEventListeners(){this.uiService.setupEventListeners({onPhotoClick:e=>this.handlePhotoClick(e),onModalClose:()=>this.handleModalClose(),onModalNext:()=>this.handleModalNext(),onModalPrevious:()=>this.handleModalPrevious()})}async handleSearch(e){var t,s;if(!e.trim()){this.uiService.updateError("Please enter a search term");return}this.clearPreloadedCache(),console.log("Starting search for:",e);try{this.currentPage=0;const r=await this.searchService.startSearch(e,this.resultsPerPage);this.totalPages=r.n_pages||1,this.totalResults=r.n_matches,this.queryToken=r.query_token,this.updatePaginationComponent(this.totalResults,this.totalPages,this.currentPage),(t=this.paginationContainerElement)==null||t.classList.remove("hidden"),this.filteredPhotos=[],await this.updatePaginationAndRenderPhotos(),(s=this.photoFilterSidebar)==null||s.updateQueryToken(this.queryToken),this.handleSearchDoneChange(!0)}catch(r){console.error("Search failed:",r),this.handleErrorChange(r instanceof Error?r.message:"Search failed. Please try again.")}}setupPagination(){if(console.log("Setting up pagination"),!this.paginationContainerElement){console.warn("Pagination container element is missing");return}this.paginationComponent=new F({container:this.paginationContainerElement,totalItems:this.totalResults,itemsPerPage:this.resultsPerPage,initialPage:this.currentPage,totalPages:this.totalPages,onPageChange:async e=>{this.currentPage=e,await this.updatePaginationAndRenderPhotos(),window.scrollTo({top:0})}}),this.paginationContainerElement.classList.add("hidden")}async updatePaginationAndRenderPhotos(){console.log("Updating pagination and rendering photos for page:",this.currentPage),this.filteredPhotos.length?this.displayedPhotos=this.filteredPhotos.slice(this.currentPage*this.resultsPerPage,(this.currentPage+1)*this.resultsPerPage):this.preloadedData[this.currentPage]?this.displayedPhotos=this.preloadedData[this.currentPage]:(console.log(`Fetching search results for page ${this.currentPage} with token ${this.queryToken}`),this.displayedPhotos=await this.searchService.fetchSearchResults(this.queryToken,this.currentPage),this.preloadedData[this.currentPage]||(this.preloadedData[this.currentPage]=this.displayedPhotos)),console.log("Displayed photos updated:",this.displayedPhotos.length),this.toggleFilterContainer(this.displayedPhotos.length>0),this.renderDisplayedPhotos(),window.scrollTo({top:0}),window.requestIdleCallback(()=>{this.preloadData()})}async preloadData(){const e=this.currentPage+1;e>=this.totalPages||(this.preloadedData[e]||(this.preloadedData[e]=await this.searchService.fetchSearchResults(this.queryToken,e)),await this.preloadImagesForPage(e))}async preloadImagesForPage(e){const t=this.preloadedData[e];t&&t.forEach(s=>{if(!this.imagePreloadCache.has(s.id)){const r=new Image;r.decoding="async",r.loading="eager",r.src=`${p.GET_PREVIEW_IMAGE}/${s.id}.webp`,this.imagePreloadCache.set(s.id,r)}})}clearPreloadedCache(){this.preloadedData={},this.imagePreloadCache.clear()}toggleFilterContainer(e){const t=document.getElementById("photo-filter-container");t&&t.classList.toggle("invisible",!e)}renderDisplayedPhotos(){this.uiService.updatePhotos([...this.displayedPhotos])}handleLoadingChange(e){console.log("Loading state changed:",e),this.uiService.updateLoading(e),e?this.fuzzySearchUI.disableInputs():this.fuzzySearchUI.enableInputs()}handleErrorChange(e){console.log("Error state changed:",e),this.uiService.updateError(e)}handleSearchDoneChange(e){this.displayedPhotos.length===0&&e&&this.uiService.showNoResults(!0)}handlePhotoClick(e){console.log("Photo clicked:",e);const t=this.displayedPhotos.findIndex(o=>o.id===e.id);if(t===-1)return;this.selectedPhoto=e;const s=t>0,r=t<this.displayedPhotos.length-1;this.uiService.showModal(e,s,r)}handleModalClose(){console.log("Modal closed"),this.selectedPhoto=null,this.uiService.hideModal()}handleModalNext(){if(!this.selectedPhoto)return;const e=this.displayedPhotos.findIndex(t=>t.id===this.selectedPhoto.id);if(e!==-1&&e<this.displayedPhotos.length-1){console.log("Modal next");const t=this.displayedPhotos[e+1];this.selectedPhoto=t;const s=e+1>0,r=e+1<this.displayedPhotos.length-1;this.uiService.showModal(t,s,r)}}handleModalPrevious(){if(!this.selectedPhoto)return;const e=this.displayedPhotos.findIndex(t=>t.id===this.selectedPhoto.id);if(e!==-1&&e>0){console.log("Modal previous");const t=this.displayedPhotos[e-1];this.selectedPhoto=t;const s=e-1>0,r=e-1<this.displayedPhotos.length-1;this.uiService.showModal(t,s,r)}}}new x({title:"Image Search - Hachi",currentPage:"/image-search.html",showNavbar:!0});document.addEventListener("DOMContentLoaded",()=>{console.log("DOM loaded, initializing ImageSearch app"),window.imageSearchApp=new q});
