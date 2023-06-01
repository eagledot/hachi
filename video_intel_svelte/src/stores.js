import { writable } from "svelte/store";

// unmutable values
export const url_prefix = "/api/"

// writable stores
// -1 = no modal selected and modal index will start from 0..total items
export const lastModal = writable(-1);
export const dark_bg = writable(false);