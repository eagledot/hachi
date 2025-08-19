import { endpoints } from "../config";
import type { HachiImageData, ImageMetaData } from "../imageSearch";
import { filterPopulateQuery, filterQueryMeta } from "../utils";

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
  private filters: PhotoFilters = {};
  private queryToken: string | null = null;
  private filteredImages: HachiImageData[] = [];
  private onFilterChange: (photos: HachiImageData[]) => void;

  constructor(onFilterChange: (photos: HachiImageData[]) => void, container?: HTMLElement) {
    this.sidebarElement = this.createSidebar();
      this.onFilterChange = onFilterChange;
      if (container) {
        container.appendChild(this.sidebarElement);
      } else {
        document.body.appendChild(this.sidebarElement);
      }
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
    await this.populateAllPhotoFilters();
    this.createPhotoFiltersUI();
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

  createSidebar(): HTMLElement {
    const sidebarElement = document.createElement("div");
    sidebarElement.id = "photo-filter-sidebar";
    this.createSidebarStyles(sidebarElement);
    return sidebarElement;
  }

  createSidebarStyles(sidebarElement: HTMLElement): void {
    sidebarElement.style.width = "320px";
    sidebarElement.style.height = "100%";
    sidebarElement.style.position = "absolute";
    sidebarElement.style.top = "0";
    sidebarElement.style.right = "0";
    sidebarElement.style.backgroundColor = "#fff";
    sidebarElement.style.boxShadow = "-2px 0 5px rgba(0,0,0,0.5)";
    sidebarElement.style.zIndex = "1000";
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

    const peopleList = document.createElement("div");
    peopleList.className = "flex flex-wrap overflow-y-auto";
    peopleList.style.height = "360px";
    peopleList.style.display = "flex";
    peopleList.style.flexWrap = "wrap";
    peopleList.style.overflowY = "auto";
    peopleList.style.padding = "2px";

    people.forEach((person) => {
        const personItem = document.createElement("div");
        personItem.className =
            "flex flex-col items-center cursor-pointer hover:bg-blue-50 rounded transition";
        // personItem.style.width = "48px";
        personItem.style.padding = "2px";
        // personItem.style.margin = "0px";
        personItem.style.alignItems = "center";
        personItem.style.justifyContent = "center";

        const photo = document.createElement("img");
        photo.className =
            "w-12 h-12 bg-gray-200 rounded-full object-cover";
        photo.src = `${endpoints.GET_PERSON_IMAGE}/${person}`;
        photo.alt = person;
        photo.style.marginBottom = "2px";

        photo.addEventListener("click", () => {
            this.onImageClick(photo, person);
        });

        

        personItem.appendChild(photo);
        peopleList.appendChild(personItem);
    });

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
    // Also uncheck all checkboxes as currently we only support single filter selection
    this.uncheckEveryCheckbox();
    if (dataPersonId === personId) {
      console.log(`Image is already selected: ${image.alt}`);
      // If the image is already selected, do nothing
      this.filteredImages = [];
      this.onFilterChange(this.filteredImages);
      return;
    }
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
    if (isChecked) {
      console.log(`Adding ${option} to ${filterName}`);
    } else {
      console.log(`Removing ${option} from ${filterName}`);
    }
    if (!isChecked) {
      this.filteredImages = [];
      this.onFilterChange(this.filteredImages);
      return;
    }
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

  createPhotoFiltersUI(): void {
    const filtersContainer = document.createElement("div");
    filtersContainer.id = "photo-filters";
    filtersContainer.className = "p-4 space-y-6";

    // Create filter elements for each filter category
    for (const [category, options] of Object.entries(this.filters)) {
      // Check if filter is not empty
      if (options.length > 0) {
        const filterUI = this.createSingleFilterUI(category, options);
        filtersContainer.appendChild(filterUI);
      }
    }
    // Empty sidebar element TODO: Recheck this approach
    this.sidebarElement.innerHTML = "";
    this.sidebarElement.appendChild(filtersContainer);
  }
}
