<script lang="ts">
  import Video from "./Video.svelte";
  //import Video_youtube from "./Video_youtube.svelte";
  import { url_prefix, lastModal } from "../stores.js";
  import { onMount } from "svelte";
  
  export let f = '';
  export let i = -1;

  onMount(() => {
    let data = sessionStorage.getItem(f.video_hash)
    console.log("session storage:", data)
    if (data === "indexing") {
      const eventSource = handleProgress();
      if (gen_index_btn) {
        gen_index_btn.disabled = true;
        gen_index_btn.innerHTML = "Index in progress"
      }
    }
  });

  let gen_index_btn;
  
  var index_progress = '0'
  var eta = "unknown"

  var indexing = false
  function genIndex() {
    this.disabled = true;
    // this.remove()
    this.innerHTML = "Index in progress"

    indexing = true
    // /progress eventSource
    const eventSource = handleProgress();
    const url = url_prefix + "/videoIndex"
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
        indexing = false
        this.innerHTML = "Index complete"
        sessionStorage.setItem(f.video_hash, "indexed");
        f.index_available = true;
        eventSource.close();
      })
  }

  
  function handleProgress() {
    // Create the connection
    let eventSource = new EventSource("/api/progress/" + f.video_hash);
    // When there is an incoming message from the server side
    eventSource.onmessage = (event) => {
      // Splitting the data into progress_value and hash
      console.log("Got some data: " + event.data);
      let progress_data = event.data.split("_")
      let progress = progress_data[0]
      let hash = progress_data[1]
      eta = progress_data[2]
      // Selecting the right progressbar to update
      if (f.video_hash === hash) {
          index_progress = progress
          indexing = true
          sessionStorage.setItem(hash, "indexing")

      }
      if (index_progress == "1.0"){
        console.log("Index complete")
        indexing = false;
        if (gen_index_btn) {
          gen_index_btn.disabled = true
          gen_index_btn.innerHTML = "Index complete"
        }
        sessionStorage.setItem(hash, "indexed")
      }
    }

    // When there is an error
    eventSource.onerror = (event) => {
      console.log("Error with event source");
      eventSource.close();
    }
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