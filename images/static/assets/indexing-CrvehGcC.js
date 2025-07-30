var v=Object.defineProperty;var b=(n,e,t)=>e in n?v(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var i=(n,e,t)=>b(n,typeof e!="symbol"?e+"":e,t);import{e as h,L as m,C as x}from"./config-C3qbAENF.js";/* empty css              */import{h as g}from"./utils-B3qE-N8V.js";class p{static async getPartitions(){try{const e=await fetch(h.GET_PARTITIONS);if(!e.ok)throw new Error(`Error fetching partitions: ${e.statusText}`);return await e.json()}catch(e){return console.error("Error in getPartitions:",e),[]}}static async getSuggestionPath(e){try{const t=await fetch(h.GET_SUGGESTION_PATH,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!t.ok)throw new Error(`Error fetching suggestion path: ${t.statusText}`);return await t.json()}catch(t){return console.error("Error in getSuggestionPath:",t),[]}}}class y{constructor(e,t={}){i(this,"container");i(this,"currentPath",[]);i(this,"currentDrive",null);i(this,"searchQuery","");i(this,"sortOrder","asc");i(this,"options");i(this,"isLoading",!1);i(this,"availableDrives",[]);i(this,"isDriveSelectionMode",!0);i(this,"currentFolders",[]);this.container=document.getElementById(e),this.options={showOkButton:!0,showCancelButton:!0,title:"Select Folder",drives:[],...t},this.availableDrives=this.options.drives||[],this.render(),this.loadDrives()}async fetchFolders(e){this.searchQuery="",this.clearSearchInput();try{return(await p.getSuggestionPath(e)).filter(o=>!/\.[a-zA-Z0-9]+$/.test(o)).map(o=>({name:o,type:"folder"}))}catch(t){return console.error("Error fetching folders:",t),[]}}clearSearchInput(){const e=this.container.querySelector("#search-input");e&&(e.value="")}render(){this.container.innerHTML=g`
      <div class="bg-white border border-gray-200 rounded-xl shadow-xl max-w-3xl mx-auto flex flex-col max-h-[80vh]">
        <!-- Header -->
        <div class="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
          <div class="flex items-center space-x-3">
            <div class="p-2 bg-blue-100 rounded-lg">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-800">${this.options.title}</h3>
          </div>
          <div class="flex items-center space-x-2">
            <button id="back-btn" class="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled title="Go back">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <button id="sort-btn" class="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200" title="Toggle sort order">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Search bar -->
        <div class="p-5 border-b border-gray-200">
          <div class="relative">
            <input 
              type="text" 
              id="search-input" 
              placeholder="Search folders..." 
              class="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
            />
            <svg class="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>            </svg>
          </div>
        </div>        
        <!-- Folder list -->
        <div class="flex-1 overflow-y-auto min-h-0">
          <div id="loading" class="hidden p-12 text-center text-gray-500">
            <div class="inline-block animate-spin rounded-full h-10 w-10 border-3 border-blue-500 border-t-transparent"></div>
            <p class="mt-4 text-lg font-medium">Loading folders...</p>
          </div>
          <div id="folder-list" class="divide-y grid grid-cols-3 divide-gray-100"></div>
          <div id="empty-state" class="hidden p-12 text-center text-gray-500">
            <div class="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
            </div>
            <p class="text-lg font-medium text-gray-600">No folders found</p>
            <p class="text-sm text-gray-500 mt-1">Try adjusting your search or navigate to a different location</p>
          </div>
        </div>        
        <!-- Footer buttons -->
        <div class="flex p-5 justify-between align-middle bg-gray-50 rounded-b-xl border-t border-gray-200">
          <div id="breadcrumb" class="flex items-center space-x-2 text-sm">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span class="text-gray-500 font-medium">Location:</span>
              <div class="flex items-center space-x-1">
                <span id="current-path" class="font-mono text-gray-700 bg-white px-3 py-1.5 rounded-lg border shadow-sm">Computer</span>
              </div>
            </div>

        ${this.options.showOkButton||this.options.showCancelButton?`
        <div class="flex justify-end space-x-3 flex-shrink-0">
          ${this.options.showCancelButton?`
            <button id="cancel-btn" class="px-3 py-2 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium transition-all duration-200">
              Cancel
            </button>
          `:""}
          ${this.options.showOkButton?`            <button id="ok-btn" class="px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" ${this.isDriveSelectionMode?"disabled":""}>
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Select Current Location
            </button>
          `:""}
        </div>
        </div>
        `:""}
      </div>
    `,this.attachEventListeners()}attachEventListeners(){const e=this.container.querySelector("#back-btn");e==null||e.addEventListener("click",()=>this.navigateBack());const t=this.container.querySelector("#sort-btn");t==null||t.addEventListener("click",()=>this.toggleSort());const s=this.container.querySelector("#search-input");s==null||s.addEventListener("input",a=>{this.searchQuery=a.target.value,this.renderFilteredFolders()});const o=this.container.querySelector("#ok-btn");o==null||o.addEventListener("click",()=>this.handleOk());const r=this.container.querySelector("#cancel-btn");r==null||r.addEventListener("click",()=>this.handleCancel())}async loadDrives(){this.setLoading(!0),this.isDriveSelectionMode=!0;try{const e=this.availableDrives.map(t=>({name:t,type:"folder"}));this.currentFolders=e,this.renderFolderList(e),this.updateBreadcrumb(),this.updateOkButton()}catch(e){console.error("Error loading drives:",e)}finally{this.setLoading(!1)}}async loadFolders(){if(this.currentDrive){this.setLoading(!0),this.isDriveSelectionMode=!1;try{const e=await this.fetchFolders({location:"LOCAL",identifier:this.currentDrive,uri:this.currentPath});this.currentFolders=e,this.renderFolderList(e),this.updateBreadcrumb(),this.updateOkButton()}catch(e){console.error("Error loading folders:",e)}finally{this.setLoading(!1)}}}renderFolderList(e){const t=this.container.querySelector("#folder-list"),s=this.container.querySelector("#empty-state");if(e.length===0){t.innerHTML="",s.classList.remove("hidden");return}s.classList.add("hidden");const o=this.sortFolders(e),r=this.filterFolders(o);t.innerHTML=r.map(a=>this.generateFolderHTML(a)).join(""),this.attachFolderEventListeners(t)}renderFilteredFolders(){const e=this.sortFolders(this.currentFolders),t=this.filterFolders(e),s=this.container.querySelector("#folder-list"),o=this.container.querySelector("#empty-state");if(t.length===0){s.innerHTML="",o.classList.remove("hidden");return}o.classList.add("hidden"),s.innerHTML=t.map(r=>this.generateFolderHTML(r)).join(""),this.attachFolderEventListeners(s)}filterFolders(e){return this.searchQuery.trim()?e.filter(t=>t.name.toLowerCase().includes(this.searchQuery.toLowerCase())):e}sortFolders(e){return[...e].sort((t,s)=>{const o=t.name.localeCompare(s.name);return this.sortOrder==="asc"?o:-o})}async navigateToFolder(e){this.isDriveSelectionMode?(this.currentDrive=e,this.currentPath=[],await this.loadFolders(),this.updateBackButton(),this.updateOkButton()):(this.currentPath.push(e),await this.loadFolders(),this.updateBackButton(),this.updateOkButton())}navigateBack(){this.currentPath.length>0?(this.currentPath.pop(),this.loadFolders()):this.currentDrive&&(this.currentDrive=null,this.isDriveSelectionMode=!0,this.loadDrives()),this.updateBackButton(),this.updateOkButton()}toggleSort(){this.sortOrder=this.sortOrder==="asc"?"desc":"asc";const t=this.container.querySelector("#sort-btn").querySelector("svg");t&&(t.style.transform=this.sortOrder==="desc"?"rotate(180deg)":"rotate(0deg)"),this.renderFilteredFolders()}updateBreadcrumb(){const e=this.container.querySelector("#current-path"),t=this.container.querySelector("#breadcrumb");let s="Computer";this.isDriveSelectionMode?(s="Computer",t&&t.classList.add("invisible")):this.currentDrive&&(s=this.currentDrive,this.currentPath.length>0&&(s+="/"+this.currentPath.join("/")),t&&t.classList.remove("invisible")),console.log(`Updating breadcrumb: ${s}`),e&&(e.textContent=s)}updateBackButton(){const e=this.container.querySelector("#back-btn");e.disabled=this.isDriveSelectionMode&&this.currentPath.length===0}updateOkButton(){const e=this.container.querySelector("#ok-btn");e&&(e.disabled=this.isDriveSelectionMode)}setLoading(e){this.isLoading=e;const t=this.container.querySelector("#loading"),s=this.container.querySelector("#folder-list");e?(t.classList.remove("hidden"),s.classList.add("hidden")):(t.classList.add("hidden"),s.classList.remove("hidden"))}handleOk(){if(this.options.onFolderSelect){const e={location:this.currentDrive?"LOCAL":"REMOTE",identifier:this.currentDrive||"",uri:this.currentPath.length>0?this.currentPath:[]};this.options.onFolderSelect(e)}}handleCancel(){this.options.onCancel&&this.options.onCancel()}getCurrentPath(){return{location:this.currentDrive?"LOCAL":"REMOTE",identifier:this.currentDrive||"",uri:this.currentPath.length>0?this.currentPath:[]}}getSelectedFolder(){return this.getCurrentPath()}destroy(){this.container.innerHTML=""}attachFolderEventListeners(e){e.querySelectorAll(".folder-item").forEach(t=>{var o;const s=t.cloneNode(!0);(o=t.parentNode)==null||o.replaceChild(s,t)}),e.querySelectorAll(".folder-item").forEach(t=>{const s=t.getAttribute("data-folder");t.addEventListener("click",()=>{console.log(`Navigating to folder: ${s}`),this.navigateToFolder(s)})})}generateFolderHTML(e){return`
      <div class="folder-item text-xsm flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 border-l-4 border-transparent hover:border-blue-200" data-folder="${e.name}">
        <div class="flex items-center space-x-4 flex-1">
          <div class="flex items-center space-x-3 flex-1">
            <div class="p-2 bg-blue-50 rounded-lg">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-gray-800 text-xs">${e.name}</p>
              <p class="text-xs text-gray-500">Folder</p>
            </div>
          </div>
        </div>
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </div>
      </div>
    `}}const u=new Set;let c=!1;function S(){c||(c=!0,queueMicrotask(()=>{c=!1;const n=Array.from(u);u.clear();for(const e of n)e()}))}function w(n){u.add(n),S()}class k{constructor(e){i(this,"_value");i(this,"listeners",new Set);this._value=e}get value(){return this._value}set value(e){if(this._value!==e){this._value=e;for(const t of this.listeners)w(t)}}subscribe(e){return this.listeners.add(e),e(),()=>{this.listeners.delete(e)}}}function d(n,e){const t=e.map(s=>s.subscribe(n));return()=>{t.forEach(s=>s())}}const L={isIndexing:!1,isCancelling:!1,indexProgress:0,extraDetails:"",eta:0,uri:[],location:"",identifier:"",completeRescan:!1,selectedProtocol:"none",error:null,simulateIndexing:!1};class C{constructor(e){i(this,"state",new k({...L}));i(this,"root");i(this,"apiUrl");i(this,"pollingTimeout",null);i(this,"pageLoaded",!0);i(this,"partitions",[]);i(this,"folderSelector",null);i(this,"subscriptions",[]);i(this,"refs",{});this.root=e.root,this.apiUrl=e.apiUrl,this.render(),this.cacheDomRefs(),this.setupReactiveSystem(),this.updateSelectedPathDisplay(""),this.pollIndexStatus(this.pageLoaded),p.getPartitions().then(t=>{this.partitions=t}).catch(t=>{console.error("Error fetching partitions:",t)})}setState(e){this.state.value={...this.state.value,...e}}hasValidSelection(){const{identifier:e,selectedProtocol:t}=this.state.value;return e!==""&&e!=="none"&&(t==="none"||t!=="none")}cacheDomRefs(){this.refs={protocolSelect:this.root.querySelector("#protocol-select"),rescanCheckbox:this.root.querySelector("#complete-rescan"),browseBtn:this.root.querySelector("#browse-btn"),simulateIndexingCheckbox:this.root.querySelector("#simulate-indexing"),scanBtn:this.root.querySelector("#scan-btn"),cancelBtn:this.root.querySelector("#cancel-btn"),advancedToggle:this.root.querySelector("#advanced-toggle"),advancedOptions:this.root.querySelector("#advanced-options"),advancedChevron:this.root.querySelector("#advanced-chevron")}}setupReactiveSystem(){this.subscriptions.push(d(this.updateActionButtons.bind(this),[this.state]),d(this.updateProgressSection.bind(this),[this.state]),d(this.updateErrorSection.bind(this),[this.state]),d(this.updateInputsState.bind(this),[this.state]))}render(){this.root.innerHTML="";const e=document.createElement("div");e.className="bg-white rounded-lg shadow-md p-6 border border-gray-200 w-full max-w-2xl mx-auto",e.innerHTML=g`
      <div class="space-y-4 w-full">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            📁 Select Folder on Your Computer
          </label>
          <div class="flex space-x-2">
            <div class="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm min-h-[42px] flex items-center">
              <span id="selected-path">No folder selected</span>
            </div>
            <button
              id="browse-btn"
              type="button"
              class="px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
            >
              📁 Browse...
            </button>
          </div>
        </div>
        <div>
          <label
            for="protocol-select"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            ☁️ Or, Connect a Cloud Service
          </label>
          <div class="relative">
            <select
              id="protocol-select"
              class="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed text-sm appearance-none bg-white shadow-sm transition-colors"
            >
              <option value="none" selected>None (Use folder on computer)</option>
              <option value="google_photos">🌟 Google Photos</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>
        <div class="">
          <button
            type="button"
            id="advanced-toggle"
            class="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-2 hover:bg-gray-50 transition-colors"
          >
            <span class="flex items-center">
              <span class="mr-2">⚙️</span>
              Advanced Options
            </span>
            <svg
              id="advanced-chevron"
              class="w-4 h-4 mr-1 transform transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          <div id="advanced-options" class="hidden mt-3 space-y-4 pl-8">
            <div class="flex items-start space-x-3">
              <input
                type="checkbox"
                id="complete-rescan"
                class="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div>
                <label
                  for="complete-rescan"
                  class="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Re-scan All Photos
                </label>
                <p class="text-xs text-gray-500 mt-1 leading-relaxed">
                  Scans all photos again, even if already added. Use this if photos
                  were missed, changed, or for a more thorough update.
                </p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <input
                type="checkbox"
                id="simulate-indexing"
                class="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div>
                <label
                  for="simulate-indexing"
                  class="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Simulate Indexing
                </label>
                <p class="text-xs text-gray-500 mt-1 leading-relaxed">
                  Perform a dry run without actually indexing photos. Useful for testing.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="flex space-x-3 pt-2">
          <button
            id="scan-btn"
            disabled
            class="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 transition-colors"
          >
            <span class="mr-2">🔍</span>
            Scan Photos
          </button>
          <button
            id="cancel-btn"
            disabled
            style="display:none"
            class="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 transition-colors"
          >
            <span class="mr-2">⏹️</span>
            Stop Scan
          </button>
        </div>
      </div>
    `,this.root.appendChild(e);const t=document.createElement("div");t.id="folder-selector-modal",t.className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden",t.innerHTML=`
      <div class="rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div id="folder-selector-content"></div>
      </div>
    `,document.body.appendChild(t),this.cacheDomRefs(),this.attachEvents()}updateProgressSection(){var a;const{isIndexing:e,indexProgress:t,eta:s,extraDetails:o}=this.state.value,r=this.root.querySelector(".bg-blue-50");if(e){const l=`
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-700">Scan Progress</span>
            <span class="text-sm font-semibold text-blue-600">${(t*100).toFixed(1)}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${t*100}%"></div>
          </div>
          <div class="space-y-1 text-sm text-gray-600">
            ${s?`<div><span class="font-medium">Time left:</span> ${s}</div>`:""}
            ${o?`<div><span class="font-medium">Status:</span> ${o}</div>`:""}
          </div>
        </div>
      `;if(r)r.outerHTML=l;else{const f=(a=this.root.querySelector("select"))==null?void 0:a.parentElement;f&&f.insertAdjacentHTML("afterend",l)}}else r&&r.remove()}updateErrorSection(){const{error:e}=this.state.value,t=this.root.querySelector(".bg-red-50");if(e){const s=`
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div class="flex">
            <span class="text-red-400 mr-2">⚠️</span>
            <span class="text-red-800">${e}</span>
          </div>
        </div>
      `;if(t)t.outerHTML=s;else{const o=this.root.querySelector("h2");o&&o.insertAdjacentHTML("afterend",s)}}else t&&t.remove()}updateInputsState(){const{isIndexing:e,selectedProtocol:t}=this.state.value,{protocolSelect:s,rescanCheckbox:o,browseBtn:r,simulateIndexingCheckbox:a,advancedToggle:l}=this.refs;r&&(r.disabled=e||t!=="none"),s&&(s.disabled=e),o&&(o.disabled=e),a&&(a.disabled=e),l&&(l.disabled=e)}updateActionButtons(){const{isIndexing:e,isCancelling:t}=this.state.value,{scanBtn:s,cancelBtn:o}=this.refs,r=this.hasValidSelection();if(s&&(s.style.display=e?"none":"flex",s.disabled=e||!r),o){o.style.display=e?"flex":"none",o.disabled=!e;const a=t?"⏳":"⏹️",l=t?"Stopping...":"Stop Scan";o.innerHTML=`<span class="mr-2">${a}</span>${l}`}}attachEvents(){this.root.addEventListener("change",e=>{console.log("Attaching change event to root");const t=e.target;if(t.id==="simulate-indexing")this.setState({simulateIndexing:t.checked});else if(t.id==="protocol-select"){const s=t.value;this.setState({selectedProtocol:s}),s==="none"?(this.setState({identifier:"",uri:[],location:""}),this.updateSelectedPathDisplay("")):(this.setState({identifier:s,uri:[],location:s}),this.updateSelectedPathDisplay(this.getDisplayPath()))}else t.id==="complete-rescan"&&this.setState({completeRescan:t.checked})}),this.refs.browseBtn&&(console.log("Attaching click event to browse button"),this.refs.browseBtn.addEventListener("click",()=>this.openFolderSelector())),this.refs.scanBtn&&(console.log("Attaching click event to scan button"),this.refs.scanBtn.addEventListener("click",()=>this.startIndexing())),this.refs.cancelBtn&&(console.log("Attaching click event to cancel button"),this.refs.cancelBtn.addEventListener("click",()=>this.cancelIndexing())),this.refs.advancedToggle&&(console.log("Attaching click event to advanced toggle"),this.refs.advancedToggle.addEventListener("click",()=>this.toggleAdvancedOptions()))}async startIndexing(){const{identifier:e,uri:t,location:s}=this.state.value;if(!e||e===""||e==="none"){this.setState({error:"Please choose a folder or connect a cloud service."});return}this.setState({error:null,isIndexing:!0,isCancelling:!1}),this.showNotification("Preparing to scan...","info");try{const o={location:s,identifier:e,uri:t,complete_rescan:this.state.value.completeRescan,simulate_indexing:this.state.value.simulateIndexing},a=await(await fetch(h.INDEX_START,{method:"POST",body:JSON.stringify(o),headers:{"Content-Type":"application/json"}})).json();a.error?(this.setState({error:a.details||"Failed to start scanning photos.",isIndexing:!1}),this.showNotification(this.state.value.error,"error")):(this.showNotification("Photo scan started successfully!","success"),this.pollIndexStatus())}catch{this.setState({error:"Could not start scanning. Please check the folder path or service.",isIndexing:!1}),this.showNotification(this.state.value.error,"error")}}async pollIndexStatus(e=!1){if(!(!e&&!this.state.value.isIndexing))try{const s=await(await fetch(`${this.apiUrl}/getIndexStatus`)).json();if(s.done){this.state.value.isCancelling&&this.showNotification("Scan stopped successfully","warning"),this.setState({isIndexing:!1,isCancelling:!1,indexProgress:0,extraDetails:"",eta:0}),this.pollingTimeout=null,this.clearAllInputs();return}this.pageLoaded&&this.setState({isIndexing:!0}),this.setState({indexProgress:(s.processed??0)/(s.total||1),eta:s.eta,extraDetails:s.details||"",error:null}),this.pollingTimeout=window.setTimeout(()=>this.pollIndexStatus(),1e3)}catch{this.setState({error:"Couldn't check scan progress. Will retry..."}),this.pollingTimeout=window.setTimeout(()=>this.pollIndexStatus(),5e3)}finally{this.pageLoaded=!1}}async cancelIndexing(){if(this.state.value.isIndexing){this.setState({isCancelling:!0}),this.showNotification("Stopping scan...","warning");try{await fetch(`${this.apiUrl}/indexCancel`),this.pollIndexStatus()}catch{this.setState({error:"Could not stop the scan. Please contact administrator.",isCancelling:!1}),this.showNotification(this.state.value.error,"error")}}}updateSelectedPathDisplay(e){const t=this.root.querySelector("#selected-path");t&&(t.textContent=e||"No folder selected")}getDisplayPath(){const{identifier:e,uri:t,location:s,selectedProtocol:o}=this.state.value;return!e||e==="none"?"":o==="none"&&s==="LOCAL"?t.length>0?`${e}\\${t.join("\\")}`:e:o}showNotification(e,t="info"){const s=document.createElement("div");switch(s.className=`notification notification-${t}`,s.textContent=e,s.style.cssText=`
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      max-width: 400px;
      word-wrap: break-word;
    `,t){case"success":s.style.backgroundColor="#10b981";break;case"error":s.style.backgroundColor="#ef4444";break;case"warning":s.style.backgroundColor="#f59e0b";break;default:s.style.backgroundColor="#3b82f6"}document.body.appendChild(s),setTimeout(()=>{s.parentNode&&s.parentNode.removeChild(s)},5e3)}clearAllInputs(){this.refs.simulateIndexingCheckbox&&(this.refs.simulateIndexingCheckbox.checked=!1),this.refs.protocolSelect&&(this.refs.protocolSelect.value="none"),this.refs.rescanCheckbox&&(this.refs.rescanCheckbox.checked=!1),this.setState({uri:[],location:"",identifier:"",simulateIndexing:!1,selectedProtocol:"none",completeRescan:!1}),this.updateSelectedPathDisplay("")}openFolderSelector(){console.log("Opening folder selector");const e=document.getElementById("folder-selector-modal"),t=document.getElementById("folder-selector-content");if(!e||!t)return;t.innerHTML="";const s=this.partitions.filter(r=>r.location==="LOCAL").map(r=>r.identifier);this.folderSelector=new y("folder-selector-content",{title:"Select Photo Directory",drives:s.length>0?s:["C:","D:","E:"],onFolderSelect:r=>{this.setState({identifier:r.identifier,uri:r.uri,location:r.location});const a=r.uri.length>0?`${r.identifier}/${r.uri.join("/")}`:r.identifier;this.updateSelectedPathDisplay(a),this.closeFolderSelector()},onCancel:()=>{this.closeFolderSelector()},showOkButton:!0,showCancelButton:!0}),e.classList.remove("hidden"),e.addEventListener("click",r=>{r.target===e&&this.closeFolderSelector()});const o=r=>{r.key==="Escape"&&(this.closeFolderSelector(),document.removeEventListener("keydown",o))};document.addEventListener("keydown",o)}closeFolderSelector(){const e=document.getElementById("folder-selector-modal");e&&e.classList.add("hidden"),this.folderSelector&&(this.folderSelector.destroy(),this.folderSelector=null)}toggleAdvancedOptions(){const{advancedOptions:e,advancedChevron:t}=this.refs;if(!e||!t)return;e.classList.contains("hidden")?(e.classList.remove("hidden"),t.style.transform="rotate(180deg)"):(e.classList.add("hidden"),t.style.transform="rotate(0deg)")}destroy(){this.subscriptions.forEach(t=>t()),this.subscriptions=[],this.pollingTimeout&&(clearTimeout(this.pollingTimeout),this.pollingTimeout=null),this.folderSelector&&(this.folderSelector.destroy(),this.folderSelector=null);const e=document.getElementById("folder-selector-modal");e&&e.remove(),this.root.innerHTML=""}}new m({title:"Add Photos - Hachi",currentPage:"/indexing.html",showNavbar:!0});document.addEventListener("DOMContentLoaded",()=>{const n=document.getElementById("indexing-root");n&&(n.innerHTML="",new C({root:n,apiUrl:x.apiUrl}))});
