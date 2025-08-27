var g=Object.defineProperty;var l=(i,e,t)=>e in i?g(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var a=(i,e,t)=>l(i,typeof e!="symbol"?e+"":e,t);class d{constructor(e){a(this,"container");a(this,"totalItems");a(this,"itemsPerPage");a(this,"currentPage");a(this,"onPageChange");a(this,"totalPages");this.container=e.container,this.totalItems=e.totalItems,this.itemsPerPage=e.itemsPerPage,this.currentPage=e.initialPage??0,this.onPageChange=e.onPageChange,this.totalPages=e.totalPages,this.render(),this.addKeyboardNavigation()}addKeyboardNavigation(){window.addEventListener("keydown",e=>{e.key==="ArrowUp"?(e.preventDefault(),this.prevPage()):e.key==="ArrowDown"&&(e.preventDefault(),this.nextPage())})}setPage(e){var n;const t=this.getTotalPages(),s=Math.max(0,Math.min(e,t-1));s!==this.currentPage&&(this.currentPage=s,this.render(),(n=this.onPageChange)==null||n.call(this,this.currentPage))}nextPage(){console.log("Going to next page",this.currentPage+1),this.setPage(this.currentPage+1)}prevPage(){console.log("Going to previous page",this.currentPage-1),this.setPage(this.currentPage-1)}getCurrentPage(){return this.currentPage}update(e){console.log("Updating pagination props:",e),typeof e.totalItems=="number"&&(this.totalItems=e.totalItems),typeof e.itemsPerPage=="number"&&(this.itemsPerPage=e.itemsPerPage),e.onPageChange&&(this.onPageChange=e.onPageChange),typeof e.initialPage=="number"&&(this.currentPage=e.initialPage),typeof e.totalPages=="number"&&(this.totalPages=e.totalPages),this.render()}getTotalPages(){return typeof this.totalPages=="number"?Math.max(0,this.totalPages):this.itemsPerPage<=0?0:Math.ceil(this.totalItems/this.itemsPerPage)}render(){const e=this.getTotalPages(),t=this.currentPage*this.itemsPerPage,s=Math.min(t+this.itemsPerPage,this.totalItems);this.container.classList.remove("hidden"),this.container.innerHTML=`
      <div class="flex items-center justify-between mx-auto px-3 sm:px-4 py-2">
        <!-- Pagination Info -->
        <div class="text-xs text-gray-600">
          <span id="pagination-info">Showing ${this.totalItems===0?0:t+1}-${s} of ${this.totalItems} photos</span>
        </div>

        <!-- Keyboard nav hint (visible md and up) -->
          <span class="hidden md:inline text-xs text-gray-500 select-none" aria-hidden="true">
            Use ↑ / ↓ to change page
          </span>

        <!-- Pagination Controls -->
        <div class="flex items-center space-x-3">
          <button id="prev-page-btn"
            class="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            ${this.currentPage<=0?"disabled":""}>
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 19l-7-7 7-7"></path>
            </svg>
            Previous
          </button>
          <span id="page-info" class="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg">
            Page ${e===0?0:this.currentPage+1} of ${e}
          </span>
          
          <button id="next-page-btn"
            class="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            ${this.currentPage>=e-1?"disabled":""}>
            Next
            <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>
    `;const n=this.container.querySelector("#prev-page-btn"),r=this.container.querySelector("#next-page-btn");n==null||n.addEventListener("click",o=>{o.preventDefault(),this.prevPage()}),r==null||r.addEventListener("click",o=>{o.preventDefault(),this.nextPage()})}}export{d as P};
