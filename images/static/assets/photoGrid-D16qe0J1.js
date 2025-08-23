var E=Object.defineProperty;var k=(p,t,e)=>t in p?E(p,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):p[t]=e;var n=(p,t,e)=>k(p,typeof t!="symbol"?t+"":t,e);import{C as L,e as y}from"./config-BqZhBBhP.js";import{h as w}from"./utils-DPM9xUNI.js";L.apiUrl;const v=class v{constructor(t,e,o,a){n(this,"container");n(this,"loadingIndicator");n(this,"errorDisplay");n(this,"photoGrid");n(this,"noResultsMessage");n(this,"modal");n(this,"modalImage");n(this,"modalMetadata");n(this,"modalPrevBtn");n(this,"modalNextBtn");n(this,"modalCloseBtn");n(this,"modalFullscreenBtn");n(this,"modalLikeBtn");n(this,"modalFacesBtn");n(this,"modalTitleEl");n(this,"currentFullImageLoader",null);n(this,"showScores",!1);n(this,"photoElementPool",[]);n(this,"maxPoolSize",100);n(this,"currentPhotoClick",null);n(this,"imageHeight");n(this,"imageWidth");n(this,"eventCleanupFunctions",[]);n(this,"globalKeydownHandler");this.imageHeight=e,this.imageWidth=o||0;const l=document.getElementById(t);if(!l)throw new Error(`Container with id '${t}' not found`);this.container=l,this.initializeElements(),this.injectResponsivePhotoStyles(),a&&(this.maxPoolSize=a,this.ensureElementPool(a),this.ensureElementsInDOM(a))}initializeElements(){if(this.loadingIndicator=this.container.querySelector("#loading-indicator"),this.errorDisplay=this.container.querySelector("#error-display"),this.photoGrid=this.container.querySelector("#photo-grid"),this.noResultsMessage=this.container.querySelector("#no-results-message"),this.modal=document.querySelector("#image-modal"),this.modalImage=document.querySelector("#modal-image"),this.modalMetadata=document.querySelector("#modal-metadata"),this.modalPrevBtn=document.querySelector("#modal-prev-btn"),this.modalNextBtn=document.querySelector("#modal-next-btn"),this.modalCloseBtn=document.querySelector("#modal-close-btn"),this.modalFullscreenBtn=document.querySelector("#modal-fullscreen-btn"),this.modalLikeBtn=document.querySelector("#modal-like-btn"),this.modalFacesBtn=document.querySelector("#modal-faces-btn"),this.modalTitleEl=document.querySelector("#modal-title"),!this.photoGrid)throw new Error("Required UI elements not found")}setupEventListeners(t){if(this.cleanupEventListeners(),this.currentPhotoClick=t.onPhotoClick,this.modalCloseBtn){const e=()=>t.onModalClose();this.modalCloseBtn.addEventListener("click",e),this.eventCleanupFunctions.push(()=>{var o;return(o=this.modalCloseBtn)==null?void 0:o.removeEventListener("click",e)})}if(this.modalNextBtn){const e=()=>t.onModalNext();this.modalNextBtn.addEventListener("click",e),this.eventCleanupFunctions.push(()=>{var o;return(o=this.modalNextBtn)==null?void 0:o.removeEventListener("click",e)})}if(this.modalPrevBtn){const e=()=>t.onModalPrevious();this.modalPrevBtn.addEventListener("click",e),this.eventCleanupFunctions.push(()=>{var o;return(o=this.modalPrevBtn)==null?void 0:o.removeEventListener("click",e)})}if(this.modalFullscreenBtn){const e=this.handleToggleFullScreen.bind(this);this.modalFullscreenBtn.addEventListener("click",e),this.eventCleanupFunctions.push(()=>{var o;return(o=this.modalFullscreenBtn)==null?void 0:o.removeEventListener("click",e)})}if(this.modalLikeBtn){const e=this.handleLike.bind(this);this.modalLikeBtn.addEventListener("click",e),this.eventCleanupFunctions.push(()=>{var o;return(o=this.modalLikeBtn)==null?void 0:o.removeEventListener("click",e)})}if(this.modalFacesBtn){const e=this.handleShowFaces.bind(this);this.modalFacesBtn.addEventListener("click",e),this.eventCleanupFunctions.push(()=>{var o;return(o=this.modalFacesBtn)==null?void 0:o.removeEventListener("click",e)})}if(this.modal){const e=o=>{o.target===this.modal&&t.onModalClose()};this.modal.addEventListener("click",e),this.eventCleanupFunctions.push(()=>{var o;return(o=this.modal)==null?void 0:o.removeEventListener("click",e)})}this.globalKeydownHandler=e=>{if(!(!this.modal||this.modal.classList.contains("hidden")))switch(e.key){case"Escape":t.onModalClose();break;case"ArrowLeft":t.onModalPrevious();break;case"ArrowRight":t.onModalNext();break}},document.addEventListener("keydown",this.globalKeydownHandler)}cleanupEventListeners(){this.eventCleanupFunctions.forEach(t=>t()),this.eventCleanupFunctions=[],this.globalKeydownHandler&&(document.removeEventListener("keydown",this.globalKeydownHandler),this.globalKeydownHandler=void 0)}destroy(){this.cleanupEventListeners(),this.photoElementPool=[],this.currentPhotoClick=null,this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null)}updateLoading(t){this.loadingIndicator&&(t?this.loadingIndicator.classList.remove("hidden"):this.loadingIndicator.classList.add("hidden"))}updateError(t){this.errorDisplay&&(t?(this.errorDisplay.textContent=`Error: ${t}`,this.errorDisplay.classList.remove("hidden")):this.errorDisplay.classList.add("hidden"))}updatePhotos(t){if(!(!this.photoGrid||!this.noResultsMessage)){if(console.log("Updating photos in UIService:",t.length),t.length===0){this.clearPhotoGrid(),this.noResultsMessage.classList.remove("hidden");return}this.noResultsMessage.classList.add("hidden"),this.updatePhotoGridForPagination(t)}}clearPhotoGrid(){this.photoElementPool.forEach(t=>{t.style.visibility="hidden"})}updatePhotoGridForPagination(t){console.log("Updating photo grid for pagination:",t.length),t.forEach((e,o)=>{const a=this.photoElementPool[o];this.updateElementWithPhotoData(a,e)});for(let e=t.length;e<this.photoElementPool.length;e++)this.photoElementPool[e].style.visibility="hidden"}ensureElementPool(t){console.log("Ensuring element pool size:",t);const e=t;for(let o=0;o<e;o++){const a=this.createEmptyPhotoElement();this.photoElementPool.push(a)}console.log("Element pool size after ensuring:",this.photoElementPool.length)}ensureElementsInDOM(t){console.log("Ensuring elements in DOM:",t,this.photoElementPool.length);const e=document.createDocumentFragment();let o=!1;for(let a=0;a<t&&a<this.photoElementPool.length;a++){const l=this.photoElementPool[a];l.parentNode||(e.appendChild(l),o=!0)}o&&this.photoGrid.appendChild(e)}createEmptyPhotoElement(){const t=document.createElement("div");t.className="group relative bg-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer mobile-photo-height invisible";const e=document.createElement("img");e.className="w-full h-full rounded-sm object-cover group-hover:scale-105 transition-transform duration-200",e.loading="lazy",e.onerror=()=>{e.src=v.FALLBACK_IMAGE_SVG,e.alt="Image not found"};const o=document.createElement("div");o.className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100";const a=document.createElement("div");return a.className="text-white bg-black/50 rounded-full p-2",a.innerHTML=v.VIEW_ICON_SVG,o.appendChild(a),t.appendChild(e),t.appendChild(o),t}updateElementWithPhotoData(t,e){var l;const o=t.querySelector("img");if(!o)return;o.src=`${y.GET_PREVIEW_IMAGE}/${e.id}.webp`,o.alt=((l=e.metadata)==null?void 0:l.filename)||"",t.setAttribute("data-photo-id",e.id);const a=t.querySelector(".score-badge");if(a&&a.remove(),this.showScores&&e.score!==void 0&&e.score!==null){const r=document.createElement("div");r.className="score-badge absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow z-10",r.textContent=Number(e.score).toFixed(3),t.appendChild(r)}t.onclick=null,this.currentPhotoClick&&(t.onclick=r=>{r.preventDefault(),r.stopPropagation(),this.currentPhotoClick(e)}),t.style.visibility="visible"}showModal(t,e,o){var a;if(!this.modal){console.error("Modal element not found");return}if(!this.modalImage){console.error("Modal image element not found");return}this.modal.classList.contains("hidden")&&this.modal.classList.remove("hidden"),this.loadImageProgressively(t),this.modalImage.alt=((a=t.metadata)==null?void 0:a.filename)||"Image",this.updateModalMetadata(t),this.updateModalNavigation(e,o),this.updateModalTitle(t),document.body.style.overflow="hidden"}loadImageProgressively(t){if(!this.modalImage)return;this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null);const e=`${y.GET_PREVIEW_IMAGE}/${t.id}.webp`,o=`${y.GET_IMAGE}/${t.id}`;this.modalImage.src=e,this.currentFullImageLoader=new Image,this.currentFullImageLoader.decoding="async",this.currentFullImageLoader.loading="eager",this.currentFullImageLoader.src=o,this.currentFullImageLoader.onload=()=>{this.currentFullImageLoader&&this.modalImage&&(this.modalImage.src=o),this.currentFullImageLoader=null},this.currentFullImageLoader.onerror=()=>{console.error("Failed to load full resolution image:",o),this.currentFullImageLoader&&(this.currentFullImageLoader=null)}}hideModal(){if(!this.modal){console.error("Modal element not found for hiding");return}this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null),this.modal.classList.add("hidden"),document.body.style.overflow="auto"}updateModalNavigation(t,e){!this.modalPrevBtn||!this.modalNextBtn||(this.modalPrevBtn.disabled=!t,this.modalNextBtn.disabled=!e,t?this.modalPrevBtn.classList.remove("opacity-50","cursor-not-allowed"):this.modalPrevBtn.classList.add("opacity-50","cursor-not-allowed"),e?this.modalNextBtn.classList.remove("opacity-50","cursor-not-allowed"):this.modalNextBtn.classList.add("opacity-50","cursor-not-allowed"))}updateModalMetadata(t){var r;if(!this.modalMetadata)return;const e=t.metadata;if(!e){this.modalMetadata.innerHTML='<p class="text-gray-500">No metadata available</p>';return}const o=[{label:"Dimensions",value:e.width&&e.height?`${e.width} × ${e.height}`:null},{label:"Date Taken",value:e.taken_at&&e.taken_at.toLowerCase()!=="unk"?e.taken_at:null},{label:"Location",value:e.place&&e.place.toLowerCase()!=="unk"?e.place:null},{label:"Description",value:e.description},{label:"Device",value:e.device&&e.device.toLowerCase()!=="unk"?e.device:null},{label:"Path",value:e.resource_path}].filter(s=>s.value&&s.value.toString().trim()!==""),a=document.createDocumentFragment();if(o.forEach(s=>{const d=document.createElement("div");d.className="grid grid-cols-3 gap-2 py-1 border-b border-gray-800 last:border-b-0";const c=document.createElement("span");c.className="font-semibold col-span-1 text-gray-800",c.textContent=`${s.label}:`,d.appendChild(c);const h=s.value;if(s.label==="Path"){const i=document.createElement("div");i.className="col-span-2 flex gap-2";const u=document.createElement("span");u.className="text-gray-500 flex-1 min-w-0";const m=20,b=h.length>m?h.substring(0,m)+"...":h;u.textContent=b,u.title=h;const g=document.createElement("button");g.className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded transition-colors",g.innerHTML="📋",g.title="Copy full path",g.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(h),g.innerHTML="✅",setTimeout(()=>{g.innerHTML="📋"},1e3)}catch{const f=document.createElement("textarea");f.value=h,document.body.appendChild(f),f.select(),document.execCommand("copy"),document.body.removeChild(f),g.innerHTML="✅",setTimeout(()=>{g.innerHTML="📋"},1e3)}}),i.appendChild(u),i.appendChild(g),d.appendChild(i)}else{const i=document.createElement("span");i.className="col-span-2 text-gray-500",i.textContent=h,d.appendChild(i)}a.appendChild(d)}),e.person&&e.person.length>0&&!e.person.every(s=>s==="no_person_detected"||s==="no_categorical_info"||s==="")){const s=document.createElement("div");s.className="py-1 border-b border-gray-800";const d=document.createElement("span");d.className="font-semibold text-gray-800",d.textContent="People:";const c=document.createElement("div");c.className="flex flex-wrap gap-4 mt-2",c.setAttribute("data-people-container","true");const h=((r=e.person)==null?void 0:r.filter(i=>i!=="no_person_detected"&&i!=="no_categorical_info"&&i.trim()!==""))||[];if(h.length===0){const i=document.createElement("span");i.className="text-gray-500 text-sm",i.textContent="No people detected.",c.appendChild(i)}else h.forEach(i=>{const u=document.createElement("div");u.className="flex flex-col items-center w-16 group";const m=document.createElement("img");m.src=`${y.GET_PERSON_IMAGE}/${i}`,m.alt=i,m.className="w-12 h-12 rounded-full object-cover border-2 border-gray-300 shadow-sm cursor-pointer group-hover:border-blue-500 group-hover:scale-105 transition-all duration-200 bg-gray-200",m.title=`Click to view ${i}'s photos`,m.setAttribute("data-person-id",i),m.onerror=()=>{m.src=v.FALLBACK_IMAGE_SVG,m.classList.add("bg-gray-100")},m.addEventListener("click",()=>this.handlePersonAvatarClick(i));const b=document.createElement("span");b.className="mt-1 text-xs text-gray-700 text-center truncate max-w-full",b.textContent=i.length>16&&/^[a-f0-9]+$/i.test(i)?i.slice(0,8)+"...":i,b.title=i,u.appendChild(m),u.appendChild(b),c.appendChild(u)});s.appendChild(d),s.appendChild(c),a.appendChild(s)}this.modalMetadata.innerHTML="",this.modalMetadata.appendChild(a)}updateModalTitle(t){var e;this.modalTitleEl&&(this.modalTitleEl.textContent=((e=t.metadata)==null?void 0:e.filename)||"Image")}showNoResults(t){this.noResultsMessage&&(t?this.noResultsMessage.classList.remove("hidden"):this.noResultsMessage.classList.add("hidden"))}handleToggleFullScreen(){this.modalImage&&(document.fullscreenElement?document.exitFullscreen():this.modalImage.requestFullscreen().catch(t=>{console.error(`Error attempting to enable full-screen mode: ${t.message} (${t.name})`),alert("Could not enter fullscreen. Your browser might not support it or it's disabled.")}))}handleLike(){alert('Feature "Like" is a placeholder.')}handleShowFaces(){alert('Feature "Show Faces" is a placeholder.')}handlePersonAvatarClick(t){try{this.hideModal();const e=window.location.pathname,o=`/image-search.html?person=${encodeURIComponent(t)}`;e.includes("person-photos.html")?window.location.assign(o):window.location.href=o}catch(e){console.error("Error navigating to person page:",e),alert(`Failed to navigate to person page: ${t}`)}}injectResponsivePhotoStyles(){if(document.getElementById("responsive-photo-styles"))return;const t=document.createElement("style");t.id="responsive-photo-styles",t.textContent=`
      .mobile-photo-height {
        height: ${this.imageHeight?this.imageHeight:140}px !important;
        width: ${this.imageWidth?this.imageWidth:240}px !important;
      }
    `,document.head.appendChild(t)}};n(v,"FALLBACK_IMAGE_SVG","data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvcnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4="),n(v,"VIEW_ICON_SVG",'<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>');let x=v;class B{static getTemplate(){return w`
      <!-- Image Modal (reusable component) -->
      <div
      id="image-modal"
      class="hidden fixed inset-0 z-50 overflow-y-auto animate-in fade-in duration-300"
      >
      <div class="modal-backdrop fixed inset-0" id="modal-backdrop"></div>
      <div class="flex h-screen items-center justify-center">
        <div
        class="relative bg-white rounded-lg shadow-2xl w-full h-full overflow-hidden border border-gray-200"
        >
        <!-- Modal header -->
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-sm"
        >
          <h3
          class="text-lg font-semibold text-gray-900"
          id="modal-title"
          ></h3>
          <div class="flex items-center space-x-1">
          <button
            id="modal-prev-btn"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            disabled
          >
            <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            ></path>
            </svg>
          </button>
          <button
            id="modal-next-btn"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            disabled
          >
            <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            ></path>
            </svg>
          </button>
          <button
            id="modal-info-btn"
            class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
            title="Show Info"
            aria-label="Show info overlay"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
            </svg>
          </button>
          <button
            id="modal-fullscreen-btn"
            class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            title="Fullscreen View"
          >
            <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            ></path>
            </svg>
          </button>
          <button
            id="modal-like-btn"
            class="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Like"
          >
            <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            ></path>
            </svg>
          </button>
          <button
            id="modal-faces-btn"
            class="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
            title="Show Faces"
          >
            <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
            </svg>
          </button>
          <button
            id="modal-close-btn"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
            </svg>
          </button>
          </div>
        </div>
        <!-- Modal content -->
        <div class="flex-1 h-full">
          <div class="flex h-full flex-row" id="modal-main-row">
            <!-- Image container -->
            <div id="modal-image-wrapper" class="flex-1 flex justify-center items-center bg-gradient-to-br from-gray-50 to-gray-100 transition-all duration-300">
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
            <aside id="modal-sidebar" class="relative h-full w-0 overflow-hidden bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ease-out" aria-label="Image details" aria-hidden="true">
              <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white/70 backdrop-blur-sm">
                <h4 class="text-sm font-semibold text-gray-700">Details</h4>
                <button id="modal-info-close-btn" class="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition" title="Close" aria-label="Close details">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div class="flex-1 p-6 overflow-y-auto" id="modal-metadata-scroll">
                <div id="modal-metadata" class="space-y-4 pb-8"></div>
              </div>
            </aside>
          </div>
        </div>
        </div>
      </div>
      </div>
    `}static getStyles(){return`
      .modal-backdrop {
        backdrop-filter: blur(8px);
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.8));
      }
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
    `}static initialize(){if(document.getElementById("image-modal"))return;if(document.body.insertAdjacentHTML("beforeend",this.getTemplate()),!document.getElementById("image-modal-styles")){const l=document.createElement("style");l.id="image-modal-styles",l.textContent=this.getStyles(),document.head.appendChild(l)}const t=document.getElementById("modal-info-btn"),e=document.getElementById("modal-sidebar"),o=document.getElementById("modal-info-close-btn"),a=document.getElementById("image-modal");if(t&&e&&a){const l=()=>a.classList.contains("info-open"),r=()=>{a.classList.remove("info-open"),e.setAttribute("aria-hidden","true"),t.setAttribute("title","Show Info"),t.setAttribute("aria-label","Show info sidebar")},s=()=>{a.classList.add("info-open"),e.setAttribute("aria-hidden","false"),t.setAttribute("title","Hide Info"),t.setAttribute("aria-label","Hide info sidebar")};t.addEventListener("click",()=>{l()?r():s()}),o==null||o.addEventListener("click",r),document.addEventListener("click",d=>{l()&&d.target instanceof Element&&(e.contains(d.target)||t.contains(d.target)||window.matchMedia("(max-width: 640px)").matches&&r())}),document.addEventListener("keydown",d=>{d.key==="Escape"&&l()&&r()})}}}class F{static getTemplate(t={}){const{containerId:e="photo-grid-container",loadingId:o="loading-indicator",errorId:a="error-display",noResultsId:l="no-results-message",gridId:r="photo-grid"}=t;return w`
      <!-- Photo Grid Container (reusable component) -->
      <div id="${e}">
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
        <div id="${l}" class="hidden text-center py-8">
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
        <div id="${r}" class="flex flex-wrap gap-1">
          <!-- Photos will be dynamically inserted here -->
        </div>
      </div>
    `}static getPersonNoResultsTemplate(t="no-results-message"){return`
      <!-- No photos message for person -->
      <div id="${t}" class="hidden text-center py-8">
        <div class="text-gray-400 text-4xl mb-3">📷</div>
        <h3 class="text-md font-medium text-gray-900 mb-1">No photos found</h3>  
        <p class="text-gray-500 text-sm">This person doesn't appear in any photos yet</p>
      </div>
    `}static initialize(t,e={}){const o=document.getElementById(t);if(!o)throw new Error(`Container with id '${t}' not found`);const{loadingId:a="loading-indicator",errorId:l="error-display",noResultsId:r="no-results-message",gridId:s="photo-grid",personMode:d=!1}=e;let c=this.getTemplate({containerId:t+"-inner",loadingId:a,errorId:l,noResultsId:r,gridId:s});d&&(c=c.replace(/<div id="${noResultsId}"[^>]*>.*?<\/div>/s,this.getPersonNoResultsTemplate(r))),o.innerHTML=c}}export{B as I,F as P,x as U};
