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

    let filter_button_disabled = true;
    let final_image_data = null;
    $:if(image_data){
      filter_button_disabled = !image_data.done
      if(image_data.done){
        final_image_data = image_data
      }
    }

    onDestroy(() => {
      image_data  = {
        "list_metaData": [],
        "list_dataHash": [],
        "list_src": [],
        "list_score": [],
        "done":false}
    })

    let image_card_data = {} 
    let meta_data_available = false; 
    let sorted_scoreIndex = [];  

    $: if (image_data){
      sorted_scoreIndex = argsort(image_data.list_score);
    }

    let interface_state = {
        // mutually exclusive states.
        "parent":true,
        "image_card":false,
        "image_card_edit_interface":false,  // if editing meta-data for an image_card
        "image_card_fullscreen":false
    }


</script>