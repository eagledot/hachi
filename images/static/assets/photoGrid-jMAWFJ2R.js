var k=Object.defineProperty;var E=(p,e,t)=>e in p?k(p,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):p[e]=t;var r=(p,e,t)=>E(p,typeof e!="symbol"?e+"":e,t);import{C as L,e as y,h as w}from"./utils-BLLb_BoN.js";L.apiUrl;const b=class b{constructor(e,t,o,a){r(this,"container");r(this,"loadingIndicator");r(this,"errorDisplay");r(this,"photoGrid");r(this,"noResultsMessage");r(this,"modal");r(this,"modalImage");r(this,"modalMetadata");r(this,"modalPrevBtn");r(this,"modalNextBtn");r(this,"modalCloseBtn");r(this,"modalFullscreenBtn");r(this,"modalLikeBtn");r(this,"modalFacesBtn");r(this,"modalTitleEl");r(this,"currentFullImageLoader",null);r(this,"showScores",!1);r(this,"photoElementPool",[]);r(this,"maxPoolSize",100);r(this,"currentPhotoClick",null);r(this,"imageHeight");r(this,"imageWidth");r(this,"eventCleanupFunctions",[]);r(this,"globalKeydownHandler");this.imageHeight=t,this.imageWidth=o||0;const n=document.getElementById(e);if(!n)throw new Error(`Container with id '${e}' not found`);this.container=n,this.initializeElements(),this.injectResponsivePhotoStyles(),a&&(this.maxPoolSize=a,this.ensureElementPool(a),this.ensureElementsInDOM(a))}initializeElements(){if(this.loadingIndicator=this.container.querySelector("#loading-indicator"),this.errorDisplay=this.container.querySelector("#error-display"),this.photoGrid=this.container.querySelector("#photo-grid"),this.noResultsMessage=this.container.querySelector("#no-results-message"),this.modal=document.querySelector("#image-modal"),this.modalImage=document.querySelector("#modal-image"),this.modalMetadata=document.querySelector("#modal-metadata"),this.modalPrevBtn=document.querySelector("#modal-prev-btn"),this.modalNextBtn=document.querySelector("#modal-next-btn"),this.modalCloseBtn=document.querySelector("#modal-close-btn"),this.modalFullscreenBtn=document.querySelector("#modal-fullscreen-btn"),this.modalLikeBtn=document.querySelector("#modal-like-btn"),this.modalFacesBtn=document.querySelector("#modal-faces-btn"),this.modalTitleEl=document.querySelector("#modal-title"),!this.photoGrid)throw new Error("Required UI elements not found")}setupEventListeners(e){if(this.cleanupEventListeners(),this.currentPhotoClick=e.onPhotoClick,this.modalCloseBtn){const t=()=>e.onModalClose();this.modalCloseBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var o;return(o=this.modalCloseBtn)==null?void 0:o.removeEventListener("click",t)})}if(this.modalNextBtn){const t=()=>e.onModalNext();this.modalNextBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var o;return(o=this.modalNextBtn)==null?void 0:o.removeEventListener("click",t)})}if(this.modalPrevBtn){const t=()=>e.onModalPrevious();this.modalPrevBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var o;return(o=this.modalPrevBtn)==null?void 0:o.removeEventListener("click",t)})}if(this.modalFullscreenBtn){const t=this.handleToggleFullScreen.bind(this);this.modalFullscreenBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var o;return(o=this.modalFullscreenBtn)==null?void 0:o.removeEventListener("click",t)})}if(this.modalLikeBtn){const t=this.handleLike.bind(this);this.modalLikeBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var o;return(o=this.modalLikeBtn)==null?void 0:o.removeEventListener("click",t)})}if(this.modalFacesBtn){const t=this.handleShowFaces.bind(this);this.modalFacesBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var o;return(o=this.modalFacesBtn)==null?void 0:o.removeEventListener("click",t)})}if(this.modal){const t=o=>{o.target===this.modal&&e.onModalClose()};this.modal.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var o;return(o=this.modal)==null?void 0:o.removeEventListener("click",t)})}this.globalKeydownHandler=t=>{if(!(!this.modal||this.modal.classList.contains("hidden")))switch(t.key){case"Escape":e.onModalClose();break;case"ArrowLeft":e.onModalPrevious();break;case"ArrowRight":e.onModalNext();break}},document.addEventListener("keydown",this.globalKeydownHandler)}cleanupEventListeners(){this.eventCleanupFunctions.forEach(e=>e()),this.eventCleanupFunctions=[],this.globalKeydownHandler&&(document.removeEventListener("keydown",this.globalKeydownHandler),this.globalKeydownHandler=void 0)}destroy(){this.cleanupEventListeners(),this.photoElementPool=[],this.currentPhotoClick=null,this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null)}updateLoading(e){this.loadingIndicator&&(e?this.loadingIndicator.classList.remove("hidden"):this.loadingIndicator.classList.add("hidden"))}updateError(e){this.errorDisplay&&(e?(this.errorDisplay.textContent=`Error: ${e}`,this.errorDisplay.classList.remove("hidden")):this.errorDisplay.classList.add("hidden"))}updatePhotos(e){if(!(!this.photoGrid||!this.noResultsMessage)){if(console.log("Updating photos in UIService:",e.length),e.length===0){this.clearPhotoGrid(),this.noResultsMessage.classList.remove("hidden");return}this.noResultsMessage.classList.add("hidden"),this.updatePhotoGridForPagination(e)}}clearPhotoGrid(){this.photoElementPool.forEach(e=>{e.style.visibility="hidden"})}updatePhotoGridForPagination(e){console.log("Updating photo grid for pagination:",e.length),e.forEach((t,o)=>{const a=this.photoElementPool[o];this.updateElementWithPhotoData(a,t)});for(let t=e.length;t<this.photoElementPool.length;t++)this.photoElementPool[t].style.visibility="hidden"}ensureElementPool(e){console.log("Ensuring element pool size:",e);const t=e;for(let o=0;o<t;o++){const a=this.createEmptyPhotoElement();this.photoElementPool.push(a)}console.log("Element pool size after ensuring:",this.photoElementPool.length)}ensureElementsInDOM(e){console.log("Ensuring elements in DOM:",e,this.photoElementPool.length);const t=document.createDocumentFragment();let o=!1;for(let a=0;a<e&&a<this.photoElementPool.length;a++){const n=this.photoElementPool[a];n.parentNode||(t.appendChild(n),o=!0)}o&&this.photoGrid.appendChild(t)}formatDateForDisplay(e){try{if(e.includes(":")&&e.includes(" ")){const[t]=e.split(" "),o=t.replace(/:/g,"-"),a=new Date(o);if(isNaN(a.getTime()))return e;const n={year:"numeric",month:"short",day:"numeric"};return a.toLocaleDateString(void 0,n)}else if(e.includes("-")){const t=new Date(e);if(isNaN(t.getTime()))return e;const o={year:"numeric",month:"short",day:"numeric"};return t.toLocaleDateString(void 0,o)}return e}catch(t){return console.error("Error formatting date:",t),e}}createEmptyPhotoElement(){const e=document.createElement("div");e.className="group relative bg-gray-100 overflow-hidden cursor-pointer";const t=document.createElement("div");t.className="mobile-photo-height w-full overflow-hidden";const o=document.createElement("img");o.className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200",o.loading="lazy",o.onerror=()=>{o.src=b.FALLBACK_IMAGE_SVG,o.alt="Image not found"};const a=document.createElement("div");a.className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100";const n=document.createElement("div");n.className="text-white bg-black/50 rounded-full p-2",n.innerHTML=b.VIEW_ICON_SVG,a.appendChild(n);const c=document.createElement("div");return c.className="absolute left-0 right-0 bottom-0 px-2 py-1 bg-black/40 backdrop-blur-sm text-xs text-gray-100 truncate",c.setAttribute("data-photo-caption","true"),c.style.pointerEvents="none",t.appendChild(o),t.appendChild(a),t.appendChild(c),e.appendChild(t),e.style.visibility="hidden",e}updateElementWithPhotoData(e,t){var c,l,s,m;const o=e.querySelector("img");if(!o)return;o.src=`${y.GET_PREVIEW_IMAGE}/${t.id}.webp`,o.alt=((c=t.metadata)==null?void 0:c.filename)||"",e.setAttribute("data-photo-id",t.id);const a=e.querySelector('[data-photo-caption="true"]');if(a){const d=this.formatDateForDisplay(((l=t.metadata)==null?void 0:l.taken_at)||((s=t.metadata)==null?void 0:s.resource_created))||((m=t.metadata)==null?void 0:m.filename)||"",i=e.clientWidth,u=Math.floor(i/8),h=d.length>u?d.substring(0,u)+"...":d;a.textContent=h,a.title=d}const n=e.querySelector(".score-badge");if(n&&n.remove(),this.showScores&&t.score!==void 0&&t.score!==null){const d=document.createElement("div");d.className="score-badge absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow z-10",d.textContent=Number(t.score).toFixed(3),e.appendChild(d)}e.onclick=null,this.currentPhotoClick&&(e.onclick=d=>{d.preventDefault(),d.stopPropagation(),this.currentPhotoClick(t)}),e.style.visibility="visible"}showModal(e,t,o){var a;if(!this.modal){console.error("Modal element not found");return}if(!this.modalImage){console.error("Modal image element not found");return}console.log("Showing modal for photo:",e.metadata),this.modal.classList.contains("hidden")&&this.modal.classList.remove("hidden"),this.loadImageProgressively(e),this.modalImage.alt=((a=e.metadata)==null?void 0:a.filename)||"Image",this.updateModalMetadata(e),this.updateModalNavigation(t,o),this.updateModalTitle(e),document.body.style.overflow="hidden"}loadImageProgressively(e){if(!this.modalImage)return;this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null);const t=`${y.GET_PREVIEW_IMAGE}/${e.id}.webp`,o=`${y.GET_IMAGE}/${e.id}`;this.modalImage.src=t,this.currentFullImageLoader=new Image,this.currentFullImageLoader.decoding="async",this.currentFullImageLoader.loading="eager",this.currentFullImageLoader.src=o,this.currentFullImageLoader.onload=()=>{this.currentFullImageLoader&&this.modalImage&&(this.modalImage.src=o),this.currentFullImageLoader=null},this.currentFullImageLoader.onerror=()=>{console.error("Failed to load full resolution image:",o),this.currentFullImageLoader&&(this.currentFullImageLoader=null)}}hideModal(){if(!this.modal){console.error("Modal element not found for hiding");return}this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null),this.modal.classList.add("hidden"),document.body.style.overflow="auto"}updateModalNavigation(e,t){!this.modalPrevBtn||!this.modalNextBtn||(this.modalPrevBtn.disabled=!e,this.modalNextBtn.disabled=!t,e?this.modalPrevBtn.classList.remove("opacity-50","cursor-not-allowed"):this.modalPrevBtn.classList.add("opacity-50","cursor-not-allowed"),t?this.modalNextBtn.classList.remove("opacity-50","cursor-not-allowed"):this.modalNextBtn.classList.add("opacity-50","cursor-not-allowed"))}updateModalMetadata(e){var c;if(!this.modalMetadata)return;const t=e.metadata;if(!t){this.modalMetadata.innerHTML='<p class="text-gray-500">No metadata available</p>';return}const o=[{label:"Dimensions",value:t.width&&t.height?`${t.width} × ${t.height}`:null},{label:"Path",value:t.resource_path}].filter(l=>l.value&&l.value.toString().trim()!=="");for(const[l,s]of Object.entries(t))if(s&&s.toString().trim()!==""){const m=l.charAt(0).toUpperCase()+l.slice(1).replace(/_/g," ");o.push({label:m,value:s})}const a=document.createDocumentFragment();if(t.person&&t.person.length>0&&!t.person.every(l=>l==="no_person_detected"||l==="no_categorical_info"||l==="")){const l=document.createElement("div");l.className="py-1 border-b border-gray-800";const s=document.createElement("span");s.className="font-semibold text-gray-100",s.textContent="People:";const m=document.createElement("div");m.className="flex flex-wrap gap-4 mt-2",m.setAttribute("data-people-container","true");const d=((c=t.person)==null?void 0:c.filter(i=>i.trim()!==""))||[];if(d.length===0){const i=document.createElement("span");i.className="text-gray-500 text-sm",i.textContent="No people detected.",m.appendChild(i)}else d.forEach(i=>{const u=document.createElement("div");u.className="flex flex-col items-center w-24 group";const h=document.createElement("img");h.src=`${y.GET_PERSON_IMAGE}/${i}`,h.alt=i,h.className="w-24 h-24 object-cover border-2 border-gray-300 shadow-sm cursor-pointer group-hover:border-blue-500 group-hover:scale-105 transition-all duration-200 bg-gray-200",h.title=`Click to view ${i}'s photos`,h.setAttribute("data-person-id",i),h.onerror=()=>{h.src=b.FALLBACK_IMAGE_SVG,h.classList.add("bg-gray-100")},h.addEventListener("click",()=>this.handlePersonAvatarClick(i));const v=document.createElement("span");v.className="mt-1 text-xs text-gray-200 text-center truncate max-w-full",v.textContent=i.length>16&&/^[a-f0-9]+$/i.test(i)?i.slice(0,8)+"...":i,v.title=i,u.appendChild(h),u.appendChild(v),m.appendChild(u)});l.appendChild(s),l.appendChild(m),a.appendChild(l)}o.forEach(l=>{const s=document.createElement("div");s.className="grid grid-cols-3 gap-2 py-1 border-b border-gray-800 last:border-b-0";const m=document.createElement("span");m.className="font-semibold col-span-1 text-gray-100",m.textContent=`${l.label}:`,s.appendChild(m);const d=typeof l.value=="string"?l.value:String(l.value);if(d.length>=20){const i=document.createElement("div");i.className="col-span-2 flex gap-2";const u=document.createElement("span");u.className="text-gray-200 flex-1 min-w-0";const h=20,v=d.length>h?d.substring(0,h)+"...":d;u.textContent=v,u.title=d;const g=document.createElement("button");g.className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded transition-colors",g.innerHTML="📋",g.title="Copy full path",g.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(d),g.innerHTML="✅",setTimeout(()=>{g.innerHTML="📋"},1e3)}catch{const f=document.createElement("textarea");f.value=d,document.body.appendChild(f),f.select(),document.execCommand("copy"),document.body.removeChild(f),g.innerHTML="✅",setTimeout(()=>{g.innerHTML="📋"},1e3)}}),i.appendChild(u),i.appendChild(g),s.appendChild(i)}else{const i=document.createElement("span");i.className="col-span-2 text-gray-200",i.textContent=d,s.appendChild(i)}a.appendChild(s)}),this.modalMetadata.innerHTML="",this.modalMetadata.appendChild(a)}updateModalTitle(e){var t;this.modalTitleEl&&(this.modalTitleEl.textContent=((t=e.metadata)==null?void 0:t.filename)||"Image")}showNoResults(e){this.noResultsMessage&&(e?this.noResultsMessage.classList.remove("hidden"):this.noResultsMessage.classList.add("hidden"))}handleToggleFullScreen(){this.modalImage&&(document.fullscreenElement?document.exitFullscreen():this.modalImage.requestFullscreen().catch(e=>{console.error(`Error attempting to enable full-screen mode: ${e.message} (${e.name})`),alert("Could not enter fullscreen. Your browser might not support it or it's disabled.")}))}handleLike(){alert('Feature "Like" is a placeholder.')}handleShowFaces(){alert('Feature "Show Faces" is a placeholder.')}handlePersonAvatarClick(e){try{this.hideModal();const t=window.location.pathname,o=`/image-search.html?person=${encodeURIComponent(e)}`;t.includes("person-photos.html")?window.location.assign(o):window.location.href=o}catch(t){console.error("Error navigating to person page:",t),alert(`Failed to navigate to person page: ${e}`)}}injectResponsivePhotoStyles(){if(document.getElementById("responsive-photo-styles"))return;const e=document.createElement("style");e.id="responsive-photo-styles",e.textContent=`
      .mobile-photo-height {
        height: ${this.imageHeight?this.imageHeight:140}px !important;
        width: ${this.imageWidth?this.imageWidth:240}px !important;
      }
    `,document.head.appendChild(e)}};r(b,"FALLBACK_IMAGE_SVG","data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvcnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4="),r(b,"VIEW_ICON_SVG",'<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>');let x=b;class P{static getTemplate(){return w`
      <!-- Image Modal (reusable component) -->
      <div
      id="image-modal"
      class="hidden fixed inset-0 z-50 overflow-y-auto  fade-in duration-300"
      >
      <div class="modal-backdrop fixed inset-0" id="modal-backdrop"></div>
      <div class="flex h-screen items-center justify-center">
  <div
  class="relative bg-black w-full h-full overflow-hidden"
  >
        <!-- Modal header overlay (buttons over image, filename removed) -->
        <div class="modal-header-overlay">
          <div class="flex items-center gap-1 ml-auto">
            <button
              id="modal-prev-btn"
              class="modal-icon-btn"
              disabled
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <button
              id="modal-next-btn"
              class="modal-icon-btn"
              disabled
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
            <button
              id="modal-info-btn"
              class="modal-icon-btn"
              title="Show Info"
              aria-label="Show info overlay"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            </button>
            <button
              id="modal-fullscreen-btn"
              class="modal-icon-btn"
              title="Fullscreen View"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
              </svg>
            </button>
            <button
              id="modal-like-btn"
              class="modal-icon-btn"
              title="Like"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
            </button>
            <button
              id="modal-faces-btn"
              class="modal-icon-btn"
              title="Show Faces"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </button>
            <button
              id="modal-close-btn"
              class="modal-icon-btn"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        <!-- Modal content -->
        <div class="flex-1 h-full">
          <div class="flex h-full flex-row" id="modal-main-row">
            <!-- Image container -->
            <div id="modal-image-wrapper" class="flex-1 flex justify-center items-center bg-black transition-all duration-100">
              <img
                id="modal-image"
                height=""
                width=""
                src=""
                alt=""
                class="h-auto w-auto max-h-full max-w-full object-contain"
                style="height: 100vh;"
              />
            </div>
            <!-- Metadata sidebar (hidden by default) -->
            <aside id="modal-sidebar" class="relative h-full w-0 overflow-hidden bg-gray-900/95 border-l border-gray-800 flex flex-col transition-all duration-100 text-gray-200" aria-label="Image details" aria-hidden="true">
              <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
                <h4 class="text-sm font-semibold text-gray-100 tracking-wide">Details</h4>
                <button id="modal-info-close-btn" class="p-1.5 rounded-md text-gray-400 hover:text-gray-100 hover:bg-white/10 transition" title="Close" aria-label="Close details">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div class="flex-1 p-6 overflow-y-auto" id="modal-metadata-scroll">
                <div id="modal-metadata" class="space-y-4 pb-8 text-sm leading-relaxed"></div>
              </div>
            </aside>
          </div>
        </div>
        </div>
      </div>
      </div>
    `}static getStyles(){return`
      .modal-backdrop {
        backdrop-filter: blur(4px);
        background: rgba(0,0,0,0.92);
      }
      /* Header overlay styles */
      .modal-header-overlay {
        position: absolute;
        top: 0; left: 0; right: 0;
        z-index: 20;
        display: flex;
        padding: .5rem .75rem;
        background: linear-gradient(to bottom, rgba(0,0,0,.72), rgba(0,0,0,0));
        pointer-events: none; /* allow clicks through except buttons */
        transition: right .3s ease; /* adjust when sidebar opens */
      }
      #image-modal.info-open .modal-header-overlay { right: 24rem; }
      @media (max-width: 640px) { #image-modal.info-open .modal-header-overlay { right: 0; } }
      .modal-header-overlay .modal-icon-btn {
        pointer-events: auto;
        padding: .55rem;
        border-radius: .75rem;
        background: rgba(255,255,255,.08);
        color: #f1f5f9; /* slate-100 */
        backdrop-filter: blur(6px) saturate(140%);
        box-shadow: 0 2px 4px -1px rgba(0,0,0,.5), 0 1px 2px -1px rgba(0,0,0,.4);
        transition: background .15s, transform .15s, color .15s;
      }
      .modal-header-overlay .modal-icon-btn:hover:not(:disabled) { background: rgba(255,255,255,.16); }
      .modal-header-overlay .modal-icon-btn:active:not(:disabled) { transform: scale(.9); }
      .modal-header-overlay .modal-icon-btn svg { filter: drop-shadow(0 1px 1px rgba(0,0,0,.6)); }
      .modal-header-overlay .modal-icon-btn:disabled { opacity: .4; cursor: not-allowed; }
      /* Dark scrollbar for metadata */
      #modal-metadata-scroll::-webkit-scrollbar { width: 8px; }
      #modal-metadata-scroll::-webkit-scrollbar-track { background: transparent; }
      #modal-metadata-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 4px; }
      #modal-metadata-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.25); }
      .photo-hover {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .photo-hover:hover {
        transform: translateY(-2px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }
      @keyframes fade-in {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      .animate-in {
        animation: fade-in 0.3s ease-out;
      }
      /* Sidebar transition states */
      #modal-sidebar { max-width: 24rem; }
      #image-modal.info-open #modal-sidebar { width: 24rem; }
      #image-modal.info-open #modal-sidebar[aria-hidden="true"] { aria-hidden: false; }
      /* Content fade */
      #modal-sidebar > * { opacity: 0; transition: opacity .2s ease .1s; }
      #image-modal.info-open #modal-sidebar > * { opacity: 1; }
      /* Adjust image area when sidebar open */
      #image-modal.info-open #modal-image-wrapper { }
      @media (max-width: 640px) {
        /* On small screens, make sidebar overlay instead of shrinking image too small */
        #modal-sidebar { position: absolute; right:0; top:0; bottom:0; box-shadow: -2px 0 8px rgba(0,0,0,0.08); }
        #modal-main-row { position: relative; }
        #image-modal.info-open #modal-sidebar { width: 80%; max-width: 24rem; }
      }
  #modal-metadata-overlay::-webkit-scrollbar { width: 6px; }
  #modal-metadata-overlay::-webkit-scrollbar-thumb { background: rgba(156,163,175,0.5); border-radius: 3px; }
  #modal-metadata-overlay::-webkit-scrollbar-thumb:hover { background: rgba(156,163,175,0.8); }
  /* Scrollbar for metadata list */
  #modal-metadata::-webkit-scrollbar { width: 6px; }
  #modal-metadata::-webkit-scrollbar-track { background: transparent; }
  #modal-metadata::-webkit-scrollbar-thumb { background: rgba(156,163,175,0.5); border-radius: 3px; }
  #modal-metadata::-webkit-scrollbar-thumb:hover { background: rgba(156,163,175,0.8); }
    `}static initialize(){if(document.getElementById("image-modal"))return;if(document.body.insertAdjacentHTML("beforeend",this.getTemplate()),!document.getElementById("image-modal-styles")){const n=document.createElement("style");n.id="image-modal-styles",n.textContent=this.getStyles(),document.head.appendChild(n)}const e=document.getElementById("modal-info-btn"),t=document.getElementById("modal-sidebar"),o=document.getElementById("modal-info-close-btn"),a=document.getElementById("image-modal");if(e&&t&&a){const n=()=>a.classList.contains("info-open"),c=()=>{a.classList.remove("info-open"),t.setAttribute("aria-hidden","true"),e.setAttribute("title","Show Info"),e.setAttribute("aria-label","Show info sidebar")},l=()=>{a.classList.add("info-open"),t.setAttribute("aria-hidden","false"),e.setAttribute("title","Hide Info"),e.setAttribute("aria-label","Hide info sidebar")};e.addEventListener("click",()=>{n()?c():l()}),l(),o==null||o.addEventListener("click",c),document.addEventListener("click",s=>{n()&&s.target instanceof Element&&(t.contains(s.target)||e.contains(s.target)||window.matchMedia("(max-width: 640px)").matches&&c())}),document.addEventListener("keydown",s=>{s.key==="Escape"&&n()&&c()})}}}class B{static getTemplate(e={}){const{containerId:t="photo-grid-container",loadingId:o="loading-indicator",errorId:a="error-display",noResultsId:n="no-results-message",gridId:c="photo-grid"}=e;return w`
      <!-- Photo Grid Container (reusable component) -->
      <div id="${t}">
        <!-- Loading indicator -->
        <div id="${o}" class="hidden justify-center items-center py-4">
          <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden relative">
            <div class="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style="animation: slideRight 1.5s linear infinite;"></div>
            <style>
              @keyframes slideRight {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
            </style>
          </div>
        </div>

        <!-- Error message -->
        <div id="${a}" class="hidden bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-2">
              <p class="text-xs text-red-800" id="error-text"></p>
            </div>
          </div>
        </div>

        <!-- No results message -->
        <div id="${n}" class="hidden text-center py-8">
          <div class="max-w-md mx-auto">
            <svg class="mx-auto h-16 w-16 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No images found</h3>
            <p class="text-gray-500 mb-2 text-sm">We couldn't find any images matching your criteria.</p>
            <p class="text-gray-400 text-xs">Try different search terms or check your filters.</p>
          </div>
        </div>

        <!-- Photo grid -->
        <div id="${c}" class="flex flex-wrap gap-1">
          <!-- Photos will be dynamically inserted here -->
        </div>
      </div>
    `}static getPersonNoResultsTemplate(e="no-results-message"){return`
      <!-- No photos message for person -->
      <div id="${e}" class="hidden text-center py-8">
        <div class="text-gray-400 text-4xl mb-3">📷</div>
        <h3 class="text-md font-medium text-gray-900 mb-1">No photos found</h3>  
        <p class="text-gray-500 text-sm">This person doesn't appear in any photos yet</p>
      </div>
    `}static initialize(e,t={}){const o=document.getElementById(e);if(!o)throw new Error(`Container with id '${e}' not found`);const{loadingId:a="loading-indicator",errorId:n="error-display",noResultsId:c="no-results-message",gridId:l="photo-grid",personMode:s=!1}=t;let m=this.getTemplate({containerId:e+"-inner",loadingId:a,errorId:n,noResultsId:c,gridId:l});s&&(m=m.replace(/<div id="${noResultsId}"[^>]*>.*?<\/div>/s,this.getPersonNoResultsTemplate(c))),o.innerHTML=m}}export{P as I,B as P,x as U};
