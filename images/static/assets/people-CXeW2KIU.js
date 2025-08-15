var d=Object.defineProperty;var c=(a,e,t)=>e in a?d(a,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):a[e]=t;var s=(a,e,t)=>c(a,typeof e!="symbol"?e+"":e,t);import{L as p,e as l}from"./config-Tz74n_gY.js";/* empty css              */import{h}from"./utils-cLygY5EC.js";import{P as g}from"./pagination-C2tzTPy9.js";new p({title:"People - Hachi",currentPage:"/people.html",showNavbar:!0});class m{constructor(){s(this,"people",[]);s(this,"filteredPeople",[]);s(this,"itemsPerPage",100);s(this,"currentPage",0);s(this,"paginationComponent");s(this,"paginationContainerElement",null);this.waitForDOMReady(()=>this.initializeApp())}waitForDOMReady(e){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",e):e()}initializeApp(){this.cacheDOMElements(),this.setupPaginationEventListeners(),this.init()}cacheDOMElements(){this.paginationContainerElement=document.getElementById("pagination-container")}init(){const t=new URLSearchParams(window.location.search).get("page");t&&!isNaN(Number(t))&&(this.currentPage=Math.max(0,Number(t)-1)),this.loadPeople()}async loadPeople(){this.showLoading(!0);try{console.log("Fetching people...");const e=await fetch(l.GET_PEOPLE);if(!e.ok)throw new Error(`HTTP error! status: ${e.status}`);const t=await e.json();this.people=t.map(o=>({id:o})),this.filteredPeople=[...this.people],this.filterPeople()}catch(e){console.error("Error loading people:",e),this.showError("Failed to load people. Please try again.")}finally{this.showLoading(!1)}}filterPeople(){this.setupPagination(),this.updatePageInUrl(),this.renderPeople(),this.restoreScrollPosition()}setupPaginationEventListeners(){}setupPagination(){this.paginationContainerElement&&(this.paginationContainerElement.innerHTML="",this.paginationComponent=new g({container:this.paginationContainerElement,totalItems:this.filteredPeople.length,itemsPerPage:this.itemsPerPage,initialPage:this.currentPage,onPageChange:e=>{this.currentPage=e,this.updatePageInUrl(),this.renderPeople(),window.scrollTo({top:0}),this.saveScrollPosition(0)}}))}async updatePaginationAndRender(){}renderPeople(){const e=document.getElementById("people-grid"),t=document.getElementById("no-people");if(!e||!t)return;if(this.filteredPeople.length===0){e.innerHTML="",t.classList.remove("hidden");return}t.classList.add("hidden");const o=this.currentPage*this.itemsPerPage,n=Math.min(o+this.itemsPerPage,this.filteredPeople.length),r=this.filteredPeople.slice(o,n);e.innerHTML=r.map(i=>this.renderPersonCard(i)).join(""),this.updatePageInUrl()}renderPersonCard(e){const t=e.id.toLowerCase().startsWith("cluster"),o=t?"Unnamed Person":e.id,n=`${l.GET_PERSON_IMAGE}/${e.id}`,r=!t;return h`
      <div
        class="group bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden relative active:scale-98"
        style="margin:8px;"
        onclick="window.peopleApp.handlePersonClick('${e.id}')"
      >
        <!-- Status badge -->
        ${r?`
        <div class="absolute top-1 sm:top-2 right-1 sm:right-2 z-10">
          <span
            class="inline-flex items-center px-1.5 sm:px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 border border-green-200"
          >
            <svg class="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="hidden sm:inline">${e.id}</span>
            <span class="sm:hidden">${e.id.length>8?e.id.substring(0,8)+"...":e.id}</span>
          </span>
        </div>
        `:""}
        <div
          class="aspect-square bg-gray-100 relative overflow-hidden flex items-center justify-center"
        >
          <img
            src="${n}"
            alt="${o}"
            class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 rounded-t-xl"
            onerror="this.src='./assets/sample_place_bg.jpg'; this.classList.add('opacity-75')"
            loading="lazy"
          />
          <div
            class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-60 transition-opacity duration-200 flex items-center justify-center"
          >
            <div class="flex space-x-2">
              <button
                class="p-1 bg-white/90 rounded-full hover:bg-white transition-colors duration-150 shadow"
                onclick="event.stopPropagation(); window.peopleApp.viewPersonDetails('${e.id}')"
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
                class="p-1 bg-white/90 rounded-full hover:bg-white transition-colors duration-150 shadow"
                onclick="event.stopPropagation(); window.peopleApp.editPersonName('${e.id}')"
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
    `}handlePersonClick(e){this.saveScrollPosition(window.scrollY),new URLSearchParams(window.location.search).set("page",(this.currentPage+1).toString()),window.location.href=`/person-photos.html?id=${encodeURIComponent(e)}`}updatePageInUrl(){const e=new URL(window.location.href);e.searchParams.set("page",(this.currentPage+1).toString()),window.history.pushState({},"",e.toString())}saveScrollPosition(e){try{sessionStorage.setItem("peoplePageScroll",String(e))}catch{console.error("Failed to save scroll position:",e)}}restoreScrollPosition(){try{const e=sessionStorage.getItem("peoplePageScroll");e&&setTimeout(()=>{window.scrollTo(0,parseInt(e,10)),sessionStorage.removeItem("peoplePageScroll")},0)}catch{console.error("Failed to restore scroll position")}}viewPersonDetails(e){window.location.href=`/person-photos.html?id=${encodeURIComponent(e)}`}editPersonName(e){const t=this.people.find(i=>i.id===e),o=(t==null?void 0:t.name)||e,n=window.innerWidth<640?`Edit name for person:

Current: ${o}

Enter new name:`:"Edit name for person:",r=prompt(n,o);r&&r.trim()&&r.trim()!==o&&this.renamePersonGlobally(e,r.trim()).then(i=>{i&&(window.innerWidth<640?(this.showSuccessMessage("Name updated successfully!"),setTimeout(()=>window.location.reload(),1e3)):window.location.reload())}).catch(i=>{console.error("Failed to rename person:",i),this.showError("Failed to rename person. Please try again.")})}async renamePersonGlobally(e,t){const o=new FormData;o.append("old_person_id",e),o.append("new_person_id",t);try{const n=await fetch(l.TAG_PERSON,{method:"POST",body:o});if(!n.ok){const i=await n.json().catch(()=>({reason:"Network error or invalid JSON response"}));throw new Error(i.reason||`Error ${n.status}: ${n.statusText}`)}const r=await n.json();if(r.success)return!0;throw new Error(r.reason||"Renaming person failed for an unknown reason.")}catch(n){const r=n instanceof Error?n.message:"An unknown error occurred";throw new Error(r)}}showLoading(e){const t=document.getElementById("loading-indicator");if(t)if(e){t.classList.remove("hidden");const o=t.querySelector("span");o&&(o.textContent=window.innerWidth<640?"Loading...":"Loading people...")}else t.classList.add("hidden")}showError(e){const t=document.getElementById("error-message"),o=document.getElementById("error-text");if(t&&o){const n=window.innerWidth<640&&e.length>50?e.substring(0,50)+"...":e;o.textContent=n,t.classList.remove("hidden"),setTimeout(()=>t.classList.add("hidden"),5e3)}}showSuccessMessage(e){const t=document.createElement("div");t.className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 shadow-lg",t.innerHTML=`
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
    `,document.body.appendChild(t),setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t)},3e3)}}const u=new m;window.peopleApp=u;console.log("People page initialized");
