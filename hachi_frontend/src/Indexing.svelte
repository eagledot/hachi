<script>

import { onMount, onDestroy } from "svelte";
import { no_images_indexed, unique_people_count, unique_place_count } from "./stores";

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
let index_progress = 0.001;                 
let directory_being_indexed = ""
let extra_details = ""
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

        let final_status = data["details"]
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
            alert("Indexing Completed.\nFinal Status: " + final_status);
        }
        
        // update the indexing stats into localstorage
        let temp_stats = await fetch("/api/getMetaStats");
        temp_stats = await temp_stats.json();
        no_images_indexed.update((value) => Number(temp_stats["image"]["count"]));
        unique_people_count.update((value) => Number(temp_stats["image"]["unique_people_count"]));
        unique_place_count.update((value) => Number(temp_stats["image"]["unique_place_count"]));

        index_start_button.disabled = false;

        //reset states.
        current_statusEndpoint = null;            // to store the current status endpoint to check indexing status, only atmax one such endpoint would be allowed for each client.
        localStorage.removeItem("stored_indexing_endpoint");
        index_progress = 0                 
        directory_being_indexed = ""
        eta = ""
        extra_details = ""
        index_directory_path = ""             // absolute path to directory to be indexed(input by user..)
        index_cancel_button.disabled = true;
        index_cancel_button.innerText = "Cancel";
        input_element.disabled = false;

        return;
      }

      index_progress = data["progress"];
      eta = data["eta"];
      extra_details = data["details"];
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
            else{
              alert(data["reason"])
              index_start_button.disabled = false;
              input_element.disabled = false;
            }
        }
        else{
            console.log("No index_start_button object found!!!");
        }
    }

    async function cancelIndex(){
        if (current_statusEndpoint)
        {   
            // localStorage.removeItem("stored_indexing_endpoint")
            
            index_cancel_button.disabled = true;
            index_cancel_button.innerText = "Cancelling... Please wait."
            let url = "/api/indexCancel/" + current_statusEndpoint
            let response = await fetch(url,
                {
                method: "GET",
                })
            
            localStorage.removeItem("stored_indexing_endpoint")
            current_statusEndpoint = null;
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

<div class="container mx-auto max-w-lg bg-green-50 p-4">
    <p class="mb-2 text-sm font-semibold">Press Start button to start indexing</p>
  
    <div class="my-2">
      <input bind:this={input_element} bind:value={index_directory_path} on:keydown={(e) => {if(e.key === "Enter"){index_start_button.click();}}} type="text" class="w-full rounded border p-1 text-sm" placeholder="D://images (Full path to directory to index)" required={true}/>
    </div>
  
    <div class="mb-3">
      
      <div class = "flex items-center">
        <div class="flex h-2 w-11/12 rounded bg-gray-300">
          <div class="h-2rounded bg-blue-500" style="width: {(index_progress * 100).toString()}%;"></div>
        </div>
        <div class="flex px-2 font-semibold">{(index_progress * 100).toString().slice(0,4)}% </div>
      </div>
      
      <div class="pt-1 text-sm text-blue-600">Current directory: <span class="text-black">{directory_being_indexed}</span> <span class="pl-3 text-right">ETA: </span> <span class="text-black">{eta}</span></div>
      <div class="pt-1 text-sm text-blue-600">Details: <span class="text-black">{extra_details}</span></div>
    </div>
  
    <div class="mt-4 mb-3 flex flex-wrap items-center">
      <div class="mr-2 flex items-center">
        <input type="checkbox" bind:checked={complete_rescan} class="h-5 w-5 text-blue-500" />
        <label class="ml-1">Complete Rescan</label>
      </div>
      <div class="text-sm text-gray-600">Re-index all originals, including already indexed and unchanged files.</div>
    </div>
  
    <div class="mb-3 mt-3 flex flex-wrap items-center">
      <select class="h-8 rounded border border-blue-500 p-1 text-sm text-blue-700 focus:outline-none">
        <option>Images Only</option>
        <option disabled>Videos Only</option>
        <option disabled>Videos and Images</option>
      </select>
      
      <div class="ml-2 text-sm text-gray-600">Filter by content type</div>
    </div>
  
    <button bind:this={index_cancel_button} on:click={cancelIndex} disabled type="button" class="mr-2 mt-2 rounded bg-orange-500 px-4 py-2 text-white disabled:bg-orange-200 disabled:opacity-75">Cancel</button>
    <button bind:this={index_start_button} on:click={startIndex} type="button" class="rounded bg-blue-500 px-4 py-2 text-white  disabled:bg-blue-200">Start</button>
  </div>

