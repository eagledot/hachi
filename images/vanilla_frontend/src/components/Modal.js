import { turnHTMLToElement } from "../utils.js";

export default class Modal {
    rootElement = null;
    contentElement = null;
    isOpen = false;
    onClose = null;

    constructor({ rootId = "modal-root", onClose } = {}) {
        this.onClose = onClose;
        this.createModal(rootId);
        this.contentElement = this.rootElement.querySelector(".modal-content");
    }

    createModal(rootId) {
        this.rootElement = ModalUI.createModal(rootId);
        document.body.appendChild(this.rootElement);

        // Listen to the custom event listener
        this.rootElement.addEventListener("closeModal", () => this.close());

        // Setup close button
        const closeButton = this.rootElement.querySelector(".modal-close");
        console.log("Close Button:", closeButton);
        closeButton.addEventListener("click", () => this.close());

        // Close on overlay click
        this.rootElement.addEventListener("click", (e) => {
            if (e.target === this.rootElement) {
                this.close()
            }
        })

        // Close on ESC key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.isOpen) {
                this.close();
            }
        })
    }

    setTitle(title) {
        const titleElement = this.rootElement.querySelector(".modal-title");
        if (titleElement) {
            titleElement.innerHTML = title;
        }
    }

    setContent(content) {
        if (!this.contentElement) return;
        console.log("Setting modal content:", content);

        if (typeof content === "string") {
            this.contentElement.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            this.contentElement.replaceChildren(content);
        }
    }

    open() {
        if (this.rootElement) {
            this.rootElement.classList.remove("hidden");
            this.rootElement.classList.add("flex");
            this.isOpen = true;
        }
    }

    close() {
        if (this.rootElement) {
            this.rootElement.classList.add("hidden");
            this.rootElement.classList.remove("flex");
            this.isOpen = false;
            if (typeof this.onClose === "function") {
                this.onClose();
            }
            this.setContent(""); // Clear content on close
        }
    }
}

class ModalUI {
    static createModal(rootId) {
        return turnHTMLToElement(`
            <div id="${rootId}" class="hidden fixed inset-0 bg-gray-900/70 flex items-center justify-center z-50">

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
        `);
    }
}