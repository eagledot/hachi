var C=Object.defineProperty;var E=(u,e,t)=>e in u?C(u,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):u[e]=t;var c=(u,e,t)=>E(u,typeof e!="symbol"?e+"":e,t);import{h as k}from"./utils-B3qE-N8V.js";import{C as M}from"./config-URX23xdb.js";function F(u){if(!u.trim())return"";const e=u.split(" ").filter(a=>a.length>0),t=[],r=[];e.forEach(a=>{a.includes("=")?t.push(a):r.push(a)});let s=t.join("&");if(r.length>0){const a=`query=${r.join(" ")}`;s.length>0?s+=`&${a}`:s=a}return s}function I(u){return!u.data_hash||!u.score||!u.meta_data||!(u.data_hash.length===u.score.length&&u.score.length===u.meta_data.length)?(console.error("Malformed rawData in transformRawDataChunk:",u),[]):u.data_hash.map((t,r)=>({id:t,score:parseFloat(u.score[r]),metadata:u.meta_data[r]}))}function _(u,e){const t=new Map(u.map(s=>[s.id,{...s}]));e.forEach(s=>{if(t.has(s.id)){const a=t.get(s.id);a.score=(Number(a.score)||0)+(Number(s.score)||0),a.metadata=s.metadata}else t.set(s.id,s)});const r=Array.from(t.values());return r.sort((s,a)=>(Number(a.score)||0)-(Number(s.score)||0)),r}const y=M.apiUrl,v={QUERY:`${y}/query`,GET_SUGGESTION:`${y}/getSuggestion`,GET_IMAGE:`${y}/getRawDataFull`,GET_PREVIEW_IMAGE:`${y}/getRawData`,GET_PERSON_IMAGE:`${y}/getPreviewPerson`},x={getImageUrl:u=>`${v.GET_IMAGE}/${encodeURIComponent(u)}`,getPreviewImageUrl:u=>`${v.GET_PREVIEW_IMAGE}/${encodeURIComponent(u)}`,getPersonImageUrl:u=>`${v.GET_PERSON_IMAGE}/${encodeURIComponent(u)}`},L={MIN_SEARCH_LENGTH:1,ERROR_MESSAGES:{SEARCH_FAILED:"Search request failed. Please try again.",UNKNOWN_ERROR:"An unknown error occurred."}},P={FORM_URLENCODED:"application/x-www-form-urlencoded"};class p{static async searchImages(e,t){console.log("SearchApiService.searchImages called with:",{searchTerm:e,options:t});const{isInitialSearch:r,clientId:s}=t,a=e.includes("=")||e.includes("&")?e:F(e),o=new URLSearchParams;o.append("query",a),o.append("query_start",String(r)),!r&&s&&o.append("client_id",s);const i=await fetch(v.QUERY,{method:"POST",headers:{"Content-Type":P.FORM_URLENCODED},body:o.toString()});if(!i.ok){const d=await i.text();throw new Error(`${L.ERROR_MESSAGES.SEARCH_FAILED}: ${i.statusText} - ${d}`)}return await i.json()}static getImageUrl(e){return x.getImageUrl(e)}static getPreviewImageUrl(e){return x.getPreviewImageUrl(e)}static getPersonImageUrl(e){return x.getPersonImageUrl(e)}}const f=class f{constructor(e){c(this,"container");c(this,"loadingIndicator");c(this,"errorDisplay");c(this,"photoGrid");c(this,"noResultsMessage");c(this,"modal");c(this,"modalImage");c(this,"modalMetadata");c(this,"modalPrevBtn");c(this,"modalNextBtn");c(this,"modalCloseBtn");c(this,"modalFullscreenBtn");c(this,"modalLikeBtn");c(this,"modalFacesBtn");c(this,"modalFilename");c(this,"currentFullImageLoader",null);c(this,"showScores",!1);c(this,"photoElementPool",[]);c(this,"maxPoolSize",100);c(this,"currentPhotoClick",null);c(this,"eventCleanupFunctions",[]);c(this,"globalKeydownHandler");const t=document.getElementById(e);if(!t)throw new Error(`Container with id '${e}' not found`);this.container=t,this.initializeElements()}initializeElements(){if(this.loadingIndicator=this.container.querySelector("#loading-indicator"),this.errorDisplay=this.container.querySelector("#error-display"),this.photoGrid=this.container.querySelector("#photo-grid"),this.noResultsMessage=this.container.querySelector("#no-results-message"),this.modal=document.querySelector("#image-modal"),this.modalImage=document.querySelector("#modal-image"),this.modalMetadata=document.querySelector("#modal-metadata"),this.modalPrevBtn=document.querySelector("#modal-prev-btn"),this.modalNextBtn=document.querySelector("#modal-next-btn"),this.modalCloseBtn=document.querySelector("#modal-close-btn"),this.modalFullscreenBtn=document.querySelector("#modal-fullscreen-btn"),this.modalLikeBtn=document.querySelector("#modal-like-btn"),this.modalFacesBtn=document.querySelector("#modal-faces-btn"),this.modalFilename=document.querySelector("#modal-filename"),!this.photoGrid)throw new Error("Required UI elements not found")}setupEventListeners(e){if(this.cleanupEventListeners(),this.modalCloseBtn){const t=()=>e.onModalClose();this.modalCloseBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalCloseBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalNextBtn){const t=()=>e.onModalNext();this.modalNextBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalNextBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalPrevBtn){const t=()=>e.onModalPrevious();this.modalPrevBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalPrevBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalFullscreenBtn){const t=this.handleToggleFullScreen.bind(this);this.modalFullscreenBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalFullscreenBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalLikeBtn){const t=this.handleLike.bind(this);this.modalLikeBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalLikeBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modalFacesBtn){const t=this.handleShowFaces.bind(this);this.modalFacesBtn.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modalFacesBtn)==null?void 0:r.removeEventListener("click",t)})}if(this.modal){const t=r=>{r.target===this.modal&&e.onModalClose()};this.modal.addEventListener("click",t),this.eventCleanupFunctions.push(()=>{var r;return(r=this.modal)==null?void 0:r.removeEventListener("click",t)})}this.globalKeydownHandler=t=>{if(!(!this.modal||this.modal.classList.contains("hidden")))switch(t.key){case"Escape":e.onModalClose();break;case"ArrowLeft":e.onModalPrevious();break;case"ArrowRight":e.onModalNext();break}},document.addEventListener("keydown",this.globalKeydownHandler)}cleanupEventListeners(){this.eventCleanupFunctions.forEach(e=>e()),this.eventCleanupFunctions=[],this.globalKeydownHandler&&(document.removeEventListener("keydown",this.globalKeydownHandler),this.globalKeydownHandler=void 0)}destroy(){this.cleanupEventListeners(),this.photoElementPool=[],this.currentPhotoClick=null,this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null)}updateLoading(e){this.loadingIndicator&&(e?this.loadingIndicator.classList.remove("hidden"):this.loadingIndicator.classList.add("hidden"))}updateError(e){this.errorDisplay&&(e?(this.errorDisplay.textContent=`Error: ${e}`,this.errorDisplay.classList.remove("hidden")):this.errorDisplay.classList.add("hidden"))}updatePhotos(e,t){if(!(!this.photoGrid||!this.noResultsMessage)){if(e.length===0){this.clearPhotoGrid(),this.noResultsMessage.classList.remove("hidden");return}this.noResultsMessage.classList.add("hidden"),this.currentPhotoClick=t,this.updatePhotoGridForPagination(e)}}clearPhotoGrid(){this.photoElementPool.forEach(e=>{e.style.display="none"})}updatePhotoGridForPagination(e){this.ensureElementPool(e.length),e.forEach((t,r)=>{const s=this.photoElementPool[r];this.updateElementWithPhotoData(s,t),s.style.display="block"});for(let t=e.length;t<this.photoElementPool.length;t++)this.photoElementPool[t].style.display="none";this.ensureElementsInDOM(e.length)}ensureElementPool(e){const t=Math.min(e,this.maxPoolSize)-this.photoElementPool.length;for(let r=0;r<t;r++){const s=this.createEmptyPhotoElement();this.photoElementPool.push(s)}}ensureElementsInDOM(e){const t=document.createDocumentFragment();let r=!1;for(let s=0;s<e&&s<this.photoElementPool.length;s++){const a=this.photoElementPool[s];a.parentNode||(t.appendChild(a),r=!0)}r&&this.photoGrid.appendChild(t)}createEmptyPhotoElement(){const e=document.createElement("div");e.className="group relative bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer",e.style.height="180px";const t=document.createElement("img");t.className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200",t.loading="lazy",t.onerror=()=>{t.src=f.FALLBACK_IMAGE_SVG,t.alt="Image not found"};const r=document.createElement("div");r.className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100";const s=document.createElement("div");return s.className="text-white bg-black/50 rounded-full p-2",s.innerHTML=f.VIEW_ICON_SVG,r.appendChild(s),e.appendChild(t),e.appendChild(r),e}updateElementWithPhotoData(e,t){var a;const r=e.querySelector("img");if(!r)return;r.src=p.getPreviewImageUrl(t.id),r.alt=((a=t.metadata)==null?void 0:a.filename)||"",e.setAttribute("data-photo-id",t.id);const s=e.querySelector(".score-badge");if(s&&s.remove(),this.showScores&&t.score!==void 0&&t.score!==null){const o=document.createElement("div");o.className="score-badge absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow z-10",o.textContent=Number(t.score).toFixed(3),e.appendChild(o)}e.onclick=null,this.currentPhotoClick&&(e.onclick=o=>{o.preventDefault(),o.stopPropagation(),this.currentPhotoClick(t)})}showModal(e,t,r){var s;if(!this.modal){console.error("Modal element not found");return}if(!this.modalImage){console.error("Modal image element not found");return}this.loadImageProgressively(e),this.modalImage.alt=((s=e.metadata)==null?void 0:s.filename)||"Image",this.updateModalMetadata(e),this.updateModalNavigation(t,r),this.updateModalFilename(e),this.modal.classList.remove("hidden"),document.body.style.overflow="hidden"}loadImageProgressively(e){var a,o;if(!this.modalImage)return;this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null),(a=e.metadata)!=null&&a.width&&((o=e.metadata)!=null&&o.height)?(this.modalImage.setAttribute("width",e.metadata.width.toString()),this.modalImage.setAttribute("height",e.metadata.height.toString())):(this.modalImage.removeAttribute("width"),this.modalImage.removeAttribute("height")),this.modalImage.style.width="",this.modalImage.style.height="";const t=p.getPreviewImageUrl(e.id),r=p.getImageUrl(e.id);this.modalImage.src=t,this.currentFullImageLoader=new Image;const s=this.currentFullImageLoader;s.src=r,s.onload=()=>{this.currentFullImageLoader===s&&this.modalImage&&(this.modalImage.src=r),this.currentFullImageLoader===s&&(this.currentFullImageLoader=null)},s.onerror=()=>{console.error("Failed to load full resolution image:",r),this.currentFullImageLoader===s&&(this.currentFullImageLoader=null)}}hideModal(){if(!this.modal){console.error("Modal element not found for hiding");return}this.currentFullImageLoader&&(this.currentFullImageLoader.onload=null,this.currentFullImageLoader.onerror=null,this.currentFullImageLoader=null),this.modal.classList.add("hidden"),document.body.style.overflow="auto"}updateModalNavigation(e,t){!this.modalPrevBtn||!this.modalNextBtn||(this.modalPrevBtn.disabled=!e,this.modalNextBtn.disabled=!t,e?this.modalPrevBtn.classList.remove("opacity-50","cursor-not-allowed"):this.modalPrevBtn.classList.add("opacity-50","cursor-not-allowed"),t?this.modalNextBtn.classList.remove("opacity-50","cursor-not-allowed"):this.modalNextBtn.classList.add("opacity-50","cursor-not-allowed"))}updateModalMetadata(e){var o;if(!this.modalMetadata)return;const t=e.metadata;if(!t){this.modalMetadata.innerHTML='<p class="text-gray-500">No metadata available</p>';return}const r=[{label:"Filename",value:t.filename},{label:"Dimensions",value:t.width&&t.height?`${t.width} × ${t.height}`:null},{label:"Date Taken",value:t.taken_at&&t.taken_at.toLowerCase()!=="unk"?t.taken_at:null},{label:"Location",value:t.place&&t.place.toLowerCase()!=="unk"?t.place:null},{label:"Description",value:t.description},{label:"Device",value:t.device&&t.device.toLowerCase()!=="unk"?t.device:null}].filter(i=>i.value&&i.value.toString().trim()!==""),s=document.createDocumentFragment();if(r.forEach(i=>{const d=document.createElement("div");d.className="grid grid-cols-3 gap-2 py-1 border-b border-gray-800 last:border-b-0";const h=document.createElement("span");h.className="font-semibold col-span-1 text-gray-800",h.textContent=`${i.label}:`;const m=document.createElement("span");m.className="col-span-2 text-gray-500",m.textContent=i.value,d.appendChild(h),d.appendChild(m),s.appendChild(d)}),t.person&&t.person.length>0&&!t.person.every(i=>i==="no_person_detected"||i==="no_categorical_info")){const i=document.createElement("div");i.className="py-1 border-b border-gray-800";const d=document.createElement("span");d.className="font-semibold text-gray-800",d.textContent="People:";const h=document.createElement("div");h.className="flex flex-wrap gap-2 mt-1",h.setAttribute("data-people-container","true"),(((o=t.person)==null?void 0:o.filter(n=>n!=="no_person_detected"&&n!=="no_categorical_info"))||[]).forEach(n=>{const l=document.createElement("div");l.className="flex flex-col items-center";const g=document.createElement("img");g.src=p.getPersonImageUrl(n),g.alt=n,g.className="w-12 h-12 rounded-full object-cover border border-gray-300 cursor-pointer hover:border-blue-500 transition-colors",g.title=`Click to view ${n}'s photos`,g.setAttribute("data-person-id",n),g.addEventListener("click",()=>this.handlePersonAvatarClick(n)),l.appendChild(g),h.appendChild(l)}),i.appendChild(d),i.appendChild(h),s.appendChild(i)}this.modalMetadata.innerHTML="",this.modalMetadata.appendChild(s)}updateModalFilename(e){var t;this.modalFilename&&((t=e.metadata)!=null&&t.filename?(this.modalFilename.textContent=e.metadata.filename,this.modalFilename.classList.remove("hidden")):this.modalFilename.classList.add("hidden"))}showNoResults(e){this.noResultsMessage&&(e?this.noResultsMessage.classList.remove("hidden"):this.noResultsMessage.classList.add("hidden"))}handleToggleFullScreen(){this.modalImage&&(document.fullscreenElement?document.exitFullscreen():this.modalImage.requestFullscreen().catch(e=>{console.error(`Error attempting to enable full-screen mode: ${e.message} (${e.name})`),alert("Could not enter fullscreen. Your browser might not support it or it's disabled.")}))}handleLike(){alert('Feature "Like" is a placeholder.')}handleShowFaces(){alert('Feature "Show Faces" is a placeholder.')}handlePersonAvatarClick(e){try{this.hideModal();const t=window.location.pathname,r=`/person-photos.html?id=${encodeURIComponent(e)}`;t.includes("person-photos.html")?window.location.replace(r):window.location.href=r}catch(t){console.error("Error navigating to person page:",t),alert(`Failed to navigate to person page: ${e}`)}}};c(f,"FALLBACK_IMAGE_SVG","data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4="),c(f,"VIEW_ICON_SVG",'<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>');let w=f;const b={person:{icon:"👤",color:"bg-green-100 text-green-800 border-green-200",examples:["john","sarah","mike"],description:"Search for people in your photos",displayName:"People"},query:{icon:"🔍",color:"bg-purple-100 text-purple-800 border-purple-200",examples:["sunset","birthday party","vacation"],description:"Search photo descriptions and content",displayName:"Keywords"},resource_directory:{icon:"📁",color:"bg-yellow-100 text-yellow-800 border-yellow-200",examples:["vacation","photos","2023"],description:"Browse photos by folder or album",displayName:"Folders"}};class A{constructor(){c(this,"currentSuggestionController",null)}async getSuggestionBatch(e,t){console.log("getSuggestionBatch called with:",{attribute:e,query:t});try{const r=new FormData;r.append("attribute",e),r.append("query",t);const s=await fetch(`${v.GET_SUGGESTION}`,{method:"POST",body:r});if(console.log("API response status for",e,":",s.status),s.ok){const a=await s.json();return console.log("API response data for",e,":",a),a[e]||[]}else console.error("API response not ok for",e,":",s.status,s.statusText)}catch(r){console.warn(`Failed to fetch suggestions for ${e}:`,r)}return[]}async getSuggestion(e,t){console.log("getSuggestion called with:",{attribute:e,query:t}),this.currentSuggestionController&&this.currentSuggestionController.abort(),this.currentSuggestionController=new AbortController;try{const r=new FormData;r.append("attribute",e),r.append("query",t);const s=await fetch(`${v.GET_SUGGESTION}`,{method:"POST",body:r,signal:this.currentSuggestionController.signal});if(console.log("API response status:",s.status),s.ok){const a=await s.json();return console.log("API response data:",a),a[e]||[]}else console.error("API response not ok:",s.status,s.statusText)}catch(r){r instanceof Error&&r.name==="AbortError"?console.log("Suggestion request was cancelled"):console.warn(`Failed to fetch suggestions for ${e}:`,r)}finally{this.currentSuggestionController=null}return[]}async generateAllAttributeSuggestions(e){if(console.log("generateAllAttributeSuggestions called with:",e),!e.trim())return[];const r=this.getAvailableAttributes().filter(s=>s!=="query").map(async s=>{try{return(await this.getSuggestionBatch(s,e)).map(o=>({text:o,attribute:s,type:"suggestion"}))}catch(a){return console.warn(`Failed to fetch suggestions for ${s}:`,a),[]}});try{const o=(await Promise.all(r)).flat().filter(n=>n.text&&n.text.trim()),i=o.filter(n=>n.attribute==="person"),d=o.filter(n=>n.attribute==="resource_directory"),h=o.filter(n=>n.attribute!=="person"&&n.attribute!=="resource_directory");return[...i,...d,...h].slice(0,15)}catch(s){return console.error("Error generating all attribute suggestions:",s),[]}}async generateSuggestions(e,t){if(console.log("generateSuggestions called with:",{attribute:e,value:t}),!t.trim())return[];try{return(await this.getSuggestion(e,t)).map(a=>({text:a,attribute:e,type:"suggestion"}))}catch(r){return console.error("Error generating suggestions:",r),[]}}buildQueryString(e,t,r){const s={...e};t&&r&&(s[t]=[...s[t]||[],r]);let a="";const o=Object.keys(s).filter(i=>s[i].length>0);for(let i=0;i<o.length;i++){const d=o[i],h=s[d];a+=d+"=";for(let m=0;m<h.length;m++)a+=h[m],m!==h.length-1&&(a+="?");i!==o.length-1&&(a+="&")}return a}getAttributeIcon(e){const t=b[e];return t?t.icon:"#️⃣"}getAttributeColor(e){const t=b[e];return t?t.color:"bg-gray-100 text-gray-800 border-gray-200"}getAttributeDisplayName(e){const t=b[e];return t?t.displayName:e.charAt(0).toUpperCase()+e.slice(1).replace("_"," ")}getAttributeDescription(e){const t=b[e];return t?t.description:"Search attribute"}getAvailableAttributes(){return Object.keys(b)}cleanup(){this.currentSuggestionController&&(this.currentSuggestionController.abort(),this.currentSuggestionController=null)}}class R{static getTemplate(){return k`      <!-- Image Modal (reusable component) -->
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
    `}static initialize(){if(!document.getElementById("image-modal")&&(document.body.insertAdjacentHTML("beforeend",this.getTemplate()),!document.getElementById("image-modal-styles"))){const e=document.createElement("style");e.id="image-modal-styles",e.textContent=this.getStyles(),document.head.appendChild(e)}}}class ${static getTemplate(e={}){const{containerId:t="photo-grid-container",loadingId:r="loading-indicator",errorId:s="error-display",noResultsId:a="no-results-message",gridId:o="photo-grid"}=e;return`
      <!-- Photo Grid Container (reusable component) -->
      <div id="${t}">
        <!-- Loading indicator -->
        <div id="${r}" class="hidden justify-center items-center py-8">
          <div class="flex items-center space-x-2">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span class="text-gray-600 text-sm">Loading photos...</span>
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
        <div id="${o}" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
    `}static initialize(e,t={}){const r=document.getElementById(e);if(!r)throw new Error(`Container with id '${e}' not found`);const{loadingId:s="loading-indicator",errorId:a="error-display",noResultsId:o="no-results-message",gridId:i="photo-grid",personMode:d=!1}=t;let h=this.getTemplate({containerId:e+"-inner",loadingId:s,errorId:a,noResultsId:o,gridId:i});d&&(h=h.replace(/<div id="${noResultsId}"[^>]*>.*?<\/div>/s,this.getPersonNoResultsTemplate(o))),r.innerHTML=h}}class S{constructor(e){c(this,"photos",[]);c(this,"filteredPhotos",[]);c(this,"semanticSearchResults",[]);c(this,"filterCriteria",{});c(this,"filterOptions",{people:[],years:[],cameraMakes:[],cameraModels:[],places:[],tags:[]});c(this,"callbacks");c(this,"container",null);c(this,"eventListeners",new Map);c(this,"peopleCache",new Map);c(this,"imageObserver",null);c(this,"INITIAL_PEOPLE_LIMIT",20);c(this,"fuzzySearchService");c(this,"isSemanticSearchMode",!1);c(this,"currentSearchTerm","");c(this,"isInitialLoad",!0);c(this,"isInitializing",!1);this.callbacks=e,this.fuzzySearchService=new A}initialize(e){const t=document.getElementById(e);if(!t)throw new Error(`Filter container with id '${e}' not found`);this.container=t,this.setupImageObserver(),this.render(),this.setupEventListeners()}updatePhotos(e){this.isInitializing=!0,this.photos=[...e],this.generateFilterOptions(),this.applyFilters(!0),this.updateFilterUI(),this.isInitialLoad=!1,setTimeout(()=>{this.isInitializing=!1},100)}getFilteredPhotos(){return[...this.filteredPhotos]}resetFilters(){const e=this.filterCriteria.resourceDirectory;this.filterCriteria={resourceDirectory:e},this.applyFilters(),this.updateFilterUI(),this.scrollToTop()}destroy(){this.eventListeners.forEach(e=>{e.forEach(t=>t())}),this.eventListeners.clear(),this.peopleCache.clear(),this.imageObserver&&(this.imageObserver.disconnect(),this.imageObserver=null),this.fuzzySearchService.cleanup()}setupImageObserver(){"IntersectionObserver"in window&&(this.imageObserver=new IntersectionObserver(e=>{e.forEach(t=>{var r;if(t.isIntersecting){const s=t.target;s.dataset.src&&(s.src=s.dataset.src,s.removeAttribute("data-src"),(r=this.imageObserver)==null||r.unobserve(s))}})},{rootMargin:"50px 0px",threshold:.1}))}addEventListenerTracked(e,t,r){e.addEventListener(t,r);const s=()=>e.removeEventListener(t,r);this.eventListeners.has(e)||this.eventListeners.set(e,[]),this.eventListeners.get(e).push(s)}static getTemplate(e="photo-filter"){return k`
      <!-- Photo Filter Component - Compact Sidebar Style -->
      <div
        id="${e}"
        class="bg-white border border-gray-200 rounded-lg shadow-sm sticky top-4 max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
      >
        <!-- Compact Header -->
        <div
          class="flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100"
        >          <h3 class="text-base font-semibold text-gray-900 flex items-center">
            <svg
              class="w-4 h-4 mr-2 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"
              ></path>
            </svg>
            Filters
          </h3>          <button
            id="reset-filters"
            class="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium flex items-center space-x-1"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>Reset</span>
          </button>
        </div>        <!-- Compact Scrollable Content -->
        <div class="flex-1 overflow-y-auto">
          <div class="p-3 space-y-4">
            <!-- Compact Search Text Filter -->
            <div class="filter-group">
              <label class="block text-xs font-medium text-gray-700 mb-2"
                >Search</label
              >
              <input
                type="text"
                id="filter-search-text"
                placeholder="Search photos... (Press Enter)"
                class="w-full px-2.5 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>            <!-- Compact Filter Sections -->
            <div class="space-y-3">              <!-- Compact People Filter -->
              <div class="filter-section">
                <button
                  class="filter-toggle w-full flex items-center justify-between py-1.5 text-left group"
                  data-filter="people"
                >
                  <span class="flex items-center space-x-2">
                    <span
                      class="text-xs font-medium text-gray-700 group-hover:text-gray-900"
                      >👥 People</span
                    >
                    <span
                      id="people-count"
                      class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      >0</span
                    >
                  </span>
                  <svg
                    class="filter-chevron w-3.5 h-3.5 text-gray-400 transform transition-transform group-hover:text-gray-600"
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
                <div
                  id="people-filter-content"
                  class="filter-content hidden mt-1.5 ml-3"
                >
                  <div
                    class="max-h-40 overflow-y-auto border-l-2 border-gray-100 pl-2"
                  >
                    <!-- People thumbnails grid will be inserted here -->
                  </div>
                </div>
              </div>              <!-- Compact Years Filter -->
              <div class="filter-section">
                <button
                  class="filter-toggle w-full flex items-center justify-between py-1.5 text-left group"
                  data-filter="years"
                >
                  <span class="flex items-center space-x-2">
                    <span
                      class="text-xs font-medium text-gray-700 group-hover:text-gray-900"
                      >📅 Years</span
                    >
                    <span
                      id="years-count"
                      class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      >0</span
                    >
                  </span>
                  <svg
                    class="filter-chevron w-3.5 h-3.5 text-gray-400 transform transition-transform group-hover:text-gray-600"
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
                <div
                  id="years-filter-content"
                  class="filter-content hidden mt-1.5 ml-3"
                >
                  <div
                    class="max-h-28 overflow-y-auto space-y-0.5 border-l-2 border-gray-100 pl-2"
                  >
                    <!-- Years checkboxes will be inserted here -->
                  </div>
                </div>
              </div>              <!-- Compact Camera Make Filter -->
              <div class="filter-section">
                <button
                  class="filter-toggle w-full flex items-center justify-between py-1.5 text-left group"
                  data-filter="cameraMakes"
                >
                  <span class="flex items-center space-x-2">
                    <span
                      class="text-xs font-medium text-gray-700 group-hover:text-gray-900"
                      >📷 Camera</span
                    >
                    <span
                      id="cameraMakes-count"
                      class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      >0</span
                    >
                  </span>
                  <svg
                    class="filter-chevron w-3.5 h-3.5 text-gray-400 transform transition-transform group-hover:text-gray-600"
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
                <div
                  id="cameraMakes-filter-content"
                  class="filter-content hidden mt-1.5 ml-3"
                >
                  <div
                    class="max-h-28 overflow-y-auto space-y-0.5 border-l-2 border-gray-100 pl-2"
                  >
                    <!-- Camera makes checkboxes will be inserted here -->
                  </div>
                </div>
              </div>              <!-- Compact Camera Model Filter -->
              <div class="filter-section">
                <button
                  class="filter-toggle w-full flex items-center justify-between py-1.5 text-left group"
                  data-filter="cameraModels"
                >
                  <span class="flex items-center space-x-2">
                    <span
                      class="text-xs font-medium text-gray-700 group-hover:text-gray-900"
                      >📸 Model</span
                    >
                    <span
                      id="cameraModels-count"
                      class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      >0</span
                    >
                  </span>
                  <svg
                    class="filter-chevron w-3.5 h-3.5 text-gray-400 transform transition-transform group-hover:text-gray-600"
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
                <div
                  id="cameraModels-filter-content"
                  class="filter-content hidden mt-1.5 ml-3"
                >
                  <div
                    class="max-h-28 overflow-y-auto space-y-0.5 border-l-2 border-gray-100 pl-2"
                  >
                    <!-- Camera models checkboxes will be inserted here -->
                  </div>
                </div>
              </div>              <!-- Compact Places Filter -->
              <div class="filter-section">
                <button
                  class="filter-toggle w-full flex items-center justify-between py-1.5 text-left group"
                  data-filter="places"
                >
                  <span class="flex items-center space-x-2">
                    <span
                      class="text-xs font-medium text-gray-700 group-hover:text-gray-900"
                      >📍 Places</span
                    >
                    <span
                      id="places-count"
                      class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      >0</span
                    >
                  </span>
                  <svg
                    class="filter-chevron w-3.5 h-3.5 text-gray-400 transform transition-transform group-hover:text-gray-600"
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
                <div
                  id="places-filter-content"
                  class="filter-content hidden mt-1.5 ml-3"
                >
                  <div
                    class="max-h-28 overflow-y-auto space-y-0.5 border-l-2 border-gray-100 pl-2"
                  >
                    <!-- Places checkboxes will be inserted here -->
                  </div>
                </div>
              </div>              <!-- Compact Tags Filter -->
              <div class="filter-section">
                <button
                  class="filter-toggle w-full flex items-center justify-between py-1.5 text-left group"
                  data-filter="tags"
                >
                  <span class="flex items-center space-x-2">
                    <span
                      class="text-xs font-medium text-gray-700 group-hover:text-gray-900"
                      >🏷️ Tags</span
                    >
                    <span
                      id="tags-count"
                      class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      >0</span
                    >
                  </span>
                  <svg
                    class="filter-chevron w-3.5 h-3.5 text-gray-400 transform transition-transform group-hover:text-gray-600"
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
                <div
                  id="tags-filter-content"
                  class="filter-content hidden mt-1.5 ml-3"
                >
                  <div
                    class="max-h-28 overflow-y-auto space-y-0.5 border-l-2 border-gray-100 pl-2"
                  >
                    <!-- Tags checkboxes will be inserted here -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Filters Footer -->
        <div id="active-filters" class="border-t border-gray-200 bg-gray-50">
          <!-- Active filter badges will be displayed here -->
        </div>
      </div>
    `}render(){this.container&&(this.container.innerHTML=S.getTemplate().replace(/id="photo-filter"/,`id="${this.container.id}"`))}setupEventListeners(){if(!this.container)return;const e=this.container.querySelector("#filter-search-text");e&&(this.addEventListenerTracked(e,"keydown",s=>{if(s.key==="Enter"){s.preventDefault();const o=s.target.value.trim();o?(console.log("1. Calling performSemanticSearch with:",o),this.performSemanticSearch(o)):this.clearSemanticSearch()}}),this.addEventListenerTracked(e,"input",s=>{!s.target.value.trim()&&this.isSemanticSearchMode&&this.clearSemanticSearch()}));const t=this.container.querySelector("#reset-filters");t&&this.addEventListenerTracked(t,"click",()=>{this.resetFilters(),e&&(e.value="")}),this.container.querySelectorAll(".filter-toggle").forEach(s=>{this.addEventListenerTracked(s,"click",a=>{const i=a.currentTarget.dataset.filter;i&&this.toggleFilterSection(i)})})}generateFilterOptions(){const e={people:[],years:[],cameraMakes:[],cameraModels:[],places:[],tags:[]};this.photos.forEach(t=>{const r=t.metadata;if(!r)return;r.person&&Array.isArray(r.person)&&r.person.forEach(o=>{o&&o!=="no_person_detected"&&o!=="no_categorical_info"&&!e.people.includes(o)&&e.people.push(o)});const s=o=>{if(!o)return null;let i=null;if(i=new Date(o),!isNaN(i.getTime()))return i.getFullYear();const d=/\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+(\d{4})/i,h=o.match(d);if(h){const l=parseInt(h[1]);if(!isNaN(l)&&l>1900&&l<3e3)return l}const m=/\b(19|20)\d{2}\b/,n=o.match(m);if(n){const l=parseInt(n[0]);if(!isNaN(l)&&l>1900&&l<3e3)return l}return null};let a=null;r.taken_at&&(a=s(r.taken_at)),!a&&r.modified_at&&(a=s(r.modified_at)),a&&!e.years.includes(a)&&e.years.push(a),r.make&&!e.cameraMakes.includes(r.make)&&e.cameraMakes.push(r.make),r.model&&!e.cameraModels.includes(r.model)&&e.cameraModels.push(r.model),r.place&&!e.places.includes(r.place)&&e.places.push(r.place),r.tags&&(Array.isArray(r.tags)?r.tags:[r.tags]).forEach(i=>{i&&!e.tags.includes(i)&&e.tags.push(i)})}),e.people.sort(),e.years.sort((t,r)=>r-t),e.cameraMakes.sort(),e.cameraModels.sort(),e.places.sort(),e.tags.sort(),this.filterOptions=e,this.callbacks.onFilterOptionsUpdate&&this.callbacks.onFilterOptionsUpdate(e)}updateFilterUI(){this.container&&(this.updateFilterSection("people",this.filterOptions.people),this.updateFilterSection("years",this.filterOptions.years.map(String)),this.updateFilterSection("cameraMakes",this.filterOptions.cameraMakes),this.updateFilterSection("cameraModels",this.filterOptions.cameraModels),this.updateFilterSection("places",this.filterOptions.places),this.updateFilterSection("tags",this.filterOptions.tags),this.updateActiveFilters())}updateFilterSection(e,t){var o,i;const r=(o=this.container)==null?void 0:o.querySelector(`#${e}-filter-content .max-h-40, #${e}-filter-content .max-h-28`),s=(i=this.container)==null?void 0:i.querySelector(`#${e}-count`);if(!r||!s)return;s.textContent=t.length.toString();const a=this.filterCriteria[e]||[];e==="people"?this.updatePeopleFilter(r,t,a):this.updateStandardFilter(r,e,t,a)}updatePeopleFilter(e,t,r){const s=t.filter(n=>n!=="no_person_detected"&&n!=="no_categorical_info");if(s.length===0){e.innerHTML=`
        <div class="py-4 text-xs text-gray-500 text-center italic">
          No people found
        </div>
      `;return}let a=e.querySelector(".people-grid");a||(a=document.createElement("div"),a.className="people-grid grid grid-cols-3 gap-2 py-2",e.innerHTML="",e.appendChild(a));const o=new Map;a.querySelectorAll(".person-filter-item").forEach(n=>{const l=n.dataset.personId;l&&o.set(l,n)}),o.forEach((n,l)=>{s.includes(l)||(n.remove(),this.peopleCache.delete(l))});const i=s.filter(n=>r.includes(n)),d=s.filter(n=>!r.includes(n)),h=[...i,...d.slice(0,this.INITIAL_PEOPLE_LIMIT-i.length)],m=document.createDocumentFragment();h.forEach(n=>{let l=o.get(n)||this.peopleCache.get(n);l?a.contains(l)||m.appendChild(l):(l=this.createPersonElement(n),this.peopleCache.set(n,l),m.appendChild(l)),this.updatePersonElementState(l,r.includes(n))}),m.children.length>0&&a.appendChild(m),s.length>h.length&&this.addShowMoreButton(a,s,h,r)}addShowMoreButton(e,t,r,s){const a=e.querySelector(".show-more-people");a&&a.remove();const o=t.length-r.length,i=document.createElement("div");i.className="show-more-people col-span-3 mt-1.5",i.innerHTML=`
      <button class="w-full py-1.5 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition-colors">
        Show ${o} more people...
      </button>
    `;const d=i.querySelector("button");this.addEventListenerTracked(d,"click",()=>{const h=t.filter(n=>!r.includes(n)),m=document.createDocumentFragment();h.forEach(n=>{let l=this.peopleCache.get(n);l||(l=this.createPersonElement(n),this.peopleCache.set(n,l)),this.updatePersonElementState(l,s.includes(n)),m.appendChild(l)}),e.insertBefore(m,i),i.remove()}),e.appendChild(i)}createPersonElement(e){const t=e.charAt(0).toUpperCase()+e.slice(1).toLowerCase(),r=p.getPersonImageUrl(e),s=document.createElement("div");s.className="person-filter-item group cursor-pointer",s.dataset.personId=e,s.innerHTML=`
      <div class="relative">
        <img 
          ${this.imageObserver?`data-src="${r}"`:`src="${r}"`}
          alt="${t}"
          class="person-avatar w-12 h-12 rounded-full object-cover border-2 transition-all duration-200 bg-gray-100"
          loading="lazy"
        />
        <div class="person-fallback w-12 h-12 rounded-full bg-gray-200 border-2 border-gray-300 hidden items-center justify-center text-xs text-gray-500 font-medium">
          ${e.substring(0,2).toUpperCase()}
        </div>
        <div class="person-checkmark absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full hidden items-center justify-center">
          <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
        </div>
      </div>
      <div class="text-xs text-center mt-1 text-gray-600 truncate max-w-[48px]" title="${t}">
        ${t}
      </div>
    `;const a=s.querySelector(".person-avatar"),o=s.querySelector(".person-fallback");return this.addEventListenerTracked(a,"error",()=>{a.style.display="none",o.style.display="flex"}),this.imageObserver&&a.dataset.src&&this.imageObserver.observe(a),this.addEventListenerTracked(s,"click",i=>{i.preventDefault(),i.stopPropagation(),this.handlePersonFilterToggle(e)}),s}updatePersonElementState(e,t){const r=e.querySelector(".person-avatar"),s=e.querySelector(".person-checkmark");t?(r.className="person-avatar w-12 h-12 rounded-full object-cover border-2 transition-all duration-200 border-blue-500 ring-2 ring-blue-200",s.style.display="flex"):(r.className="person-avatar w-12 h-12 rounded-full object-cover border-2 transition-all duration-200 border-gray-300 group-hover:border-blue-400",s.style.display="none")}updateStandardFilter(e,t,r,s){e.innerHTML=r.length>0?r.map(o=>{const i=s.includes(o);return`
        <label class="flex items-center space-x-1.5 py-0.5 hover:bg-gray-50 rounded cursor-pointer text-xs">
          <input 
            type="checkbox" 
            value="${o}" 
            data-filter-type="${t}"
            ${i?"checked":""}
            class="filter-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
          />
          <span class="text-gray-700 truncate flex-1">${o}</span>
        </label>
      `}).join(""):`
      <div class="py-2 text-xs text-gray-500 text-center italic">
        No ${t} found
      </div>
    `,e.querySelectorAll(".filter-checkbox").forEach(o=>{this.addEventListenerTracked(o,"change",i=>{this.handleFilterChange(i)})})}handlePersonFilterToggle(e){var o;this.filterCriteria.people||(this.filterCriteria.people=[]);const t=this.filterCriteria.people,r=t.indexOf(e),s=r>-1;s?t.splice(r,1):t.push(e),t.length===0&&delete this.filterCriteria.people;const a=(o=this.container)==null?void 0:o.querySelector(`[data-person-id="${e}"]`);a&&this.updatePersonElementState(a,!s),this.applyFilters(),this.updateActiveFilters()}handleFilterChange(e){const t=e.target,r=t.dataset.filterType,s=t.value;if(r){if(this.filterCriteria[r]||(this.filterCriteria[r]=[]),r==="years"){const a=this.filterCriteria[r],o=parseInt(s);if(isNaN(o))return;if(t.checked)a.includes(o)||a.push(o);else{const i=a.indexOf(o);i>-1&&a.splice(i,1)}a.length===0&&delete this.filterCriteria[r]}else{const a=this.filterCriteria[r];if(t.checked)a.includes(s)||a.push(s);else{const o=a.indexOf(s);o>-1&&a.splice(o,1)}a.length===0&&delete this.filterCriteria[r]}this.applyFilters(),this.updateActiveFilters()}}toggleFilterSection(e){var a,o;const t=(a=this.container)==null?void 0:a.querySelector(`#${e}-filter-content`),r=(o=this.container)==null?void 0:o.querySelector(`[data-filter="${e}"] .filter-chevron`);if(!t||!r)return;t.classList.contains("hidden")?(t.classList.remove("hidden"),r.classList.add("rotate-180")):(t.classList.add("hidden"),r.classList.remove("rotate-180"))}applyFilters(e=!1){this.filteredPhotos=this.photos.filter(t=>this.matchesFilter(t,this.filterCriteria)),this.callbacks.onFilterChange(this.filteredPhotos),this.updateActiveFilters(),!e&&!this.isInitialLoad&&this.scrollToTop()}matchesFilter(e,t){const r=e.metadata;if(!r)return Object.keys(t).length===0;if(t.resourceDirectory&&t.resourceDirectory.length>0){if(!r.resource_directory)return console.log("Photo missing resource_directory:",e.id),!1;const s=r.resource_directory.replace(/\//g,"\\").toLowerCase();if(!t.resourceDirectory.some(o=>{const i=o.replace(/\//g,"\\").toLowerCase();return s.includes(i)||i.includes(s)}))return console.log("Photo does not match resource directory filter:",e.id,s),!1}if(t.searchText&&![r.filename,r.absolute_path,r.description,r.place,...r.person||[],...Array.isArray(r.tags)?r.tags:[r.tags].filter(Boolean)].filter(Boolean).map(o=>o.toLowerCase()).some(o=>o.includes(t.searchText))||t.people&&t.people.length>0&&(!r.person||!Array.isArray(r.person)||!t.people.some(a=>r.person.includes(a))))return!1;if(t.years&&t.years.length>0){const s=o=>{if(!o)return null;let i=null;if(i=new Date(o),!isNaN(i.getTime()))return i.getFullYear();const d=/\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+(\d{4})/i,h=o.match(d);if(h){const l=parseInt(h[1]);if(!isNaN(l)&&l>1900&&l<3e3)return l}const m=/\b(19|20)\d{2}\b/,n=o.match(m);if(n){const l=parseInt(n[0]);if(!isNaN(l)&&l>1900&&l<3e3)return l}return null};let a=null;if(r.taken_at&&(a=s(r.taken_at)),!a&&r.modified_at&&(a=s(r.modified_at)),!a||!t.years.includes(a))return!1}if(t.cameraMakes&&t.cameraMakes.length>0&&(!r.make||!t.cameraMakes.includes(r.make))||t.cameraModels&&t.cameraModels.length>0&&(!r.model||!t.cameraModels.includes(r.model))||t.places&&t.places.length>0&&(!r.place||!t.places.includes(r.place)))return!1;if(t.tags&&t.tags.length>0){if(!r.tags)return!1;const s=Array.isArray(r.tags)?r.tags:[r.tags];if(!t.tags.some(o=>s.includes(o)))return!1}return!0}updateActiveFilters(){var r;const e=(r=this.container)==null?void 0:r.querySelector("#active-filters");if(!e)return;const t=[];if(this.filterCriteria.searchText&&t.push(`
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
      `),Object.entries(this.filterCriteria).forEach(([s,a])=>{if(s==="searchText"||s==="resourceDirectory"||!a||!Array.isArray(a)||a.length===0)return;const o={people:"👥",years:"📅",cameraMakes:"📷",cameraModels:"📸",places:"📍",tags:"🏷️"},i={people:"bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",years:"bg-green-100 text-green-800 border-green-200 hover:bg-green-200",cameraMakes:"bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",cameraModels:"bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",places:"bg-red-100 text-red-800 border-red-200 hover:bg-red-200",tags:"bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200"};a.forEach(d=>{const h=s==="people"&&d.length>20?d.substring(0,20)+"...":d;t.push(`
          <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border transition-colors ${i[s]||"bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"}">
            <span class="mr-1">${o[s]}</span>
            ${h}
            <button class="ml-1.5 p-0.5 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors active-filter-remove" data-type="${s}" data-value="${d}">
              <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </span>
        `)})}),t.length>0){e.innerHTML=`
        <div class="p-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-1.5">
              <svg class="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"></path>
              </svg>
              <span class="text-xs font-semibold text-gray-700">Active Filters (${t.length})</span>
            </div>
            <button class="clear-all-filters text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">
              Clear All
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5">${t.join("")}</div>
        </div>
      `,e.classList.remove("hidden"),e.querySelectorAll(".active-filter-remove").forEach(o=>{this.addEventListenerTracked(o,"click",i=>{i.stopPropagation();const h=i.target.closest(".active-filter-remove");if(h){const m=h.dataset.type,n=h.dataset.value;m&&n&&this.clearFilter(m,n)}})});const a=e.querySelector(".clear-all-filters");a&&this.addEventListenerTracked(a,"click",()=>{this.clearAllFilters()})}else e.innerHTML="",e.classList.add("hidden")}clearFilter(e,t){var r;if(e==="searchText"){this.filterCriteria.searchText=void 0;const s=(r=this.container)==null?void 0:r.querySelector("#filter-search-text");s&&(s.value="")}else if(this.filterCriteria[e])if(e==="years"){const s=this.filterCriteria[e],a=parseInt(t);if(!isNaN(a)){const o=s.indexOf(a);o>-1&&s.splice(o,1)}}else{const s=this.filterCriteria[e],a=s.indexOf(t);a>-1&&s.splice(a,1)}this.updateActiveFilters(),this.applyFilters(),this.scrollToTop()}clearAllFilters(){var a,o,i;const e=this.filterCriteria.resourceDirectory;this.filterCriteria={searchText:void 0,people:[],years:[],cameraMakes:[],cameraModels:[],places:[],tags:[],resourceDirectory:e};const t=(a=this.container)==null?void 0:a.querySelector("#filter-search-text");t&&(t.value=""),((o=this.container)==null?void 0:o.querySelectorAll('input[type="checkbox"]')).forEach(d=>{d.checked=!1}),((i=this.container)==null?void 0:i.querySelectorAll(".person-thumbnail.selected")).forEach(d=>{d.classList.remove("selected");const h=d.querySelector(".checkmark");h&&h.classList.add("hidden")}),this.updateFilterUI(),this.updateActiveFilters(),this.applyFilters(),this.scrollToTop()}updateSearchLoadingState(e){var r;const t=(r=this.container)==null?void 0:r.querySelector("#filter-search-text");t&&(t.disabled=e,e?(t.placeholder="Searching...",t.classList.add("opacity-50")):(t.placeholder="Search photos... (Press Enter)",t.classList.remove("opacity-50")))}handleSearchError(e){e&&console.error("Semantic search error:",e)}handleSearchComplete(e){e&&console.log("Semantic search completed")}applyFiltersToSemanticResults(){if(!this.semanticSearchResults.length){console.log("No semantic search results to filter"),this.callbacks.onFilterChange([]);return}console.log("Applying filters to",this.semanticSearchResults.length,"semantic search results"),console.log("Current filter criteria:",this.filterCriteria);const e=this.semanticSearchResults.filter(t=>this.matchesFilter(t,this.filterCriteria));console.log("Filtered results:",e.length,"photos"),this.filteredPhotos=e,this.callbacks.onFilterChange(e),this.callbacks.onSemanticSearch&&this.callbacks.onSemanticSearch(e),this.scrollToTop()}scrollToTop(){this.isInitializing||window.scrollTo(0,0)}async performSemanticSearch(e){this.isSemanticSearchMode=!0,this.currentSearchTerm=e;const t={};if(e.trim()&&(t.query=[e]),this.filterCriteria.resourceDirectory&&this.filterCriteria.resourceDirectory.length>0){const s=this.filterCriteria.resourceDirectory.map(a=>a.replace(/\//g,"\\"));t.resource_directory=s}const r=this.fuzzySearchService.buildQueryString(t);console.log("Performing semantic search with filters:",t),console.log("Generated query string:",r);try{this.updateSearchLoadingState(!0);const s=await p.searchImages(r,{isInitialSearch:!0}),a=I(s);a.sort((o,i)=>{const d=parseFloat(String(o.score||0));return parseFloat(String(i.score||0))-d}),console.log("Semantic search completed:",a.length,"photos"),this.semanticSearchResults=a,this.applyFiltersToSemanticResults()}catch(s){console.error("Failed to perform semantic search:",s),this.handleSearchError(s instanceof Error?s.message:"Search failed"),this.clearSemanticSearch()}finally{this.updateSearchLoadingState(!1)}}clearSemanticSearch(){this.isSemanticSearchMode=!1,this.currentSearchTerm="",this.semanticSearchResults=[],this.filterCriteria.searchText=void 0,this.applyFilters()}setResourceDirectory(e){const t=e.map(r=>r.replace(/\//g,"\\"));this.filterCriteria.resourceDirectory=t.length>0?t:void 0,this.isSemanticSearchMode&&this.currentSearchTerm?this.performSemanticSearch(this.currentSearchTerm):this.applyFilters()}isInSemanticSearchMode(){return this.isSemanticSearchMode}getCurrentSearchTerm(){return this.currentSearchTerm}}export{L as C,A as F,R as I,$ as P,p as S,w as U,S as a,_ as m,I as t};
