var y=Object.defineProperty;var P=(d,e,t)=>e in d?y(d,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):d[e]=t;var n=(d,e,t)=>P(d,typeof e!="symbol"?e+"":e,t);import{e as p,f as m,h as v,a as x,b as w,c as S,L as C}from"./layout-CMTxcYkn.js";/* empty css              */import{I,P as k,U as E}from"./photoGrid-Y8KRjKGq.js";import{P as F}from"./pagination-DilowG3T.js";function L(d){return!d.data_hash||!d.score||!d.meta_data||!(d.data_hash.length===d.score.length&&d.score.length===d.meta_data.length)?(console.error("Malformed rawData in transformRawDataChunk:",d),[]):d.data_hash.map((t,s)=>({id:t,score:d.score[s],metadata:d.meta_data[s]}))}class z{async startSearch(e,t){console.log("Starting search:",e);let s=new FormData,i=p.COLLECT_ALL_PHOTOS(t);e&&e.length>0&&(s.append("query_start",String(!0)),s.append("query",e),s.append("page_size",String(t)),i=p.IMAGE_SEARCH);try{let o;if(e&&e.length>0?o=await m(i,{method:"POST",body:s}):o=await m(i),!o.ok)throw new Error(`Image search error: ${o.status}`);return await o.json()}catch(o){throw console.error("Search request failed:",o),o}}async fetchSearchResults(e,t){console.log("Fetching search results for token:",e,"page:",t);try{const s=`${p.COLLECT_QUERY_META}/${e}/${String(t)}`;console.log(s);const i=await m(s);if(!i.ok)throw new Error(`Query results fetch error: ${i.status}`);const o=await i.json();return L(o)}catch(s){throw console.error(s),s}}}const g={person:{icon:"👤",color:"text-green-800",examples:["john","sarah","mike"],description:"Search for people in your photos",displayName:"People"},query:{icon:"🔍",color:"text-purple-800",examples:["sunset","birthday party","vacation"],description:"Search photo descriptions and content",displayName:"Keywords"},resource_directory:{icon:"📁",color:"text-yellow-800",examples:["vacation","photos","2023"],description:"Browse photos by folder or album",displayName:"Folders"}};class M{constructor(){n(this,"currentSuggestionController",null)}buildQueryString(e,t,s){const i={...e};t&&s&&(i[t]=[...i[t]||[],s]);let o="";const r=Object.keys(i).filter(l=>i[l].length>0);for(let l=0;l<r.length;l++){const a=r[l],h=i[a];o+=a+"=";for(let c=0;c<h.length;c++)o+=h[c],c!==h.length-1&&(o+="?");l!==r.length-1&&(o+="&")}return o}getAttributeIcon(e){const t=g[e];return t?t.icon:"#️⃣"}getAttributeColor(e){const t=g[e];return t?t.color:"bg-gray-100 text-gray-800 border-gray-200"}getAttributeDisplayName(e){const t=g[e];return t?t.displayName:e.charAt(0).toUpperCase()+e.slice(1).replace("_"," ")}getAttributeDescription(e){const t=g[e];return t?t.description:"Search attribute"}async getSuggestions(e){const t=new FormData;t.append("query",e);const s=await m(`${p.GET_SUGGESTIONS}`,{method:"POST",body:t});if(s.ok){let i=await s.json();const o=[];let r=Object.keys(i);console.log("Suggestion attributes: ",r);for(let l=0;l<r.length;l++){let a=r[l];const h=Array.from(new Set(i[a]));for(let c=0;c<h.length;c++)o.push({text:h[c],attribute:a,type:"suggestion"})}return o}return[]}getAvailableAttributes(){return Object.keys(g)}}class A{constructor(e,t){n(this,"container");n(this,"fuzzySearchService");n(this,"callbacks");n(this,"filtersContainer");n(this,"inputContainer");n(this,"searchInput");n(this,"searchButton");n(this,"dropdown");n(this,"searchTips");n(this,"selectedFilters",{query:[]});n(this,"suggestions",[]);n(this,"showDropdown",!1);n(this,"selectedIndex",-1);n(this,"hasSearched",!1);n(this,"debounceTimeout",null);console.log("Initializing FuzzySearchUI"),this.container=e,this.callbacks=t,this.fuzzySearchService=new M,this.initializeFilters(),this.createUI(),this.setupEventListeners(),setTimeout(()=>{this.searchInput.focus(),console.log("Search input focused");const{attribute:s,value:i}=this.extractSearchQueryParam();console.log("Extracted query params:",{attribute:s,value:i}),s&&i&&this.addFilter(s,i),this.executeSearch()},0)}initializeFilters(){this.fuzzySearchService.getAvailableAttributes().forEach(t=>{this.selectedFilters[t]=[]})}extractSearchQueryParam(){const e=new URLSearchParams(window.location.search),t=e.get("person")||"",s=e.get("resource_directory")||"";return t?{attribute:"person",value:t}:s?{attribute:"resource_directory",value:s}:{attribute:null,value:null}}createUI(){this.container.innerHTML=v`
      <div class="mx-auto mt-4 fuzzy-search-container">
        <div class="w-full relative">
          <!-- Modern Search Container -->
          <div class="flex flex-col">
            <!-- Main Search Row -->
            <div class="flex flex-col rounded-xl sm:flex-row shadow bg-gray-50 sm:space-y-0 mb-2">
              <div id="input-container" class="relative flex-grow">
                <!-- Integrated Input and Button Container -->
                <div
                  class="relative px-3  rounded-xl  flex items-center h-10 sm:h-12 group overflow-hidden"
                  style="padding-right:0;"
                >

                  <!-- Active Filters Display (moved below input) -->
                  <div
                    id="filters-container"
                    class="flex items-center flex-wrap gap-1 sm:gap-1 invisible transition-all duration-300"
                  >
                    <!-- Filters will be rendered here -->
                  </div>

                  <!-- Modern Input Field -->
                  <input
                    id="fuzzy-search-input"
                    type="text"
                    autocomplete="off"
                    placeholder="Search by people, folders, or keywords..."
                    class="flex-1 h-full ml-2  text-sm sm:text-base bg-transparent border-r-0 focus:outline-none focus:ring-0 placeholder-gray-600 rounded-l-xl rounded-r-none transition-all duration-300"
                    style="border-top-right-radius:0;border-bottom-right-radius:0;"
                  />

                  <!-- Filter Toggle Button -->
                  <!-- 
                  <button
                    disabled
                    id="filter-sidebar-toggle-btn"
                    class="flex cursor-not-allowed items-center justify-center w-16 h-10 sm:h-12 sm:w-14 group focus:outline-none "
                    aria-label="Toggle advanced filters"
                    title="Show/hide advanced search filters"
                  >
                    <?xml version="1.0" encoding="utf-8"?><
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style="width:24px;height:24px;"
                    >
                      <path
                        d="M4 5L10 5M10 5C10 6.10457 10.8954 7 12 7C13.1046 7 14 6.10457 14 5M10 5C10 3.89543 10.8954 3 12 3C13.1046 3 14 3.89543 14 5M14 5L20 5M4 12H16M16 12C16 13.1046 16.8954 14 18 14C19.1046 14 20 13.1046 20 12C20 10.8954 19.1046 10 18 10C16.8954 10 16 10.8954 16 12ZM8 19H20M8 19C8 17.8954 7.10457 17 6 17C4.89543 17 4 17.8954 4 19C4 20.1046 4.89543 21 6 21C7.10457 21 8 20.1046 8 19Z"
                        stroke="#000000"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                    </svg>
                  </button> -->

                  <!-- Integrated Search Button -->
                  <button
                    id="fuzzy-search-btn"
                    aria-label="Search"
                    class="relative flex items-center justify-center
                          h-10 sm:h-12
                          px-3 sm:px-5 md:px-4
                          bg-gradient-to-r from-blue-600 via-blue-600 to-blue-600
                          hover:from-blue-600 hover:via-blue-600 hover:to-blue-500
                          active:from-blue-600 active:via-blue-600 active:to-blue-500
                          disabled:opacity-60 disabled:cursor-not-allowed
                          text-white font-semibold
                          rounded-r-xl rounded-l-none
                          transition-all duration-300
                          space-x-0 sm:space-x-2
                          text-sm sm:text-base
                          
         focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600 focus:z-10"
                    style="border-top-left-radius:0;border-bottom-left-radius:0;margin-left:-1px;"
                  >
                    <svg
                      class="w-5 h-5 sm:w-6 sm:h-6 shrink-0"
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
                    <span
                      id="search-btn-text"
                      class="hidden font-bold tracking-wide"
                      >Search</span
                    >
                  </button>
                </div>

                <!-- Modern Smart Dropdown -->
                <div
                  id="fuzzy-dropdown"
                  class="absolute top-full left-0 right-0 bg-white border-2 border-gray-200 rounded-lg shadow-2xl mt-3 z-50 max-h-64 sm:max-h-80 overflow-y-auto hidden backdrop-blur-sm"
                  style="box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 10px 20px -5px rgba(0, 0, 0, 0.1);"
                >
                  <div id="dropdown-content">
                    <!-- Dropdown content will be rendered here -->
                  </div>
                </div>
              </div>
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
    `,this.filtersContainer=this.container.querySelector("#filters-container"),this.inputContainer=this.container.querySelector("#input-container"),this.searchInput=this.container.querySelector("#fuzzy-search-input"),this.searchButton=this.container.querySelector("#fuzzy-search-btn"),this.dropdown=this.container.querySelector("#fuzzy-dropdown"),this.searchTips=this.container.querySelector("#search-tips")}handleKeyDown(e){console.log("Key down:",e.key),e.key==="Enter"&&(e.preventDefault(),this.handleAddFilter())}setupEventListeners(){this.searchInput.addEventListener("input",this.handleInputChange.bind(this)),this.searchInput.addEventListener("keydown",this.handleKeyDown.bind(this)),this.searchInput.addEventListener("focus",this.handleInputFocus.bind(this)),this.searchInput.addEventListener("blur",this.handleInputBlur.bind(this)),this.searchButton.addEventListener("click",this.handleSearchClick.bind(this)),document.addEventListener("click",e=>{this.inputContainer.contains(e.target)||this.hideDropdown()})}async handleInputChange(e){const s=e.target.value;console.log("Input changed to:",s),this.selectedIndex=-1,this.debounceTimeout&&clearTimeout(this.debounceTimeout),this.debounceTimeout=setTimeout(async()=>{s.trim().length>0?(this.suggestions=await this.fuzzySearchService.getSuggestions(s),this.suggestions.length>0?(this.showDropdown=!0,this.renderDropdown()):this.hideDropdown()):(this.suggestions=[],this.hideDropdown())},300)}async handleInputFocus(){this.selectedIndex=-1,this.searchInput.value.trim()&&(this.suggestions=await this.fuzzySearchService.getSuggestions(this.searchInput.value),this.suggestions.length>0?(this.showDropdown=!0,this.renderDropdown()):this.hideDropdown())}handleInputBlur(){setTimeout(()=>{this.suggestions=[],this.selectedIndex=-1,this.hideDropdown()},200)}async handleAddFilter(){var e;if(this.searchInput.value.trim()){const t=this.searchInput.value.trim();(e=this.selectedFilters.query)!=null&&e.includes(t)||this.addFilter("query",t),this.searchInput.value="",this.suggestions=[],this.hideDropdown(),this.executeSearch()}}async handleSuggestionClick(e){this.addFilter(e.attribute,e.text),this.searchInput.value="",this.suggestions=[],this.hideDropdown(),this.executeSearch()}async handleSearchClick(){this.searchInput.value.trim()?await this.handleAddFilter():this.executeSearch()}addFilter(e,t){this.selectedFilters[e]||(this.selectedFilters[e]=[]),this.selectedFilters[e].includes(t)||(e==="query"||e==="resource_directory"?this.selectedFilters[e]=[t]:this.selectedFilters[e].push(t),this.renderFilters())}removeFilter(e,t){if(this.selectedFilters[e]){this.selectedFilters[e]=this.selectedFilters[e].filter(o=>o!==t),this.renderFilters();const s=Object.keys(this.selectedFilters).some(o=>this.selectedFilters[o]&&this.selectedFilters[o].length>0),i=this.searchInput.value.trim().length>0;(s||i)&&this.executeSearch()}}executeSearch(){const e=this.fuzzySearchService.buildQueryString(this.selectedFilters);console.log("Executing search with query:",e),this.hasSearched||(this.hasSearched=!0,this.hideSearchTips()),localStorage.setItem("lastSearchQuery",e),this.callbacks.onSearchExecuted(e)}renderFilters(){const e=Object.keys(this.selectedFilters).filter(s=>this.selectedFilters[s].length>0).map(s=>this.selectedFilters[s].map(i=>{const o=this.fuzzySearchService.getAttributeIcon(s);return`
            <div class="flex items-center rounded-sm px-1 py-1 ${this.fuzzySearchService.getAttributeColor(s)} cursor-pointer group filter-tag" data-attribute="${s}" data-value="${i}">
              <span class="mr-2 sm:mr-3 text-sm sm:text-base">${o}</span>
              <span title="${i}" class="text-xs font-semibold truncate max-w-[120px] sm:max-w-none">${i.length>20?i.slice(0,20)+"...":i}</span>
              <button class="ml-2 sm:ml-3 text-current opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-40 rounded-full p-1.5 transition-all duration-300 remove-filter-btn hover:scale-110 active:scale-90" data-attribute="${s}" data-value="${i}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          `}).join("")).flat().join("");this.filtersContainer.innerHTML=e,this.filtersContainer.children.length>0?this.filtersContainer.classList.remove("invisible"):this.filtersContainer.classList.add("invisible"),this.filtersContainer.querySelectorAll(".remove-filter-btn").forEach(s=>{s.addEventListener("click",i=>{i.stopPropagation();const o=s.getAttribute("data-attribute"),r=s.getAttribute("data-value");this.removeFilter(o,r)})}),(e.length===0||this.filtersContainer.children.length===0)&&this.executeSearch()}renderDropdown(){if(!this.showDropdown){this.hideDropdown();return}const e=this.dropdown.querySelector("#dropdown-content");if(this.suggestions.length>0){const t=this.suggestions.reduce((r,l)=>(r[l.attribute]||(r[l.attribute]=[]),r[l.attribute].push(l),r),{});let s="",i=0;Object.keys(t).forEach(r=>{const l=t[r],a=this.fuzzySearchService.getAttributeIcon(r),h=this.fuzzySearchService.getAttributeDisplayName(r);Object.keys(t).length>1&&(s+=`
            <div class="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600 bg-gray-50 border-b border-gray-100 flex items-center">
              <span class="mr-2 sm:mr-3">${a}</span>
              ${h}
            </div>
          `),l.forEach(c=>{const u=this.fuzzySearchService.getAttributeColor(c.attribute);s+=`
            <div class="suggestion-option flex items-center px-2 sm:px-3 py-1.5 cursor-pointer border-b border-gray-100 last:border-b-0 group hover:bg-blue-50 transition ${this.selectedIndex===i?"bg-blue-50 border-l-2 border-l-blue-500":""}" data-index="${i}">
              <div class="flex items-center justify-center w-7 sm:w-8 h-7 sm:h-8 rounded-lg mr-2 sm:mr-3 ${u}">
                <span class="text-xs sm:text-sm">${a}</span>
              </div>
              <div class="flex-grow min-w-0">
                <div class="font-medium text-gray-900 group-hover:text-blue-700 text-xs sm:text-sm truncate">
                  ${c.text}
                </div>
              </div>
              <div class="ml-2 flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m6-6H6"></path>
                </svg>
              </div>
            </div>
            `,i++})}),e.innerHTML=s,e.querySelectorAll(".suggestion-option").forEach((r,l)=>{r.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation(),console.log("Suggestion div clicked:",this.suggestions[l]),this.handleSuggestionClick(this.suggestions[l])}),r.addEventListener("mousedown",a=>{a.preventDefault()}),r.addEventListener("mouseenter",()=>{this.selectedIndex=l,this.updateDropdownSelection()})})}else{this.hideDropdown();return}this.dropdown.classList.remove("hidden")}updateDropdownSelection(){this.dropdown.querySelectorAll(".suggestion-option").forEach((t,s)=>{s===this.selectedIndex?t.classList.add("bg-blue-50","border-l-4","border-l-blue-500"):t.classList.remove("bg-blue-50","border-l-4","border-l-blue-500")})}hideDropdown(){this.showDropdown=!1,this.dropdown.classList.add("hidden")}clearAllFilters(){this.selectedFilters={},this.fuzzySearchService.getAvailableAttributes().forEach(e=>{this.selectedFilters[e]=[]}),this.renderFilters()}hideSearchTips(){this.searchTips&&(this.searchTips.style.display="none")}disableInputs(){console.log("Disabling inputs and showing loading state..."),this.searchInput.disabled=!0,this.searchInput.classList.add("opacity-50","cursor-not-allowed"),this.searchButton.disabled=!0,this.searchButton.classList.add("opacity-50","cursor-not-allowed");const e=this.searchButton.querySelector("#search-btn-text");e&&(e.textContent="Searching..."),this.hideDropdown(),this.filtersContainer.querySelectorAll(".remove-filter-btn").forEach(s=>{s.disabled=!0,s.classList.add("opacity-50","cursor-not-allowed")})}enableInputs(){this.searchInput.disabled=!1,this.searchInput.classList.remove("opacity-50","cursor-not-allowed"),this.searchButton.disabled=!1,this.searchButton.classList.remove("opacity-50","cursor-not-allowed");const e=this.searchButton.querySelector("#search-btn-text");e&&(e.textContent="Search"),this.filtersContainer.querySelectorAll(".remove-filter-btn").forEach(s=>{s.disabled=!1,s.classList.remove("opacity-50","cursor-not-allowed")})}}const T='<svg  xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"><path d="M440-160q-17 0-28.5-11.5T400-200v-240L168-736q-15-20-4.5-42t36.5-22h560q26 0 36.5 22t-4.5 42L560-440v240q0 17-11.5 28.5T520-160h-80Zm40-308 198-252H282l198 252Zm0 0Z"/></svg>',D={people:"People",cameraMakes:"Camera Makes",cameraModels:"Camera Models",places:"Places",tags:"Tags",years:"Years",months:"Months"},f={people:"person",cameraMakes:"make",cameraModels:"model",places:"place",tags:"tags",years:"year",months:"month"};class B{constructor(e,t){n(this,"sidebarElement");n(this,"filters",{});n(this,"queryToken",null);n(this,"filteredImages",[]);n(this,"onFilterChange");n(this,"toggleButtonId");n(this,"isInitialized",!1);n(this,"peoplePageSize",30);n(this,"peopleRendered",0);n(this,"peopleListElement");n(this,"peopleSentinel");n(this,"peopleObserver");this.sidebarElement=this.createSidebar(),this.onFilterChange=e,this.toggleButtonId=t,this.addToggleListener(),this.createPhotoFiltersUI()}async initialize(){await this.populateAllPhotoFilters(),this.renderFilters()}async setFilteredImages(e,t){if(!this.queryToken)return;const i=(await x(this.queryToken,e,t)).map(o=>({id:o.resource_hash,score:1,metadata:o}));this.filteredImages=i,this.onFilterChange(this.filteredImages),console.log("Filtered images:",this.filteredImages)}async updateQueryToken(e){console.log("Updating query token:",e),this.queryToken=e,this.enableToggleButton(),await this.initialize(),this.isInitialized=!0}enableToggleButton(){const e=document.getElementById(this.toggleButtonId);e&&(e.classList.remove("cursor-not-allowed"),e.classList.add("cursor-pointer"),e.removeAttribute("disabled"))}removeAllFilterPills(){const e=document.getElementById("filters-container");if(!e)return;const t=e.getElementsByClassName("filter-pill");for(;t.length>0;)t[0].remove()}clearFilters(){this.filteredImages=[],this.uncheckAllImages(),this.uncheckEveryCheckbox(),this.removeAllFilterPills(),this.onFilterChange(this.filteredImages)}addFilterPill(e,t){var c;const s=document.getElementById("filters-container");if(!s)return;s.classList.remove("invisible");const i=document.createElement("div");i.className="filter-pill flex items-center px-1 rounded-xl",i.style.transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",i.style.cursor="pointer",i.style.color="#1f2937",i.style.fontWeight="500",i.style.letterSpacing="0.025em",i.setAttribute("data-attribute",e),i.setAttribute("data-value",t);const o=document.createElement("span");o.className="mr-2 sm:mr-3 text-xs",o.innerHTML=T,(c=o.querySelector("svg"))==null||c.setAttribute("fill","#2563eb"),i.appendChild(o);const r=document.createElement("span");if(r.className="text-xs text-blue-800 font-semibold truncate",r.style.maxWidth="360px",r.style.textShadow="0 1px 2px rgba(0, 0, 0, 0.1)",r.style.lineHeight="1.4",e==="months"){t=t.replace(/^-/,"").replace(/-$/,"");const u=parseInt(t,10),b=new Date(0,u-1).toLocaleString("default",{month:"long"});r.textContent=`${b}`}else r.textContent=t;i.appendChild(r);const l=document.createElement("button");l.className="ml-3 sm:ml-4 opacity-80 hover:opacity-100 cursor-pointer text-blue-800 hover:bg-opacity-20 rounded-full p-2 transition-all duration-300 remove-filter-btn",l.style.display="flex",l.style.alignItems="center",l.style.justifyContent="center",l.style.minWidth="28px",l.style.minHeight="28px",l.style.backdropFilter="blur(5px)",l.setAttribute("data-attribute",e),l.setAttribute("data-value",t),l.addEventListener("click",u=>{u.stopPropagation(),this.clearFilters()});const a=document.createElementNS("http://www.w3.org/2000/svg","svg");a.setAttribute("class","w-4 h-4"),a.setAttribute("fill","none"),a.setAttribute("stroke","currentColor"),a.setAttribute("viewBox","0 0 24 24"),a.setAttribute("stroke-width","2.5"),a.style.filter="drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))";const h=document.createElementNS("http://www.w3.org/2000/svg","path");h.setAttribute("stroke-linecap","round"),h.setAttribute("stroke-linejoin","round"),h.setAttribute("d","M6 18L18 6M6 6l12 12"),a.appendChild(h),l.appendChild(a),i.appendChild(l),s==null||s.appendChild(i)}createDummyPhotoFilters(){this.filters={people:["Alice","Bob","Charlie"],cameraMakes:["Canon","Nikon","Sony"],cameraModels:["Model A","Model B","Model C"],places:["Beach","Mountain","City"],tags:["Sunset","Portrait","Landscape"]}}addToggleListener(){const e=document.getElementById("filter-sidebar-toggle-btn");e==null||e.addEventListener("click",async()=>{this.toggleSidebar(),this.isInitialized||(await this.initialize(),this.isInitialized=!0)})}createSidebar(){const e=document.getElementById("photo-filter-sidebar");return this.createSidebarStyles(e),e}createOverlay(){const e=document.createElement("div");return e.id="photo-filter-overlay",this.createOverlayStyles(e),e.addEventListener("click",()=>{this.closeSidebar()}),e}createOverlayStyles(e){e.style.position="fixed",e.style.top="0",e.style.left="0",e.style.width="100%",e.style.height="100%",e.style.backgroundColor="rgba(0, 0, 0, 0.0)",e.style.zIndex="999",e.style.display="none"}closeSidebar(){this.sidebarElement.style.display="none",this.sidebarElement.classList.add("hidden")}showSidebar(){this.sidebarElement.style.display="flex",this.sidebarElement.classList.remove("hidden")}toggleSidebar(){!this.sidebarElement.classList.contains("hidden")?this.closeSidebar():this.showSidebar()}createSidebarStyles(e){e.style.width="276px",e.style.height="100vh",e.style.overflowY="auto",e.style.flexDirection="column"}resetPeopleInfiniteScroll(){this.peopleRendered=0,this.peopleObserver&&(this.peopleObserver.disconnect(),this.peopleObserver=void 0),this.peopleListElement=void 0,this.peopleSentinel=void 0}createPersonItem(e){const t=document.createElement("div");t.className="flex flex-col cursor-pointer hover:bg-blue-50 rounded transition",t.style.margin="1px";const s=document.createElement("img");return s.className="w-12 h-12 bg-gray-200",s.src=`${p.GET_PERSON_IMAGE}/${e}`,s.alt=e,s.addEventListener("click",()=>{this.onImageClick(s,e)}),t.appendChild(s),t}renderNextPeopleBatch(){if(!this.peopleListElement)return;const e=this.filters.people||[];if(this.peopleRendered>=e.length)return;const t=document.createDocumentFragment(),s=Math.min(this.peopleRendered+this.peoplePageSize,e.length);console.log(`Rendering people ${this.peopleRendered} to ${s}`);for(let i=this.peopleRendered;i<s;i++)t.appendChild(this.createPersonItem(e[i]));this.peopleRendered=s,this.peopleSentinel&&this.peopleListElement.contains(this.peopleSentinel)?this.peopleListElement.insertBefore(t,this.peopleSentinel):this.peopleListElement.appendChild(t),this.peopleRendered>=e.length&&this.peopleSentinel&&(this.peopleSentinel.remove(),this.peopleSentinel=void 0,this.peopleObserver&&(this.peopleObserver.disconnect(),this.peopleObserver=void 0)),this.peopleListElement&&this.peopleSentinel&&this.peopleRendered<e.length&&this.peopleListElement.scrollHeight<=this.peopleListElement.clientHeight&&setTimeout(()=>this.renderNextPeopleBatch(),0)}setupPeopleInfiniteScroll(){!this.peopleListElement||!this.peopleSentinel||(this.peopleObserver=new IntersectionObserver(e=>{e[0].isIntersecting&&(console.log("Loading next batch of people..."),this.renderNextPeopleBatch())},{root:this.peopleListElement,rootMargin:"0px 0px 20px 0px",threshold:0}),this.peopleObserver.observe(this.peopleSentinel))}createPeopleFilterUI(){const e=this.filters.people||[],t=document.createElement("div");t.className="filter-container mb-4 shadow-sm p-4 rounded-lg";const s=document.createElement("h4");s.textContent="People",s.className="text-base font-semibold text-blue-700 mb-2 tracking-wide capitalize border-b border-blue-200 pb-0.5",t.appendChild(s),this.resetPeopleInfiniteScroll();const i=document.createElement("div");if(i.style.scrollbarWidth="none",i.style.scrollbarColor="#cbd5e1 transparent",i.className="flex flex-wrap overflow-y-auto",i.style.maxHeight="360px",i.style.display="flex",i.style.flexWrap="wrap",i.style.overflowY="auto",i.style.padding="2px",this.peopleListElement=i,e.length>this.peoplePageSize){const o=document.createElement("div");o.style.width="100%",o.style.height="1px",o.dataset.role="people-sentinel",this.peopleSentinel=o,i.appendChild(o)}return this.renderNextPeopleBatch(),this.peopleSentinel&&this.setupPeopleInfiniteScroll(),t.appendChild(i),t}async populateSinglePhotoFilter(e){const t=f[e];if(!t)return;const s=await w(this.queryToken,t);this.filters[e]=s.filter(i=>i)}async populateAllPhotoFilters(){const e=Object.keys(f);for(const t of e)await this.populateSinglePhotoFilter(t)}uncheckAllImages(){document.querySelectorAll("#photo-filters img").forEach(t=>{delete t.dataset.personId,t.parentElement.style.border="none",t.parentElement.style.borderRadius="0"})}onImageClick(e,t){const s=e.dataset.personId;if(this.uncheckAllImages(),this.removeAllFilterPills(),this.uncheckEveryCheckbox(),s===t){console.log(`Image is already selected: ${e.alt}`),this.filteredImages=[],this.onFilterChange(this.filteredImages);return}this.addFilterPill("person",t),e.parentElement.style.border="2px solid #2563eb",e.dataset.personId=t,this.setFilteredImages("person",t)}onCheckboxClick(e,t,s,i){if(this.uncheckEveryCheckbox(i),this.uncheckAllImages(),this.removeAllFilterPills(),!s){this.filteredImages=[],this.onFilterChange(this.filteredImages);return}this.addFilterPill(e,t),this.setFilteredImages(f[e],t)}uncheckEveryCheckbox(e){document.querySelectorAll('input[type="checkbox"]').forEach(s=>{s!==e&&(s.checked=!1,s.parentElement.classList.remove("bg-blue-100","font-semibold","text-blue-700"))})}createSingleFilterUI(e,t){if(e==="people")return this.createPeopleFilterUI();e==="years"&&t.sort((r,l)=>parseInt(l)-parseInt(r)),e==="months"&&t.sort((r,l)=>parseInt(l)-parseInt(r));const s=document.createElement("div");s.className="filter-container mb-4 shadow-sm rounded-2xl bg-white p-4";const i=document.createElement("h4");i.textContent=D[e],i.className="text-sm font-semibold text-blue-700 mb-1 tracking-wide capitalize border-b border-blue-200 pb-1",s.appendChild(i);const o=document.createElement("ul");return o.style.maxHeight="400px",o.style.overflowY="auto",o.style.scrollbarWidth="thin",o.style.scrollbarColor="#cbd5e1 transparent",o.className="space-y-0.5",t.forEach(r=>{const l=document.createElement("li"),a=document.createElement("label");a.className="flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded hover:bg-blue-50 transition";const h=document.createElement("input");if(h.type="checkbox",h.name=e,e==="months"?h.value=`-${r}-`:h.value=r,h.className="mr-1 accent-blue-600 w-3 h-3 rounded border-gray-300",h.addEventListener("change",c=>{h.checked?a.classList.add("bg-blue-100","font-semibold","text-blue-700"):a.classList.remove("bg-blue-100","font-semibold","text-blue-700");const u=c.target;if(e==="months"){this.onCheckboxClick(e,`-${r}-`,u.checked,h);return}this.onCheckboxClick(e,r,u.checked,h)}),a.appendChild(h),e==="months"){const c=parseInt(r),u=new Date(0,c-1).toLocaleString("default",{month:"long"});a.appendChild(document.createTextNode(`${u}`))}else a.appendChild(document.createTextNode(r));l.appendChild(a),o.appendChild(l)}),s.appendChild(o),s}createSidebarHeader(){const e=document.createElement("div");e.className="flex items-center justify-between p-4 border-b border-gray-200 bg-white",e.style.borderBottom="1px solid #e5e7eb";const t=document.createElement("h3");t.textContent="Filters",t.className="text-lg font-semibold text-gray-800";const s=document.createElement("button");return s.innerHTML="×",s.className="text-gray-500 hover:text-gray-700 text-2xl font-bold cursor-pointer bg-transparent border-none",s.style.fontSize="24px",s.style.lineHeight="1",s.style.padding="0",s.style.width="24px",s.style.height="24px",s.style.display="flex",s.style.alignItems="center",s.style.justifyContent="center",s.addEventListener("click",()=>{this.closeSidebar()}),e.appendChild(t),e.appendChild(s),e}createSidebarFooter(){const e=document.createElement("div");e.className="p-4 bg-white";const t=document.createElement("button");return t.textContent="Clear All Filters",t.className="w-full py-2 px-4 border bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium",t.style.cursor="pointer",t.style.border="none",t.addEventListener("click",()=>{this.clearAllFilters()}),e.appendChild(t),e}clearAllFilters(){this.uncheckAllImages(),this.uncheckEveryCheckbox(),this.removeAllFilterPills(),this.filteredImages=[],this.onFilterChange(this.filteredImages)}renderFilters(){const e=document.getElementById("photo-filters");if(!e)return;if(e.innerHTML="",!Object.values(this.filters).some(s=>s&&s.length>0)){const s=document.createElement("p");s.textContent="No filters available.",s.className="text-gray-500 italic",e.appendChild(s);return}for(const[s,i]of Object.entries(this.filters))if(i.length>0){const o=this.createSingleFilterUI(s,i);e.appendChild(o)}}createPhotoFiltersUI(){this.sidebarElement.innerHTML="";const e=document.createElement("div");e.id="photo-filters",e.className="p-4 space-y-6 flex-1 overflow-y-auto",e.style.scrollbarWidth="none",this.sidebarElement.appendChild(e),this.renderFilters();const t=this.createSidebarFooter();this.sidebarElement.appendChild(t)}}class q{constructor(){n(this,"searchService");n(this,"uiService");n(this,"fuzzySearchUI");n(this,"filteredPhotos",[]);n(this,"displayedPhotos",[]);n(this,"selectedPhoto",null);n(this,"currentPage",0);n(this,"totalPages",0);n(this,"totalResults",0);n(this,"queryToken","");n(this,"resultsPerPage",10);n(this,"paginationComponent");n(this,"paginationContainerElement",null);n(this,"filterContainer",null);n(this,"imageHeight",0);n(this,"imageWidth",0);n(this,"photoFilterSidebar",null);n(this,"preloadedData",{});n(this,"imagePreloadCache",new Map);this.cacheDOMElements(),I.initialize(),k.initialize("photo-grid-container",{loadingId:"loading-indicator",errorId:"error-display",noResultsId:"no-results-message",gridId:"photo-grid"});const e=document.getElementById("fuzzy-search-container");this.fuzzySearchUI=new A(e,{onSearchExecuted:t=>this.handleSearch(t)}),this.photoFilterSidebar=new B(t=>this.handleFilteredPhotosUpdate(t),"filter-sidebar-toggle-btn"),this.findGallerySize(),this.uiService=new E("photo-grid-container",this.imageHeight,this.imageWidth,this.resultsPerPage),this.searchService=new z,this.setupEventListeners(),this.init()}findGallerySize(){const e=window.innerHeight,t=window.innerWidth,s=document.getElementById("photo-gallery"),i=e-140;console.log(`Photo gallery height: ${i}px`);const o=(s==null?void 0:s.clientWidth)-264;let r=150;t<768&&(r=100),console.log(`Photo gallery width: ${o}px`),console.log(`Photo gallery height: ${i}px`);const{rows:l,cols:a,tileWidth:h,tileHeight:c}=S(i,o,r,9);this.resultsPerPage=l*a,this.imageHeight=c,this.imageWidth=h-1}cacheDOMElements(){this.paginationContainerElement=document.getElementById("pagination-container"),this.filterContainer=document.getElementById("photo-filter-container")}init(){console.log("ImageSearch app initialized"),this.setupPagination()}handleFilteredPhotosUpdate(e){if(console.log("Filtered photos updated:",e.length),this.currentPage=0,this.clearPreloadedCache(),e.length===0){this.filteredPhotos=[],this.updatePaginationComponent(this.totalResults,this.totalPages,0),this.updatePaginationAndRenderPhotos();return}this.filteredPhotos=[...e],this.displayedPhotos=[...e];const t=Math.ceil(this.filteredPhotos.length/this.resultsPerPage);this.updatePaginationComponent(this.filteredPhotos.length,t,0),this.updatePaginationAndRenderPhotos()}updatePaginationComponent(e,t,s){var i;(i=this.paginationComponent)==null||i.update({totalItems:e,itemsPerPage:this.resultsPerPage,initialPage:s,totalPages:t})}setupEventListeners(){this.uiService.setupEventListeners({onPhotoClick:e=>this.handlePhotoClick(e),onModalClose:()=>this.handleModalClose(),onModalNext:()=>this.handleModalNext(),onModalPrevious:()=>this.handleModalPrevious()})}async handleSearch(e){var t,s;this.clearPreloadedCache(),console.log("Starting search for:",e);try{this.currentPage=0;const i=await this.searchService.startSearch(e,this.resultsPerPage);this.totalPages=i.n_pages||1,this.totalResults=i.n_matches,this.queryToken=i.query_token,this.updatePaginationComponent(this.totalResults,this.totalPages,this.currentPage),(t=this.paginationContainerElement)==null||t.classList.remove("hidden"),this.filteredPhotos=[],await this.updatePaginationAndRenderPhotos(),(s=this.photoFilterSidebar)==null||s.updateQueryToken(this.queryToken),this.handleSearchDoneChange(!0)}catch(i){console.error("Search failed:",i),this.handleErrorChange(i instanceof Error?i.message:"Search failed. Please try again.")}}setupPagination(){if(console.log("Setting up pagination"),!this.paginationContainerElement){console.warn("Pagination container element is missing");return}this.paginationComponent=new F({container:this.paginationContainerElement,totalItems:this.totalResults,itemsPerPage:this.resultsPerPage,initialPage:this.currentPage,totalPages:this.totalPages,onPageChange:async e=>{this.currentPage=e,await this.updatePaginationAndRenderPhotos(),window.scrollTo({top:0})}}),this.paginationContainerElement.classList.add("hidden")}async updatePaginationAndRenderPhotos(e){console.log("Updating pagination and rendering photos for page:",this.currentPage),this.filteredPhotos.length?this.displayedPhotos=this.filteredPhotos.slice(this.currentPage*this.resultsPerPage,(this.currentPage+1)*this.resultsPerPage):this.preloadedData[this.currentPage]?this.displayedPhotos=this.preloadedData[this.currentPage]:(console.log(`Fetching search results for page ${this.currentPage} with token ${this.queryToken}`),this.displayedPhotos=await this.searchService.fetchSearchResults(this.queryToken,this.currentPage),this.preloadedData[this.currentPage]||(this.preloadedData[this.currentPage]=this.displayedPhotos)),console.log("Displayed photos updated:",this.displayedPhotos.length),this.toggleFilterContainer(this.displayedPhotos.length>0),this.renderDisplayedPhotos(),e!=null&&e.skipScroll||window.scrollTo({top:0}),"requestIdleCallback"in window?window.requestIdleCallback(()=>this.preloadData()):setTimeout(()=>this.preloadData(),1e3)}async preloadData(){const e=this.currentPage+1;e>=this.totalPages||(this.preloadedData[e]||(this.preloadedData[e]=await this.searchService.fetchSearchResults(this.queryToken,e)),await this.preloadImagesForPage(e))}async preloadImagesForPage(e){const t=this.preloadedData[e];t&&t.forEach(s=>{if(!this.imagePreloadCache.has(s.id)){const i=new Image;i.decoding="async",i.loading="eager",i.src=`${p.GET_PREVIEW_IMAGE}/${s.id}.webp`,this.imagePreloadCache.set(s.id,i)}})}clearPreloadedCache(){this.preloadedData={},this.imagePreloadCache.clear()}toggleFilterContainer(e){const t=document.getElementById("photo-filter-container");t&&t.classList.toggle("invisible",!e)}renderDisplayedPhotos(){this.uiService.updatePhotos([...this.displayedPhotos])}handleLoadingChange(e){console.log("Loading state changed:",e),this.uiService.updateLoading(e),e?this.fuzzySearchUI.disableInputs():this.fuzzySearchUI.enableInputs()}handleErrorChange(e){console.log("Error state changed:",e),this.uiService.updateError(e)}handleSearchDoneChange(e){this.displayedPhotos.length===0&&e&&this.uiService.showNoResults(!0)}handlePhotoClick(e){console.log("Photo clicked:",e);const t=this.displayedPhotos.findIndex(o=>o.id===e.id);if(t===-1)return;this.selectedPhoto=e;const s=t>0,i=t<this.displayedPhotos.length-1;this.uiService.showModal(e,s,i)}handleModalClose(){console.log("Modal closed"),this.selectedPhoto=null,this.uiService.hideModal()}async handleModalNext(){if(!this.selectedPhoto)return;const e=this.displayedPhotos.findIndex(t=>t.id===this.selectedPhoto.id);if(e!==-1){if(e<this.displayedPhotos.length-1){const t=this.displayedPhotos[e+1];this.selectedPhoto=t;const s=!0,i=(this.filteredPhotos.length?this.filteredPhotos.findIndex(o=>o.id===t.id)<this.filteredPhotos.length-1:e+1<this.displayedPhotos.length-1)||this.currentPage<this.totalPages-1;this.uiService.showModal(t,s,i);return}if(this.filteredPhotos.length){const t=this.filteredPhotos.findIndex(a=>a.id===this.selectedPhoto.id);if(t===-1)return;const s=t+1;if(s>=this.filteredPhotos.length)return;const i=Math.floor(s/this.resultsPerPage);if(i!==this.currentPage){this.currentPage=i,await this.updatePaginationAndRenderPhotos({skipScroll:!0});const a=Math.ceil(this.filteredPhotos.length/this.resultsPerPage);this.updatePaginationComponent(this.filteredPhotos.length,a,this.currentPage)}const o=this.displayedPhotos[s%this.resultsPerPage];this.selectedPhoto=o;const r=s>0,l=s<this.filteredPhotos.length-1;this.uiService.showModal(o,r,l)}else{if(this.currentPage>=this.totalPages-1)return;if(this.currentPage+=1,this.preloadedData[this.currentPage]?this.displayedPhotos=this.preloadedData[this.currentPage]:(this.displayedPhotos=await this.searchService.fetchSearchResults(this.queryToken,this.currentPage),this.preloadedData[this.currentPage]=this.displayedPhotos),this.updatePaginationComponent(this.totalResults,this.totalPages,this.currentPage),this.renderDisplayedPhotos(),"requestIdleCallback"in window?window.requestIdleCallback(()=>this.preloadData()):setTimeout(()=>this.preloadData(),1e3),this.displayedPhotos.length>0){const t=this.displayedPhotos[0];this.selectedPhoto=t;const s=this.currentPage!==0,i=this.displayedPhotos.length>1||this.currentPage<this.totalPages-1;this.uiService.showModal(t,s,i)}}}}async handleModalPrevious(){if(!this.selectedPhoto)return;const e=this.displayedPhotos.findIndex(t=>t.id===this.selectedPhoto.id);if(e!==-1){if(e>0){const t=this.displayedPhotos[e-1];this.selectedPhoto=t;const s=e-1>0||(this.filteredPhotos.length?this.filteredPhotos.findIndex(o=>o.id===t.id)>0:this.currentPage>0);this.uiService.showModal(t,s,!0);return}if(this.filteredPhotos.length){const t=this.filteredPhotos.findIndex(a=>a.id===this.selectedPhoto.id);if(t<=0)return;const s=t-1,i=Math.floor(s/this.resultsPerPage);if(i!==this.currentPage){this.currentPage=i,await this.updatePaginationAndRenderPhotos({skipScroll:!0});const a=Math.ceil(this.filteredPhotos.length/this.resultsPerPage);this.updatePaginationComponent(this.filteredPhotos.length,a,this.currentPage)}const o=this.displayedPhotos[s%this.resultsPerPage];this.selectedPhoto=o;const r=s>0,l=s<this.filteredPhotos.length-1;this.uiService.showModal(o,r,l)}else{if(this.currentPage<=0)return;if(this.currentPage-=1,this.preloadedData[this.currentPage]?this.displayedPhotos=this.preloadedData[this.currentPage]:(this.displayedPhotos=await this.searchService.fetchSearchResults(this.queryToken,this.currentPage),this.preloadedData[this.currentPage]=this.displayedPhotos),this.updatePaginationComponent(this.totalResults,this.totalPages,this.currentPage),this.renderDisplayedPhotos(),"requestIdleCallback"in window?window.requestIdleCallback(()=>this.preloadData()):setTimeout(()=>this.preloadData(),1e3),this.displayedPhotos.length>0){const t=this.displayedPhotos[this.displayedPhotos.length-1];this.selectedPhoto=t;const s=this.currentPage>0||this.displayedPhotos.length>1;this.uiService.showModal(t,s,!0)}}}}}new C({title:"Image Search - Hachi",currentPage:"/image-search.html",showNavbar:!0});document.addEventListener("DOMContentLoaded",()=>{console.log("DOM loaded, initializing ImageSearch app"),window.imageSearchApp=new q});
