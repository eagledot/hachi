var h=Object.defineProperty;var m=(o,e,t)=>e in o?h(o,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):o[e]=t;var d=(o,e,t)=>m(o,typeof e!="symbol"?e+"":e,t);import{L as u,f,e as c,h as g}from"./layout-CMTxcYkn.js";/* empty css              */new u({title:"Folders - Hachi",currentPage:"/folders.html",showNavbar:!0});class p{constructor(){d(this,"folders",[]);d(this,"filteredFolders",[]);d(this,"searchTerm","");d(this,"sortBy","name");d(this,"isLoading",!1);this.setupEventListeners(),this.loadFolders();const e=document.getElementById("folders-grid");e&&!e.getAttribute("data-click-delegation")&&(e.addEventListener("click",t=>{const s=t.target.closest(".folder-list-item");if(s&&s.hasAttribute("data-folder-path")){const r=s.getAttribute("data-folder-path");r&&(window.location.href=`/image-search.html?resource_directory=${r}`)}}),e.setAttribute("data-click-delegation","true"))}setupEventListeners(){const e=document.getElementById("folder-search");e&&e.addEventListener("input",s=>{const r=s.target.value.toLowerCase();this.setSearchTerm(r)});const t=document.getElementById("sort-filter");t&&t.addEventListener("change",s=>{const r=s.target.value;this.sortFolders(r)})}async loadFolders(){try{await this.loadFoldersFromAPI()}catch(e){console.error("Error loading folders:",e),this.showError(`Failed to load folders: ${e instanceof Error?e.message:"Unknown error"}`)}finally{}}async loadFoldersFromAPI(){const e=await f(c.GET_FOLDERS);if(!e.ok)throw new Error(`Failed to fetch folders: ${e.status}`);const t=await e.json();if(Array.isArray(t))this.folders=t.map(s=>({name:this.getDisplayName(s.directory),fullPath:s.directory,imageCount:s.count,thumbnailHash:s.thumbnail_hash})),this.folders.sort((s,r)=>r.imageCount-s.imageCount),this.filteredFolders=[...this.folders],this.renderFolders();else throw new Error("Invalid response format")}getDisplayName(e){const t=e.split(/[/\\]/);return t[t.length-1]||e}setSearchTerm(e){this.searchTerm=e,this.filterFolders(),this.renderFolders()}filterFolders(){if(!this.searchTerm){this.filteredFolders=[...this.folders];return}this.filteredFolders=this.folders.filter(e=>e.name.toLowerCase().includes(this.searchTerm)||e.fullPath.toLowerCase().includes(this.searchTerm))}sortFolders(e){this.sortBy=e,this.filteredFolders.sort((t,s)=>{switch(e){case"photos":return s.imageCount-t.imageCount;case"name":default:return t.name.localeCompare(s.name)}})}renderFolders(){const e=document.getElementById("folders-grid"),t=document.getElementById("no-folders");if(!(!e||!t)){if(this.filteredFolders.length===0&&!this.isLoading){e.classList.add("hidden"),t.classList.remove("hidden");return}else if(this.filteredFolders.length===0&&this.isLoading){e.classList.add("hidden"),t.classList.add("hidden");return}t.classList.add("hidden"),e.classList.remove("hidden"),this.batchUpdateFolderGrid(e)}}batchUpdateFolderGrid(e){const t=Array.from(e.querySelectorAll(":scope > .folder-list-item")),s=new Map;t.forEach(n=>{const i=n.getAttribute("data-folder-path");i&&s.set(i,n)});const r=document.createDocumentFragment(),a=new Set;for(const n of this.filteredFolders){const i=encodeURIComponent(n.fullPath);a.add(i);const l=s.get(i);l?(this.updateFolderElement(l,n),r.appendChild(l)):r.appendChild(this.createFolderElement(n))}for(const[n,i]of s.entries())a.has(n)||i.remove();e.appendChild(r)}createFolderElement(e){const t=document.createElement("div");t.className="folder-list-item flex items-center p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer gap-4",t.setAttribute("data-folder-path",encodeURIComponent(e.fullPath));const s=document.createElement("div");s.className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center",e.thumbnailHash?s.innerHTML=`
        <img 
          src="${c.GET_PREVIEW_IMAGE}/${e.thumbnailHash}.webp" 
          alt="${e.name}" 
          class="w-full h-full object-cover rounded-md"
          onerror="this.parentElement.innerHTML = '<div class=\\'flex items-center justify-center w-full h-full\\'><svg class=\\'w-6 h-6 text-gray-400\\'><use href=\\'#folder-icon\\'/></svg></div>';"
        />
      `:s.innerHTML=`
        <div class="flex items-center justify-center w-full h-full">
          <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
          </svg>
        </div>
      `,t.appendChild(s);const r=document.createElement("div");r.className="flex-grow min-w-0";const{trimmedPath:a}=this.getTrimmedPath(e.fullPath);r.innerHTML=`
      <div class="folder-name font-medium text-gray-800 truncate" title="${e.name}">${e.name}</div>
      <div class="folder-path text-sm text-gray-500 truncate" title="${e.fullPath}">${a}</div>
    `,t.appendChild(r);const n=document.createElement("div");return n.className="photo-count text-sm text-gray-600 font-medium whitespace-nowrap",n.textContent=`${e.imageCount} ${e.imageCount===1?"photo":"photos"}`,t.appendChild(n),t}updateFolderElement(e,t){const s=e.querySelector("img");s&&!s.src.includes(t.thumbnailHash)&&(s.src=`${c.GET_PREVIEW_IMAGE}/${t.thumbnailHash}.webp`);const r=e.querySelector(".folder-name");r&&r.textContent!==t.name&&(r.textContent=t.name,r.title=t.name);const a=e.querySelector(".folder-path");if(a){const{trimmedPath:l}=this.getTrimmedPath(t.fullPath);a.textContent!==l&&(a.textContent=l),a.title!==t.fullPath&&(a.title=t.fullPath)}const n=e.querySelector(".photo-count"),i=`${t.imageCount} ${t.imageCount===1?"photo":"photos"}`;n&&n.textContent!==i&&(n.textContent=i)}buildTopRow(e){const t=document.createElement("div");t.className="flex items-center gap-4";const s=document.createElement("div");s.className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center",e.thumbnailHash?s.innerHTML=`
        <img 
          src="${c.GET_PREVIEW_IMAGE}/${e.thumbnailHash}.webp" 
          alt="${e.name}" 
          class="w-full h-full object-cover rounded-lg"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
        />
        <div class="hidden w-full h-full items-center justify-center">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
          </svg>
        </div>
      `:s.innerHTML=`
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
        </svg>
      `,t.appendChild(s);const r=document.createElement("div");return r.className="flex flex-col justify-center",r.innerHTML=`
      <span class="folder-name font-semibold text-gray-800 text-base" title="${e.name}">${e.name}</span>
      <span class="text-sm text-gray-500">${e.imageCount} ${e.imageCount===1?"photo":"photos"}</span>
    `,t.appendChild(r),t}buildPathRow(e){const{trimmedPath:t}=this.getTrimmedPath(e.fullPath),s=document.createElement("div");return s.className="pl-20",s.innerHTML=`
      <span class="folder-path text-sm text-gray-500 truncate" title="${e.fullPath}">${t}</span>
    `,s}getTrimmedPath(e){let s=e;return s.length>32&&(s="…"+s.slice(-32)),{trimmedPath:s}}renderFolderCard(e){return this.renderGridViewCard(e)}renderGridViewCard(e){let s=e.fullPath;return s.length>32&&(s="…"+s.slice(-32)),g`
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
            >${s}</span
          >
        </div>
      </div>
    `}setupFolderClickHandlers(){document.querySelectorAll(".folder-list-item").forEach(t=>{t.addEventListener("click",()=>{const s=t.getAttribute("data-folder-path");s&&(window.location.href=`/image-search.html?resource_directory=${s}`)})})}showLoading(e){const t=document.getElementById("loading-indicator");t&&(e?(t.classList.remove("hidden"),t.classList.add("flex")):(t.classList.add("hidden"),t.classList.remove("flex")))}showError(e){const t=document.getElementById("error-message"),s=document.getElementById("error-text");t&&s&&(s.textContent=e,t.classList.remove("hidden"))}hideError(){const e=document.getElementById("error-message");e&&e.classList.add("hidden")}}const v=new p;window.foldersApp=v;
