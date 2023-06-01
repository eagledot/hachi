<!-- want to be able to play videos through youtube but using custom controls. -->

<script context="module">
    let iframeApiReady = false;
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/player_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Replace the 'ytplayer' element with an <iframe> and
    // YouTube player after the API code downloads.
    window.onYouTubeIframeAPIReady = function(){
        console.log("iframe api ready!!");
        iframeApiReady = true;
    }
</script>

<script>
    import { url_prefix, dark_bg } from "../stores.js";
    import { onMount, onDestroy } from "svelte";

    let videoId="M7lc1UVf-VE";
    let ytplayer;
    let player;
    let video_modal_mounted = false;
    let time, duration;
    let progress_update_interval;
    
    function initialize(){

        //clear any old interval;
        clearInterval(progress_update_interval);

        // set interval for 100ms.
        progress_update_interval = setInterval(function() {
            time = player.getCurrentTime(); //based on this variable the progress bar should update. i think!!
        }, 100)

        duration = player.getDuration()
        console.log("Initialized!");
        }

    $: if(iframeApiReady && video_modal_mounted){ 
            //idea to create player instance, only if video_model is mounted and iframe API is ready.
            player = new YT.Player(ytplayer, {
            height: "390",
            width: "640",
            videoId,
            playerVars: {
                'origin': "localhost:5000",
                'autoplay': 1,
                'playsinline': 1,
                'modestbranding': 1,
                'controls': 0,     
                },
            events: {
                onReady: initialize,
            }
            });
    }

    onMount (() => {
      searchInputFocus();
      if(!isInViewport(video_modal)) {
        // scroll 'video_modal' div into 'end' of viewport (bottom viewport)
        video_modal.scrollIntoView({block: "end", inline: "nearest"})
      }
  
      dark_bg.set(true);
      video_modal_mounted = true;
      videoId = f.youtube_id;
      console.log("youtube_id: " +  f.youtube_id)
      console.log("modal mounted!!")
      
      if (f.index_available == false) {
        search_input.setAttribute('disabled', '');
        search_input.setAttribute('placeholder', "Gen index to query")
      }
    });
  
    onDestroy(() => {
      closeVideoModal();
      video_modal_mounted = false;
      dark_bg.set(false);
    });
  
    // check if particular 'element' is in viewport
    function isInViewport(element) {
      const rect = element.getBoundingClientRect();
      return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
  }
  
  
    export let f;
    export let show_modal;
    
    let video;
    let video_modal;
    let search_input;
    let paused;
    // initially video paused
    paused = true
  
    export function searchInputFocus() {
      search_input.focus();
    }
  
    // close connection to server before destrying the node
    export function closeVideoModal() {
      //video.pause();
      //video.removeAttribute('src')
      //video.load();
      show_modal = false
      player.stopVideo();
    }
  
  
    // catch escape keydown
    document.addEventListener("keydown", function(event) {
      const key = event.key;
      if (key === "Escape") {
          closeVideoModal()
      }
    });
  
    function updateTime(obj, e) {
    //   if (!duration) return;
    //   if (e.buttons != 1) return; // check if mouse button is pressed
  
      const { left, right } = obj.getBoundingClientRect();
      //video.currentTime = duration * (e.clientX - left) / (right - left);
      player.seekTo( duration * (e.clientX - left) / (right - left));
    }
  
    function handleMove(e) {
      updateTime(this, e);
    }
  
    function handleMouseDown1(e) {
        console.log("eventfadsfs");
      updateTime(this, e);
    }
  
    let playback_pos;
    var meta_data;
    let aug_prompt = "true";
  
    function sendQuery(query_text) {
      if (!query_text) return; // if string is undefined
  
      const url = url_prefix + "queryVideo"
      console.log(url);
      console.log("query text: ", query_text)
      
      let formData = new FormData();
      formData.append('video_hash', f.video_hash);
      formData.append('query_text', query_text);
      formData.append('aug_prompt', aug_prompt);
      console.log("prompt_type: ", aug_prompt);
      fetch(url, {
        method: 'POST',
        mode: 'cors',
        body: formData,
      })
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        meta_data = data['meta_data']
        playback_pos = data['meta_data']['playback_pos'];
      })
    }
  
    // send search query again whenever 'aug_prompt' radio element changes
    $: if(search_input) {
      // for reactivity we need to specify 'watch element'(in this case aug_prompt) on r.h.s
      aug_prompt = aug_prompt
      sendQuery(search_input.value)
    }
  
    // send query text when pressed "enter" inside 'search_input'
    function querySearch(e) {
      if (e.key === 'Enter') {
        const query_text = this.value;
        sendQuery(query_text);
      }
    }
  
    function gotoPlaybackPos(pos) {
      player.pauseVideo();
      player.seekTo(pos)
    //   video.pause()
    //   video.currentTime = pos
    }
  
    let query_result;
    function displayQueryResult() {
      query_result.style.display = 'flex'
    }
  
    const thumbnail_time = 0; // in seconds (time from where video should start playing)
  </script>

  
  <div bind:this={video_modal} class="transform z-[9999] col-span-full w-full flex justify-center pb-[20px]">
    <div class="relative  max-w-[1080px] w-full pb-[10px] bg-gray-300">
      <div >
        <h3 class="text-2xl mx-2 mt-2">{f.video_title}</h3>
        <button on:click={closeVideoModal} class="absolute top-0 right-0 hover:text-pink-500 p-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="dark:text-white w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span class=" font-light">esc</span>
        </button>
      </div>
      
      <fieldset class="flex flex-row place-content-center mt-3">
        <!-- <div class="border py-1 px-3"> -->
        <div>
          <legend>Augmented Prompts</legend>
          <label>
            <input type="radio" bind:group={aug_prompt} name="prompts" value={"true"}>
            true
          </label>
          <label>
            <input type="radio" bind:group={aug_prompt} name="prompts" value={"false"}>
            false
          </label>
        </div>
      </fieldset>
  
      <div class="flex place-content-center my-5">
        <!-- search query div -->
        <div class="flex border rounded-full p-2 bg-white">
          <button on:click={searchInputFocus} class="hover:text-pink-500 cursor-pointer px-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="dark:text-white w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
          <input bind:this={search_input} on:keyup={querySearch} class="focus:outline-none" type="text" placeholder="Search query">
        </div>
      </div>

      <div class="relative w-full min-h-[400px] h-[40vh] break-all">
        <div bind:this={ytplayer} class="bg-black  w-full h-full"></div>
        <!-- progress bar -->
        <div class="relative w-full h-[10px] hover:h-[20px] bg-red-200"
            on:mousedown={handleMouseDown1} 
        >
          <div class="h-full bg-red-400" style="width: {(Number(time) / Number(duration) * 100) || 0}%;"></div>
          {#if playback_pos}
            {#each playback_pos as pos}
              <div class="absolute bg-blue-900 top-0 w-[4px] h-full max-w-full" style="left: {(pos/duration * 100)}%;"></div>
            {/each}
          {/if}
        </div>
        {#if playback_pos}
          <div bind:this={query_result} class="absolute bottom-0 left-0 h-32 flex flex-nowrap overflow-x-auto bg-transparent" style="scrollbar-color: red gray">
            {#each meta_data['data'] as img_data, i}
              <img on:click={() => gotoPlaybackPos(playback_pos[i])} class="h-full mr-2 hover:border-4 border-red-400" src={"data:image/jpg;base64, "+img_data} alt="video frames from search query">
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>