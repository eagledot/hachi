var w=Object.defineProperty;var k=(g,e,t)=>e in g?w(g,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):g[e]=t;var h=(g,e,t)=>k(g,typeof e!="symbol"?e+"":e,t);import{h as M,b as u,e as x,a as C}from"./utils-BLLb_BoN.js";class b{constructor(e){h(this,"photos",[]);h(this,"queryToken",null);h(this,"filteredPhotos",[]);h(this,"filterCriteria",{});h(this,"filterOptions",{people:[],years:[],cameraMakes:[],cameraModels:[],places:[],tags:[]});h(this,"callbacks");h(this,"container",null);h(this,"eventListeners",new Map);h(this,"peopleCache",new Map);h(this,"imageObserver",null);h(this,"INITIAL_PEOPLE_LIMIT",50);h(this,"isInitialLoad",!0);h(this,"isInitializing",!1);this.callbacks=e}updateQueryToken(e){this.queryToken=e,this.filterCriteria={},this.filterOptions={people:[],years:[],cameraMakes:[],cameraModels:[],places:[],tags:[]},this.updateFilterUI()}initialize(e){const t=document.getElementById(e);if(!t)throw new Error(`Filter container with id '${e}' not found`);this.container=t,this.setupImageObserver(),this.render(),this.setupEventListeners(),console.log("Photo filter component initialized")}async resetFilters(){this.filterCriteria={},await this.applyFilters(),await this.updateFilterUI()}destroy(){this.eventListeners.forEach(e=>{e.forEach(t=>t())}),this.eventListeners.clear(),this.imageObserver&&(this.imageObserver.disconnect(),this.imageObserver=null)}setupImageObserver(){"IntersectionObserver"in window&&(this.imageObserver=new IntersectionObserver(e=>{e.forEach(t=>{var r;if(t.isIntersecting){const s=t.target;s.dataset.src&&(s.src=s.dataset.src,s.removeAttribute("data-src"),(r=this.imageObserver)==null||r.unobserve(s))}})},{rootMargin:"50px 0px",threshold:.1}))}addEventListenerTracked(e,t,r){e.addEventListener(t,r);const s=()=>e.removeEventListener(t,r);this.eventListeners.has(e)||this.eventListeners.set(e,[]),this.eventListeners.get(e).push(s)}static getTemplate(e="photo-filter"){return M`
      ${b.getStyles()}
      <!-- Photo Filter Component - Horizontal Filter Bar -->
      <div id="${e}" class="photo-filter-container sticky z-20">
        <!-- Horizontal Filter Tabs -->
        <div class="relative">
          <div
            class="flex items-center space-x-2 overflow-x-auto scrollbar-hide"
          >
            <!-- People Tab -->
            <div class="flex-shrink-0">
              <button
                class="filter-tab flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                data-filter="people"
                id="people-tab"
              >
                <span>👥 People</span>
                <span
                  id="people-count"
                  class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs min-w-[20px] text-center"
                  >0</span
                >
                <svg
                  class="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>
            </div>

            <!-- Years Tab -->
            <div class="flex-shrink-0">
              <button
                class="filter-tab flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                data-filter="years"
                id="years-tab"
              >
                <span>📅 Years</span>
                <span
                  id="years-count"
                  class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs min-w-[20px] text-center"
                  >0</span
                >
                <svg
                  class="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>
            </div>

            <!-- Tags Tab -->
            <div class="flex-shrink-0">
              <button
                class="filter-tab flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                data-filter="tags"
                id="tags-tab"
              >
                <span>🏷️ Tags</span>
                <span
                  id="tags-count"
                  class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs min-w-[20px] text-center"
                  >0</span
                >
                <svg
                  class="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>
            </div>

            <!-- Camera Makes Tab -->
            <div class="flex-shrink-0">
              <button
                class="filter-tab flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                data-filter="cameraMakes"
                id="cameraMakes-tab"
              >
                <span>📷 Camera</span>
                <span
                  id="cameraMakes-count"
                  class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs min-w-[20px] text-center"
                  >0</span
                >
                <svg
                  class="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>
            </div>

            <!-- Camera Models Tab -->
            <div class="flex-shrink-0">
              <button
                class="filter-tab flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                data-filter="cameraModels"
                id="cameraModels-tab"
              >
                <span>📸 Model</span>
                <span
                  id="cameraModels-count"
                  class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs min-w-[20px] text-center"
                  >0</span
                >
                <svg
                  class="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>
            </div>

            <!-- Places Tab -->
            <div class="flex-shrink-0">
              <button
                class="filter-tab flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                data-filter="places"
                id="places-tab"
              >
                <span>📍 Places</span>
                <span
                  id="places-count"
                  class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs min-w-[20px] text-center"
                  >0</span
                >
                <svg
                  class="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Dropdown containers positioned outside main container -->
        <div
          id="people-dropdown"
          class="filter-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden"
          style="min-width: 320px; max-width: 400px;"
        >
          <div class="p-3">
            <div class="max-h-64 overflow-y-auto">
              <!-- People content will be inserted here -->
            </div>
          </div>
        </div>

        <div
          id="years-dropdown"
          class="filter-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden"
          style="min-width: 200px; max-width: 300px;"
        >
          <div class="p-3">
            <div class="max-h-48 overflow-y-auto space-y-1">
              <!-- Years content will be inserted here -->
            </div>
          </div>
        </div>

        <div
          id="tags-dropdown"
          class="filter-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden"
          style="min-width: 200px; max-width: 300px;"
        >
          <div class="p-3">
            <div class="max-h-48 overflow-y-auto space-y-1">
              <!-- Tags content will be inserted here -->
            </div>
          </div>
        </div>

        <div
          id="cameraMakes-dropdown"
          class="filter-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden"
          style="min-width: 200px; max-width: 300px;"
        >
          <div class="p-3">
            <div class="max-h-48 overflow-y-auto space-y-1">
              <!-- Camera makes content will be inserted here -->
            </div>
          </div>
        </div>

        <div
          id="cameraModels-dropdown"
          class="filter-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden"
          style="min-width: 200px; max-width: 300px;"
        >
          <div class="p-3">
            <div class="max-h-48 overflow-y-auto space-y-1">
              <!-- Camera models content will be inserted here -->
            </div>
          </div>
        </div>

        <div
          id="places-dropdown"
          class="filter-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden"
          style="min-width: 200px; max-width: 300px;"
        >
          <div class="p-3">
            <div class="max-h-48 overflow-y-auto space-y-1">
              <!-- Places content will be inserted here -->
            </div>
          </div>
        </div>

        <!-- Active Filters - Simplified -->
        <div id="active-filters" class="pb-2 hidden">
          <div class="flex items-center justify-between">
            <div class="flex flex-wrap gap-1.5 flex-1">
              <!-- Active filter badges will be displayed here -->
            </div>
            <button
              class="clear-all-filters text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors ml-3 flex-shrink-0"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    `}static getStyles(){return`
      <style>
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Filter dropdown improvements */
        .filter-dropdown {
          backdrop-filter: blur(8px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        /* Filter bar positioning */
        .photo-filter-container {
          position: relative;
          z-index: 20;
        }
          /* Responsive improvements */
          @media (max-width: 768px) {
            .filter-tab {
              min-width: max-content;
              font-size: 0.875rem;
              padding: 0.5rem 0.75rem;
            }
            
            .filter-tab span:first-child {
              white-space: nowrap;
            }
            
            .filter-dropdown {
              position: fixed !important;
              left: 1rem !important;
              right: 1rem !important;
              width: auto !important;
              max-width: none !important;
              min-width: auto !important;
            }
            
            /* Adjust search input on mobile */
            #filter-search-text {
              font-size: 0.875rem;
              padding: 0.5rem 0.75rem 0.5rem 2.25rem;
            }
            
            #filter-search-text + svg {
              width: 1rem;
              height: 1rem;
              left: 0.5rem;
              top: 0.75rem;
            }
            
            /* Hide the "Press Enter" hint on mobile */
            #filter-search-text + svg + div {
              display: none !important;
            }
          }
          
          @media (max-width: 640px) {
            .photo-filter-container {
              margin-bottom: 1rem;
            }
            
            .filter-tab {
              padding: 0.375rem 0.625rem;
              font-size: 0.8125rem;
            }
          }
      </style>
    `}render(){this.container&&(this.container.innerHTML=b.getTemplate(this.container.id))}setupEventListeners(){if(!this.container)return;const e=this.container.querySelector("#reset-filters");e&&this.addEventListenerTracked(e,"click",()=>{this.resetFilters()}),this.container.querySelectorAll(".filter-tab").forEach(o=>{this.addEventListenerTracked(o,"click",l=>{l.preventDefault();const n=l.currentTarget.dataset.filter;n&&this.toggleFilterDropdown(n)})});const r=o=>{const l=o.target;!l.closest(".filter-tab")&&!l.closest(".filter-dropdown")&&this.closeAllDropdowns()};document.addEventListener("click",r);const s=o=>{o.key==="Escape"&&this.closeAllDropdowns()};document.addEventListener("keydown",s);const i=()=>{this.closeAllDropdowns()};window.addEventListener("resize",i),this.eventListeners.has(document)||this.eventListeners.set(document,[]),this.eventListeners.get(document).push(()=>{document.removeEventListener("click",r),document.removeEventListener("keydown",s),window.removeEventListener("resize",i)})}async toggleFilterDropdown(e){var l;console.log(`Toggling dropdown for filter: ${e}`);const t=document.querySelector(`#${e}-dropdown`),r=(l=this.container)==null?void 0:l.querySelector(`#${e}-tab`);if(!t||!r)return;if(this.closeAllDropdowns(e),t.classList.contains("hidden")){t.classList.remove("hidden");const a=t.style.visibility;t.style.visibility="hidden",this.positionDropdown(t,r),t.style.visibility=a||"",r.classList.add("bg-blue-50","border-blue-300","text-blue-700")}else t.classList.add("hidden"),r.classList.remove("bg-blue-50","border-blue-300","text-blue-700");const i={people:"person",years:"year",cameraMakes:"make",cameraModels:"model",places:"place",tags:"tags"};if(this.filterOptions[e].length===0){console.log("Filter options",this.filterOptions);const a=await u(this.queryToken,i[e]);this.filterOptions[e]=a}const o=this.filterOptions[e].filter(a=>a);this.updateFilterSection(e,e==="years"?o.map(String):o),this.updateTabLabel(e)}positionDropdown(e,t){const r=t.getBoundingClientRect(),s=window.innerWidth;let i=e.offsetWidth;if(i===0){const a=e.style.display,n=e.style.visibility;e.style.visibility="hidden",e.style.display="block",i=e.offsetWidth,e.style.display=a,e.style.visibility=n}if((!i||i===0)&&(i=300),s<=768){e.style.position="fixed",e.style.top=`${r.bottom+4}px`,e.style.left="1rem",e.style.right="1rem",e.style.width="auto",e.style.minWidth="auto",e.style.maxWidth="none";return}e.style.position="fixed",e.style.top=`${r.bottom+4}px`;const o=16;let l=r.left;l+i>s-o&&(l=r.right-i),l+i>s-o&&(l=s-i-o),l<o&&(l=o),e.style.left=`${Math.round(l)}px`,e.style.right="auto",e.style.width=""}closeAllDropdowns(e){var s;const t=document.querySelectorAll(".filter-dropdown"),r=(s=this.container)==null?void 0:s.querySelectorAll(".filter-tab");t.forEach(i=>{const o=i.id.replace("-dropdown","");e&&o===e||i.classList.add("hidden")}),r.forEach(i=>{const o=i.id.replace("-tab","");e&&o===e||i.classList.remove("bg-blue-50","border-blue-300","text-blue-700")})}updateTabLabel(e){var l;const t=(l=this.container)==null?void 0:l.querySelector(`#${e}-tab`);if(!t)return;const r=this.filterCriteria[e],s=t.querySelector("span:first-child");if(!s)return;const o={people:"👥 People",years:"📅 Years",tags:"🏷️ Tags",cameraMakes:"📷 Camera",cameraModels:"📸 Model",places:"📍 Places"}[e];if(r&&r.length>0){if(r.length===1){const a=r[0],n=typeof a=="string"?a.length>15?a.substring(0,15)+"...":a:a.toString();s.textContent=`${o}: ${n}`}else s.textContent=`${o}: ${r.length} selected`;t.classList.add("bg-blue-50","border-blue-400","text-blue-700")}else s.textContent=o,t.classList.remove("bg-blue-50","border-blue-400","text-blue-700")}initializeTabLabels(){["people","years","tags","cameraMakes","cameraModels","places"].forEach(e=>{this.updateTabLabel(e)})}async generateFilterOptions(){const e={people:[],years:[],cameraMakes:[],cameraModels:[],places:[],tags:[]};if(this.queryToken)try{console.log("Fetching filter options from server with token:",this.queryToken);const t=await u(this.queryToken,"person").catch(a=>(console.warn("Failed to fetch people options:",a),[])),r=await u(this.queryToken,"year").catch(a=>(console.warn("Failed to fetch years options:",a),[])),s=await u(this.queryToken,"make").catch(a=>(console.warn("Failed to fetch camera makes options:",a),[])),i=await u(this.queryToken,"model").catch(a=>(console.warn("Failed to fetch camera models options:",a),[])),o=await u(this.queryToken,"place").catch(a=>(console.warn("Failed to fetch places options:",a),[])),l=await u(this.queryToken,"tags").catch(a=>(console.warn("Failed to fetch tags options:",a),[]));t&&Array.isArray(t)&&(e.people=t.filter(a=>a&&a!=="no_person_detected"&&a!=="no_categorical_info")),r&&Array.isArray(r)&&(e.years=r.filter(a=>typeof a=="number"||!isNaN(parseInt(a))).map(a=>typeof a=="number"?a:parseInt(a))),s&&Array.isArray(s)&&(e.cameraMakes=s.filter(a=>a&&a.trim())),i&&Array.isArray(i)&&(e.cameraModels=i.filter(a=>a&&a.trim())),o&&Array.isArray(o)&&(e.places=o.filter(a=>a&&a.trim())),l&&Array.isArray(l)&&(e.tags=l.filter(a=>a&&a.trim())),console.log("Server filter options:",e)}catch(t){console.error("Error fetching filter options from server:",t)}e.people.sort(),e.years.sort((t,r)=>r-t),e.cameraMakes.sort(),e.cameraModels.sort(),e.places.sort(),e.tags.sort(),this.filterOptions=e,this.callbacks.onFilterOptionsUpdate&&this.callbacks.onFilterOptionsUpdate(e)}async updateFilterUI(){this.container&&(this.updateFilterSection("people",this.filterOptions.people),this.updateFilterSection("years",this.filterOptions.years.map(String)),this.updateFilterSection("cameraMakes",this.filterOptions.cameraMakes),this.updateFilterSection("cameraModels",this.filterOptions.cameraModels),this.updateFilterSection("places",this.filterOptions.places),this.updateFilterSection("tags",this.filterOptions.tags),this.updateActiveFilters(),this.initializeTabLabels())}updateFilterSection(e,t){var l;const r=document.querySelector(`#${e}-dropdown`),s=r==null?void 0:r.querySelector(".max-h-64, .max-h-48"),i=(l=this.container)==null?void 0:l.querySelector(`#${e}-count`);if(!s||!i)return;i.textContent=t.length.toString();const o=this.filterCriteria[e]||[];e==="people"?this.updatePeopleFilter(s,t,o):this.updateStandardFilter(s,e,t,o),this.updateTabLabel(e)}updatePeopleFilter(e,t,r){const s=t.filter(c=>c!=="no_person_detected"&&c!=="no_categorical_info"&&c!==""&&c);if(s.length===0){e.innerHTML=`
        <div class="py-4 text-xs text-gray-500 text-center italic">
          No people found
        </div>
      `;return}console.log("VALID PEOPLE",s);let i=e.querySelector(".people-grid");i||(i=document.createElement("div"),i.className="people-grid flex flex-wrap gap-2 py-2",e.innerHTML="",e.appendChild(i));const o=new Map;i.querySelectorAll(".person-filter-item").forEach(c=>{const d=c.dataset.personId;d&&o.set(d,c)}),o.forEach((c,d)=>{s.includes(d)||(c.remove(),this.peopleCache.delete(d))});const l=s.filter(c=>r.includes(c)),a=s.filter(c=>!r.includes(c)),n=[...l,...a.slice(0,Math.max(this.INITIAL_PEOPLE_LIMIT-l.length,16))],p=document.createDocumentFragment();n.forEach(c=>{let d=o.get(c)||this.peopleCache.get(c);d?i.contains(d)||p.appendChild(d):(d=this.createPersonElement(c),this.peopleCache.set(c,d),p.appendChild(d)),this.updatePersonElementState(d,r.includes(c))}),p.children.length>0&&i.appendChild(p),s.length>n.length&&this.addShowMoreButton(i,s,n,r)}addShowMoreButton(e,t,r,s){const i=e.querySelector(".show-more-people");i&&i.remove();const o=t.length-r.length,l=document.createElement("div");l.className="show-more-people w-full mt-2",l.innerHTML=`
      <button class="w-full py-2 px-3 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition-colors">
        +${o} more
      </button>
    `;const a=l.querySelector("button");this.addEventListenerTracked(a,"click",n=>{n.preventDefault(),n.stopPropagation();const d=t.filter(f=>!r.includes(f)).slice(0,50),y=document.createDocumentFragment();d.forEach(f=>{let m=this.peopleCache.get(f);m||(m=this.createPersonElement(f),this.peopleCache.set(f,m)),this.updatePersonElementState(m,s.includes(f)),y.appendChild(m)}),e.insertBefore(y,l),r.push(...d);const v=t.length-r.length;v>0?a.textContent=`+${v} more`:l.remove()}),e.appendChild(l)}createPersonElement(e){const t=e.charAt(0).toUpperCase()+e.slice(1).toLowerCase(),r=`${x.GET_PERSON_IMAGE}/${e}`,s=document.createElement("div");s.className="person-filter-item group cursor-pointer",s.dataset.personId=e,s.innerHTML=`
      <div class="relative">
        <img 
          ${this.imageObserver?`data-src="${r}"`:`src="${r}"`}
          alt="${t}"
          class="person-avatar w-14 h-14 object-cover transition-all duration-200 bg-gray-100"
          loading="lazy"
        />
        <div class="person-fallback w-14 h-14 bg-gray-200 border-gray-300 hidden items-center justify-center text-sm text-gray-500 font-medium">
          ${e.substring(0,2).toUpperCase()}
        </div>
      </div>
    `;const i=s.querySelector(".person-avatar"),o=s.querySelector(".person-fallback");return this.addEventListenerTracked(i,"error",()=>{i.style.display="none",o.style.display="flex"}),this.imageObserver&&i.dataset.src&&this.imageObserver.observe(i),this.addEventListenerTracked(s,"click",l=>{l.preventDefault(),l.stopPropagation(),this.handlePersonFilterToggle(e)}),s}updatePersonElementState(e,t){const r=e.querySelector(".person-avatar"),s=e.querySelector(".person-fallback");t?(r.className="person-avatar w-14 h-14 object-cover border-4 transition-all duration-200 border-blue-500 ring-2 ring-blue-200",s&&(s.className="person-fallback w-14 h-14 bg-gray-200 border-4 border-blue-500 ring-2 ring-blue-200 hidden items-center justify-center text-sm text-gray-500 font-medium")):(r.className="person-avatar w-14 h-14 object-cover transition-all duration-200 border-gray-300 group-hover:border-blue-400",s&&(s.className="person-fallback w-14 h-14 bg-gray-200 border-gray-300 hidden items-center justify-center text-sm text-gray-500 font-medium"))}updateStandardFilter(e,t,r,s){e.innerHTML=r.length>0?r.map(o=>{const l=s.includes(o);return`
        <label class="flex items-center space-x-2 py-1.5 px-2 hover:bg-gray-50 rounded cursor-pointer text-sm">
          <input 
            type="radio" 
            name="${t}-filter"
            value="${o}" 
            data-filter-type="${t}"
            ${l?"checked":""}
            class="filter-radio rounded-full border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <span class="text-gray-700 truncate flex-1">${o}</span>
        </label>
      `}).join(""):`
      <div class="py-4 text-sm text-gray-500 text-center italic">
        No ${t} found
      </div>
    `,e.querySelectorAll(".filter-radio").forEach(o=>{this.addEventListenerTracked(o,"change",l=>{this.handleFilterChange(l),setTimeout(()=>this.closeAllDropdowns(),100)})})}handlePersonFilterToggle(e){this.filterCriteria={},this.filterCriteria.people||(this.filterCriteria.people=[]);const t=this.filterCriteria.people,r=t.indexOf(e);r>-1?t.splice(r,1):this.filterCriteria.people=[e],this.filterCriteria.people.length===0&&delete this.filterCriteria.people,this.updateAllPersonElementsState(),this.applyFilters(),this.updateActiveFilters(),this.updateAllTabLabels(),setTimeout(()=>this.closeAllDropdowns(),100)}handleFilterChange(e){const t=e.target,r=t.dataset.filterType,s=t.value;if(r){if(this.filterCriteria={},t.checked)if(r==="years"){const i=parseInt(s);isNaN(i)||(this.filterCriteria.years=[i])}else this.filterCriteria[r]=[s];this.updateAllInputElementsState(),this.applyFilters(),this.updateActiveFilters(),this.updateAllTabLabels()}}updateAllPersonElementsState(){var t;((t=this.container)==null?void 0:t.querySelectorAll(".person-filter-item")).forEach(r=>{var i;const s=r.dataset.personId;if(s){const o=((i=this.filterCriteria.people)==null?void 0:i.includes(s))||!1;this.updatePersonElementState(r,o)}})}updateAllTabLabels(){["people","years","tags","cameraMakes","cameraModels","places"].forEach(e=>{this.updateTabLabel(e)})}updateAllInputElementsState(){var r,s;((r=this.container)==null?void 0:r.querySelectorAll('input[type="radio"]')).forEach(i=>{const o=i.dataset.filterType,l=i.value;if(o){const a=this.filterCriteria[o];if(Array.isArray(a))if(o==="years"){const n=parseInt(l),p=a;i.checked=!isNaN(n)&&p.includes(n)}else{const n=a;i.checked=n.includes(l)}else i.checked=!1}}),((s=this.container)==null?void 0:s.querySelectorAll('input[type="checkbox"]')).forEach(i=>{const o=i.dataset.filterType,l=i.value;if(o){const a=this.filterCriteria[o];if(Array.isArray(a))if(o==="years"){const n=parseInt(l),p=a;i.checked=!isNaN(n)&&p.includes(n)}else{const n=a;i.checked=n.includes(l)}else i.checked=!1}})}transformFilterRawData(e){return e.map(t=>({id:t.resource_hash,score:1,metadata:t}))}async applyFilters(){if(console.log("Applying filters..."),this.queryToken&&this.hasActiveFilters())try{console.log("Using server-side filtering with criteria:",this.filterCriteria);const{attribute:e,value:t}=this.getActiveFilterAttributeAndValue();if(e&&t){const r=await C(this.queryToken,e,t);this.filteredPhotos=this.transformFilterRawData(r),console.log("Server filter results:",this.filteredPhotos)}else console.warn("No valid filter attribute/value found"),this.filteredPhotos=[]}catch(e){console.error("Error applying server-side filters:",e),this.filteredPhotos=[]}else this.filteredPhotos=this.photos.filter(e=>this.matchesFilter(e,this.filterCriteria));this.callbacks.onFilterChange(this.filteredPhotos),this.updateActiveFilters()}getActiveFilterAttributeAndValue(){var e,t,r,s,i,o;return(e=this.filterCriteria.people)!=null&&e.length?{attribute:"person",value:this.filterCriteria.people[0]}:(t=this.filterCriteria.years)!=null&&t.length?{attribute:"year",value:this.filterCriteria.years[0].toString()}:(r=this.filterCriteria.cameraMakes)!=null&&r.length?{attribute:"cameraMake",value:this.filterCriteria.cameraMakes[0]}:(s=this.filterCriteria.cameraModels)!=null&&s.length?{attribute:"cameraModel",value:this.filterCriteria.cameraModels[0]}:(i=this.filterCriteria.places)!=null&&i.length?{attribute:"place",value:this.filterCriteria.places[0]}:(o=this.filterCriteria.tags)!=null&&o.length?{attribute:"tag",value:this.filterCriteria.tags[0]}:{attribute:null,value:null}}hasActiveFilters(){var e,t,r,s,i,o;return!!((e=this.filterCriteria.people)!=null&&e.length||(t=this.filterCriteria.years)!=null&&t.length||(r=this.filterCriteria.cameraMakes)!=null&&r.length||(s=this.filterCriteria.cameraModels)!=null&&s.length||(i=this.filterCriteria.places)!=null&&i.length||(o=this.filterCriteria.tags)!=null&&o.length)}matchesFilter(e,t){const r=e.metadata;if(!r)return Object.keys(t).length===0;if(t.resourceDirectory&&t.resourceDirectory.length>0){if(!r.resource_directory)return console.log("Photo missing resource_directory:",e.id),!1;const s=r.resource_directory.replace(/\//g,"\\").toLowerCase();if(!t.resourceDirectory.some(o=>{const l=o.replace(/\//g,"\\").toLowerCase();return s.includes(l)||l.includes(s)}))return console.log("Photo does not match resource directory filter:",e.id,s),!1}if(t.people&&t.people.length>0&&(!r.person||!Array.isArray(r.person)||!t.people.some(i=>r.person.includes(i))))return!1;if(t.years&&t.years.length>0){const s=o=>{if(!o)return null;let l=null;if(l=new Date(o),!isNaN(l.getTime()))return l.getFullYear();const a=/\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+(\d{4})/i,n=o.match(a);if(n){const d=parseInt(n[1]);if(!isNaN(d)&&d>1900&&d<3e3)return d}const p=/\b(19|20)\d{2}\b/,c=o.match(p);if(c){const d=parseInt(c[0]);if(!isNaN(d)&&d>1900&&d<3e3)return d}return null};let i=null;if(r.taken_at&&(i=s(r.taken_at)),!i&&r.modified_at&&(i=s(r.modified_at)),!i||!t.years.includes(i))return!1}if(t.cameraMakes&&t.cameraMakes.length>0&&(!r.make||!t.cameraMakes.includes(r.make))||t.cameraModels&&t.cameraModels.length>0&&(!r.model||!t.cameraModels.includes(r.model))||t.places&&t.places.length>0&&(!r.place||!t.places.includes(r.place)))return!1;if(t.tags&&t.tags.length>0){if(!r.tags)return!1;const s=Array.isArray(r.tags)?r.tags:[r.tags];if(!t.tags.some(o=>s.includes(o)))return!1}return!0}updateActiveFilters(){var r;const e=(r=this.container)==null?void 0:r.querySelector("#active-filters");if(!e)return;const t=[];if(Object.entries(this.filterCriteria).forEach(([s,i])=>{const o={people:"👥",years:"📅",cameraMakes:"📷",cameraModels:"📸",places:"📍",tags:"🏷️"},l={people:"bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",years:"bg-green-100 text-green-800 border-green-200 hover:bg-green-200",cameraMakes:"bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",cameraModels:"bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",places:"bg-red-100 text-red-800 border-red-200 hover:bg-red-200",tags:"bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200"};i.forEach(a=>{if(s==="people"){const n=`${x.GET_PERSON_IMAGE}/${a}`,p=a.length>15?a.substring(0,15)+"...":a;t.push(`
        <span class="inline-flex items-center px-1.5 py-1 rounded-md text-xs font-medium border transition-colors ${l[s]}">
          <img 
            src="${n}" 
            alt="${p}"
            class="w-5 h-5 rounded-full object-cover border border-purple-300 mr-1.5"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div class="w-5 h-5 rounded-full bg-purple-200 border border-purple-300 items-center justify-center text-xs text-purple-600 font-medium mr-1.5" style="display:none;">
            ${a.substring(0,2).toUpperCase()}
          </div>
          <span class="truncate max-w-[80px]" title="${a}">${p}</span>
          <button class="ml-1.5 p-0.5 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors active-filter-remove" data-type="${s}" data-value="${a}">
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </span>
          `)}else{const n=a.length>20?a.substring(0,20)+"...":a;t.push(`
        <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border transition-colors ${l[s]||"bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"}">
          <span class="mr-1">${o[s]}</span>
          ${n}
          <button class="ml-1.5 p-0.5 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors active-filter-remove" data-type="${s}" data-value="${a}">
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </span>
          `)}})}),t.length>0){e.innerHTML=`
        <div class="flex items-center justify-between">
          <div class="flex flex-wrap gap-1.5 flex-1">${t.join("")}</div>
          <button class="clear-all-filters text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors ml-3 flex-shrink-0">
            Clear All
          </button>
        </div>
      `,e.classList.remove("hidden"),e.querySelectorAll(".active-filter-remove").forEach(o=>{this.addEventListenerTracked(o,"click",l=>{l.stopPropagation();const n=l.target.closest(".active-filter-remove");if(n){const p=n.dataset.type,c=n.dataset.value;p&&c&&this.clearFilter(p,c)}})});const i=e.querySelector(".clear-all-filters");i&&this.addEventListenerTracked(i,"click",()=>{this.clearAllFilters().catch(o=>{console.error("Error clearing all filters:",o)})})}else e.innerHTML="",e.classList.add("hidden")}clearFilter(e,t){delete this.filterCriteria[e],this.updateAllInputElementsState(),this.updateAllPersonElementsState(),this.updateActiveFilters(),this.applyFilters(),this.updateAllTabLabels()}async clearAllFilters(){var r,s;this.filterCriteria={},((r=this.container)==null?void 0:r.querySelectorAll('input[type="radio"]')).forEach(i=>{i.checked=!1}),((s=this.container)==null?void 0:s.querySelectorAll('input[type="checkbox"]')).forEach(i=>{i.checked=!1}),this.updateAllPersonElementsState(),this.updateAllTabLabels(),this.closeAllDropdowns(),await this.updateFilterUI(),this.updateActiveFilters()}}export{b as P};
