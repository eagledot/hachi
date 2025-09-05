var P=Object.defineProperty;var w=(h,e,t)=>e in h?P(h,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):h[e]=t;var l=(h,e,t)=>w(h,typeof e!="symbol"?e+"":e,t);import{L as f,f as u,e as p,h as v,c as y}from"./utils-BSuwgFyC.js";/* empty css              */import{P as b}from"./pagination-DahQr-Bv.js";new f({title:"People - Hachi",currentPage:"/people.html",showNavbar:!0});class E{constructor(){l(this,"people",[]);l(this,"totalPages",0);l(this,"itemsPerPage",10);l(this,"currentPage",0);l(this,"paginationComponent",null);l(this,"imageHeight",0);l(this,"imageWidth",0);l(this,"imagePreloadCache",new Map);l(this,"paginationContainerElement",null);l(this,"editPersonName",e=>{var n;e.stopPropagation();const s=(n=e.target.closest(".person-card"))==null?void 0:n.dataset.personId;if(!s)return;this.people.find(a=>a.id===s);const i=s,r=window.innerWidth<640?`Edit name for person:

Current: ${i}

Enter new name:`:"Edit name for person:",o=prompt(r,i);o&&o.trim()&&o.trim()!==i&&this.renamePersonGlobally(s,o.trim()).then(a=>{a&&(window.innerWidth<640?(this.showSuccessMessage("Name updated successfully!"),setTimeout(()=>window.location.reload(),1e3)):window.location.reload())}).catch(a=>{console.error("Failed to rename person:",a),this.showError("Failed to rename person. Please try again.")})});l(this,"handlePersonClick",e=>{var i;e.stopPropagation();const s=(i=e.target.closest(".person-card"))==null?void 0:i.dataset.personId;s&&(new URLSearchParams(window.location.search).set("page",(this.currentPage+1).toString()),window.location.href=`/image-search.html?person=${s}`)});this.findGallarySize(),this.cacheDOMElements(),this.init()}findGallarySize(){const e=document.getElementById("people-grid"),t=e==null?void 0:e.clientHeight,s=e==null?void 0:e.clientWidth;let i=156;window.innerWidth<768&&(i=100);const{rows:r,cols:o,tileWidth:n,tileHeight:a}=y(t,s,i);this.itemsPerPage=r*o,this.imageHeight=a-4,this.imageWidth=n-4}cacheDOMElements(){this.paginationContainerElement=document.getElementById("pagination-container")}setupCurrentPageFromQueryParam(){const t=new URLSearchParams(window.location.search).get("page");t&&!isNaN(Number(t))&&(this.currentPage=Math.max(0,Number(t)-1))}async init(){this.setupCurrentPageFromQueryParam(),this.updatePageInUrl(),await this.loadPeople(),this.setupPagination(),this.renderPeople()}async loadPeople(){try{const e=await u(p.GET_PEOPLE);if(!e.ok)throw new Error(`HTTP error! status: ${e.status}`);const t=await e.json();this.people=t.map(s=>({id:s})),console.log(this.people),this.totalPages=Math.ceil(this.people.length/this.itemsPerPage)}catch(e){console.error("Error loading people:",e)}finally{}}updatePersonCard(e,t){const s=t.id.toLowerCase().startsWith("cluster"),i=t.id,r=`${p.GET_PERSON_IMAGE}/${t.id}`,o=!s,n=e.querySelector(".badge");if(o){n&&(n.style.visibility="visible");const c=e.querySelector(".avatar-name");c&&(c.textContent=i.length>8?i.substring(0,8)+"...":i);const m=e.querySelector(".avatar-name-mobile");m&&(m.textContent=i.length>8?i.substring(0,8)+"...":i)}else n&&(console.log("Hiding badge for person:",t.id),n.style.visibility="hidden");const a=e.querySelector(".person-edit-btn");a&&(console.log("Setting person ID for edit button:",t.id),a.dataset.personId=t.id);const d=e.querySelector(".person-details-btn");d&&(console.log("Setting person ID for details button:",t.id),d.dataset.personId=t.id),a&&(a.removeEventListener("click",this.editPersonName),a.addEventListener("click",this.editPersonName)),d&&(d.removeEventListener("click",this.handlePersonClick),d.addEventListener("click",this.handlePersonClick));const g=e.querySelector("img");g&&(g.src=r,g.alt=i)}renderPersonCard(e){const t=e.id.toLowerCase().startsWith("cluster"),s=e.id,i=`${p.GET_PERSON_IMAGE}/${e.id}`,r=!t;return v`
      <div
        style="height: ${this.imageHeight}px; width: ${this.imageWidth}px;"
        class="group duration-200 cursor-pointer relative active:scale-98"
      >
        <!-- Status badge -->
        <div
          style="${r?"visibility: visible;":"visibility: hidden;"}"
          class="badge hidden sm:block absolute top-1 sm:top-2 right-1 sm:right-2 z-10"
        >
          <span
            class="inline-flex items-center px-1.5 sm:px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 border border-green-200"
          >
            <svg
              class="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
            <span title="${e.id}" class="hidden avatar-name sm:block">${e.id.length>12?e.id.substring(0,12)+"...":e.id}</span>
            <span class="sm:hidden avatar-name-mobile"
              >${e.id.length>8?e.id.substring(0,8)+"...":e.id}</span
            >
          </span>
        </div>
        <div class="bg-gray-100 relative flex items-center justify-center">
          <img
            src="${i}"
            alt="${s}"
            style="height: ${this.imageHeight}px; width: ${this.imageWidth}px;"
            class="transition-transform rounded-md duration-200 group-hover:scale-105"
            onerror="this.src='./assets/sample_place_bg.jpg'; this.classList.add('opacity-75')"
            loading="lazy"
          />
          <div
            class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-60 transition-opacity duration-200 flex items-center justify-center"
          >
            <div class="flex space-x-2">
              <button
                data-person-id="${e.id}"
                class="p-1 person-details-btn bg-white/90 rounded-full hover:bg-white transition-colors duration-150 shadow"
              >
                <svg
                  class="w-4 h-4 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  ></path>
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  ></path>
                </svg>
              </button>
              <button
                class="p-1 person-edit-btn bg-white/90 rounded-full hover:bg-white transition-colors duration-150 shadow"
                data-person-id="${e.id}"
              >
                <svg
                  class="w-4 h-4 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `}ensureCardsInGrid(){const e=document.getElementById("people-cards");if(!e)return;const t=e.children,s=this.itemsPerPage;for(;t.length<s;){console.log("Adding more cards");const i=document.createElement("div");i.className="person-card",e.appendChild(i)}}showSuccessMessage(e){const t=document.createElement("div");t.className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 shadow-lg",t.innerHTML=`
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
    `,document.body.appendChild(t),setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t)},3e3)}showError(e){const t=document.getElementById("error-message"),s=document.getElementById("error-text");if(t&&s){const i=window.innerWidth<640&&e.length>50?e.substring(0,50)+"...":e;s.textContent=i,t.classList.remove("hidden"),setTimeout(()=>t.classList.add("hidden"),5e3)}}showLoading(e){const t=document.getElementById("loading-indicator");if(t)if(e){t.classList.remove("hidden");const s=t.querySelector("span");s&&(s.textContent=window.innerWidth<640?"Loading...":"Loading people...")}else t.classList.add("hidden")}async renamePersonGlobally(e,t){const s=new FormData;s.append("old_person_id",e),s.append("new_person_id",t);try{const i=await u(p.TAG_PERSON,{method:"POST",body:s});if(!i.ok){const o=await i.json().catch(()=>({reason:"Network error or invalid JSON response"}));throw new Error(o.reason||`Error ${i.status}: ${i.statusText}`)}const r=await i.json();if(r.success)return!0;throw new Error(r.reason||"Renaming person failed for an unknown reason.")}catch(i){const r=i instanceof Error?i.message:"An unknown error occurred";throw new Error(r)}}viewPersonDetails(e){window.location.href=`/person-photos.html?id=${encodeURIComponent(e)}`}async renderPeople(){const e=document.getElementById("people-cards"),t=document.getElementById("no-people");if(!e||!t)return;if(this.people.length===0){e.innerHTML="",t.classList.remove("hidden");return}t.classList.add("hidden");const s=this.currentPage*this.itemsPerPage,i=Math.min(s+this.itemsPerPage,this.people.length),r=this.people.slice(s,i);this.ensureCardsInGrid();for(let o=0;o<r.length;o++){const n=e.children[o];n.classList.add("person-card");const a=r[o];if(`${p.GET_PERSON_IMAGE}${a.id}`,n.style.visibility="visible",console.log("Preloading image for",o,a.id),n.dataset.personId)this.updatePersonCard(n,a);else{n.innerHTML=this.renderPersonCard(a),n.addEventListener("click",c=>this.handlePersonClick(c));const d=n.querySelector(".person-details-btn");d&&d.addEventListener("click",c=>this.handlePersonClick(c));const g=n.querySelector(".person-edit-btn");g&&g.addEventListener("click",c=>this.editPersonName(c))}n.dataset.personId=a.id}for(let o=r.length;o<e.children.length;o++){const n=e.children[o];n.style.visibility="hidden",delete n.dataset.personId}this.updatePageInUrl(),this.schedulePreloadAdjacent()}updatePageInUrl(){const e=new URL(window.location.href);e.searchParams.set("page",(this.currentPage+1).toString()),window.history.pushState({},"",e.toString())}preloadPage(e){if(e<0||e>=this.totalPages)return;const t=e*this.itemsPerPage;if(t>=this.people.length)return;const s=Math.min(t+this.itemsPerPage,this.people.length),i=this.people.slice(t,s);for(const r of i){const o=`${p.GET_PERSON_IMAGE}/${r.id}`;if(this.imagePreloadCache.has(r.id))continue;const n=new Image;n.decoding="async",n.loading="eager",n.src=o,this.imagePreloadCache.set(r.id,n)}}schedulePreloadAdjacent(){const e=this.currentPage+1,t=this.currentPage-1,s=()=>{this.preloadPage(e),this.preloadPage(t)};"requestIdleCallback"in window?window.requestIdleCallback(s,{timeout:120}):setTimeout(s,120)}setupPagination(){this.paginationContainerElement&&(this.paginationContainerElement.innerHTML="",this.paginationComponent=new b({container:this.paginationContainerElement,totalItems:this.people.length,itemsPerPage:this.itemsPerPage,initialPage:this.currentPage,onPageChange:e=>{this.currentPage=e,this.updatePageInUrl(),this.renderPeople(),window.scrollTo({top:0})}}))}}const C=new E;window.peopleApp=C;
