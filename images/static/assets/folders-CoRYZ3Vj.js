var h=Object.defineProperty;var m=(n,e,t)=>e in n?h(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var i=(n,e,t)=>m(n,typeof e!="symbol"?e+"":e,t);import{L as u,f,e as c,h as p}from"./layout-BImXdik9.js";/* empty css              */new u({title:"Folders - Hachi",currentPage:"/folders.html",showNavbar:!0});class g{constructor(){i(this,"folders",[]);i(this,"filteredFolders",[]);i(this,"searchTerm","");i(this,"sortBy","name");i(this,"isLoading",!1);this.setupEventListeners(),this.loadFolders();const e=document.getElementById("folders-grid");e&&!e.getAttribute("data-click-delegation")&&(e.addEventListener("click",t=>{const r=t.target.closest(".folder-list-item");if(r&&r.hasAttribute("data-folder-path")){const s=r.getAttribute("data-folder-path");s&&(window.location.href=`/image-search.html?resource_directory=${s}`)}}),e.setAttribute("data-click-delegation","true"))}setupEventListeners(){const e=document.getElementById("folder-search");e&&e.addEventListener("input",r=>{const s=r.target.value.toLowerCase();this.setSearchTerm(s)});const t=document.getElementById("sort-filter");t&&t.addEventListener("change",r=>{const s=r.target.value;this.sortFolders(s)})}async loadFolders(){try{await this.loadFoldersFromAPI()}catch(e){console.error("Error loading folders:",e),this.showError(`Failed to load folders: ${e instanceof Error?e.message:"Unknown error"}`)}finally{}}async loadFoldersFromAPI(){const e=await f(c.GET_FOLDERS);if(!e.ok)throw new Error(`Failed to fetch folders: ${e.status}`);const t=await e.json();if(Array.isArray(t))this.folders=t.map(r=>({name:this.getDisplayName(r.directory),fullPath:r.directory,imageCount:r.count,thumbnailHash:r.thumbnail_hash})),this.folders.sort((r,s)=>s.imageCount-r.imageCount),this.filteredFolders=[...this.folders],this.renderFolders();else throw new Error("Invalid response format")}getDisplayName(e){const t=e.split(/[/\\]/);return t[t.length-1]||e}setSearchTerm(e){this.searchTerm=e,this.filterFolders(),this.renderFolders()}filterFolders(){if(!this.searchTerm){this.filteredFolders=[...this.folders];return}this.filteredFolders=this.folders.filter(e=>e.name.toLowerCase().includes(this.searchTerm)||e.fullPath.toLowerCase().includes(this.searchTerm))}sortFolders(e){this.sortBy=e,this.filteredFolders.sort((t,r)=>{switch(e){case"photos":return r.imageCount-t.imageCount;case"name":default:return t.name.localeCompare(r.name)}})}renderFolders(){const e=document.getElementById("folders-grid"),t=document.getElementById("no-folders");if(!(!e||!t)){if(this.filteredFolders.length===0&&!this.isLoading){e.classList.add("hidden"),t.classList.remove("hidden");return}else if(this.filteredFolders.length===0&&this.isLoading){e.classList.add("hidden"),t.classList.add("hidden");return}t.classList.add("hidden"),e.classList.remove("hidden"),this.batchUpdateFolderGrid(e)}}batchUpdateFolderGrid(e){const t=Array.from(e.querySelectorAll(":scope > .folder-list-item")),r=new Map;t.forEach(a=>{const o=a.getAttribute("data-folder-path");o&&r.set(o,a)});const s=document.createDocumentFragment(),l=new Set;for(const a of this.filteredFolders){const o=encodeURIComponent(a.fullPath);l.add(o);const d=r.get(o);d?(this.updateFolderElement(d,a),s.appendChild(d)):s.appendChild(this.createFolderElement(a))}for(const[a,o]of r.entries())l.has(a)||o.remove();e.appendChild(s)}createFolderElement(e){const t=document.createElement("div");return t.className="folder-list-item px-4 py-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex flex-col gap-1 justify-between",t.setAttribute("data-folder-path",encodeURIComponent(e.fullPath)),t.appendChild(this.buildTopRow(e)),t.appendChild(this.buildPathRow(e)),t}updateFolderElement(e,t){const r=e.querySelector(".folder-name");r&&r.textContent!==t.name&&(r.textContent=t.name,r.title=t.name);const s=e.querySelector(".folder-path");if(s){const{trimmedPath:l}=this.getTrimmedPath(t.fullPath);s.textContent!==l&&(s.textContent=l),s.title!==t.fullPath&&(s.title=t.fullPath)}}buildTopRow(e){const t=document.createElement("div");return t.className="flex items-center gap-3",e.thumbnailHash?t.innerHTML=`
      <img 
        src="${c.GET_PREVIEW_IMAGE}/${e.thumbnailHash}.webp" 
        alt="${e.name}" 
        class="w-12 h-12 object-cover rounded"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
      />
      <svg class="w-6 h-6 text-gray-400 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
      </svg>
      <span class="folder-name font-medium text-gray-800" title="${e.name}">${e.name}</span>
    `:t.innerHTML=`
      <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
      </svg>
      <span class="folder-name font-medium text-gray-800" title="${e.name}">${e.name}</span>
    `,t}buildPathRow(e){const{trimmedPath:t}=this.getTrimmedPath(e.fullPath),r=document.createElement("div");return r.className="flex items-center gap-2 justify-between",r.innerHTML=`
    <span class="folder-path text-xs text-gray-400 truncate max-w-full" title="${e.fullPath}">${t}</span>
    <span class="text-xs text-gray-500 font-medium whitespace-nowrap ml-2">${e.imageCount} ${e.imageCount===1?"photo":"photos"}</span>
  `,r}getTrimmedPath(e){let r=e;return r.length>32&&(r="…"+r.slice(-32)),{trimmedPath:r}}renderFolderCard(e){return this.renderGridViewCard(e)}renderGridViewCard(e){let r=e.fullPath;return r.length>32&&(r="…"+r.slice(-32)),p`
      <div
        class="folder-list-item px-4 py-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex flex-col gap-1 justify-between"
        data-folder-path="${encodeURIComponent(e.fullPath)}"
      >
        <div class="flex items-center gap-3">
          <svg
            class="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            ></path>
          </svg>
          <span class="font-medium text-gray-800" title="${e.name}"
            >${e.name}</span
          >
        </div>
        <div class="flex items-center gap-2">
          <span
            class="text-xs text-gray-400 truncate max-w-full"
            title="${e.fullPath}"
            >${r}</span
          >
        </div>
      </div>
    `}setupFolderClickHandlers(){document.querySelectorAll(".folder-list-item").forEach(t=>{t.addEventListener("click",()=>{const r=t.getAttribute("data-folder-path");r&&(window.location.href=`/image-search.html?resource_directory=${r}`)})})}showLoading(e){const t=document.getElementById("loading-indicator");t&&(e?(t.classList.remove("hidden"),t.classList.add("flex")):(t.classList.add("hidden"),t.classList.remove("flex")))}showError(e){const t=document.getElementById("error-message"),r=document.getElementById("error-text");t&&r&&(r.textContent=e,t.classList.remove("hidden"))}hideError(){const e=document.getElementById("error-message");e&&e.classList.add("hidden")}}const y=new g;window.foldersApp=y;
