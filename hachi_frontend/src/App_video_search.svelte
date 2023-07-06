<script>
    import DarkMode from "./lib/DarkMode.svelte";

    let image_src = [];
    let image_scores = [];
    let image_local_hash = [];
    let query_button;
    let text_query = "";
    let temp_count = 0;
    let MAX_COUNT = 100;
    let formData;
    const url_prefix = "/api";
    let num_videos_indexed = 0;

    // set page mode: dark or light
      
    function sort_image_data(){
      // basically sorting the image_data, based on the image_scores.
      // image_src.length == image_scores.length;  # check this...
  
      // create a temporary array.
      const mapped = image_scores.map((value, i) => {
        return {i, value: image_scores[i]};
      })
  
      // sort this temporary array.
      mapped.sort((a, b) => {
        if (a.value > b.value) {
          return -1;
        }
        if (a.value < b.value) {
          return 1;
        }
        return 0;
      });
  
      // sort the scores, src and local paths. based on indices returned from sorting scores.
      image_scores = mapped.map((v) => v.value);    
      image_src = mapped.map((v) => image_src[v.i]);
      image_local_hash = mapped.map((v) => image_local_hash[v.i]);
    }
  
  
    async function getImageBinaryData(hash, data_generation_id){
      // get image data from the server, given a hash.
      // hash is generally received as a result of query.

      let temp_hash = hash.split("_")[0]
      let url = "/api/videoFramesBinaryData/" + temp_hash + "/" + data_generation_id;
      let response = await fetch(url);
      let myBlob = await response.blob();
      let objectURL = null;
      if (myBlob.size > 0){
        objectURL = await URL.createObjectURL(myBlob);
      }
      return objectURL
    }
  
    async function handleClick(data_generation_id = "xxxxxxx", got_id = false){
      let formData = new FormData();
      
      formData.append('text_query', text_query);
      formData.append('context_window', context_window.toString());

      if (got_id == true){
          formData.append("data_generation_id", data_generation_id);  //send this key along with subsequent requests. We would get this from server.
      }
      
      if(got_id == false){
          image_src = [];
          image_local_hash = [];
          image_scores = [];
          formData.append("query_start", "true");
          query_button.disabled = true;
          }

      // send the query.
      const url = url_prefix + "/search_new/video";
      let response = await fetch(url, {
              method: 'POST',
              body: formData,
              })
      if (!response.ok) {
            query_button.disabled = false;
                  throw new Error(response);
          }

      let data = await response.json();
      let query_completed = data["query_completed"];
      if(query_completed == true){
        query_button.disabled = false;
        return
      }
      let temp_id = data["data_generation_id"];
      let local_hashes  = data["local_hashes"];
      let frame_scores = data["scores"];

      for (let i = 0; i < frame_scores.length ; i++){
        let objectURL = await getImageBinaryData(local_hashes[i], temp_id);
        if (objectURL == null){
          continue
        }

        image_src.push(objectURL);
        image_scores.push(frame_scores[i]);
        image_local_hash.push(local_hashes[i]);
        
        image_src = image_src;
      }
      sort_image_data();

      await handleClick(temp_id, true) // call it recursively.

    }
  
    function handleKeyUp(event) {
      if (event.key === 'Enter') {
        if(query_button.disabled == false)
        {handleClick();}
      }
    }

    async function getIndexCount(){
    let res = await fetch("/api/getIndexCount/video");
    if(!res.ok){
      throw new Error(res);
    }
    else{
      let result = await res.json();
      num_videos_indexed = (result["index_count"]);
    }

    }

    // update context window size based on the slider.
    let context_window = 1;
    let contextWindow_tag;
    function contextWindowChange(){
      handleClick(); 
    }
    
    $: if(query_button) {
      contextWindow_tag.disabled = query_button.disabled
    }

    getIndexCount()

    </script>
    
    
  <div class="overflow-y-auto min-h-screen dark:bg-gray-600 dark:text-white">    
    <div class="flex flex-row place-content-center mt-10 select-none">
      <div>
        <div class="flex flex-row my-2">
          <input on:keyup={handleKeyUp} bind:value={text_query} class="bg-transparent focus:outline-none dark:text-white border-b border-black dark:border-white" placeholder="Search">
          <button on:click={handleClick} bind:this={query_button} class="bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white px-3 py-1 ml-2 rounded-md">Query All Videos</button>
          <DarkMode/>
        </div>
        <p class="dark:dark:text-white">{num_videos_indexed} Videos Indexed So far.</p>
        <div class="my-4">
          <input on:change={contextWindowChange} bind:this={contextWindow_tag} type="range" min="0" max="3" bind:value={context_window} class="w-full">
          <label for="context_window" class="dark:text-white">Current Context Window: {context_window}</label>
        </div>
      </div> 
    </div>
  
    <div class="flex items-center select-none m-4">
      <div class="relative grid md:grid-cols-3 2xl:grid-cols-5 gap-8 mt-6 grid-flow-row-dense">
      {#each image_src  as src,i}
        <div  class="flex flex-col">
          <!-- href works for local path only, This is local url, only works when running on local host. -->
            <a href={"/api/get_full_image/" + image_local_hash[i]} target="_blank"> 
              <img class="sm:max-h-48 rounded-lg shadow-xl" src={src} alt="image">
            </a>
        </div>
      {/each}
      </div>
    </div>
  </div>
    
    
    
    