var L=Object.defineProperty;var M=(f,e,t)=>e in f?L(f,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):f[e]=t;var c=(f,e,t)=>M(f,typeof e!="symbol"?e+"":e,t);import{C as F,e as y}from"./config-Tz74n_gY.js";import{h as C,f as w,a as P}from"./utils-cLygY5EC.js";F.apiUrl;const b=class b{constructor(e){c(this,"container");c(this,"loadingIndicator");c(this,"errorDisplay");c(this,"photoGrid");c(this,"noResultsMessage");c(this,"modal");c(this,"modalImage");c(this,"modalMetadata");c(this,"modalPrevBtn");c(this,"modalNextBtn");c(this,"modalCloseBtn");c(this,"modalFullscreenBtn");c(this,"modalLikeBtn");c(this,"modalFacesBtn");c(this,"modalFilename");c(this,"currentFullImageLoader",null);c(this,"showScores",!1);c(this,"photoElementPool",[]);c(this,"maxPoolSize",100);c(this,"currentPhotoClick",null);c(this,"eventCleanupFunctions",[]);c(this,"globalKeydownHandler");const t=document.getElementById(e);if(!t)throw new Error(`Container with id '${e}' not found`);this.container=t,this.initializeElements(),this.injectResponsivePhotoStyles()}initializeElements(){if(this.loadingIndicator=this.container.querySelector("#loading-indicator"),this.errorDisplay=this.container.querySelector("#error-display"),this.photoGrid=this.container.querySelector("#photo-grid"),this.noResultsMessage=this.container.querySelector("#no-results-message"),this.modal=document.querySelector("#image-modal"),this.modalImage=document.querySelector("#modal-image"),this.modalMetadata=document.querySelector("#modal-metadata"),this.modalPrevBtn=document.querySelector("#modal-prev-btn"),this.modalNextBtn=document.querySelector("#modal-next-btn"),this.modalCloseBtn=document.querySelector("#modal-close-btn"),this.modalFullscreenBtn=document.querySelector("#modal-fullscreen-btn"),this.modalLikeBtn=document.querySelector("#modal-like-btn"),this.modalFacesBtn=document.querySelector("#modal-faces-btn"),this.modalFilename=document.querySelector("#modal-filename"),!this.photoGrid)throw new Error("Required UI elements not found")}setupEventListeners(e){if(this.cleanupEventListeners(),this.currentPhotoClick=e.onPhotoClick,this.modalCloseBtn){const t=()=>e.onModalClose();this.modalCloseBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalCloseBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalNextBtn){const t=()=>e.onModalNext();this.modalNextBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalNextBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalPrevBtn){const t=()=>e.onModalPrevious();this.modalPrevBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalPrevBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalFullscreenBtn){const t=this.handleToggleFullScreen.bind(this);this.modalFullscreenBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalFullscreenBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalLikeBtn){const t=this.handleLike.bind(this);this.modalLikeBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalLikeBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalFacesBtn){const t=this.handleShowFaces.bind(this);this.modalFacesBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalFacesBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modal){const t=r=>{r.target===this.modal&&e.onModalClose()};this.modal.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modal)==null?void 0:r.removeEventListener("click",t)})}this.globalKeydownHandler=t=>{if(!(!this.modal||this.modal.classList.contains("hidden")))switch(t.key){case"Escape":e.onModalClose();break;case"ArrowLeft":e.onModalPrevious();break;case"ArrowRight":e.onModalNext();break}},document.addEventListener("keydown",this.globalKeydownHandler)}cleanupEventListeners(){this.eventCleanupFunctions.forEach(e=>e()),this.eventCleanupFunctions=[],this.globalKeydownHandler&&(document.removeEventListener("keydown",this.globalKeydownHandler),this.globalKeydownHandler=void 0)}destroy(){this.cleanupEventListeners(),this.photoElementPool=[],this.currentPhotoClick=null,this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null)}updateLoading(e){this.loadingIndicator&&(e?this.loadingIndicator.classList.remove("hidden"):this.loadingIndicator.classList.add("hidden"))}updateError(e){this.errorDisplay&&(e?(this.errorDisplay.textContent=`Error: ${e}`,this.errorDisplay.classList.remove("hidden")):this.errorDisplay.classList.add("hidden"))}updatePhotos(e){if(!(!this.photoGrid||!this.noResultsMessage)){if(console.log("Updating photos in UIService:",e.length),e.length===0){this.clearPhotoGrid(),this.noResultsMessage.classList.remove("hidden");return}this.noResultsMessage.classList.add("hidden"),this.updatePhotoGridForPagination(e)}}clearPhotoGrid(){this.photoElementPool.forEach(e=>{e.style.display="none"})}updatePhotoGridForPagination(e){this.ensureElementPool(e.length),e.forEach((t,r)=>{const i=this.photoElementPool[r];this.updateElementWithPhotoData(i,t),i.style.display="block"});for(let t=e.length;t<this.photoElementPool.length;t++)this.photoElementPool[t].style.display="none";this.ensureElementsInDOM(e.length)}ensureElementPool(e){const t=Math.min(e,this.maxPoolSize)-this.photoElementPool.length;for(let r=0;r<t;r++){const i=this.createEmptyPhotoElement();this.photoElementPool.push(i)}}ensureElementsInDOM(e){const t=document.createDocumentFragment();let r=!1;for(let i=0;i<e&&i<this.photoElementPool.length;i++){const a=this.photoElementPool[i];a.parentNode||(t.appendChild(a),r=!0)}r&&this.photoGrid.appendChild(t)}createEmptyPhotoElement(){const e=document.createElement("div");e.className="group relative bg-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer mobile-photo-height";const t=document.createElement("img");t.className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200",t.loading="lazy",t.onerror=()=>{t.src=b.FALLBACK_IMAGE_SVG,t.alt="Image not found"};const r=document.createElement("div");r.className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100";const i=document.createElement("div");return i.className="text-white bg-black/50 rounded-full p-2",i.innerHTML=b.VIEW_ICON_SVG,r.appendChild(i),e.appendChild(t),e.appendChild(r),e}updateElementWithPhotoData(e,t){var a;const r=e.querySelector("img");if(!r)return;r.src=`${y.GET_PREVIEW_IMAGE}/${t.id}.webp`,r.alt=((a=t.metadata)==null?void 0:a.filename)||"",e.setAttribute("data-photo-id",t.id);const i=e.querySelector(".score-badge");if(i&&i.remove(),this.showScores&&t.score!==void 0&&t.score!==null){const s=document.createElement("div");s.className="score-badge absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow z-10",s.textContent=Number(t.score).toFixed(3),e.appendChild(s)}e.onclick=null,this.currentPhotoClick&&(e.onclick=s=>{s.preventDefault(),s.stopPropagation(),this.currentPhotoClick(t)})}showModal(e,t,r){var i;if(!this.modal){console.error("Modal element not found");return}if(!this.modalImage){console.error("Modal image element not found");return}this.loadImageProgressively(e),this.modalImage.alt=((i=e.metadata)==null?void 0:i.filename)||"Image",this.updateModalMetadata(e),this.updateModalNavigation(t,r),this.updateModalFilename(e),this.modal.classList.remove("hidden"),console.log(this.modal),document.body.style.overflow="hidden"}loadImageProgressively(e){var a,s;if(!this.modalImage)return;this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null),(a=e.metadata)!=null&&a.width&&((s=e.metadata)!=null&&s.height)?(this.modalImage.setAttribute("width",e.metadata.width.toString()),this.modalImage.setAttribute("height",e.metadata.height.toString())):(this.modalImage.removeAttribute("width"),this.modalImage.removeAttribute("height")),this.modalImage.style.width="",this.modalImage.style.height="";const t=`${y.GET_PREVIEW_IMAGE}/${e.id}.webp`,r=`${y.GET_IMAGE}/${e.id}`;this.modalImage.src=t,this.currentFullImageLoader=new Image;const i=this.currentFullImageLoader;i.src=r,i.onload=()=>{this.currentFullImageLoader===i&&this.modalImage&&(this.modalImage.src=r),this.currentFullImageLoader===i&&(this.currentFullImageLoader=null)},i.onerror=()=>{console.error("Failed to load full resolution image:",r),this.currentFullImageLoader===i&&(this.currentFullImageLoader=null)}}hideModal(){if(!this.modal){console.error("Modal element not found for hiding");return}this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null),this.modal.classList.add("hidden"),document.body.style.overflow="auto"}updateModalNavigation(e,t){!this.modalPrevBtn||!this.modalNextBtn||(this.modalPrevBtn.disabled=!e,this.modalNextBtn.disabled=!t,e?this.modalPrevBtn.classList.remove("opacity-50","cursor-not-allowed"):this.modalPrevBtn.classList.add("opacity-50","cursor-not-allowed"),t?this.modalNextBtn.classList.remove("opacity-50","cursor-not-allowed"):this.modalNextBtn.classList.add("opacity-50","cursor-not-allowed"))}updateModalMetadata(e){var s;if(!this.modalMetadata)return;const t=e.metadata;if(!t){this.modalMetadata.innerHTML='<p class="text-gray-500">No metadata available</p>';return}const r=[{label:"Dimensions",value:t.width&&t.height?`${t.width} × ${t.height}`:null},{label:"Date Taken",value:t.taken_at&&t.taken_at.toLowerCase()!=="unk"?t.taken_at:null},{label:"Location",value:t.place&&t.place.toLowerCase()!=="unk"?t.place:null},{label:"Description",value:t.description},{label:"Device",value:t.device&&t.device.toLowerCase()!=="unk"?t.device:null},{label:"Path",value:t.resource_path}].filter(o=>o.value&&o.value.toString().trim()!==""),i=document.createDocumentFragment();if(r.forEach(o=>{const n=document.createElement("div");n.className="grid grid-cols-3 gap-2 py-1 border-b border-gray-800 last:border-b-0";const d=document.createElement("span");d.className="font-semibold col-span-1 text-gray-800",d.textContent=`${o.label}:`,n.appendChild(d);const u=o.value;if(o.label==="Path"){const l=document.createElement("div");l.className="col-span-2 flex gap-2";const h=document.createElement("span");h.className="text-gray-500 flex-1 min-w-0";const p=20,g=u.length>p?u.substring(0,p)+"...":u;h.textContent=g,h.title=u;const m=document.createElement("button");m.className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded transition-colors",m.innerHTML="📋",m.title="Copy full path",m.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(u),m.innerHTML="✅",setTimeout(()=>{m.innerHTML="📋"},1e3)}catch{const x=document.createElement("textarea");x.value=u,document.body.appendChild(x),x.select(),document.execCommand("copy"),document.body.removeChild(x),m.innerHTML="✅",setTimeout(()=>{m.innerHTML="📋"},1e3)}}),l.appendChild(h),l.appendChild(m),n.appendChild(l)}else{const l=document.createElement("span");l.className="col-span-2 text-gray-500",l.textContent=u,n.appendChild(l)}i.appendChild(n)}),t.person&&t.person.length>0&&!t.person.every(o=>o==="no_person_detected"||o==="no_categorical_info"||o==="")){const o=document.createElement("div");o.className="py-1 border-b border-gray-800";const n=document.createElement("span");n.className="font-semibold text-gray-800",n.textContent="People:";const d=document.createElement("div");d.className="flex flex-wrap gap-4 mt-2",d.setAttribute("data-people-container","true");const u=((s=t.person)==null?void 0:s.filter(l=>l!=="no_person_detected"&&l!=="no_categorical_info"&&l.trim()!==""))||[];if(u.length===0){const l=document.createElement("span");l.className="text-gray-500 text-sm",l.textContent="No people detected.",d.appendChild(l)}else u.forEach(l=>{const h=document.createElement("div");h.className="flex flex-col items-center w-16 group";const p=document.createElement("img");p.src=`${y.GET_PERSON_IMAGE}/${l}`,p.alt=l,p.className="w-12 h-12 rounded-full object-cover border-2 border-gray-300 shadow-sm cursor-pointer group-hover:border-blue-500 group-hover:scale-105 transition-all duration-200 bg-gray-200",p.title=`Click to view ${l}'s photos`,p.setAttribute("data-person-id",l),p.onerror=()=>{p.src=b.FALLBACK_IMAGE_SVG,p.classList.add("bg-gray-100")},p.addEventListener("click",()=>this.handlePersonAvatarClick(l));const g=document.createElement("span");g.className="mt-1 text-xs text-gray-700 text-center truncate max-w-full",g.textContent=l.length>16&&/^[a-f0-9]+$/i.test(l)?l.slice(0,8)+"...":l,g.title=l,h.appendChild(p),h.appendChild(g),d.appendChild(h)});o.appendChild(n),o.appendChild(d),i.appendChild(o)}this.modalMetadata.innerHTML="",this.modalMetadata.appendChild(i)}updateModalFilename(e){var t;this.modalFilename&&((t=e.metadata)!=null&&t.filename?(this.modalFilename.textContent=e.metadata.filename,this.modalFilename.classList.remove("hidden")):this.modalFilename.classList.add("hidden"))}showNoResults(e){this.noResultsMessage&&(e?this.noResultsMessage.classList.remove("hidden"):this.noResultsMessage.classList.add("hidden"))}handleToggleFullScreen(){this.modalImage&&(document.fullscreenElement?document.exitFullscreen():this.modalImage.requestFullscreen().catch(e=>{console.error(`Error attempting to enable full-screen mode: ${e.message} (${e.name})`),alert("Could not enter fullscreen. Your browser might not support it or it's disabled.")}))}handleLike(){alert('Feature "Like" is a placeholder.')}handleShowFaces(){alert('Feature "Show Faces" is a placeholder.')}handlePersonAvatarClick(e){try{this.hideModal();const t=window.location.pathname,r=`/person-photos.html?id=${encodeURIComponent(e)}`;t.includes("person-photos.html")?window.location.assign(r):window.location.href=r}catch(t){console.error("Error navigating to person page:",t),alert(`Failed to navigate to person page: ${e}`)}}injectResponsivePhotoStyles(){if(document.getElementById("responsive-photo-styles"))return;const e=document.createElement("style");e.id="responsive-photo-styles",e.textContent=`
      .mobile-photo-height {
        height: 140px !important;
      }
      
      @media (min-width: 640px) {
        .mobile-photo-height {
          height: 160px !important;
        }
      }
      
      @media (min-width: 768px) {
        .mobile-photo-height {
          height: 180px !important;
        }
      }
      
      @media (min-width: 1024px) {
        .mobile-photo-height {
          height: 200px !important;
        }
      }
    `,document.head.appendChild(e)}};c(b,"FALLBACK_IMAGE_SVG","data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvcnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4="),c(b,"VIEW_ICON_SVG",'<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>');let E=b;class S{static getTemplate(){return C`
      <!-- Image Modal (reusable component) -->
      <div
        id="image-modal"
        class="hidden fixed inset-0 z-50 overflow-y-auto animate-in fade-in duration-300"
      >
        <div class="modal-backdrop fixed inset-0" id="modal-backdrop"></div>
        <div class="flex min-h-screen items-center justify-center p-4">
          <div
            class="relative bg-white rounded-lg shadow-2xl w-full overflow-hidden border border-gray-200"
          >
            <!-- Modal header -->
            <div
              class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-sm"
            >
              <h3 class="text-lg font-semibold text-gray-900" id="modal-title">
                
              </h3>
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
            <div class="flex flex-col lg:flex-row h-[calc(100vh-140px)]">
              <!-- Image container -->
              <div
                class="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"
              >
                <img
                  id="modal-image"
                  src=""
                  alt=""
                  class="w-full h-full object-contain rounded-lg"
                />
              </div>
              <!-- Metadata sidebar -->
              <div
                class="w-full lg:w-80 xl:w-96 border-l border-gray-200 overflow-y-auto bg-white"
              >
                <div class="p-6 space-y-6">
                  <div
                    id="modal-filename"
                    class="text-sm font-semibold text-gray-900 break-all bg-gray-50 p-3 rounded-lg border border-gray-200"
                  ></div>
                  <div id="modal-metadata" class="space-y-4">
                    <!-- Metadata will be populated here -->
                  </div>
                </div>
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
      /* Custom scrollbar for metadata sidebar */
      #modal-metadata::-webkit-scrollbar {
        width: 6px;
      }
      #modal-metadata::-webkit-scrollbar-track {
        background: transparent;
      }
      #modal-metadata::-webkit-scrollbar-thumb {
        background: rgba(156, 163, 175, 0.5);
        border-radius: 3px;
      }
      #modal-metadata::-webkit-scrollbar-thumb:hover {
        background: rgba(156, 163, 175, 0.8);
      }
    `}static initialize(){if(!document.getElementById("image-modal")&&(document.body.insertAdjacentHTML("beforeend",this.getTemplate()),!document.getElementById("image-modal-styles"))){const e=document.createElement("style");e.id="image-modal-styles",e.textContent=this.getStyles(),document.head.appendChild(e)}}}class B{static getTemplate(e={}){const{containerId:t="photo-grid-container",loadingId:r="loading-indicator",errorId:i="error-display",noResultsId:a="no-results-message",gridId:s="photo-grid"}=e;return C`
      <!-- Photo Grid Container (reusable component) -->
      <div id="${t}">
        <!-- Loading indicator -->
        <div id="${r}" class="hidden justify-center items-center py-4">
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
        <div id="${i}" class="hidden bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
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
        <div id="${a}" class="hidden text-center py-8">
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
        <div id="${s}" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1">
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
    `}static initialize(e,t={}){const r=document.getElementById(e);if(!r)throw new Error(`Container with id '${e}' not found`);const{loadingId:i="loading-indicator",errorId:a="error-display",noResultsId:s="no-results-message",gridId:o="photo-grid",personMode:n=!1}=t;let d=this.getTemplate({containerId:e+"-inner",loadingId:i,errorId:a,noResultsId:s,gridId:o});n&&(d=d.replace(/<div id="${noResultsId}"[^>]*>.*?<\/div>/s,this.getPersonNoResultsTemplate(s))),r.innerHTML=d}}class k{constructor(e){c(this,"photos",[]);c(this,"queryToken",null);c(this,"filteredPhotos",[]);c(this,"filterCriteria",{});c(this,"filterOptions",{people:[],years:[],cameraMakes:[],cameraModels:[],places:[],tags:[]});c(this,"callbacks");c(this,"container",null);c(this,"eventListeners",new Map);c(this,"peopleCache",new Map);c(this,"imageObserver",null);c(this,"INITIAL_PEOPLE_LIMIT",50);c(this,"isInitialLoad",!0);c(this,"isInitializing",!1);this.callbacks=e}updateQueryToken(e){this.queryToken=e,this.updateFilterUI().catch(t=>{console.error("Error updating filter UI after query token change:",t)})}initialize(e){const t=document.getElementById(e);if(!t)throw new Error(`Filter container with id '${e}' not found`);this.container=t,this.setupImageObserver(),this.render(),this.setupEventListeners(),console.log("Photo filter component initialized")}async resetFilters(){this.clearAllFiltersExceptContext(),await this.applyFilters(),await this.updateFilterUI()}destroy(){this.eventListeners.forEach(e=>{e.forEach(t=>t())}),this.eventListeners.clear(),this.imageObserver&&(this.imageObserver.disconnect(),this.imageObserver=null)}setupImageObserver(){"IntersectionObserver"in window&&(this.imageObserver=new IntersectionObserver(e=>{e.forEach(t=>{var r;if(t.isIntersecting){const i=t.target;i.dataset.src&&(i.src=i.dataset.src,i.removeAttribute("data-src"),(r=this.imageObserver)==null||r.unobserve(i))}})},{rootMargin:"50px 0px",threshold:.1}))}addEventListenerTracked(e,t,r){e.addEventListener(t,r);const i=()=>e.removeEventListener(t,r);this.eventListeners.has(e)||this.eventListeners.set(e,[]),this.eventListeners.get(e).push(i)}static getTemplate(e="photo-filter"){return C`
      ${k.getStyles()}
      <!-- Photo Filter Component - Horizontal Filter Bar -->
      <div id="${e}" class="photo-filter-container sticky z-20">

        <!-- Horizontal Filter Tabs -->
        <div class="relative">
          <div
            class="flex items-center py-3 space-x-2 overflow-x-auto scrollbar-hide"
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
    `}render(){this.container&&(this.container.innerHTML=k.getTemplate(this.container.id))}setupEventListeners(){if(!this.container)return;const e=this.container.querySelector("#reset-filters");e&&this.addEventListenerTracked(e,"click",()=>{this.resetFilters()}),this.container.querySelectorAll(".filter-tab").forEach(s=>{this.addEventListenerTracked(s,"click",o=>{o.preventDefault();const d=o.currentTarget.dataset.filter;d&&this.toggleFilterDropdown(d)})});const r=s=>{const o=s.target;!o.closest(".filter-tab")&&!o.closest(".filter-dropdown")&&this.closeAllDropdowns()};document.addEventListener("click",r);const i=s=>{s.key==="Escape"&&this.closeAllDropdowns()};document.addEventListener("keydown",i);const a=()=>{this.closeAllDropdowns()};window.addEventListener("resize",a),this.eventListeners.has(document)||this.eventListeners.set(document,[]),this.eventListeners.get(document).push(()=>{document.removeEventListener("click",r),document.removeEventListener("keydown",i),window.removeEventListener("resize",a)})}toggleFilterDropdown(e){var a;const t=document.querySelector(`#${e}-dropdown`),r=(a=this.container)==null?void 0:a.querySelector(`#${e}-tab`);if(!t||!r)return;if(this.closeAllDropdowns(e),t.classList.contains("hidden")){t.classList.remove("hidden");const s=t.style.visibility;t.style.visibility="hidden",this.positionDropdown(t,r),t.style.visibility=s||"",r.classList.add("bg-blue-50","border-blue-300","text-blue-700")}else t.classList.add("hidden"),r.classList.remove("bg-blue-50","border-blue-300","text-blue-700")}positionDropdown(e,t){const r=t.getBoundingClientRect(),i=window.innerWidth;let a=e.offsetWidth;if(a===0){const n=e.style.display,d=e.style.visibility;e.style.visibility="hidden",e.style.display="block",a=e.offsetWidth,e.style.display=n,e.style.visibility=d}if((!a||a===0)&&(a=300),i<=768){e.style.position="fixed",e.style.top=`${r.bottom+4}px`,e.style.left="1rem",e.style.right="1rem",e.style.width="auto",e.style.minWidth="auto",e.style.maxWidth="none";return}e.style.position="fixed",e.style.top=`${r.bottom+4}px`;const s=16;let o=r.left;o+a>i-s&&(o=r.right-a),o+a>i-s&&(o=i-a-s),o<s&&(o=s),e.style.left=`${Math.round(o)}px`,e.style.right="auto",e.style.width=""}closeAllDropdowns(e){var i;const t=document.querySelectorAll(".filter-dropdown"),r=(i=this.container)==null?void 0:i.querySelectorAll(".filter-tab");t.forEach(a=>{const s=a.id.replace("-dropdown","");e&&s===e||a.classList.add("hidden")}),r.forEach(a=>{const s=a.id.replace("-tab","");e&&s===e||a.classList.remove("bg-blue-50","border-blue-300","text-blue-700")})}updateTabLabel(e){var o;const t=(o=this.container)==null?void 0:o.querySelector(`#${e}-tab`);if(!t)return;const r=this.filterCriteria[e],i=t.querySelector("span:first-child");if(!i)return;const s={people:"👥 People",years:"📅 Years",tags:"🏷️ Tags",cameraMakes:"📷 Camera",cameraModels:"📸 Model",places:"📍 Places"}[e];if(r&&r.length>0){if(r.length===1){const n=r[0],d=typeof n=="string"?n.length>15?n.substring(0,15)+"...":n:n.toString();i.textContent=`${s}: ${d}`}else i.textContent=`${s}: ${r.length} selected`;t.classList.add("bg-blue-50","border-blue-400","text-blue-700")}else i.textContent=s,t.classList.remove("bg-blue-50","border-blue-400","text-blue-700")}initializeTabLabels(){["people","years","tags","cameraMakes","cameraModels","places"].forEach(e=>{this.updateTabLabel(e)})}async generateFilterOptions(){const e={people:[],years:[],cameraMakes:[],cameraModels:[],places:[],tags:[]};if(this.queryToken)try{console.log("Fetching filter options from server with token:",this.queryToken);const t=[w(this.queryToken,"person").catch(s=>(console.warn("Failed to fetch people options:",s),[])),w(this.queryToken,"place").catch(s=>(console.warn("Failed to fetch places options:",s),[])),w(this.queryToken,"tags").catch(s=>(console.warn("Failed to fetch tags options:",s),[]))],[r,i,a]=await Promise.all(t);r&&Array.isArray(r)&&(e.people=r.filter(s=>s&&s!=="no_person_detected"&&s!=="no_categorical_info")),i&&Array.isArray(i)&&(e.places=i.filter(s=>s&&s.trim())),a&&Array.isArray(a)&&(e.tags=a.filter(s=>s&&s.trim())),console.log("Server filter options:",e)}catch(t){console.error("Error fetching filter options from server:",t)}e.people.sort(),e.years.sort((t,r)=>r-t),e.cameraMakes.sort(),e.cameraModels.sort(),e.places.sort(),e.tags.sort(),this.filterOptions=e,this.callbacks.onFilterOptionsUpdate&&this.callbacks.onFilterOptionsUpdate(e)}async updateFilterUI(){this.container&&(await this.generateFilterOptions(),this.updateFilterSection("people",this.filterOptions.people),this.updateFilterSection("years",this.filterOptions.years.map(String)),this.updateFilterSection("cameraMakes",this.filterOptions.cameraMakes),this.updateFilterSection("cameraModels",this.filterOptions.cameraModels),this.updateFilterSection("places",this.filterOptions.places),this.updateFilterSection("tags",this.filterOptions.tags),this.updateActiveFilters(),this.initializeTabLabels())}updateFilterSection(e,t){var o;const r=document.querySelector(`#${e}-dropdown`),i=r==null?void 0:r.querySelector(".max-h-64, .max-h-48"),a=(o=this.container)==null?void 0:o.querySelector(`#${e}-count`);if(!i||!a)return;a.textContent=t.length.toString();const s=this.filterCriteria[e]||[];e==="people"?this.updatePeopleFilter(i,t,s):this.updateStandardFilter(i,e,t,s),this.updateTabLabel(e)}updatePeopleFilter(e,t,r){const i=t.filter(l=>l!=="no_person_detected"&&l!=="no_categorical_info"&&l!==""&&l);if(i.length===0){e.innerHTML=`
        <div class="py-4 text-xs text-gray-500 text-center italic">
          No people found
        </div>
      `;return}console.log("VALID PEOPLE",i);let a=e.querySelector(".people-grid");a||(a=document.createElement("div"),a.className="people-grid flex flex-wrap gap-2 py-2",e.innerHTML="",e.appendChild(a));const s=new Map;a.querySelectorAll(".person-filter-item").forEach(l=>{const h=l.dataset.personId;h&&s.set(h,l)}),s.forEach((l,h)=>{i.includes(h)||(l.remove(),this.peopleCache.delete(h))});const o=i.filter(l=>r.includes(l)),n=i.filter(l=>!r.includes(l)),d=[...o,...n.slice(0,Math.max(this.INITIAL_PEOPLE_LIMIT-o.length,16))],u=document.createDocumentFragment();d.forEach(l=>{let h=s.get(l)||this.peopleCache.get(l);h?a.contains(h)||u.appendChild(h):(h=this.createPersonElement(l),this.peopleCache.set(l,h),u.appendChild(h)),this.updatePersonElementState(h,r.includes(l))}),u.children.length>0&&a.appendChild(u),i.length>d.length&&this.addShowMoreButton(a,i,d,r)}addShowMoreButton(e,t,r,i){const a=e.querySelector(".show-more-people");a&&a.remove();const s=t.length-r.length,o=document.createElement("div");o.className="show-more-people w-full mt-2",o.innerHTML=`
      <button class="w-full py-2 px-3 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition-colors">
        +${s} more
      </button>
    `;const n=o.querySelector("button");this.addEventListenerTracked(n,"click",d=>{d.preventDefault(),d.stopPropagation();const h=t.filter(m=>!r.includes(m)).slice(0,50),p=document.createDocumentFragment();h.forEach(m=>{let v=this.peopleCache.get(m);v||(v=this.createPersonElement(m),this.peopleCache.set(m,v)),this.updatePersonElementState(v,i.includes(m)),p.appendChild(v)}),e.insertBefore(p,o),r.push(...h);const g=t.length-r.length;g>0?n.textContent=`+${g} more`:o.remove()}),e.appendChild(o)}createPersonElement(e){const t=e.charAt(0).toUpperCase()+e.slice(1).toLowerCase(),r=`${y.GET_PERSON_IMAGE}/${e}`,i=document.createElement("div");i.className="person-filter-item group cursor-pointer",i.dataset.personId=e,i.innerHTML=`
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
    `;const a=i.querySelector(".person-avatar"),s=i.querySelector(".person-fallback");return this.addEventListenerTracked(a,"error",()=>{a.style.display="none",s.style.display="flex"}),this.imageObserver&&a.dataset.src&&this.imageObserver.observe(a),this.addEventListenerTracked(i,"click",o=>{o.preventDefault(),o.stopPropagation(),this.handlePersonFilterToggle(e)}),i}updatePersonElementState(e,t){const r=e.querySelector(".person-avatar"),i=e.querySelector(".person-fallback");t?(r.className="person-avatar w-14 h-14 object-cover border-4 transition-all duration-200 border-blue-500 ring-2 ring-blue-200",i&&(i.className="person-fallback w-14 h-14 bg-gray-200 border-4 border-blue-500 ring-2 ring-blue-200 hidden items-center justify-center text-sm text-gray-500 font-medium")):(r.className="person-avatar w-14 h-14 object-cover transition-all duration-200 border-gray-300 group-hover:border-blue-400",i&&(i.className="person-fallback w-14 h-14 bg-gray-200 border-gray-300 hidden items-center justify-center text-sm text-gray-500 font-medium"))}updateStandardFilter(e,t,r,i){e.innerHTML=r.length>0?r.map(s=>{const o=i.includes(s);return`
        <label class="flex items-center space-x-2 py-1.5 px-2 hover:bg-gray-50 rounded cursor-pointer text-sm">
          <input 
            type="radio" 
            name="${t}-filter"
            value="${s}" 
            data-filter-type="${t}"
            ${o?"checked":""}
            class="filter-radio rounded-full border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <span class="text-gray-700 truncate flex-1">${s}</span>
        </label>
      `}).join(""):`
      <div class="py-4 text-sm text-gray-500 text-center italic">
        No ${t} found
      </div>
    `,e.querySelectorAll(".filter-radio").forEach(s=>{this.addEventListenerTracked(s,"change",o=>{this.handleFilterChange(o),setTimeout(()=>this.closeAllDropdowns(),100)})})}handlePersonFilterToggle(e){this.clearAllFiltersExceptContext(),this.filterCriteria.people||(this.filterCriteria.people=[]);const t=this.filterCriteria.people,r=t.indexOf(e);r>-1?t.splice(r,1):this.filterCriteria.people=[e],this.filterCriteria.people.length===0&&delete this.filterCriteria.people,this.updateAllPersonElementsState(),this.applyFilters(),this.updateActiveFilters(),this.updateAllTabLabels(),setTimeout(()=>this.closeAllDropdowns(),100)}handleFilterChange(e){const t=e.target,r=t.dataset.filterType,i=t.value;if(r){if(this.clearAllFiltersExceptContext(),t.checked)if(r==="years"){const a=parseInt(i);isNaN(a)||(this.filterCriteria.years=[a])}else this.filterCriteria[r]=[i];this.updateAllInputElementsState(),this.applyFilters(),this.updateActiveFilters(),this.updateAllTabLabels()}}clearAllFiltersExceptContext(){const e=this.filterCriteria.resourceDirectory,t=this.filterCriteria.personContext;this.filterCriteria={resourceDirectory:e,personContext:t}}updateAllPersonElementsState(){var t;((t=this.container)==null?void 0:t.querySelectorAll(".person-filter-item")).forEach(r=>{var a;const i=r.dataset.personId;if(i){const s=((a=this.filterCriteria.people)==null?void 0:a.includes(i))||!1;this.updatePersonElementState(r,s)}})}updateAllTabLabels(){["people","years","tags","cameraMakes","cameraModels","places"].forEach(e=>{this.updateTabLabel(e)})}updateAllInputElementsState(){var r,i;((r=this.container)==null?void 0:r.querySelectorAll('input[type="radio"]')).forEach(a=>{const s=a.dataset.filterType,o=a.value;if(s){const n=this.filterCriteria[s];if(Array.isArray(n))if(s==="years"){const d=parseInt(o),u=n;a.checked=!isNaN(d)&&u.includes(d)}else{const d=n;a.checked=d.includes(o)}else a.checked=!1}}),((i=this.container)==null?void 0:i.querySelectorAll('input[type="checkbox"]')).forEach(a=>{const s=a.dataset.filterType,o=a.value;if(s){const n=this.filterCriteria[s];if(Array.isArray(n))if(s==="years"){const d=parseInt(o),u=n;a.checked=!isNaN(d)&&u.includes(d)}else{const d=n;a.checked=d.includes(o)}else a.checked=!1}})}transformFilterRawData(e){return e.map(t=>({id:t.resource_hash,score:1,metadata:t}))}async applyFilters(e=!1){if(console.log("Applying filters..."),this.queryToken&&this.hasActiveFilters())try{console.log("Using server-side filtering with criteria:",this.filterCriteria);const{attribute:t,value:r}=this.getActiveFilterAttributeAndValue();if(t&&r){const i=await P(this.queryToken,t,r);this.filteredPhotos=this.transformFilterRawData(i),console.log("Server filter results:",this.filteredPhotos)}else console.warn("No valid filter attribute/value found"),this.filteredPhotos=[]}catch(t){console.error("Error applying server-side filters:",t),this.filteredPhotos=[]}else this.filteredPhotos=this.photos.filter(t=>this.matchesFilter(t,this.filterCriteria));this.callbacks.onFilterChange(this.filteredPhotos),this.updateActiveFilters(),!e&&!this.isInitialLoad&&this.scrollToTop()}getActiveFilterAttributeAndValue(){var e,t,r,i,a,s;return(e=this.filterCriteria.people)!=null&&e.length?{attribute:"person",value:this.filterCriteria.people[0]}:(t=this.filterCriteria.years)!=null&&t.length?{attribute:"year",value:this.filterCriteria.years[0].toString()}:(r=this.filterCriteria.cameraMakes)!=null&&r.length?{attribute:"cameraMake",value:this.filterCriteria.cameraMakes[0]}:(i=this.filterCriteria.cameraModels)!=null&&i.length?{attribute:"cameraModel",value:this.filterCriteria.cameraModels[0]}:(a=this.filterCriteria.places)!=null&&a.length?{attribute:"place",value:this.filterCriteria.places[0]}:(s=this.filterCriteria.tags)!=null&&s.length?{attribute:"tag",value:this.filterCriteria.tags[0]}:this.filterCriteria.searchText?{attribute:"searchText",value:this.filterCriteria.searchText}:{attribute:null,value:null}}hasActiveFilters(){var e,t,r,i,a,s;return!!((e=this.filterCriteria.people)!=null&&e.length||(t=this.filterCriteria.years)!=null&&t.length||(r=this.filterCriteria.cameraMakes)!=null&&r.length||(i=this.filterCriteria.cameraModels)!=null&&i.length||(a=this.filterCriteria.places)!=null&&a.length||(s=this.filterCriteria.tags)!=null&&s.length||this.filterCriteria.searchText)}buildServerFilterParams(){var t,r,i,a,s,o,n;const e={};return(t=this.filterCriteria.people)!=null&&t.length&&(e.person=this.filterCriteria.people[0]),(r=this.filterCriteria.years)!=null&&r.length&&(e.year=this.filterCriteria.years[0]),(i=this.filterCriteria.cameraMakes)!=null&&i.length&&(e.make=this.filterCriteria.cameraMakes[0]),(a=this.filterCriteria.cameraModels)!=null&&a.length&&(e.model=this.filterCriteria.cameraModels[0]),(s=this.filterCriteria.places)!=null&&s.length&&(e.place=this.filterCriteria.places[0]),(o=this.filterCriteria.tags)!=null&&o.length&&(e.tag=this.filterCriteria.tags[0]),this.filterCriteria.searchText&&(e.searchText=this.filterCriteria.searchText),(n=this.filterCriteria.resourceDirectory)!=null&&n.length&&(e.resourceDirectory=this.filterCriteria.resourceDirectory),this.filterCriteria.personContext&&(e.personContext=this.filterCriteria.personContext),console.log("Built server filter params:",e),e}matchesFilter(e,t){const r=e.metadata;if(!r)return Object.keys(t).length===0;if(t.resourceDirectory&&t.resourceDirectory.length>0){if(!r.resource_directory)return console.log("Photo missing resource_directory:",e.id),!1;const i=r.resource_directory.replace(/\//g,"\\").toLowerCase();if(!t.resourceDirectory.some(s=>{const o=s.replace(/\//g,"\\").toLowerCase();return i.includes(o)||o.includes(i)}))return console.log("Photo does not match resource directory filter:",e.id,i),!1}if(t.searchText&&![r.filename,r.absolute_path,r.description,r.place,...r.person||[],...Array.isArray(r.tags)?r.tags:[r.tags].filter(Boolean)].filter(Boolean).map(s=>s.toLowerCase()).some(s=>s.includes(t.searchText))||t.people&&t.people.length>0&&(!r.person||!Array.isArray(r.person)||!t.people.some(a=>r.person.includes(a))))return!1;if(t.years&&t.years.length>0){const i=s=>{if(!s)return null;let o=null;if(o=new Date(s),!isNaN(o.getTime()))return o.getFullYear();const n=/\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+(\d{4})/i,d=s.match(n);if(d){const h=parseInt(d[1]);if(!isNaN(h)&&h>1900&&h<3e3)return h}const u=/\b(19|20)\d{2}\b/,l=s.match(u);if(l){const h=parseInt(l[0]);if(!isNaN(h)&&h>1900&&h<3e3)return h}return null};let a=null;if(r.taken_at&&(a=i(r.taken_at)),!a&&r.modified_at&&(a=i(r.modified_at)),!a||!t.years.includes(a))return!1}if(t.cameraMakes&&t.cameraMakes.length>0&&(!r.make||!t.cameraMakes.includes(r.make))||t.cameraModels&&t.cameraModels.length>0&&(!r.model||!t.cameraModels.includes(r.model))||t.places&&t.places.length>0&&(!r.place||!t.places.includes(r.place)))return!1;if(t.tags&&t.tags.length>0){if(!r.tags)return!1;const i=Array.isArray(r.tags)?r.tags:[r.tags];if(!t.tags.some(s=>i.includes(s)))return!1}return!0}updateActiveFilters(){var r;const e=(r=this.container)==null?void 0:r.querySelector("#active-filters");if(!e)return;const t=[];if(this.filterCriteria.searchText&&t.push(`
        <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors">
          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          "${this.filterCriteria.searchText}"
          <button class="ml-1.5 p-0.5 rounded-full hover:bg-blue-300 transition-colors active-filter-remove" data-type="searchText" data-value="${this.filterCriteria.searchText}">
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </span>
      `),Object.entries(this.filterCriteria).forEach(([i,a])=>{if(i==="searchText"||i==="resourceDirectory"||!a||!Array.isArray(a)||a.length===0)return;const s={people:"👥",years:"📅",cameraMakes:"📷",cameraModels:"📸",places:"📍",tags:"🏷️"},o={people:"bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",years:"bg-green-100 text-green-800 border-green-200 hover:bg-green-200",cameraMakes:"bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",cameraModels:"bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",places:"bg-red-100 text-red-800 border-red-200 hover:bg-red-200",tags:"bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200"};a.forEach(n=>{if(i==="people"){const d=`${y.GET_PERSON_IMAGE}/${n}`,u=n.length>15?n.substring(0,15)+"...":n;t.push(`
            <span class="inline-flex items-center px-1.5 py-1 rounded-md text-xs font-medium border transition-colors ${o[i]}">
              <img 
                src="${d}" 
                alt="${u}"
                class="w-5 h-5 rounded-full object-cover border border-purple-300 mr-1.5"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              />
              <div class="w-5 h-5 rounded-full bg-purple-200 border border-purple-300 items-center justify-center text-xs text-purple-600 font-medium mr-1.5" style="display:none;">
                ${n.substring(0,2).toUpperCase()}
              </div>
              <span class="truncate max-w-[80px]" title="${n}">${u}</span>
              <button class="ml-1.5 p-0.5 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors active-filter-remove" data-type="${i}" data-value="${n}">
                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </span>
          `)}else{const d=n.length>20?n.substring(0,20)+"...":n;t.push(`
            <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border transition-colors ${o[i]||"bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"}">
              <span class="mr-1">${s[i]}</span>
              ${d}
              <button class="ml-1.5 p-0.5 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors active-filter-remove" data-type="${i}" data-value="${n}">
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
      `,e.classList.remove("hidden"),e.querySelectorAll(".active-filter-remove").forEach(s=>{this.addEventListenerTracked(s,"click",o=>{o.stopPropagation();const d=o.target.closest(".active-filter-remove");if(d){const u=d.dataset.type,l=d.dataset.value;u&&l&&this.clearFilter(u,l)}})});const a=e.querySelector(".clear-all-filters");a&&this.addEventListenerTracked(a,"click",()=>{this.clearAllFilters().catch(s=>{console.error("Error clearing all filters:",s)})})}else e.innerHTML="",e.classList.add("hidden")}clearFilter(e,t){var r;if(e==="searchText"){this.filterCriteria.searchText=void 0;const i=(r=this.container)==null?void 0:r.querySelector("#filter-search-text");i&&(i.value="")}else this.filterCriteria[e]&&delete this.filterCriteria[e];this.updateAllInputElementsState(),this.updateAllPersonElementsState(),this.updateActiveFilters(),this.applyFilters(),this.updateAllTabLabels(),this.scrollToTop()}async clearAllFilters(){var i,a,s;this.clearAllFiltersExceptContext(),this.filterCriteria.searchText=void 0;const e=(i=this.container)==null?void 0:i.querySelector("#filter-search-text");e&&(e.value=""),((a=this.container)==null?void 0:a.querySelectorAll('input[type="radio"]')).forEach(o=>{o.checked=!1}),((s=this.container)==null?void 0:s.querySelectorAll('input[type="checkbox"]')).forEach(o=>{o.checked=!1}),this.updateAllPersonElementsState(),this.updateAllTabLabels(),this.closeAllDropdowns(),await this.updateFilterUI(),this.updateActiveFilters(),await this.applyFilters(),this.scrollToTop()}scrollToTop(){this.isInitializing||window.scrollTo(0,0)}}export{S as I,B as P,E as U,k as a};
