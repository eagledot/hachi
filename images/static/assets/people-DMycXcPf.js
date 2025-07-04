var h=Object.defineProperty;var p=(i,e,t)=>e in i?h(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var a=(i,e,t)=>p(i,typeof e!="symbol"?e+"":e,t);import{C as m,L as u}from"./config-URX23xdb.js";/* empty css              */import{h as g}from"./utils-B3qE-N8V.js";const l=m.apiUrl;new u({title:"People - Hachi",currentPage:"/people.html",showNavbar:!0});class w{constructor(){a(this,"people",[]);a(this,"filteredPeople",[]);a(this,"currentPage",1);a(this,"itemsPerPage",100);a(this,"searchTerm","");this.setupEventListeners(),this.init()}init(){console.log("People page initialized"),this.loadPeople()}setupEventListeners(){const e=document.getElementById("people-search");if(e){let o;e.addEventListener("input",r=>{const n=r.target.value.toLowerCase();clearTimeout(o),o=setTimeout(()=>{this.setSearchTerm(n)},300)}),e.addEventListener("focus",()=>{e.classList.add("ring-2","ring-blue-500","border-blue-500")}),e.addEventListener("blur",()=>{e.classList.remove("ring-2","ring-blue-500","border-blue-500")})}const t=document.getElementById("load-more-btn");t&&(t.addEventListener("click",()=>{this.loadMorePeople()}),t.addEventListener("touchstart",()=>{t.classList.add("scale-95")}),t.addEventListener("touchend",()=>{t.classList.remove("scale-95")}));const s=document.getElementById("save-name-btn");s&&s.addEventListener("click",()=>this.savePersonName()),window.addEventListener("resize",()=>{this.handleResize()}),this.handleResize()}handleResize(){const e=window.innerWidth;e<640?this.itemsPerPage=50:e<1024?this.itemsPerPage=75:this.itemsPerPage=100,this.people.length>0&&this.renderPeople()}setSearchTerm(e){this.searchTerm=e,this.filterPeople();const t=document.getElementById("people-search");t&&t.value!==e&&(t.value=e)}async loadPeople(){this.showLoading(!0);try{console.log("Fetching people...");const e=await fetch(`${l}/getGroup/person`);if(!e.ok)throw new Error(`HTTP error! status: ${e.status}`);const t=await e.json();this.people=t.map(s=>({id:s})),this.filteredPeople=[...this.people],this.filterPeople()}catch(e){console.error("Error loading people:",e),this.showError("Failed to load people. Please try again.")}finally{this.showLoading(!1)}}filterPeople(){if(!this.searchTerm)this.filteredPeople=[...this.people];else{const e=this.searchTerm.toLowerCase();this.filteredPeople=this.people.filter(t=>{const s=t.id.toLowerCase().includes(e),o=t.name?t.name.toLowerCase().includes(e):!1;return s||o})}this.currentPage=1,this.sortPeopleByNamedFirst(),this.renderPeople(),this.showLoadMoreButton()}sortPeopleByNamedFirst(){this.filteredPeople.sort((e,t)=>{const s=e.id.toLowerCase().startsWith("cluster"),o=t.id.toLowerCase().startsWith("cluster"),r=!s,n=!o;return r&&!n?-1:!r&&n?1:r&&n||!r&&!n?e.id.localeCompare(t.id):0})}renderPeople(){const e=document.getElementById("people-grid"),t=document.getElementById("no-people");if(!e||!t)return;if(this.filteredPeople.length===0){e.innerHTML="",t.classList.remove("hidden"),this.updateSearchStats(0,0);return}t.classList.add("hidden");const s=this.searchTerm?this.filteredPeople:this.filteredPeople.slice(0,this.currentPage*this.itemsPerPage);this.updateSearchStats(s.length,this.filteredPeople.length),e.innerHTML=s.map(o=>{const r=o.id.toLowerCase().startsWith("cluster"),n=r?"Unnamed Person":o.id,c=`${l}/getPreviewPerson/${o.id}`,d=!r;return g`
        <div class="group bg-white rounded-lg shadow-sm sm:shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 hover:scale-[1.01] relative active:scale-95" 
             onclick="window.peopleApp.handlePersonClick('${o.id}')">
            <!-- Status badge -->
          <div class="absolute top-1 sm:top-2 right-1 sm:right-2 z-10">
            <span class="inline-flex items-center px-1.5 sm:px-2 py-0.5 text-xs font-medium ${d?"bg-green-100 text-green-800 border-green-200":"bg-amber-100 text-amber-800 border-amber-200"} rounded-md border">
              ${d?`
                <svg class="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="hidden sm:inline">${o.id}</span>
                <span class="sm:hidden">${o.id.length>8?o.id.substring(0,8)+"...":o.id}</span>
              `:`
                <span class="hidden sm:inline">Auto Detected</span>
                <span class="sm:hidden">Auto</span>
              `}
            </span>
          </div>

          <!-- Enhanced image container with overlay effects -->
          <div class="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
            <!-- Shimmer loading effect placeholder -->
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 opacity-20"></div>
            
            <img src="${c}" 
                 alt="${n}" 
                 class="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                 onerror="this.src='./assets/sample_place_bg.jpg'; this.classList.add('opacity-75')"
                 loading="lazy">
            
            <!-- Gradient overlay for better text readability -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <!-- Hover actions overlay -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div class="flex space-x-1 sm:space-x-2">
                <button class="p-1 sm:p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors duration-200 shadow-md" onclick="event.stopPropagation(); window.peopleApp.viewPersonDetails('${o.id}')">
                  <svg class="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>                </button>
                <button class="p-1 sm:p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors duration-200 shadow-md" onclick="event.stopPropagation(); window.peopleApp.editPersonName('${o.id}')">
                  <svg class="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Subtle border accent -->
          <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
        </div>
      `}).join(""),this.showLoadMoreButton()}loadMorePeople(){this.currentPage++,this.renderPeople(),this.showLoadMoreButton()}showLoadMoreButton(){const e=document.getElementById("load-more-container");e&&(this.searchTerm?e.classList.add("hidden"):this.filteredPeople.length>this.currentPage*this.itemsPerPage?e.classList.remove("hidden"):e.classList.add("hidden"))}handlePersonClick(e){window.location.href=`/person-photos.html?id=${encodeURIComponent(e)}`}async savePersonName(){const e=document.getElementById("person-name-input");if(!e||!e.personId)return;const t=e.personId,s=e.value.trim();if(!s){this.showError("Please enter a valid name");return}if(s===t){this.showError("New name is the same as the current name");return}const o=document.getElementById("save-name-btn"),r=(o==null?void 0:o.textContent)||"Save Name";o&&(o.textContent="Saving...",o.disabled=!0);try{await this.renamePersonGlobally(t,s)&&window.location.reload()}catch(n){console.error("Failed to save person name:",n),this.showError("Failed to save person name. Please try again.")}finally{o&&(o.textContent=r,o.disabled=!1)}}async renamePersonGlobally(e,t){const s=new FormData;s.append("old_person_id",e),s.append("new_person_id",t);try{const o=await fetch(`${l}/tagPerson`,{method:"POST",body:s});if(!o.ok){const n=await o.json().catch(()=>({reason:"Network error or invalid JSON response"}));throw new Error(n.reason||`Error ${o.status}: ${o.statusText}`)}const r=await o.json();if(r.success)return!0;throw new Error(r.reason||"Renaming person failed for an unknown reason.")}catch(o){const r=o instanceof Error?o.message:"An unknown error occurred";throw new Error(r)}}showLoading(e){const t=document.getElementById("loading-indicator");if(t)if(e){t.classList.remove("hidden");const s=t.querySelector("span");s&&(s.textContent=window.innerWidth<640?"Loading...":"Loading people...")}else t.classList.add("hidden")}showError(e){const t=document.getElementById("error-message"),s=document.getElementById("error-text");if(t&&s){const o=window.innerWidth<640&&e.length>50?e.substring(0,50)+"...":e;s.textContent=o,t.classList.remove("hidden"),setTimeout(()=>{t.classList.add("hidden")},5e3)}}updateSearchStats(e,t){const s=document.getElementById("current-count"),o=document.getElementById("total-count");s&&(s.textContent=e.toString()),o&&(o.textContent=t.toString())}viewPersonDetails(e){window.location.href=`/person-photos.html?id=${encodeURIComponent(e)}`}editPersonName(e){const t=this.people.find(o=>o.id===e),s=(t==null?void 0:t.name)||e;if(window.innerWidth<640){const o=prompt(`Edit name for person:

Current: ${s}

Enter new name:`,s);o&&o.trim()&&o.trim()!==s&&this.renamePersonGlobally(e,o.trim()).then(r=>{r&&(this.showSuccessMessage("Name updated successfully!"),setTimeout(()=>{window.location.reload()},1e3))}).catch(r=>{console.error("Failed to rename person:",r),this.showError("Failed to rename person. Please try again.")})}else{const o=prompt("Edit name for person:",s);o&&o.trim()&&o.trim()!==s&&this.renamePersonGlobally(e,o.trim()).then(r=>{r&&window.location.reload()}).catch(r=>{console.error("Failed to rename person:",r),this.showError("Failed to rename person. Please try again.")})}}showSuccessMessage(e){const t=document.createElement("div");t.className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 shadow-lg",t.innerHTML=`
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-green-800">${e}</p>
        </div>
      </div>
    `,document.body.appendChild(t),setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t)},3e3)}}const f=new w;window.peopleApp=f;console.log("People page initialized");
