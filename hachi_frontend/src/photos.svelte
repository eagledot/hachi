<script>

import { createEventDispatcher, onDestroy, onMount } from 'svelte';
import Filters from './filters.svelte';
const dispatch = createEventDispatcher();  // attach dispatch to this instance. 
export let show_exit_interface_button = false;    // in case to exit this component, depeneding on the parent. we can have a such button.

export let image_data  = {
            "list_metaData": [],
            "list_dataHash": [],
            "list_src": [],
            "list_score": [],
            "done":false
    }


</script>