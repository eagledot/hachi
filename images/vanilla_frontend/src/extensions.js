
import Modal from "./components/Modal.js";
import { turnHTMLToElement } from "./utils.js";

class Extensions {
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
                //  TODO: update ids to 3letter ids, mtp, gdr!
                { id: "mtp", name: "Android", isSetup: false, classname: "MTPScanner", filename: "mtp.js" },
                { id: "gdr", name: "Google Drive", isSetup: false, classname: "DriveScanner", filename: "drive.js" }
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
            // script.src = `./${extension.filename}` // or filepath
            script.src  = "http://localhost:5000/api/ext/" + extension.id +"/static/" + `${extension.filename}`
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
            const button = this.extensionButton(extension);
            if (button) {
                fragment.append(button);
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

    static extensionButton(extension) {
        return turnHTMLToElement(`
                <button type="button" class="bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 px-3 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center text-sm cursor-pointer space-x-2 disabled:opacity-75">

                <svg class="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> ${extension.name}
                </button>
        `);
    }
}