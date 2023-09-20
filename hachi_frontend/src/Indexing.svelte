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






</script>