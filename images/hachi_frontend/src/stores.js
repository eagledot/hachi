import { writable } from "svelte/store";

// unmutable values
export const url_prefix = "/api/"

// writable stores
// -1 = no modal selected and modal index will start from 0..total items
export const lastModal = writable(-1);
export const dark_bg = writable(false);


export const no_images_indexed = writable(0);  // on app mount, update these and also on indexing completion..
export const unique_people_count = writable(0); 
export const unique_place_count = writable(0);
export const unique_resource_directories_count = writable(0);

export const filter_metaData_store = writable([]);

let query_completed_data_store  = {
    "list_metaData": [],
    "list_dataHash": [],
    "list_score": [],
    "done":false,
}

export const query_results_available = writable(query_completed_data_store);
export const available_resource_attributes = writable([]); // a list of available resource attributes. Server provides those..
