<!-- This module displays the video tiles/cards dynamically based on the video directory selected. 
All video related routes should be available here.
-->
<script lang="ts">
  import Video from "./Video.svelte";
  //import Video_youtube from "./Video_youtube.svelte";
  import { url_prefix, lastModal } from "../stores.js";
  import { onMount } from "svelte";
  
  export let f = '';
  export let i = -1;

  onMount(() => {
    let endpoint = url_prefix + "indexStatus/" + f.video_hash ;
    pollEndpointNew(endpoint) // this should be enough.
    
  });

  let gen_index_btn;
  var index_progress = '0'
  var eta = "unknown"
  var indexing = false       // is currently indexing ?

  let pollEndpointTimeoutId;
  async function pollEndpointNew(endpoint, count = 0){
    
    let response = await fetch(endpoint,
      {method: 'GET'});
    let data = await response.json();
    let status_available = data["status_available"];
    if (status_available){
      
      // if indexing done.
      if (data["done"] == true){
          
        if (gen_index_btn)
          {
            gen_index_btn.disabled = true
          }
          
          f.index_available = true
          indexing = false // this means that indexing is done.
          return
        }


        if (count == 0){
          // update state, for variables.
          f.index_available = false;
          indexing = true;
          if(gen_index_btn){
              {
                gen_index_btn.disabled = true;
                gen_index_btn.innerHTML = "indexing in progress";
              }
        }}
        
        eta = data["eta"]
        index_progress = data["progress"]

        if(pollEndpointTimeoutId){
          clearTimeout(pollEndpointTimeoutId);
        }
        pollEndpointTimeoutId = setTimeout(function() {pollEndpointNew(endpoint, count + 1)} , 1000) // call this function again, after a second.
        // return now.
    }

  }

  function genIndex() {
    // make a request to genereate index for this video. based on the arguments we receive like video_hash.
    // based on the if an index is available, we would update the status.
    
    const url = url_prefix + "videoIndex"
    let formData = new FormData();
    formData.append('video_absolute_path', f.video_absolute_path);
    fetch(url, {
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        let endpoint = url_prefix + "indexStatus/" + data.statusEndpoint   // where should client make the request to know its indexing status.
        pollEndpointNew(endpoint)
      })
       
  }

  // handle video modal
  let show_modal = false;

  function toggleShow() {
    if (show_modal) {
      show_modal = false
    } else {
      show_modal = true;
      lastModal.update(x => i) // update lastModal value to present selected modal
    }
  }

  lastModal.subscribe(value => {
    // check if last opened modal value is same as present modal value
    // otherwise do not show the modal
    if (i != value) {
      show_modal = false
    }
  })

</script>

<!-- video card -->
<div class="mb-4 dark:text-white">
  <div  class="flex flex-col">
    <div class="break-all">
      <label for="" class="mb-2 text-blue-500 dark:text-white h-auto w-full">{f.video_title}</label>
      <button on:click={toggleShow} class="h-auto w-full shadow-xl">
        <img class="h-auto w-full rounded-lg" src={"/api/videoPoster/" + f.video_hash + ".jpg"} alt="videos from selected directory">
      </button>
      
      {#if indexing}
        <div>
          <progress class="bg-gray-400 dark:bg-gray-200 h-3 mt-2 w-full" data-hash={f.video_hash} value={index_progress} max="1"></progress>
          <span>ETA: {eta}</span>
        </div>
      {/if}
    </div>
    <div class="mx-auto mt-2">
      {#if f.index_available === true }
        <p class="dark:text-white">Already Indexed</p>
      {:else}
        <button bind:this={gen_index_btn} on:click={genIndex} class="items-center focus:outline-none rounded-lg py-2 px-6
          leading-none bg-blue-200 dark:bg-blue-600 hover:bg-blue-300 dark:hover:bg-blue-800 disabled:bg-slate-100 dark:text-white">
          <span>Gen Index</span>
        </button>
      {/if}
    </div>
  </div>
</div>
{#if show_modal}
  <Video bind:show_modal={show_modal} f={f}/>
{/if}