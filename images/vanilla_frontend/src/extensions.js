
import Modal from "./components/Modal.js";
import { turnHTMLToElement } from "./utils.js";
import {Layout} from "./components/Layout.js";

// Initialize the layout for the main page
new Layout({
  title: 'Hachi - Photo Management System',
  currentPage: '/extensions.html',
  showNavbar: true
});

class Extensions {
    BASE_URL = "http://127.0.0.1:5500/images/mtp_windows/static"; // Change to your server URL
    rootId = "extensions";
    root = document.getElementById(this.rootId);
    constructor() {
        this.modal = new Modal({
            onClose: () => console.log("Modal Closed")
        })
        this.extensions = [];
        this.extensionComponents = {};
        this.loadedScripts = new Set();

        // Start the loading process
        this.initializeExtensions();
    }

    async initializeExtensions() {
        try {
            // Step 1: Get extension metadata from server
            await this.loadAvailableExtensions();

            // Step 2: Load all extension scripts from server
            await this.loadAllExtensionScripts();
        } catch (error) {
            console.error("Failed to initialize extensions:", error);
            // this.render(); // Show empty state
        }
    }

    // Method to load extensions from server/API
    async loadAvailableExtensions() {
        try {
            // const response = await fetch("/api/available-extensions");
            // if (!response.ok) {
            //     throw new Error("Failed to fetch available extensions");
            // }
            // const availableExtensions = await response.json();
            // this.extensions = availableExtensions;
            this.extensions = [
                { id: "android", name: "Android", isSetup: false, classname: "MTPScanner", filename: "mtp.js" },
                { id: "google_drive", name: "Google Drive", isSetup: false, classname: "DriveScanner", filename: "drive.js" }
            ];
            this.render();
        } catch (error) {
            console.error("Failed to load available extensions:", error);
        }
    }



    render() {
        if (!this.root) {
            console.error("Extensions root element not found.")
            return;
        }

        UI.updateExtensionsCount(this.extensions.length);

        if (this.extensions.length === 0) {
            this.root.replaceChildren(UI.noExtensions());
            return;
        }

        this.root.replaceChildren(UI.extensionsList(this.extensions));

        // Attach event listeners to setup buttons
        this.extensions.forEach((extension, index) => {
            if (!extension.isSetup) {
                const button = this.root.querySelectorAll("button")[index];
                if (button) {
                    button.addEventListener("click", () => this.handleSetup(index));
                }
            }
        });
    }

    onFinishSetup(index) {
        this.extensions[index].isSetup = true;
        this.render();
    }

    async loadAllExtensionScripts() {
        const loadPromises = this.extensions.map(extension => {
            this.loadExtensionScript(extension);
        })

        await Promise.allSettled(loadPromises);
    }

    async loadExtensionScript(extension) {
        if (this.loadedScripts.has(extension.filename)) {
            return; // Already loaded
        }

        try {
            // Create script element and load from the server
            const script = document.createElement('script');
            script.type = "module";
            script.src = `${this.BASE_URL}/${extension.filename}` // or filepath

            // Wait for the script to load
            await new Promise((resolve, reject) => {
                script.onload = () => {
                    this.loadedScripts.add(extension.filename);
                    console.log(`Loaded script: ${extension.filename}`);
                    resolve();
                };
                script.onerror = () => {
                    console.error(`Failed to load script: ${extension.filename}`);
                    reject(new Error(`Failed to load ${extension.filename}`));
                };
                document.head.appendChild(script);
            })
        } catch (error) {
            console.error(`Error loading extension script ${extension.filename}:`, error);
        }
    }


    async loadExtensionModule(extension) {
        try {
            if (!this.loadedScripts.has(extension.filename)) {
                await this.loadExtensionScript(extension);
            }

            // Since we loaded the script as a module, the class should be available globally
            // Or we can access it from the window object
            let ExtensionClass;

            // Try to get the class from global scope
            if (window[extension.classname]) {
                ExtensionClass = window[extension.classname];
            } else {
                throw new Error(`Extension class ${extension.classname} not found in global scope`);
            }

            // Create instance with proper callbacks
            const instance = new ExtensionClass({
                onFinishSetup: (index) => this.onFinishSetup(index)
            });

            return instance;
        } catch (error) {
            console.error(`Failed to load extension module ${extension.filename}:`, error);
            throw error;
        }
    }

    // Add a method to ensure extension component is loaded
    async ensureExtensionComponent(extension) {
        if (!this.extensionComponents[extension.id]) {
            try {
                this.extensionComponents[extension.id] = await this.loadExtensionModule(extension);
                console.log(`Initialized component for ${extension.name}`);
            } catch (error) {
                console.error(`Failed to initialize component for ${extension.name}:`, error);
            }
        }
        return this.extensionComponents[extension.id];
    }



    async handleSetup(index) {
        const extension = this.extensions[index];
        if (!extension || extension.isSetup) {
            return;
        }
        console.log(`Setting up ${extension.name} extension...`);

        // Ensure the extension component is loaded and initialized
        const component = await this.ensureExtensionComponent(extension);
        if (!component) {
            console.error(`Failed to load component for ${extension.name}`);
            return;
        }

        // Start the setup process
        component.beginSetup();
        // Check if getModalHeaderUI exists
        if (typeof component.getModalHeaderUI !== "function") {
            this.modal.setTitle(`${extension.name} Setup`);
        } else {
            this.modal.setTitle(component.getModalHeaderUI()?.outerHTML || `${extension.name} Setup`);
        }
        this.modal.open();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new Extensions();
});



class UI {

    static noExtensions() {
        return turnHTMLToElement(`
            <div class="text-center text-gray-500 mt-10">
                <p class="text-lg">No extensions available.</p>
                <p class="text-sm">Please check back later for new extensions.</p>
            </div>
        `);
    }

    static extensionsList(extensions) {
        const fragment = document.createDocumentFragment();
        extensions.forEach((extension) => {
            const row = this.extensionRow(extension);
            if (row) {
                fragment.append(row);
            }
        });
        return fragment;
    }

    static updateExtensionsCount(count) {
        const countElement = document.getElementById("extension-count");
        if (countElement) {
            countElement.textContent = count;
        }
    }

    static extensionRow(extension) {
        return turnHTMLToElement(`
            <div class="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg mb-3">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span class="text-white font-semibold text-lg">${extension.name.charAt(0)}</span>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">${extension.name}</h3>
                        <p class="text-sm text-gray-500">${extension.isSetup ? "Ready to use" : "Setup required"}</p>
                    </div>
                </div>

                <button type="button" class="${extension.isSetup ? 'bg-green-100 text-green-700 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'} px-3 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center text-sm cursor-pointer space-x-2 disabled:opacity-75"
                ${extension.isSetup ? "diabled" : ""}>

                ${extension.isSetup
                ? '<svg class="w-5 h-5 inline mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>Configured'
                : '<svg class="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Setup'}

                </button>

            </div>
        `);
    }
}