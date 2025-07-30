var M=Object.defineProperty;var I=(u,e,t)=>e in u?M(u,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):u[e]=t;var c=(u,e,t)=>I(u,typeof e!="symbol"?e+"":e,t);import{h as S}from"./utils-B3qE-N8V.js";import{C as F}from"./config-C3qbAENF.js";function P(u){if(!u.trim())return"";const e=u.split(" ").filter(o=>o.length>0),t=[],r=[];e.forEach(o=>{o.includes("=")?t.push(o):r.push(o)});let s=t.join("&");if(r.length>0){const o=`query=${r.join(" ")}`;s.length>0?s+=`&${o}`:s=o}return s}function A(u){return!u.data_hash||!u.score||!u.meta_data||!(u.data_hash.length===u.score.length&&u.score.length===u.meta_data.length)?(console.error("Malformed rawData in transformRawDataChunk:",u),[]):u.data_hash.map((t,r)=>({id:t,score:u.score[r],metadata:u.meta_data[r]}))}function D(u,e){if(!e||!e.length)return u;const t=new Map(u.map(s=>[s.id,{...s}]));e.forEach(s=>{if(t.has(s.id)){const o=t.get(s.id);o.score=(Number(o.score)||0)+(Number(s.score)||0),o.metadata=s.metadata}else t.set(s.id,s)});const r=Array.from(t.values());return r.sort((s,o)=>(Number(o.score)||0)-(Number(s.score)||0)),r}const w=F.apiUrl,x={QUERY:`${w}/query`,GET_SUGGESTION:`${w}/getSuggestion`,GET_IMAGE:`${w}/getRawDataFull`,GET_PREVIEW_IMAGE:"/preview_image",GET_PERSON_IMAGE:`${w}/getPreviewPerson`},k={getImageUrl:u=>`${x.GET_IMAGE}/${encodeURIComponent(u)}`,getPreviewImageUrl:u=>"/preview_image/"+u+".webp",getPersonImageUrl:u=>`${x.GET_PERSON_IMAGE}/${encodeURIComponent(u)}`},T={MIN_SEARCH_LENGTH:1,ERROR_MESSAGES:{SEARCH_FAILED:"Search request failed. Please try again.",UNKNOWN_ERROR:"An unknown error occurred."}},N={FORM_URLENCODED:"application/x-www-form-urlencoded"};class g{static async searchImages(e,t){console.log("SearchApiService.searchImages called with:",{searchTerm:e,options:t});const{isInitialSearch:r,clientId:s}=t,o=e.includes("=")||e.includes("&")?e:P(e),a=new URLSearchParams;a.append("query",o),a.append("query_start",String(r)),!r&&s&&a.append("client_id",s);const i=await fetch(x.QUERY,{method:"POST",headers:{"Content-Type":N.FORM_URLENCODED},body:a.toString()});if(!i.ok){const n=await i.text();throw new Error(`${T.ERROR_MESSAGES.SEARCH_FAILED}: ${i.statusText} - ${n}`)}return await i.json()}static getImageUrl(e){return k.getImageUrl(e)}static getPreviewImageUrl(e){return k.getPreviewImageUrl(e)}static getPersonImageUrl(e){return k.getPersonImageUrl(e)}}const b=class b{constructor(e){c(this,"container");c(this,"loadingIndicator");c(this,"errorDisplay");c(this,"photoGrid");c(this,"noResultsMessage");c(this,"modal");c(this,"modalImage");c(this,"modalMetadata");c(this,"modalPrevBtn");c(this,"modalNextBtn");c(this,"modalCloseBtn");c(this,"modalFullscreenBtn");c(this,"modalLikeBtn");c(this,"modalFacesBtn");c(this,"modalFilename");c(this,"currentFullImageLoader",null);c(this,"showScores",!1);c(this,"photoElementPool",[]);c(this,"maxPoolSize",100);c(this,"currentPhotoClick",null);c(this,"eventCleanupFunctions",[]);c(this,"globalKeydownHandler");const t=document.getElementById(e);if(!t)throw new Error(`Container with id '${e}' not found`);this.container=t,this.initializeElements(),this.injectResponsivePhotoStyles()}initializeElements(){if(this.loadingIndicator=this.container.querySelector("#loading-indicator"),this.errorDisplay=this.container.querySelector("#error-display"),this.photoGrid=this.container.querySelector("#photo-grid"),this.noResultsMessage=this.container.querySelector("#no-results-message"),this.modal=document.querySelector("#image-modal"),this.modalImage=document.querySelector("#modal-image"),this.modalMetadata=document.querySelector("#modal-metadata"),this.modalPrevBtn=document.querySelector("#modal-prev-btn"),this.modalNextBtn=document.querySelector("#modal-next-btn"),this.modalCloseBtn=document.querySelector("#modal-close-btn"),this.modalFullscreenBtn=document.querySelector("#modal-fullscreen-btn"),this.modalLikeBtn=document.querySelector("#modal-like-btn"),this.modalFacesBtn=document.querySelector("#modal-faces-btn"),this.modalFilename=document.querySelector("#modal-filename"),!this.photoGrid)throw new Error("Required UI elements not found")}setupEventListeners(e){if(this.cleanupEventListeners(),this.modalCloseBtn){const t=()=>e.onModalClose();this.modalCloseBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalCloseBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalNextBtn){const t=()=>e.onModalNext();this.modalNextBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalNextBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalPrevBtn){const t=()=>e.onModalPrevious();this.modalPrevBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalPrevBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalFullscreenBtn){const t=this.handleToggleFullScreen.bind(this);this.modalFullscreenBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalFullscreenBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalLikeBtn){const t=this.handleLike.bind(this);this.modalLikeBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalLikeBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalFacesBtn){const t=this.handleShowFaces.bind(this);this.modalFacesBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalFacesBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modal){const t=r=>{r.target===this.modal&&e.onModalClose()};this.modal.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modal)==null?void 0:r.removeEventListener("click",t)})}this.globalKeydownHandler=t=>{if(!(!this.modal||this.modal.classList.contains("hidden")))switch(t.key){case"Escape":e.onModalClose();break;case"ArrowLeft":e.onModalPrevious();break;case"ArrowRight":e.onModalNext();break}},document.addEventListener("keydown",this.globalKeydownHandler)}cleanupEventListeners(){this.eventCleanupFunctions.forEach(e=>e()),this.eventCleanupFunctions=[],this.globalKeydownHandler&&(document.removeEventListener("keydown",this.globalKeydownHandler),this.globalKeydownHandler=void 0)}destroy(){this.cleanupEventListeners(),this.photoElementPool=[],this.currentPhotoClick=null,this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null)}updateLoading(e){this.loadingIndicator&&(e?this.loadingIndicator.classList.remove("hidden"):this.loadingIndicator.classList.add("hidden"))}updateError(e){this.errorDisplay&&(e?(this.errorDisplay.textContent=`Error: ${e}`,this.errorDisplay.classList.remove("hidden")):this.errorDisplay.classList.add("hidden"))}updatePhotos(e,t){if(!(!this.photoGrid||!this.noResultsMessage)){if(e.length===0){this.clearPhotoGrid(),this.noResultsMessage.classList.remove("hidden");return}this.noResultsMessage.classList.add("hidden"),this.currentPhotoClick=t,this.updatePhotoGridForPagination(e)}}clearPhotoGrid(){this.photoElementPool.forEach(e=>{e.style.display="none"})}updatePhotoGridForPagination(e){this.ensureElementPool(e.length),e.forEach((t,r)=>{const s=this.photoElementPool[r];this.updateElementWithPhotoData(s,t),s.style.display="block"});for(let t=e.length;t<this.photoElementPool.length;t++)this.photoElementPool[t].style.display="none";this.ensureElementsInDOM(e.length)}ensureElementPool(e){const t=Math.min(e,this.maxPoolSize)-this.photoElementPool.length;for(let r=0;r<t;r++){const s=this.createEmptyPhotoElement();this.photoElementPool.push(s)}}ensureElementsInDOM(e){const t=document.createDocumentFragment();let r=!1;for(let s=0;s<e&&s<this.photoElementPool.length;s++){const o=this.photoElementPool[s];o.parentNode||(t.appendChild(o),r=!0)}r&&this.photoGrid.appendChild(t)}createEmptyPhotoElement(){const e=document.createElement("div");e.className="group relative bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer mobile-photo-height";const t=document.createElement("img");t.className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200",t.loading="lazy",t.onerror=()=>{t.src=b.FALLBACK_IMAGE_SVG,t.alt="Image not found"};const r=document.createElement("div");r.className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100";const s=document.createElement("div");return s.className="text-white bg-black/50 rounded-full p-2",s.innerHTML=b.VIEW_ICON_SVG,r.appendChild(s),e.appendChild(t),e.appendChild(r),e}updateElementWithPhotoData(e,t){var o;const r=e.querySelector("img");if(!r)return;r.src=g.getPreviewImageUrl(t.id),r.alt=((o=t.metadata)==null?void 0:o.filename)||"",e.setAttribute("data-photo-id",t.id);const s=e.querySelector(".score-badge");if(s&&s.remove(),this.showScores&&t.score!==void 0&&t.score!==null){const a=document.createElement("div");a.className="score-badge absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow z-10",a.textContent=Number(t.score).toFixed(3),e.appendChild(a)}e.onclick=null,this.currentPhotoClick&&(e.onclick=a=>{a.preventDefault(),a.stopPropagation(),this.currentPhotoClick(t)})}showModal(e,t,r){var s;if(!this.modal){console.error("Modal element not found");return}if(!this.modalImage){console.error("Modal image element not found");return}this.loadImageProgressively(e),this.modalImage.alt=((s=e.metadata)==null?void 0:s.filename)||"Image",this.updateModalMetadata(e),this.updateModalNavigation(t,r),this.updateModalFilename(e),this.modal.classList.remove("hidden"),document.body.style.overflow="hidden"}loadImageProgressively(e){var o,a;if(!this.modalImage)return;this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null),(o=e.metadata)!=null&&o.width&&((a=e.metadata)!=null&&a.height)?(this.modalImage.setAttribute("width",e.metadata.width.toString()),this.modalImage.setAttribute("height",e.metadata.height.toString())):(this.modalImage.removeAttribute("width"),this.modalImage.removeAttribute("height")),this.modalImage.style.width="",this.modalImage.style.height="";const t=g.getPreviewImageUrl(e.id),r=g.getImageUrl(e.id);this.modalImage.src=t,this.currentFullImageLoader=new Image;const s=this.currentFullImageLoader;s.src=r,s.onload=()=>{this.currentFullImageLoader===s&&this.modalImage&&(this.modalImage.src=r),this.currentFullImageLoader===s&&(this.currentFullImageLoader=null)},s.onerror=()=>{console.error("Failed to load full resolution image:",r),this.currentFullImageLoader===s&&(this.currentFullImageLoader=null)}}hideModal(){if(!this.modal){console.error("Modal element not found for hiding");return}this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null),this.modal.classList.add("hidden"),document.body.style.overflow="auto"}updateModalNavigation(e,t){!this.modalPrevBtn||!this.modalNextBtn||(this.modalPrevBtn.disabled=!e,this.modalNextBtn.disabled=!t,e?this.modalPrevBtn.classList.remove("opacity-50","cursor-not-allowed"):this.modalPrevBtn.classList.add("opacity-50","cursor-not-allowed"),t?this.modalNextBtn.classList.remove("opacity-50","cursor-not-allowed"):this.modalNextBtn.classList.add("opacity-50","cursor-not-allowed"))}updateModalMetadata(e){var a;if(!this.modalMetadata)return;const t=e.metadata;if(!t){this.modalMetadata.innerHTML='<p class="text-gray-500">No metadata available</p>';return}const r=[{label:"Filename",value:t.filename},{label:"Dimensions",value:t.width&&t.height?`${t.width} × ${t.height}`:null},{label:"Date Taken",value:t.taken_at&&t.taken_at.toLowerCase()!=="unk"?t.taken_at:null},{label:"Location",value:t.place&&t.place.toLowerCase()!=="unk"?t.place:null},{label:"Description",value:t.description},{label:"Device",value:t.device&&t.device.toLowerCase()!=="unk"?t.device:null}].filter(i=>i.value&&i.value.toString().trim()!==""),s=document.createDocumentFragment();if(r.forEach(i=>{const n=document.createElement("div");n.className="grid grid-cols-3 gap-2 py-1 border-b border-gray-800 last:border-b-0";const l=document.createElement("span");l.className="font-semibold col-span-1 text-gray-800",l.textContent=`${i.label}:`;const p=document.createElement("span");p.className="col-span-2 text-gray-500",p.textContent=i.value,n.appendChild(l),n.appendChild(p),s.appendChild(n)}),t.person&&t.person.length>0&&!t.person.every(i=>i==="no_person_detected"||i==="no_categorical_info")){const i=document.createElement("div");i.className="py-1 border-b border-gray-800";const n=document.createElement("span");n.className="font-semibold text-gray-800",n.textContent="People:";const l=document.createElement("div");l.className="flex flex-wrap gap-2 mt-1",l.setAttribute("data-people-container","true"),(((a=t.person)==null?void 0:a.filter(d=>d!=="no_person_detected"&&d!=="no_categorical_info"))||[]).forEach(d=>{const h=document.createElement("div");h.className="flex flex-col items-center";const m=document.createElement("img");m.src=g.getPersonImageUrl(d),m.alt=d,m.className="w-12 h-12 rounded-full object-cover border border-gray-300 cursor-pointer hover:border-blue-500 transition-colors",m.title=`Click to view ${d}'s photos`,m.setAttribute("data-person-id",d),m.addEventListener("click",()=>this.handlePersonAvatarClick(d)),h.appendChild(m),l.appendChild(h)}),i.appendChild(n),i.appendChild(l),s.appendChild(i)}this.modalMetadata.innerHTML="",this.modalMetadata.appendChild(s)}updateModalFilename(e){var t;this.modalFilename&&((t=e.metadata)!=null&&t.filename?(this.modalFilename.textContent=e.metadata.filename,this.modalFilename.classList.remove("hidden")):this.modalFilename.classList.add("hidden"))}showNoResults(e){this.noResultsMessage&&(e?this.noResultsMessage.classList.remove("hidden"):this.noResultsMessage.classList.add("hidden"))}handleToggleFullScreen(){this.modalImage&&(document.fullscreenElement?document.exitFullscreen():this.modalImage.requestFullscreen().catch(e=>{console.error(`Error attempting to enable full-screen mode: ${e.message} (${e.name})`),alert("Could not enter fullscreen. Your browser might not support it or it's disabled.")}))}handleLike(){alert('Feature "Like" is a placeholder.')}handleShowFaces(){alert('Feature "Show Faces" is a placeholder.')}handlePersonAvatarClick(e){try{this.hideModal();const t=window.location.pathname,r=`/person-photos.html?id=${encodeURIComponent(e)}`;t.includes("person-photos.html")?window.location.replace(r):window.location.href=r}catch(t){console.error("Error navigating to person page:",t),alert(`Failed to navigate to person page: ${e}`)}}injectResponsivePhotoStyles(){if(document.getElementById("responsive-photo-styles"))return;const e=document.createElement("style");e.id="responsive-photo-styles",e.textContent=`
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
    `,document.head.appendChild(e)}};c(b,"FALLBACK_IMAGE_SVG","data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvcnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4="),c(b,"VIEW_ICON_SVG",'<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>');let L=b;const y={person:{icon:"👤",color:"bg-green-100 text-green-800 border-green-200",examples:["john","sarah","mike"],description:"Search for people in your photos",displayName:"People"},query:{icon:"🔍",color:"bg-purple-100 text-purple-800 border-purple-200",examples:["sunset","birthday party","vacation"],description:"Search photo descriptions and content",displayName:"Keywords"},resource_directory:{icon:"📁",color:"bg-yellow-100 text-yellow-800 border-yellow-200",examples:["vacation","photos","2023"],description:"Browse photos by folder or album",displayName:"Folders"}};class B{constructor(){c(this,"currentSuggestionController",null)}async getSuggestionBatch(e,t){console.log("getSuggestionBatch called with:",{attribute:e,query:t});try{const r=new FormData;r.append("attribute",e),r.append("query",t);const s=await fetch(`${x.GET_SUGGESTION}`,{method:"POST",body:r});if(console.log("API response status for",e,":",s.status),s.ok){const o=await s.json();return console.log("API response data for",e,":",o),o[e]||[]}else console.error("API response not ok for",e,":",s.status,s.statusText)}catch(r){console.warn(`Failed to fetch suggestions for ${e}:`,r)}return[]}async getSuggestion(e,t){console.log("getSuggestion called with:",{attribute:e,query:t}),this.currentSuggestionController&&this.currentSuggestionController.abort(),this.currentSuggestionController=new AbortController;try{const r=new FormData;r.append("attribute",e),r.append("query",t);const s=await fetch(`${x.GET_SUGGESTION}`,{method:"POST",body:r,signal:this.currentSuggestionController.signal});if(console.log("API response status:",s.status),s.ok){const o=await s.json();return console.log("API response data:",o),o[e]||[]}else console.error("API response not ok:",s.status,s.statusText)}catch(r){r instanceof Error&&r.name==="AbortError"?console.log("Suggestion request was cancelled"):console.warn(`Failed to fetch suggestions for ${e}:`,r)}finally{this.currentSuggestionController=null}return[]}async generateAllAttributeSuggestions(e){if(console.log("generateAllAttributeSuggestions called with:",e),!e.trim())return[];const r=this.getAvailableAttributes().filter(s=>s!=="query").map(async s=>{try{return(await this.getSuggestionBatch(s,e)).map(a=>({text:a,attribute:s,type:"suggestion"}))}catch(o){return console.warn(`Failed to fetch suggestions for ${s}:`,o),[]}});try{const a=(await Promise.all(r)).flat().filter(d=>d.text&&d.text.trim()),i=a.filter(d=>d.attribute==="person"),n=a.filter(d=>d.attribute==="resource_directory"),l=a.filter(d=>d.attribute!=="person"&&d.attribute!=="resource_directory");return[...i,...n,...l].slice(0,15)}catch(s){return console.error("Error generating all attribute suggestions:",s),[]}}async generateSuggestions(e,t){if(console.log("generateSuggestions called with:",{attribute:e,value:t}),!t.trim())return[];try{return(await this.getSuggestion(e,t)).map(o=>({text:o,attribute:e,type:"suggestion"}))}catch(r){return console.error("Error generating suggestions:",r),[]}}buildQueryString(e,t,r){const s={...e};t&&r&&(s[t]=[...s[t]||[],r]);let o="";const a=Object.keys(s).filter(i=>s[i].length>0);for(let i=0;i<a.length;i++){const n=a[i],l=s[n];o+=n+"=";for(let p=0;p<l.length;p++)o+=l[p],p!==l.length-1&&(o+="?");i!==a.length-1&&(o+="&")}return o}getAttributeIcon(e){const t=y[e];return t?t.icon:"#️⃣"}getAttributeColor(e){const t=y[e];return t?t.color:"bg-gray-100 text-gray-800 border-gray-200"}getAttributeDisplayName(e){const t=y[e];return t?t.displayName:e.charAt(0).toUpperCase()+e.slice(1).replace("_"," ")}getAttributeDescription(e){const t=y[e];return t?t.description:"Search attribute"}getAvailableAttributes(){return Object.keys(y)}cleanup(){this.currentSuggestionController&&(this.currentSuggestionController.abort(),this.currentSuggestionController=null)}}class z{static getTemplate(){return S`      <!-- Image Modal (reusable component) -->
      <div id="image-modal" class="hidden fixed inset-0 z-50 overflow-y-auto animate-in fade-in duration-300">
        <div class="modal-backdrop fixed inset-0" id="modal-backdrop"></div>
        <div class="flex min-h-screen items-center justify-center p-4">
          <div class="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl min-h-[90vh] overflow-hidden border border-gray-200">            <!-- Modal header -->            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
              <h3 class="text-lg font-semibold text-gray-900" id="modal-title">Image Details</h3>
              <div class="flex items-center space-x-1">                <button id="modal-prev-btn" class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent" disabled>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </button>
                <button id="modal-next-btn" class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent" disabled>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
                <button id="modal-fullscreen-btn" class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200" title="Fullscreen View">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                  </svg>
                </button>                <button id="modal-like-btn" class="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200" title="Like">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                  </svg>
                </button>
                <button id="modal-faces-btn" class="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200" title="Show Faces">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </button>
                <button id="modal-close-btn" class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
              <!-- Modal content -->
            <div class="flex flex-col lg:flex-row h-[calc(100vh-140px)]">
              <!-- Image container -->
              <div class="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                <img id="modal-image" src="" alt="" class="max-w-full max-h-full object-contain rounded-lg shadow-lg">
              </div>
              <!-- Metadata sidebar -->
              <div class="w-full lg:w-80 xl:w-96 border-l border-gray-200 overflow-y-auto bg-white">                <div class="p-6 space-y-6">
                  <div id="modal-filename" class="text-sm font-semibold text-gray-900 break-all bg-gray-50 p-3 rounded-lg border border-gray-200"></div>
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
    `}static initialize(){if(!document.getElementById("image-modal")&&(document.body.insertAdjacentHTML("beforeend",this.getTemplate()),!document.getElementById("image-modal-styles"))){const e=document.createElement("style");e.id="image-modal-styles",e.textContent=this.getStyles(),document.head.appendChild(e)}}}class q{static getTemplate(e={}){const{containerId:t="photo-grid-container",loadingId:r="loading-indicator",errorId:s="error-display",noResultsId:o="no-results-message",gridId:a="photo-grid"}=e;return S`
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
        <div id="${s}" class="hidden bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
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
        <div id="${o}" class="hidden text-center py-8">
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
        <div id="${a}" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
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
    `}static initialize(e,t={}){const r=document.getElementById(e);if(!r)throw new Error(`Container with id '${e}' not found`);const{loadingId:s="loading-indicator",errorId:o="error-display",noResultsId:a="no-results-message",gridId:i="photo-grid",personMode:n=!1}=t;let l=this.getTemplate({containerId:e+"-inner",loadingId:s,errorId:o,noResultsId:a,gridId:i});n&&(l=l.replace(/<div id="${noResultsId}"[^>]*>.*?<\/div>/s,this.getPersonNoResultsTemplate(a))),r.innerHTML=l}}class C{constructor(e){c(this,"photos",[]);c(this,"filteredPhotos",[]);c(this,"semanticSearchResults",[]);c(this,"filterCriteria",{});c(this,"filterOptions",{people:[],years:[],cameraMakes:[],cameraModels:[],places:[],tags:[]});c(this,"callbacks");c(this,"container",null);c(this,"eventListeners",new Map);c(this,"peopleCache",new Map);c(this,"imageObserver",null);c(this,"INITIAL_PEOPLE_LIMIT",50);c(this,"fuzzySearchService");c(this,"isSemanticSearchMode",!1);c(this,"currentSearchTerm","");c(this,"isInitialLoad",!0);c(this,"isInitializing",!1);this.callbacks=e,this.fuzzySearchService=new B}initialize(e){const t=document.getElementById(e);if(!t)throw new Error(`Filter container with id '${e}' not found`);this.container=t,this.setupImageObserver(),this.render(),this.setupEventListeners()}updatePhotos(e){this.isInitializing=!0,this.photos=[...e],this.generateFilterOptions(),this.applyFilters(!0),this.updateFilterUI(),this.isInitialLoad=!1,setTimeout(()=>{this.isInitializing=!1},100)}getFilteredPhotos(){return[...this.filteredPhotos]}resetFilters(){const e=this.filterCriteria.resourceDirectory,t=this.filterCriteria.personContext;this.filterCriteria={resourceDirectory:e,personContext:t},this.applyFilters(),this.updateFilterUI(),this.scrollToTop()}destroy(){this.eventListeners.forEach(e=>{e.forEach(t=>t())}),this.eventListeners.clear(),this.peopleCache.clear(),this.imageObserver&&(this.imageObserver.disconnect(),this.imageObserver=null),this.fuzzySearchService.cleanup()}setupImageObserver(){"IntersectionObserver"in window&&(this.imageObserver=new IntersectionObserver(e=>{e.forEach(t=>{var r;if(t.isIntersecting){const s=t.target;s.dataset.src&&(s.src=s.dataset.src,s.removeAttribute("data-src"),(r=this.imageObserver)==null||r.unobserve(s))}})},{rootMargin:"50px 0px",threshold:.1}))}addEventListenerTracked(e,t,r){e.addEventListener(t,r);const s=()=>e.removeEventListener(t,r);this.eventListeners.has(e)||this.eventListeners.set(e,[]),this.eventListeners.get(e).push(s)}static getTemplate(e="photo-filter",t=!1){return S`
      ${C.getStyles()}
      <!-- Photo Filter Component - Horizontal Filter Bar -->
      <div id="${e}" class="photo-filter-container sticky z-20">
        ${t?"":S`
              <!-- Filter Header -->
              <div class="w-full py-1">
                <div class="flex w-full items-center space-x-3">
                  <!-- Search Input -->
                  <div class="relative w-full">
                    <input
                      type="search"
                      id="filter-search-text"
                      placeholder="Search photos with AI..."
                      class="w-full px-4 py-2.5 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm hover:shadow-md transition-shadow placeholder-gray-400"
                    />
                    <svg
                      class="absolute left-3 top-3 w-4 h-4 text-gray-400"
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
                </div>
              </div>
            `}

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
    `}render(){if(!this.container)return;const e=this.callbacks.hideSearchInput||!1;this.container.innerHTML=C.getTemplate(this.container.id,e)}setupEventListeners(){if(!this.container)return;const e=this.container.querySelector("#filter-search-text");e&&(this.addEventListenerTracked(e,"keydown",i=>{if(i.key==="Enter"){i.preventDefault();const l=i.target.value.trim();l?(console.log("1. Calling performSemanticSearch with:",l),this.performSemanticSearch(l)):this.clearSemanticSearch()}}),this.addEventListenerTracked(e,"input",i=>{!i.target.value.trim()&&this.isSemanticSearchMode&&this.clearSemanticSearch()}));const t=this.container.querySelector("#reset-filters");t&&this.addEventListenerTracked(t,"click",()=>{this.resetFilters(),e&&(e.value="")}),this.container.querySelectorAll(".filter-tab").forEach(i=>{this.addEventListenerTracked(i,"click",n=>{n.preventDefault();const p=n.currentTarget.dataset.filter;p&&this.toggleFilterDropdown(p)})});const s=i=>{const n=i.target;!n.closest(".filter-tab")&&!n.closest(".filter-dropdown")&&this.closeAllDropdowns()};document.addEventListener("click",s);const o=i=>{i.key==="Escape"&&this.closeAllDropdowns()};document.addEventListener("keydown",o);const a=()=>{this.closeAllDropdowns()};window.addEventListener("resize",a),this.eventListeners.has(document)||this.eventListeners.set(document,[]),this.eventListeners.get(document).push(()=>{document.removeEventListener("click",s),document.removeEventListener("keydown",o),window.removeEventListener("resize",a)})}toggleFilterDropdown(e){var o;const t=document.querySelector(`#${e}-dropdown`),r=(o=this.container)==null?void 0:o.querySelector(`#${e}-tab`);if(!t||!r)return;this.closeAllDropdowns(e),t.classList.contains("hidden")?(this.positionDropdown(t,r),t.classList.remove("hidden"),r.classList.add("bg-blue-50","border-blue-300","text-blue-700")):(t.classList.add("hidden"),r.classList.remove("bg-blue-50","border-blue-300","text-blue-700"))}positionDropdown(e,t){const r=t.getBoundingClientRect(),s=window.innerWidth,o=e.offsetWidth||300;if(s<=768){e.style.position="fixed",e.style.top=`${r.bottom+4}px`,e.style.left="1rem",e.style.right="1rem",e.style.width="auto",e.style.minWidth="auto",e.style.maxWidth="none";return}e.style.position="fixed",e.style.top=`${r.bottom+4}px`;let a=r.left+r.width/2-o/2;a<16?a=16:a+o>s-16&&(a=s-o-16),e.style.left=`${a}px`,e.style.right="auto",e.style.width=""}closeAllDropdowns(e){var s;const t=document.querySelectorAll(".filter-dropdown"),r=(s=this.container)==null?void 0:s.querySelectorAll(".filter-tab");t.forEach(o=>{const a=o.id.replace("-dropdown","");e&&a===e||o.classList.add("hidden")}),r.forEach(o=>{const a=o.id.replace("-tab","");e&&a===e||o.classList.remove("bg-blue-50","border-blue-300","text-blue-700")})}updateTabLabel(e){var i;const t=(i=this.container)==null?void 0:i.querySelector(`#${e}-tab`);if(!t)return;const r=this.filterCriteria[e],s=t.querySelector("span:first-child");if(!s)return;const a={people:"👥 People",years:"📅 Years",tags:"🏷️ Tags",cameraMakes:"📷 Camera",cameraModels:"📸 Model",places:"📍 Places"}[e];if(r&&r.length>0){if(r.length===1){const n=r[0],l=typeof n=="string"?n.length>15?n.substring(0,15)+"...":n:n.toString();s.textContent=`${a}: ${l}`}else s.textContent=`${a}: ${r.length} selected`;t.classList.add("bg-blue-50","border-blue-400","text-blue-700")}else s.textContent=a,t.classList.remove("bg-blue-50","border-blue-400","text-blue-700")}initializeTabLabels(){["people","years","tags","cameraMakes","cameraModels","places"].forEach(e=>{this.updateTabLabel(e)})}generateFilterOptions(){const e={people:[],years:[],cameraMakes:[],cameraModels:[],places:[],tags:[]};this.photos.forEach(t=>{const r=t.metadata;if(!r)return;r.person&&Array.isArray(r.person)&&r.person.forEach(a=>{a&&a!=="no_person_detected"&&a!=="no_categorical_info"&&!e.people.includes(a)&&e.people.push(a)});const s=a=>{if(!a)return null;let i=null;if(i=new Date(a),!isNaN(i.getTime()))return i.getFullYear();const n=/\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+(\d{4})/i,l=a.match(n);if(l){const h=parseInt(l[1]);if(!isNaN(h)&&h>1900&&h<3e3)return h}const p=/\b(19|20)\d{2}\b/,d=a.match(p);if(d){const h=parseInt(d[0]);if(!isNaN(h)&&h>1900&&h<3e3)return h}return null};let o=null;r.taken_at&&(o=s(r.taken_at)),!o&&r.modified_at&&(o=s(r.modified_at)),o&&!e.years.includes(o)&&e.years.push(o),r.make&&!e.cameraMakes.includes(r.make)&&e.cameraMakes.push(r.make),r.model&&!e.cameraModels.includes(r.model)&&e.cameraModels.push(r.model),r.place&&!e.places.includes(r.place)&&e.places.push(r.place),r.tags&&(Array.isArray(r.tags)?r.tags:[r.tags]).forEach(i=>{i&&!e.tags.includes(i)&&e.tags.push(i)})}),e.people.sort(),e.years.sort((t,r)=>r-t),e.cameraMakes.sort(),e.cameraModels.sort(),e.places.sort(),e.tags.sort(),this.filterOptions=e,this.callbacks.onFilterOptionsUpdate&&this.callbacks.onFilterOptionsUpdate(e)}updateFilterUI(){this.container&&(this.updateFilterSection("people",this.filterOptions.people),this.updateFilterSection("years",this.filterOptions.years.map(String)),this.updateFilterSection("cameraMakes",this.filterOptions.cameraMakes),this.updateFilterSection("cameraModels",this.filterOptions.cameraModels),this.updateFilterSection("places",this.filterOptions.places),this.updateFilterSection("tags",this.filterOptions.tags),this.updateActiveFilters(),this.initializeTabLabels())}updateFilterSection(e,t){var i;const r=document.querySelector(`#${e}-dropdown`),s=r==null?void 0:r.querySelector(".max-h-64, .max-h-48"),o=(i=this.container)==null?void 0:i.querySelector(`#${e}-count`);if(!s||!o)return;o.textContent=t.length.toString();const a=this.filterCriteria[e]||[];e==="people"?this.updatePeopleFilter(s,t,a):this.updateStandardFilter(s,e,t,a),this.updateTabLabel(e)}updatePeopleFilter(e,t,r){const s=t.filter(d=>d!=="no_person_detected"&&d!=="no_categorical_info");if(s.length===0){e.innerHTML=`
        <div class="py-4 text-xs text-gray-500 text-center italic">
          No people found
        </div>
      `;return}let o=e.querySelector(".people-grid");o||(o=document.createElement("div"),o.className="people-grid flex flex-wrap gap-2 py-2",e.innerHTML="",e.appendChild(o));const a=new Map;o.querySelectorAll(".person-filter-item").forEach(d=>{const h=d.dataset.personId;h&&a.set(h,d)}),a.forEach((d,h)=>{s.includes(h)||(d.remove(),this.peopleCache.delete(h))});const i=s.filter(d=>r.includes(d)),n=s.filter(d=>!r.includes(d)),l=[...i,...n.slice(0,Math.max(this.INITIAL_PEOPLE_LIMIT-i.length,16))],p=document.createDocumentFragment();l.forEach(d=>{let h=a.get(d)||this.peopleCache.get(d);h?o.contains(h)||p.appendChild(h):(h=this.createPersonElement(d),this.peopleCache.set(d,h),p.appendChild(h)),this.updatePersonElementState(h,r.includes(d))}),p.children.length>0&&o.appendChild(p),s.length>l.length&&this.addShowMoreButton(o,s,l,r)}addShowMoreButton(e,t,r,s){const o=e.querySelector(".show-more-people");o&&o.remove();const a=t.length-r.length,i=document.createElement("div");i.className="show-more-people w-full mt-2",i.innerHTML=`
      <button class="w-full py-2 px-3 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition-colors">
        +${a} more
      </button>
    `;const n=i.querySelector("button");this.addEventListenerTracked(n,"click",l=>{l.preventDefault(),l.stopPropagation();const h=t.filter(f=>!r.includes(f)).slice(0,50),m=document.createDocumentFragment();h.forEach(f=>{let v=this.peopleCache.get(f);v||(v=this.createPersonElement(f),this.peopleCache.set(f,v)),this.updatePersonElementState(v,s.includes(f)),m.appendChild(v)}),e.insertBefore(m,i),r.push(...h);const E=t.length-r.length;E>0?n.textContent=`+${E} more`:i.remove()}),e.appendChild(i)}createPersonElement(e){const t=e.charAt(0).toUpperCase()+e.slice(1).toLowerCase(),r=g.getPersonImageUrl(e),s=document.createElement("div");s.className="person-filter-item group cursor-pointer",s.dataset.personId=e,s.innerHTML=`
      <div class="relative">
        <img 
          ${this.imageObserver?`data-src="${r}"`:`src="${r}"`}
          alt="${t}"
          class="person-avatar w-14 h-14 rounded-full object-cover border-2 transition-all duration-200 bg-gray-100"
          loading="lazy"
        />
        <div class="person-fallback w-14 h-14 rounded-full bg-gray-200 border-2 border-gray-300 hidden items-center justify-center text-sm text-gray-500 font-medium">
          ${e.substring(0,2).toUpperCase()}
        </div>
      </div>
    `;const o=s.querySelector(".person-avatar"),a=s.querySelector(".person-fallback");return this.addEventListenerTracked(o,"error",()=>{o.style.display="none",a.style.display="flex"}),this.imageObserver&&o.dataset.src&&this.imageObserver.observe(o),this.addEventListenerTracked(s,"click",i=>{i.preventDefault(),i.stopPropagation(),this.handlePersonFilterToggle(e)}),s}updatePersonElementState(e,t){const r=e.querySelector(".person-avatar"),s=e.querySelector(".person-fallback");t?(r.className="person-avatar w-14 h-14 rounded-full object-cover border-2 transition-all duration-200 border-blue-500 ring-2 ring-blue-200",s&&(s.className="person-fallback w-14 h-14 rounded-full bg-gray-200 border-2 border-blue-500 ring-2 ring-blue-200 hidden items-center justify-center text-sm text-gray-500 font-medium")):(r.className="person-avatar w-14 h-14 rounded-full object-cover border-2 transition-all duration-200 border-gray-300 group-hover:border-blue-400",s&&(s.className="person-fallback w-14 h-14 rounded-full bg-gray-200 border-2 border-gray-300 hidden items-center justify-center text-sm text-gray-500 font-medium"))}updateStandardFilter(e,t,r,s){e.innerHTML=r.length>0?r.map(a=>{const i=s.includes(a);return`
        <label class="flex items-center space-x-2 py-1.5 px-2 hover:bg-gray-50 rounded cursor-pointer text-sm">
          <input 
            type="checkbox" 
            value="${a}" 
            data-filter-type="${t}"
            ${i?"checked":""}
            class="filter-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <span class="text-gray-700 truncate flex-1">${a}</span>
        </label>
      `}).join(""):`
      <div class="py-4 text-sm text-gray-500 text-center italic">
        No ${t} found
      </div>
    `,e.querySelectorAll(".filter-checkbox").forEach(a=>{this.addEventListenerTracked(a,"change",i=>{this.handleFilterChange(i),setTimeout(()=>this.closeAllDropdowns(),100)})})}handlePersonFilterToggle(e){var a;this.filterCriteria.people||(this.filterCriteria.people=[]);const t=this.filterCriteria.people,r=t.indexOf(e),s=r>-1;s?t.splice(r,1):t.push(e),t.length===0&&delete this.filterCriteria.people;const o=(a=this.container)==null?void 0:a.querySelector(`[data-person-id="${e}"]`);o&&this.updatePersonElementState(o,!s),this.applyFilters(),this.updateActiveFilters(),this.updateTabLabel("people"),setTimeout(()=>this.closeAllDropdowns(),100)}handleFilterChange(e){const t=e.target,r=t.dataset.filterType,s=t.value;if(r){if(this.filterCriteria[r]||(this.filterCriteria[r]=[]),r==="years"){const o=this.filterCriteria[r],a=parseInt(s);if(isNaN(a))return;if(t.checked)o.includes(a)||o.push(a);else{const i=o.indexOf(a);i>-1&&o.splice(i,1)}o.length===0&&delete this.filterCriteria[r]}else{const o=this.filterCriteria[r];if(t.checked)o.includes(s)||o.push(s);else{const a=o.indexOf(s);a>-1&&o.splice(a,1)}o.length===0&&delete this.filterCriteria[r]}this.applyFilters(),this.updateActiveFilters(),this.updateTabLabel(r)}}applyFilters(e=!1){this.filteredPhotos=this.photos.filter(t=>this.matchesFilter(t,this.filterCriteria)),this.callbacks.onFilterChange(this.filteredPhotos),this.updateActiveFilters(),!e&&!this.isInitialLoad&&this.scrollToTop()}matchesFilter(e,t){const r=e.metadata;if(!r)return Object.keys(t).length===0;if(t.resourceDirectory&&t.resourceDirectory.length>0){if(!r.resource_directory)return console.log("Photo missing resource_directory:",e.id),!1;const s=r.resource_directory.replace(/\//g,"\\").toLowerCase();if(!t.resourceDirectory.some(a=>{const i=a.replace(/\//g,"\\").toLowerCase();return s.includes(i)||i.includes(s)}))return console.log("Photo does not match resource directory filter:",e.id,s),!1}if(t.searchText&&![r.filename,r.absolute_path,r.description,r.place,...r.person||[],...Array.isArray(r.tags)?r.tags:[r.tags].filter(Boolean)].filter(Boolean).map(a=>a.toLowerCase()).some(a=>a.includes(t.searchText))||t.people&&t.people.length>0&&(!r.person||!Array.isArray(r.person)||!t.people.some(o=>r.person.includes(o))))return!1;if(t.years&&t.years.length>0){const s=a=>{if(!a)return null;let i=null;if(i=new Date(a),!isNaN(i.getTime()))return i.getFullYear();const n=/\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+(\d{4})/i,l=a.match(n);if(l){const h=parseInt(l[1]);if(!isNaN(h)&&h>1900&&h<3e3)return h}const p=/\b(19|20)\d{2}\b/,d=a.match(p);if(d){const h=parseInt(d[0]);if(!isNaN(h)&&h>1900&&h<3e3)return h}return null};let o=null;if(r.taken_at&&(o=s(r.taken_at)),!o&&r.modified_at&&(o=s(r.modified_at)),!o||!t.years.includes(o))return!1}if(t.cameraMakes&&t.cameraMakes.length>0&&(!r.make||!t.cameraMakes.includes(r.make))||t.cameraModels&&t.cameraModels.length>0&&(!r.model||!t.cameraModels.includes(r.model))||t.places&&t.places.length>0&&(!r.place||!t.places.includes(r.place)))return!1;if(t.tags&&t.tags.length>0){if(!r.tags)return!1;const s=Array.isArray(r.tags)?r.tags:[r.tags];if(!t.tags.some(a=>s.includes(a)))return!1}return!0}updateActiveFilters(){var r;const e=(r=this.container)==null?void 0:r.querySelector("#active-filters");if(!e)return;const t=[];if(this.filterCriteria.searchText&&t.push(`
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
      `),Object.entries(this.filterCriteria).forEach(([s,o])=>{if(s==="searchText"||s==="resourceDirectory"||!o||!Array.isArray(o)||o.length===0)return;const a={people:"👥",years:"📅",cameraMakes:"📷",cameraModels:"📸",places:"📍",tags:"🏷️"},i={people:"bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",years:"bg-green-100 text-green-800 border-green-200 hover:bg-green-200",cameraMakes:"bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",cameraModels:"bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",places:"bg-red-100 text-red-800 border-red-200 hover:bg-red-200",tags:"bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200"};o.forEach(n=>{if(s==="people"){const l=g.getPersonImageUrl(n),p=n.length>15?n.substring(0,15)+"...":n;t.push(`
            <span class="inline-flex items-center px-1.5 py-1 rounded-md text-xs font-medium border transition-colors ${i[s]}">
              <img 
                src="${l}" 
                alt="${p}"
                class="w-5 h-5 rounded-full object-cover border border-purple-300 mr-1.5"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              />
              <div class="w-5 h-5 rounded-full bg-purple-200 border border-purple-300 items-center justify-center text-xs text-purple-600 font-medium mr-1.5" style="display:none;">
                ${n.substring(0,2).toUpperCase()}
              </div>
              <span class="truncate max-w-[80px]" title="${n}">${p}</span>
              <button class="ml-1.5 p-0.5 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors active-filter-remove" data-type="${s}" data-value="${n}">
                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </span>
          `)}else{const l=n.length>20?n.substring(0,20)+"...":n;t.push(`
            <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border transition-colors ${i[s]||"bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"}">
              <span class="mr-1">${a[s]}</span>
              ${l}
              <button class="ml-1.5 p-0.5 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors active-filter-remove" data-type="${s}" data-value="${n}">
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
      `,e.classList.remove("hidden"),e.querySelectorAll(".active-filter-remove").forEach(a=>{this.addEventListenerTracked(a,"click",i=>{i.stopPropagation();const l=i.target.closest(".active-filter-remove");if(l){const p=l.dataset.type,d=l.dataset.value;p&&d&&this.clearFilter(p,d)}})});const o=e.querySelector(".clear-all-filters");o&&this.addEventListenerTracked(o,"click",()=>{this.clearAllFilters()})}else e.innerHTML="",e.classList.add("hidden")}clearFilter(e,t){var r,s;if(e==="searchText"){this.filterCriteria.searchText=void 0;const o=(r=this.container)==null?void 0:r.querySelector("#filter-search-text");o&&(o.value="")}else if(this.filterCriteria[e])if(e==="years"){const o=this.filterCriteria[e],a=parseInt(t);if(!isNaN(a)){const i=o.indexOf(a);i>-1&&o.splice(i,1)}}else if(e==="people"){const o=this.filterCriteria[e],a=o.indexOf(t);if(a>-1){o.splice(a,1);const i=(s=this.container)==null?void 0:s.querySelector(`[data-person-id="${t}"]`);i&&this.updatePersonElementState(i,!1)}}else{const o=this.filterCriteria[e],a=o.indexOf(t);a>-1&&o.splice(a,1)}this.updateActiveFilters(),this.applyFilters(),e!=="searchText"&&this.updateTabLabel(e),this.scrollToTop()}clearAllFilters(){var a,i,n;const e=this.filterCriteria.resourceDirectory,t=this.filterCriteria.personContext;this.filterCriteria={searchText:void 0,people:[],years:[],cameraMakes:[],cameraModels:[],places:[],tags:[],resourceDirectory:e,personContext:t};const r=(a=this.container)==null?void 0:a.querySelector("#filter-search-text");r&&(r.value=""),((i=this.container)==null?void 0:i.querySelectorAll('input[type="checkbox"]')).forEach(l=>{l.checked=!1}),((n=this.container)==null?void 0:n.querySelectorAll(".person-filter-item")).forEach(l=>{this.updatePersonElementState(l,!1)}),["people","years","tags","cameraMakes","cameraModels","places"].forEach(l=>{this.updateTabLabel(l)}),this.closeAllDropdowns(),this.updateFilterUI(),this.updateActiveFilters(),this.applyFilters(),this.scrollToTop()}updateSearchLoadingState(e){var r;const t=(r=this.container)==null?void 0:r.querySelector("#filter-search-text");t&&(t.disabled=e,e?(t.placeholder="Searching...",t.classList.add("opacity-50")):(t.placeholder="Search photos... (Press Enter)",t.classList.remove("opacity-50")))}handleSearchError(e){e&&console.error("Semantic search error:",e)}handleSearchComplete(e){e&&console.log("Semantic search completed")}applyFiltersToSemanticResults(){if(!this.semanticSearchResults.length){console.log("No semantic search results to filter"),this.callbacks.onFilterChange([]);return}console.log("Applying filters to",this.semanticSearchResults.length,"semantic search results"),console.log("Current filter criteria:",this.filterCriteria);const e=this.semanticSearchResults.filter(t=>this.matchesFilter(t,this.filterCriteria));console.log("Filtered results:",e.length,"photos"),this.filteredPhotos=e,this.callbacks.onFilterChange(e),this.callbacks.onSemanticSearch&&this.callbacks.onSemanticSearch(e),this.scrollToTop()}scrollToTop(){this.isInitializing||window.scrollTo(0,0)}async performSemanticSearch(e){this.isSemanticSearchMode=!0,this.currentSearchTerm=e;const t={};e.trim()&&(t.query=[e]),this.filterCriteria.resourceDirectory&&this.filterCriteria.resourceDirectory.length>0&&(t.resource_directory=this.filterCriteria.resourceDirectory),this.filterCriteria.personContext&&(t.person=[this.filterCriteria.personContext]);const r=this.fuzzySearchService.buildQueryString(t);console.log("Performing semantic search with filters:",t),console.log("Generated query string:",r);try{this.updateSearchLoadingState(!0);const s=await g.searchImages(r,{isInitialSearch:!0}),o=A(s);o.sort((a,i)=>{const n=parseFloat(String(a.score||0));return parseFloat(String(i.score||0))-n}),console.log("Semantic search completed:",o.length,"photos"),this.semanticSearchResults=o,this.applyFiltersToSemanticResults()}catch(s){console.error("Failed to perform semantic search:",s),this.handleSearchError(s instanceof Error?s.message:"Search failed"),this.clearSemanticSearch()}finally{this.updateSearchLoadingState(!1)}}clearSemanticSearch(){this.isSemanticSearchMode=!1,this.currentSearchTerm="",this.semanticSearchResults=[],this.filterCriteria.searchText=void 0,this.applyFilters()}setResourceDirectory(e){this.filterCriteria.resourceDirectory=e.length>0?e:void 0,this.isSemanticSearchMode&&this.currentSearchTerm?this.performSemanticSearch(this.currentSearchTerm):this.applyFilters()}setPersonContext(e){this.filterCriteria.personContext=e,this.isSemanticSearchMode&&this.currentSearchTerm?this.performSemanticSearch(this.currentSearchTerm):this.applyFilters()}isInSemanticSearchMode(){return this.isSemanticSearchMode}getCurrentSearchTerm(){return this.currentSearchTerm}}export{T as C,B as F,z as I,q as P,g as S,L as U,C as a,D as m,A as t};
