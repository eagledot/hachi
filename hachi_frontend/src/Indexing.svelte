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

let pollEndpointTimeoutId;
    async function pollEndpointNew(endpoint, count = 0){
    
    if(count == 0){
      console.log("starting a new polll...");
    }
    
    let response = await fetch(endpoint, 
      {method: "GET"});
    let data = await response.json();

    let status_available = data["is_active"]

    if (status_available == true){
      
      if (data["done"] == true){

        let formData = new FormData();
        formData.append("ack", "true");  // let the server know that client has acknowledged that indexing done on server side. (So that server could do some cleanup,)

        let response = await fetch(endpoint,
          {
            method: "POST",
            body: formData
          })
        
        if (response.ok === false){
            alert("Some error on server side, after indexing is Completed. Contact administrator..");    
        }
        else{
            alert("Indexing Completed Successfully");
        }
        
        // update the indexing stats into localstorage
        let temp_stats = await fetch("/api/getMetaStats");
        temp_stats = await temp_stats.json();
        localStorage.setItem("no_images_indexed", temp_stats["image"]["count"].toString());
        localStorage.setItem("unique_people_count", temp_stats["image"]["unique_people_count"].toString());
        localStorage.setItem("unique_place_count", temp_stats["image"]["unique_place_count"].toString());

        index_start_button.disabled = false;

        //reset states.
        current_statusEndpoint = null;            // to store the current status endpoint to check indexing status, only atmax one such endpoint would be allowed for each client.
        localStorage.removeItem("stored_indexing_endpoint");
        index_progress = 0                 
        directory_being_indexed = ""
        eta = ""
        index_directory_path = ""             // absolute path to directory to be indexed(input by user..)
        index_cancel_button.disabled = true;
        input_element.disabled = false;

        return;
      }

      index_progress = data["progress"];
      eta = data["eta"];
      directory_being_indexed = data["current_directory"];
      
      //set it to poll this endpoint .
      if(pollEndpointTimeoutId){
            clearTimeout(pollEndpointTimeoutId);
          }
      pollEndpointTimeoutId = setTimeout(function() {pollEndpointNew(endpoint, count + 1)} , 1000) // call this function again, after a second.
      


    }
    
  }

  let complete_rescan = false;   // bind to checkbox.
    async function startIndex(){
        
        if (index_start_button && index_directory_path)
        {
            index_start_button.disabled = true;
            input_element.disabled = true;

            let form_data = new FormData();
            
            form_data.append("image_directory_path", index_directory_path);
            form_data.append("complete_rescan",   complete_rescan.toString());

            let url = "/api/indexStart"
            let response = await fetch(url, {method: 'POST', body: form_data}) ;
            let data = await response.json();
            let wasSuccess = data["success"] // indexing started successfully.
            if (wasSuccess === true){
                index_cancel_button.disabled = false;
                let endpoint = "/api/getIndexStatus/" + data.statusEndpoint;
                current_statusEndpoint = data.statusEndpoint;     // for now assuming only one endpoint would be active for a CLIENT at a given time.
                pollEndpointNew(endpoint) // keep polling that endpoint.
            }
        }
        else{
            console.log("No index_start_button object found!!!");
        }
    }

    async function cancelIndex(){
        if (current_statusEndpoint)
        {             
            index_cancel_button.disabled = true;
            let url = "/api/indexCancel/" + current_statusEndpoint
            let response = await fetch(url,
                {
                method: "GET",
                })
            
            if (!response.ok) {
                alert("Error occured while cancelling index. Contact administrator.")
                throw new Error(response);
            
            }
            return;
        }
        else{
            return;
        }
    }





</script>