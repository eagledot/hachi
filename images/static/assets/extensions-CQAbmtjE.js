var c=Object.defineProperty;var d=(s,e,t)=>e in s?c(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t;var i=(s,e,t)=>d(s,typeof e!="symbol"?e+"":e,t);import{t as r,L as m}from"./layout-CMTxcYkn.js";class h{constructor({rootId:e="modal-root",onClose:t}={}){i(this,"rootElement",null);i(this,"contentElement",null);i(this,"isOpen",!1);i(this,"onClose",null);this.onClose=t,this.createModal(e),this.contentElement=this.rootElement.querySelector(".modal-content")}createModal(e){this.rootElement=u.createModal(e),document.body.appendChild(this.rootElement),this.rootElement.addEventListener("closeModal",()=>this.close());const t=this.rootElement.querySelector(".modal-close");console.log("Close Button:",t),t.addEventListener("click",()=>this.close()),this.rootElement.addEventListener("click",o=>{o.target===this.rootElement&&this.close()}),document.addEventListener("keydown",o=>{o.key==="Escape"&&this.isOpen&&this.close()})}setTitle(e){const t=this.rootElement.querySelector(".modal-title");t&&(t.innerHTML=e)}setContent(e){this.contentElement&&(console.log("Setting modal content:",e),typeof e=="string"?this.contentElement.innerHTML=e:e instanceof HTMLElement&&this.contentElement.replaceChildren(e))}open(){this.rootElement&&(this.rootElement.classList.remove("hidden"),this.rootElement.classList.add("flex"),this.isOpen=!0)}close(){this.rootElement&&(this.rootElement.classList.add("hidden"),this.rootElement.classList.remove("flex"),this.isOpen=!1,typeof this.onClose=="function"&&this.onClose(),this.setContent(""))}}class u{static createModal(e){return r(`
            <div id="${e}" class="hidden fixed inset-0 bg-gray-900/70 flex items-center justify-center z-50">

                <div class="bg-white flex flex-col rounded-lg p-6 max-w-2xl w-11/12 max-h-[80vh] min-h-[80vh] overflow-y-auto shadow-xl">
                    <div class="flex justify-between mb-5">
                        <div class="modal-title text-2xl font-semibold text-gray-800"></div>

                        <button class="modal-close cursor-pointer text-gray-500 hover:text-gray-700 text-3xl leading-none w-8 h-8 flex items-center justify-center" type="button">&times;</button>

                    </div>
                    <div class="modal-content flex-grow flex flex-col py-2" id='extension-setup'>
                        <!--Content will be injected here -->
                    </div>
                </div>
            </div>
        `)}}new m({title:"Hachi - Photo Management System",currentPage:"/extensions",showNavbar:!0});class p{constructor(){i(this,"rootId","extensions");i(this,"root",document.getElementById(this.rootId));this.modal=new h({onClose:()=>console.log("Modal Closed")}),this.extensions=[],this.extensionComponents={},this.loadedScripts=new Set,this.initializeExtensions()}async initializeExtensions(){try{await this.loadAvailableExtensions(),await this.loadAllExtensionScripts()}catch(e){console.error("Failed to initialize extensions:",e)}}async loadAvailableExtensions(){try{this.extensions=[{id:"mtp",name:"Android",classname:"MTPScanner",filename:"mtp.js"},{id:"gdr",name:"Google Drive",classname:"DriveScanner",filename:"drive.js"}],this.render()}catch(e){console.error("Failed to load available extensions:",e)}}async getRemoteClients(){try{const e=await fetch("http://localhost:5000/api/getRemoteClients");if(!e.ok)throw new Error("Network response was not ok");const t=await e.json();if(t.length===0){document.getElementById("configured-extensions").replaceChildren(l.noRemoveClientsMessage());return}let o=document.getElementById("configured-extensions");for(let n=0;n<t.length;n++){let a=l.configuredExtensionRow(t[n]);o.appendChild(a)}}catch(e){console.error("Failed to fetch configured extensions:",e)}}render(){if(!this.root){console.error("Extensions root element not found.");return}if(l.updateExtensionsCount(this.extensions.length),this.extensions.length===0){this.root.replaceChildren(l.noExtensions());return}this.root.replaceChildren(l.extensionsList(this.extensions)),this.extensions.forEach((e,t)=>{if(!e.isSetup){const o=this.root.querySelectorAll("button")[t];o&&o.addEventListener("click",()=>this.handleSetup(t))}}),this.getRemoteClients()}onFinishSetup(e){this.extensions[e].isSetup=!0,this.render()}async loadAllExtensionScripts(){const e=this.extensions.map(t=>{this.loadExtensionScript(t)});await Promise.allSettled(e)}async loadExtensionScript(e){if(!this.loadedScripts.has(e.filename))try{const t=document.createElement("script");t.type="module",t.src="http://localhost:5000/api/ext/"+e.id+`/static/${e.filename}`,await new Promise((o,n)=>{t.onload=()=>{this.loadedScripts.add(e.filename),console.log(`Loaded script: ${e.filename}`),o()},t.onerror=()=>{console.error(`Failed to load script: ${e.filename}`),n(new Error(`Failed to load ${e.filename}`))},document.head.appendChild(t)})}catch(t){console.error(`Error loading extension script ${e.filename}:`,t)}}async loadExtensionModule(e){try{this.loadedScripts.has(e.filename)||await this.loadExtensionScript(e);let t;if(window[e.classname])t=window[e.classname];else throw new Error(`Extension class ${e.classname} not found in global scope`);return new t({onFinishSetup:n=>this.onFinishSetup(n)})}catch(t){throw console.error(`Failed to load extension module ${e.filename}:`,t),t}}async ensureExtensionComponent(e){if(!this.extensionComponents[e.id])try{this.extensionComponents[e.id]=await this.loadExtensionModule(e),console.log(`Initialized component for ${e.name}`)}catch(t){console.error(`Failed to initialize component for ${e.name}:`,t)}return this.extensionComponents[e.id]}async handleSetup(e){var n;const t=this.extensions[e];if(!t||t.isSetup)return;console.log(`Setting up ${t.name} extension...`);const o=await this.ensureExtensionComponent(t);if(!o){console.error(`Failed to load component for ${t.name}`);return}o.beginSetup(),typeof o.getModalHeaderUI!="function"?this.modal.setTitle(`${t.name} Setup`):this.modal.setTitle(((n=o.getModalHeaderUI())==null?void 0:n.outerHTML)||`${t.name} Setup`),this.modal.open()}}document.addEventListener("DOMContentLoaded",()=>{new p});class l{static noRemoveClientsMessage(){return r(`
            <div class="text-center text-gray-500 mt-10">
                <p class="text-lg">No remote clients configured.</p>
                <p class="text-sm">Please add a remote client to manage photos from other devices.</p>
                <button onclick="location.reload()" type="button" class="mt-4 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 px-3 py-2 rounded-lg font-medium transition-colors duration-200">Refresh</button>
            </div>
        `)}static configuredExtensionRow(e){return r(` <div
                           class="bg-white p-2 rounded-lg border border-gray-200 flex items-center justify-between hover:border-gray-300 transition-colors">
                           <div class="flex items-center space-x-3">
                               <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                   <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                       <path
                                           d="M7.71 3.5L1.15 15l3.85 6.5L11.56 10zM22.85 15l-3.85 6.5L12.44 10l6.56-6.5z" />
                                   </svg>
                               </div>
                               <div>
                                   <p class="text-sm font-medium text-gray-900">${e.name}</p>
                                   <p class="text-xs text-gray-500">${e.id}</p>
                               </div>
                           </div>
                            <button type="button" class="bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 px-3 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center text-sm">Unlink</button>
                           <span class="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">${e.protocol}</span>
                       </div>`)}static noExtensions(){return r(`
            <div class="text-center text-gray-500 mt-10">
                <p class="text-lg">No extensions available.</p>
                <p class="text-sm">Please check back later for new extensions.</p>
            </div>
        `)}static extensionsList(e){const t=document.createDocumentFragment();return e.forEach(o=>{const n=this.extensionButton(o);n&&t.append(n)}),t}static updateExtensionsCount(e){const t=document.getElementById("extension-count");t&&(t.textContent=e)}static extensionButton(e){return r(`
                <button type="button" class="bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 px-3 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center text-sm cursor-pointer space-x-2 disabled:opacity-75">

                <svg class="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> ${e.name}
                </button>
        `)}}
