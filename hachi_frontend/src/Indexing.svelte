<script>

import { onMount, onDestroy } from "svelte";

let current_statusEndpoint;        // to store the current status endpoint to check indexing status, only atmax one such endpoint would be allowed for each client.
let index_cancel_button;
let index_start_button;  

onMount(() => {
      
      current_statusEndpoint = localStorage.getItem("stored_indexing_endpoint")
      if(current_statusEndpoint !== null)
      {
      
      let http_endpoint = "/api/getIndexStatus/" + current_statusEndpoint;
      index_cancel_button.disabled = false;
      index_start_button.disabled = true;

      pollEndpointNew(http_endpoint);
      }
      
    })

    
onDestroy(() => {
    // apparently setinterval function would keep running in the background...even after destroy!!!
    if (pollEndpointTimeoutId){
      clearTimeout(pollEndpointTimeoutId);
    }

  })

  $: if(current_statusEndpoint){
      localStorage.setItem("stored_indexing_endpoint", current_statusEndpoint);
    }

let input_element;         // input element to accept indexing directory path..

// current indexing stats
let index_progress = 0.01;                 
let directory_being_indexed = ""
let eta = ""
let index_directory_path = ""             // absolute path to directory to be indexed(input by user..)







</script>