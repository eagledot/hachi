<style global lang="postcss">
  /* custom styles goes here */
</style>

<script lang="ts">
  import SideBar from './lib/SideBar.svelte';
  import Card from './lib/Card.svelte';
  import OptionBar from './lib/OptionBar.svelte';
  
  import { url_prefix } from './stores.js';
  import { dark_bg } from './stores.js';
  import { onMount } from 'svelte';
  
  onMount(() => {
    let dir_temp = localStorage.getItem('dirname')
    if (dir_temp) {
      dirname = dir_temp
      console.log(dirname)
    }
  })
  dark_bg.set(false)

  let dirname = ''
  let videos_list = [];
  let current_videos_list = [];
  let search_text = "";
  let promiseGetVideos;
  let include_subdirectories = false;

  $: if(videos_list){
    if (search_text.length > 0){ 
    current_videos_list  = videos_list.filter(item => item.video_title.toLowerCase().search(search_text) != -1)
    }
    else{
      current_videos_list = [];
    }
  }

  async function getVideoPosterData(video_hash){
    // get the poster/thumbnail for a video.
    let url = "/api/videoPoster/" + video_hash;
    let response = await fetch(url);
    let myBlob = await response.blob();
    let objectURL = await URL.createObjectURL(myBlob);
    return objectURL
  }

  async function getVideos(data_generation_id = "xxxxxx", got_id = false) {
    if (got_id == false){
      //TODO: disable search button.

      videos_list = [];
      current_videos_list = [];
    }
    const url = url_prefix + "/videos"
    let formData = new FormData();

    // create POST request formData
    formData.append('video_directory', dirname);
    formData.append("include_subdirectories", include_subdirectories.toString());
    if (got_id){
      //send it along to let server pinpoint the request iteration.
      formData.append("data_generation_id", data_generation_id);
    }
    const res = await fetch(url, {
                method: 'POST',
                body: formData,
              })
    if (!res.ok) {
			throw new Error(res);
		}
    else{
      let data = await res.json();  // temp is supposed to be an object with fields.
      let is_query_done = data["query_done"]
      if (is_query_done == true){
        //TODO: enable search button.

        return
      }
      else{
          let data_generation_id = data["data_generation_id"];
          let video_hash = data["video_hash"];
          let poster_url = await getVideoPosterData(video_hash); // get the corresponding poster for the video.
          data["poster_url"] = poster_url;
          videos_list.push(data);
          videos_list = videos_list; // allowing svelte to run reactive code.

          // recursive.
          await getVideos(data_generation_id, true) // Donot use `got_id = true`, just true. Have to discuss this issue. call this again with this data_generation_id
      }

  }
  }
  
  $: if (dirname) {
    promiseGetVideos  = getVideos();
  }

  function handleMessage(event){
    search_text = event.detail.text.toLowerCase();
  }

  var dark_bg_value = false;
  dark_bg.subscribe(value => {
    dark_bg_value = value;
    console.log("dark bg value:", value)
  })

  let video_dir_path;
  function select_video_directory() {
    if (video_dir_path) {
      dirname = video_dir_path
      localStorage.setItem('dirname', dirname)
    }
  }
  function handleVideodirInput(e) {
    if (e.key === 'Enter') {
      select_video_directory()
    }
  }

</script>
<!-- minimum height of screen = viewport height -->
<div class="min-h-screen md:flex">
  <!-- Side bar -->
  <SideBar bind:dirname={dirname}/>

  <!-- Main window -->
  <main class="max-md:flex flex-1 bg-gray-300 dark:bg-gray-600 overflow-y-auto">
    <div class="sm:px-12 max-sm:px-4 py-12 text-gray-700">
      <!-- menu bar -->
      <OptionBar on:message={handleMessage} items={current_videos_list.length}/>
      <!-- Show cards -->
      <!-- List all videos -->
      <input  on:keydown={handleVideodirInput} bind:value={video_dir_path} type="text" class="dark:text-white w-96 bg-transparent focus:outline-none  border-b border-black dark:border-white" placeholder="Provide absolute path to video directory.">
      <!-- checkbox to include subdirectories -->
      <label class="dark:text-white w-96 bg-transparent">
        <input type=checkbox bind:checked={include_subdirectories}>
        Include Subdirectories
      </label>

      <button on:click={select_video_directory} class="items-center focus:outline-none rounded-lg my-3 py-2 px-6 mb-4
        leading-none bg-blue-200 dark:bg-blue-600 hover:bg-blue-300 hover:dark:bg-blue-800 dark:text-white disabled:bg-slate-100">
        <span>Select video directory</span>
      </button>
      {#if !dirname}
        <p class="dark:text-white text-2xl">Select a directory.</p>
      {:else}
        <p class="dark:text-white">
          Current selected directory: <span class="font-bold">{dirname}</span>
        </p>
        
        {#await promiseGetVideos}
          <p class="dark:text-white"> Fetching data....</p>
        {:then}
          <p class="dark:text-white"></p>
        {/await}
        
        <!-- shouldn't i also supply poster url/data here also, so that each mounting of card doesn't cause it to  -->
        <div class="relative grid sm:grid-cols-6 2xl:grid-cols-8 min-[2400px]:grid-cols-12 gap-8 mt-6 grid-flow-row-dense">
          {#each current_videos_list as f,i (f)}
            <Card f={f} i={i}/>
          {/each}
        </div>
        
        <hr>

        <div class="relative grid sm:grid-cols-3 2xl:grid-cols-5 min-[2400px]:grid-cols-9 gap-8 mt-6 grid-flow-row-dense">
          {#each videos_list as f,i (f)}
            <Card f={f} i={i}/>
          {/each}
        </div>
      
      {/if}
    </div>
  </main>
</div>
<!-- make background darker when playing videos -->
{#if dark_bg_value}
  <div class="fixed inset-0 transition-opacity">
    <div class="absolute inset-0 bg-gray-900 opacity-75"></div>
  </div>
{/if}
