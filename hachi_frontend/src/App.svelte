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
    current_videos_list  = videos_list.filter(item => item.video_title.toLowerCase().search(search_text) != -1)
    }


  async function getVideos(data_generation_id = "xxxxxx", got_id = false) {
    if (got_id == false){
      videos_list = [];
    }
    const url = url_prefix + "/videos"
    let formData = new FormData();
    // create POST request formData
    formData.append('video_directory', dirname);
    formData.append("include_subdirectories", include_subdirectories.toString());
    if (got_id){
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
      let temp = await res.json();  // temp is supposed to be an object with fields.
      let data_generation_id = temp.data_generation_id
      if (temp.flag == true){
        
        videos_list.push(temp);
        videos_list = videos_list;  // so that svelte know.

        await getVideos(data_generation_id, got_id = true);   // call this again with this data_generation_id
      }
      return
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

        <div class="relative grid sm:grid-cols-3 2xl:grid-cols-5 min-[2400px]:grid-cols-9 gap-8 mt-6 grid-flow-row-dense">
          {#each current_videos_list as f,i (f)}
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
