import { writable } from "svelte/store";

// unmutable values
export const url_prefix = "/api/"

// writable stores
// -1 = no modal selected and modal index will start from 0..total items
export const lastModal = writable(-1);
export const dark_bg = writable(false);


// idea is to to update by some component..
// then subscribed to by in filter.svelte.
export const filter_metaData_store = writable([]);

let query_completed_data_store  = {
    "list_metaData": [],
    "list_dataHash": [],
    "list_score": [],
    "done":false,
}

export const query_results_available = writable(query_completed_data_store);
