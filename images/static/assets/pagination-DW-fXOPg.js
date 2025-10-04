var g=Object.defineProperty;var l=(s,e,t)=>e in s?g(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t;var a=(s,e,t)=>l(s,typeof e!="symbol"?e+"":e,t);import{h as d}from"./utils-2RDbpbPS.js";class u{constructor(e){a(this,"container");a(this,"totalItems");a(this,"itemsPerPage");a(this,"currentPage");a(this,"onPageChange");a(this,"totalPages");this.container=e.container,this.totalItems=e.totalItems,this.itemsPerPage=e.itemsPerPage,this.currentPage=e.initialPage??0,this.onPageChange=e.onPageChange,this.totalPages=e.totalPages,this.render(),this.addKeyboardNavigation()}addKeyboardNavigation(){window.addEventListener("keydown",e=>{e.key==="ArrowUp"?(e.preventDefault(),this.prevPage()):e.key==="ArrowDown"&&(e.preventDefault(),this.nextPage())})}setPage(e){var n;const t=this.getTotalPages(),i=Math.max(0,Math.min(e,t-1));i!==this.currentPage&&(this.currentPage=i,this.render(),(n=this.onPageChange)==null||n.call(this,this.currentPage))}nextPage(){console.log("Going to next page",this.currentPage+1),this.setPage(this.currentPage+1)}prevPage(){console.log("Going to previous page",this.currentPage-1),this.setPage(this.currentPage-1)}getCurrentPage(){return this.currentPage}update(e){console.log("Updating pagination props:",e),typeof e.totalItems=="number"&&(this.totalItems=e.totalItems),typeof e.itemsPerPage=="number"&&(this.itemsPerPage=e.itemsPerPage),e.onPageChange&&(this.onPageChange=e.onPageChange),typeof e.initialPage=="number"&&(this.currentPage=e.initialPage),typeof e.totalPages=="number"&&(this.totalPages=e.totalPages),this.render()}getTotalPages(){return typeof this.totalPages=="number"?Math.max(0,this.totalPages):this.itemsPerPage<=0?0:Math.ceil(this.totalItems/this.itemsPerPage)}render(){const e=this.getTotalPages(),t=this.currentPage*this.itemsPerPage,i=Math.min(t+this.itemsPerPage,this.totalItems);this.container.classList.remove("hidden"),this.container.innerHTML=d`
      <div class="mx-auto w-full px-3 sm:px-4 py-2
                  flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        
        <!-- Left: Info + Hint (stack) -->
        <div class="flex flex-col md:flex-row md:items-center gap-1 xs:gap-3 min-w-0">
          <div class="text-[11px] xs:text-xs text-gray-600 leading-snug min-w-0">
            <span id="pagination-info" class="block truncate max-w-[220px] sm:max-w-xs">
              Showing ${this.totalItems===0?0:t+1}-${i}
              <span class="hidden md:inline">of ${this.totalItems} photos</span>
            </span>
          </div>
          <!-- <span class="hidden md:inline text-[11px] text-gray-500 select-none" aria-hidden="true">
            ↑ / ↓ to change page
          </span> -->
        </div>

        <!-- Right: Controls -->
        <div class="flex items-stretch gap-2 sm:gap-3 w-full sm:w-auto">
          <button id="prev-page-btn"
            class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1
                   px-3 sm:px-3.5 py-2 text-xs font-medium
                   text-gray-700 bg-white border border-gray-300 rounded-md
                   hover:bg-gray-50 hover:text-gray-900
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60
                   transition-colors"
            ${this.currentPage<=0?"disabled":""}>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 19l-7-7 7-7"></path>
            </svg>
            <span class="hidden xs:inline">Previous</span>
            <span class="xs:hidden sr-only">Previous page</span>
          </button>

          <span id="page-info"
            class="hidden sm:inline-flex items-center px-2.5 py-2 text-[11px] font-medium
                   text-gray-700 bg-gray-50 border border-gray-200 rounded-md">
            Page ${e===0?0:this.currentPage+1}
            <span class="ml-1">/ ${e}</span>
          </span>

          <button id="next-page-btn"
            class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1
                   px-3 sm:px-3.5 py-2 text-xs font-medium
                   text-gray-700 bg-white border border-gray-300 rounded-md
                   hover:bg-gray-50 hover:text-gray-900
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60
                   transition-colors"
            ${this.currentPage>=e-1?"disabled":""}>
            <span class="hidden xs:inline">Next</span>
            <span class="xs:hidden sr-only">Next page</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>
    `;const n=this.container.querySelector("#prev-page-btn"),r=this.container.querySelector("#next-page-btn");n==null||n.addEventListener("click",o=>{o.preventDefault(),this.prevPage()}),r==null||r.addEventListener("click",o=>{o.preventDefault(),this.nextPage()})}}export{u as P};
