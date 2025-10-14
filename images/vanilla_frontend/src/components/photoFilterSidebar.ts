import { endpoints } from "../config";
import type { HachiImageData, ImageMetaData } from "../imageSearch";
import { filterPopulateQuery, filterQueryMeta } from "../utils";

const Filter_On_SVG = `<svg  xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"><path d="M440-160q-17 0-28.5-11.5T400-200v-240L168-736q-15-20-4.5-42t36.5-22h560q26 0 36.5 22t-4.5 42L560-440v240q0 17-11.5 28.5T520-160h-80Zm40-308 198-252H282l198 252Zm0 0Z"/></svg>`;

interface PhotoFilters {
  people?: string[];
  cameraMakes?: string[];
  cameraModels?: string[];
  places?: string[];
  tags?: string[];
}

const Filter_UI_Mapping = {
  people: "People",
  cameraMakes: "Camera Makes",
  cameraModels: "Camera Models",
  places: "Places",
  tags: "Tags",
};

const Filter_Request_Mapping = {
  people: "person",
  cameraMakes: "make",
  cameraModels: "model",
  places: "place",
  tags: "tags",
};

export default class PhotoFilterSidebar {
  private sidebarElement: HTMLElement;
  private overlayElement: HTMLElement;
  private filters: PhotoFilters = {};
  private queryToken: string | null = null;
  private filteredImages: HachiImageData[] = [];
  private onFilterChange: (photos: HachiImageData[]) => void;
  private toggleButtonId: string;
  private isInitialized: boolean = false;

  // People
  private peoplePageSize = 30;
  private peopleRendered = 0;
  private peopleListElement?: HTMLElement;
  private peopleSentinel?: HTMLElement;
  private peopleObserver?: IntersectionObserver;

  constructor(
    onFilterChange: (photos: HachiImageData[]) => void,
    toggleButtonId: string
  ) {
    this.overlayElement = this.createOverlay();
    this.sidebarElement = this.createSidebar();
    this.onFilterChange = onFilterChange;
    this.toggleButtonId = toggleButtonId;
    document.body.appendChild(this.overlayElement);
    document.body.appendChild(this.sidebarElement);
    this.addToggleListener();
    this.createPhotoFiltersUI();
  }

  async initialize() {
    await this.populateAllPhotoFilters();
    this.renderFilters();
  }

  async setFilteredImages(attribute: string, value: string): Promise<void> {
    if (!this.queryToken) return;

    const data = await filterQueryMeta(this.queryToken, attribute, value);

    const transformedData = data.map((item: ImageMetaData) => ({
      id: item.resource_hash!,
      score: 1,
      metadata: item,
    }));

    this.filteredImages = transformedData;
    this.onFilterChange(this.filteredImages);

    console.log("Filtered images:", this.filteredImages);
  }

  public async updateQueryToken(token: string): Promise<void> {
    console.log("Updating query token:", token);
    this.queryToken = token;
    this.enableToggleButton(); // TODO: Should be called only once. Fix it later.
    this.isInitialized = false;
  }

  enableToggleButton(): void {
    const toggleButton = document.getElementById(this.toggleButtonId);
    if (toggleButton) {
      toggleButton.classList.remove("cursor-not-allowed");
      toggleButton.classList.add("cursor-pointer");
      toggleButton.removeAttribute("disabled");
    }
  }

  removeAllFilterPills(): void {
    const filterPillsContainer = document.getElementById("filters-container");

    if (!filterPillsContainer) return;
    const pills = filterPillsContainer.getElementsByClassName("filter-pill");
    while (pills.length > 0) {
      pills[0].remove();
    }
  }

  public clearFilters(): void {
    this.filteredImages = [];
    this.uncheckAllImages();
    this.uncheckEveryCheckbox();
    // Remove all filter pills
    this.removeAllFilterPills();
    this.onFilterChange(this.filteredImages);
  }

  private addFilterPill(attribute: string, value: string): void {
    const filterPillsContainer = document.getElementById("filters-container");
    if (!filterPillsContainer) return;

    const icon = "";
    // Enhanced gradient and styling


    // Manually create the filter pill UI node with enhanced styling
    const pill = document.createElement("div");
    pill.className =
      "filter-pill flex items-center px-1 rounded-xl";
    pill.style.transition = "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
    pill.style.cursor = "pointer";
    pill.style.color = "#1f2937"; // Teal text color
    pill.style.fontWeight = "500";
    pill.style.letterSpacing = "0.025em";
    pill.setAttribute("data-attribute", attribute);
    pill.setAttribute("data-value", value);

    // Icon span (keeping empty as in original)
    const iconSpan = document.createElement("span");
    iconSpan.className = "mr-2 sm:mr-3 text-xs";
    iconSpan.innerHTML = Filter_On_SVG;
    // Change the fill color of the SVG
    iconSpan.querySelector("svg")?.setAttribute("fill", "#2563eb");

    pill.appendChild(iconSpan);

    // Value span with enhanced typography
    const valueSpan = document.createElement("span");
    valueSpan.className = "text-xs text-blue-800 font-semibold truncate";
    valueSpan.style.maxWidth = "360px";
    valueSpan.style.textShadow = "0 1px 2px rgba(0, 0, 0, 0.1)";
    valueSpan.style.lineHeight = "1.4";
    valueSpan.textContent = value;
    pill.appendChild(valueSpan);

    // Enhanced remove button
    const removeBtn = document.createElement("button");
    removeBtn.className =
      "ml-3 sm:ml-4 opacity-80 hover:opacity-100 cursor-pointer text-blue-800 hover:bg-opacity-20 rounded-full p-2 transition-all duration-300 remove-filter-btn";
    removeBtn.style.display = "flex";
    removeBtn.style.alignItems = "center";
    removeBtn.style.justifyContent = "center";
    removeBtn.style.minWidth = "28px";
    removeBtn.style.minHeight = "28px";
    removeBtn.style.backdropFilter = "blur(5px)";
    removeBtn.setAttribute("data-attribute", attribute);
    removeBtn.setAttribute("data-value", value);

    removeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.clearFilters();
    });

    // Enhanced SVG icon for remove with better styling
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "w-4 h-4");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("stroke-width", "2.5");
    svg.style.filter = "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("d", "M6 18L18 6M6 6l12 12");
    svg.appendChild(path);

    removeBtn.appendChild(svg);
    pill.appendChild(removeBtn);

    // Insert into container
    filterPillsContainer?.appendChild(pill);
  }

  createDummyPhotoFilters(): void {
    this.filters = {
      people: ["Alice", "Bob", "Charlie"],
      cameraMakes: ["Canon", "Nikon", "Sony"],
      cameraModels: ["Model A", "Model B", "Model C"],
      places: ["Beach", "Mountain", "City"],
      tags: ["Sunset", "Portrait", "Landscape"],
    };
  }

  addToggleListener(): void {
    const toggleButton = document.getElementById("filter-sidebar-toggle-btn");
    toggleButton?.addEventListener("click", async () => {
      this.toggleSidebar();
      if (!this.isInitialized) {
        await this.initialize();
        this.isInitialized = true;
      }
    });
  }

  createSidebar(): HTMLElement {
    const sidebarElement = document.createElement("div");
    sidebarElement.id = "photo-filter-sidebar";
    this.createSidebarStyles(sidebarElement);
    return sidebarElement;
  }

  createOverlay(): HTMLElement {
    const overlayElement = document.createElement("div");
    overlayElement.id = "photo-filter-overlay";
    this.createOverlayStyles(overlayElement);

    // Add click handler to close sidebar when clicking on overlay
    overlayElement.addEventListener("click", () => {
      this.closeSidebar();
    });

    return overlayElement;
  }

  createOverlayStyles(overlayElement: HTMLElement): void {
    overlayElement.style.position = "fixed";
    overlayElement.style.top = "0";
    overlayElement.style.left = "0";
    overlayElement.style.width = "100%";
    overlayElement.style.height = "100%";
    overlayElement.style.backgroundColor = "rgba(0, 0, 0, 0.0)";
    overlayElement.style.zIndex = "999";
    overlayElement.style.display = "none";
  }

  closeSidebar(): void {
    this.overlayElement.style.display = "none";
    this.sidebarElement.style.display = "none";
  }

  showSidebar(): void {
    this.overlayElement.style.display = "block";
    this.sidebarElement.style.display = "flex";
  }

  toggleSidebar(): void {
    const isVisible = this.sidebarElement.style.display === "flex";
    if (isVisible) {
      this.closeSidebar();
    } else {
      this.showSidebar();
    }
  }

  createSidebarStyles(sidebarElement: HTMLElement): void {
    sidebarElement.style.width = "320px";
    sidebarElement.style.height = "100%";
    sidebarElement.style.position = "fixed";
    sidebarElement.style.top = "0";
    sidebarElement.style.right = "0";
    sidebarElement.style.backgroundColor = "#fff";
    sidebarElement.style.boxShadow = "-2px 0 5px rgba(0,0,0,0.1)";
    sidebarElement.style.zIndex = "1000";
    sidebarElement.style.display = "none";
    sidebarElement.style.flexDirection = "column";
  }

  private resetPeopleInfiniteScroll(): void {
    this.peopleRendered = 0;
    if (this.peopleObserver) {
      this.peopleObserver.disconnect();
      this.peopleObserver = undefined;
    }
    this.peopleListElement = undefined;
    this.peopleSentinel = undefined;
  }

  private createPersonItem(person: string): HTMLElement {
    const personItem = document.createElement("div");
    personItem.className =
      "flex flex-col cursor-pointer hover:bg-blue-50 rounded transition";
    personItem.style.padding = "2px";

    const photo = document.createElement("img");
    photo.className = "w-12 h-12 bg-gray-200 rounded-full object-cover";
    photo.src = `${endpoints.GET_PERSON_IMAGE}/${person}`;
    photo.alt = person;
    photo.style.marginBottom = "2px";

    photo.addEventListener("click", () => {
      this.onImageClick(photo, person);
    });

    personItem.appendChild(photo);
    return personItem;
  }

  private renderNextPeopleBatch(): void {
    if (!this.peopleListElement) return;
    const people = this.filters.people || [];
    if (this.peopleRendered >= people.length) return;

    const frag = document.createDocumentFragment();
    const nextLimit = Math.min(
      this.peopleRendered + this.peoplePageSize,
      people.length
    );

    console.log(`Rendering people ${this.peopleRendered} to ${nextLimit}`);

    for (let i = this.peopleRendered; i < nextLimit; i++) {
      frag.appendChild(this.createPersonItem(people[i]));
    }

    this.peopleRendered = nextLimit;
    if (this.peopleSentinel && this.peopleListElement.contains(this.peopleSentinel)) {
      this.peopleListElement.insertBefore(frag, this.peopleSentinel);
    } else {
      this.peopleListElement.appendChild(frag);
    }

    // If we've loaded all, remove sentinel & observer
    if (this.peopleRendered >= people.length && this.peopleSentinel) {
      this.peopleSentinel.remove();
      this.peopleSentinel = undefined;
      if (this.peopleObserver) {
        this.peopleObserver.disconnect();
        this.peopleObserver = undefined;
      }
    }

    // Autofill logic: if container still doesn't scroll (content height <= visible height)
    // and there are more people to load, continue loading additional batches.
    // This addresses the case where the initial sentinel intersection fires only once
    // because the sentinel never leaves the viewport when container is tall.
    if (
      this.peopleListElement &&
      this.peopleSentinel &&
      this.peopleRendered < people.length &&
      this.peopleListElement.scrollHeight <= this.peopleListElement.clientHeight
    ) {
      // Defer next batch to allow layout to update and avoid tight sync recursion.
      setTimeout(() => this.renderNextPeopleBatch(), 0);
    }
  }

  private setupPeopleInfiniteScroll(): void {
    if (!this.peopleListElement || !this.peopleSentinel) return;
    this.peopleObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          console.log("Loading next batch of people...");
          this.renderNextPeopleBatch();
        }
      },
      {
        root: this.peopleListElement,
        rootMargin: "0px 0px 200px 0px", // prefetch a bit earlier
        threshold: 0,
      }
    );
    this.peopleObserver.observe(this.peopleSentinel);
  }



  createPeopleFilterUI(): HTMLElement {
    const people = this.filters.people || [];
    const filterContainer = document.createElement("div");
    filterContainer.className = "filter-container mb-2";

    const filterTitle = document.createElement("h4");
    filterTitle.textContent = "People";
    filterTitle.className =
      "text-base font-semibold text-blue-700 mb-2 tracking-wide capitalize border-b border-blue-200 pb-0.5";
    filterContainer.appendChild(filterTitle);

    // Reset previous infinite scroll state
    this.resetPeopleInfiniteScroll();

    const peopleList = document.createElement("div");
    peopleList.className = "flex flex-wrap overflow-y-auto";
    peopleList.style.maxHeight = "360px";
    peopleList.style.display = "flex";
    peopleList.style.flexWrap = "wrap";
    peopleList.style.overflowY = "auto";
    peopleList.style.padding = "2px";

    this.peopleListElement = peopleList;
    // Sentinel (only if there is more than one page)
    if (people.length > this.peoplePageSize) {
      const sentinel = document.createElement("div");
      sentinel.style.width = "100%";
      sentinel.style.height = "1px";
      sentinel.dataset.role = "people-sentinel";
      this.peopleSentinel = sentinel;
      peopleList.appendChild(sentinel);
    }

    // Initial batch
    this.renderNextPeopleBatch();

    // Activate observer if needed
    if (this.peopleSentinel) {
      this.setupPeopleInfiniteScroll();
    }


    filterContainer.appendChild(peopleList);
    return filterContainer;
  }

  async populateSinglePhotoFilter(
    filterName: keyof typeof Filter_Request_Mapping
  ): Promise<string[] | undefined> {
    const mappedName = Filter_Request_Mapping[filterName];
    if (!mappedName) return;

    const filterOptions = await filterPopulateQuery(
      this.queryToken!,
      mappedName
    );

    this.filters[filterName] = filterOptions.filter((option: string) => option);
  }

  async populateAllPhotoFilters(): Promise<void> {
    const filterNames = Object.keys(
      Filter_Request_Mapping
    ) as (keyof typeof Filter_Request_Mapping)[];

    for (const filterName of filterNames) {
      await this.populateSinglePhotoFilter(filterName);
    }
  }

  uncheckAllImages(): void {
    const images = document.querySelectorAll("#photo-filters img");
    images.forEach((img) => {
      delete (img as HTMLImageElement).dataset.personId;
      // Reset border, boxShadow and borderRadius
      (img.parentElement! as HTMLImageElement).style.border = "none";
      (img.parentElement as HTMLImageElement).style.borderRadius = "0";
    });
  }

  onImageClick(image: HTMLImageElement, personId: string): void {
    const dataPersonId = image.dataset.personId;
    this.uncheckAllImages();
    this.removeAllFilterPills();
    // Also uncheck all checkboxes as currently we only support single filter selection
    this.uncheckEveryCheckbox();
    if (dataPersonId === personId) {
      console.log(`Image is already selected: ${image.alt}`);
      // If the image is already selected, do nothing
      this.filteredImages = [];
      this.onFilterChange(this.filteredImages);
      return;
    }
    this.addFilterPill("person", personId);
    // Add better styles to show a selected image
    image.parentElement!.style.border = "3px solid #2563eb"; // Use a blue accent for selection
    image.parentElement!.style.borderRadius = "8px"; // Rounded corners for better appearance
    // Add a data attribute to tell that it is checked
    image.dataset.personId = personId;
    this.setFilteredImages("person", personId);
  }

  onCheckboxClick(
    filterName: string,
    option: string,
    isChecked: boolean,
    checkbox: HTMLInputElement
  ): void {
    this.uncheckEveryCheckbox(checkbox);
    // Uncheck all images as we currently only support single filter selection
    this.uncheckAllImages();
    this.removeAllFilterPills();
    if (!isChecked) {
      this.filteredImages = [];
      this.onFilterChange(this.filteredImages);
      return;
    }
    this.addFilterPill(filterName, option);
    this.setFilteredImages(
      Filter_Request_Mapping[filterName as keyof typeof Filter_Request_Mapping],
      option
    );
  }

  uncheckEveryCheckbox(checkedCheckbox?: HTMLInputElement): void {
    // Uncheck all the checkboxes of the filter container
    const checkboxes = document.querySelectorAll(`input[type="checkbox"]`);

    checkboxes.forEach((checkbox) => {
      if (checkbox !== checkedCheckbox) {
        (checkbox as HTMLInputElement).checked = false;
        // Reset styles
        const label = checkbox.parentElement as HTMLLabelElement;
        label.classList.remove("bg-blue-100", "font-semibold", "text-blue-700");
      }
    });
  }

  createSingleFilterUI(filterName: string, options: string[]): HTMLElement {
    if (filterName === "people") {
      return this.createPeopleFilterUI();
    }
    const filterContainer = document.createElement("div");
    filterContainer.className = "filter-container mb-4";

    const filterTitle = document.createElement("h4");
    filterTitle.textContent =
      Filter_UI_Mapping[filterName as keyof typeof Filter_UI_Mapping];
    filterTitle.className =
      "text-lg font-semibold text-blue-700 mb-3 tracking-wide capitalize border-b border-blue-200 pb-1";
    filterContainer.appendChild(filterTitle);

    const optionsList = document.createElement("ul");
    optionsList.className = "space-y-1";
    options.forEach((option) => {
      const optionItem = document.createElement("li");

      const label = document.createElement("label");
      label.className =
        "flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-blue-50 transition";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = filterName;
      checkbox.value = option;
      checkbox.className =
        "mr-2 accent-blue-600 w-4 h-4 rounded border-gray-300";

      // Add event listener
      checkbox.addEventListener("change", (event) => {
        if (checkbox.checked) {
          label.classList.add("bg-blue-100", "font-semibold", "text-blue-700");
        } else {
          label.classList.remove(
            "bg-blue-100",
            "font-semibold",
            "text-blue-700"
          );
        }
        const target = event.target as HTMLInputElement;
        this.onCheckboxClick(filterName, option, target.checked, checkbox);
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(option));
      optionItem.appendChild(label);

      optionsList.appendChild(optionItem);
    });

    filterContainer.appendChild(optionsList);
    return filterContainer;
  }

  createSidebarHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className =
      "flex items-center justify-between p-4 border-b border-gray-200 bg-white";
    header.style.borderBottom = "1px solid #e5e7eb";

    const title = document.createElement("h3");
    title.textContent = "Filters";
    title.className = "text-lg font-semibold text-gray-800";

    const closeButton = document.createElement("button");
    closeButton.innerHTML = "×";
    closeButton.className =
      "text-gray-500 hover:text-gray-700 text-2xl font-bold cursor-pointer bg-transparent border-none";
    closeButton.style.fontSize = "24px";
    closeButton.style.lineHeight = "1";
    closeButton.style.padding = "0";
    closeButton.style.width = "24px";
    closeButton.style.height = "24px";
    closeButton.style.display = "flex";
    closeButton.style.alignItems = "center";
    closeButton.style.justifyContent = "center";

    closeButton.addEventListener("click", () => {
      this.closeSidebar();
    });

    header.appendChild(title);
    header.appendChild(closeButton);
    return header;
  }

  createSidebarFooter(): HTMLElement {
    const footer = document.createElement("div");
    footer.className = "p-4 border-t border-gray-200 bg-white";
    footer.style.borderTop = "1px solid #e5e7eb";

    const clearButton = document.createElement("button");
    clearButton.textContent = "Clear All Filters";
    clearButton.className =
      "w-full py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium";
    clearButton.style.cursor = "pointer";
    clearButton.style.border = "none";

    clearButton.addEventListener("click", () => {
      this.clearAllFilters();
    });

    footer.appendChild(clearButton);
    return footer;
  }

  clearAllFilters(): void {
    // Uncheck all images
    this.uncheckAllImages();
    // Uncheck all checkboxes
    this.uncheckEveryCheckbox();
    // Remove all filter pills
    this.removeAllFilterPills();
      // Clear filtered images
      // TODO: Should be called only when filters are applied
      // TODO: Need to keep a state to track which filters are on
    this.filteredImages = [];
    this.onFilterChange(this.filteredImages);
  }

  renderFilters() {
    // Create main content container
    const filtersContainer = document.getElementById("photo-filters");

    if (!filtersContainer) {
      return;
    }

    filtersContainer.innerHTML = ""; // Clear existing content

    // Create filter elements for each filter category
    for (const [category, options] of Object.entries(this.filters)) {
      // Check if filter is not empty
      if (options.length > 0) {
        const filterUI = this.createSingleFilterUI(category, options);
        filtersContainer.appendChild(filterUI);
      }
    }
  }

  createPhotoFiltersUI(): void {
    // Empty sidebar element TODO: Recheck this approach
    this.sidebarElement.innerHTML = "";

    // Create header with close button
    const header = this.createSidebarHeader();
    this.sidebarElement.appendChild(header);

    const filtersContainer = document.createElement("div");
    filtersContainer.id = "photo-filters";
    filtersContainer.className = "p-4 space-y-6 flex-1 overflow-y-auto";
    this.sidebarElement.appendChild(filtersContainer);

    // Create footer with clear filters button
    const footer = this.createSidebarFooter();
    this.sidebarElement.appendChild(footer);
  }
}
