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
  
  
    async function handleClick()
      {   
          formData = new FormData();
          if (!text_query) return;
          formData.append('text_query', text_query);
          formData.append('context_window', context_window.toString());
  
          if(temp_count == 0){
              image_src = [];
              image_local_hash = [];
              image_scores = [];
              formData.append("query_start", "true");
              query_button.disabled = true;
          }
    
          if(temp_count == MAX_COUNT){
            //TODO: wait out for the previous stream to complete.
              console.log("Max limit reached. Ending query.");
              temp_count = 0;
              query_button.disabled = false;
              return;
          }           
          
  
          const url = url_prefix + "/search/video";
          let response = await fetch(url, {
                  method: 'POST',
                  body: formData,
                  })
          
          if (!response.ok) {
            query_button.disabled = false;
                  throw new Error(response);
          }
          
          let reader = response.body.getReader();
  
          let new_stream = await new ReadableStream({
          start(controller) {
              return pump();
              function pump() {
              return reader.read().then(({ done, value }) => {
                  // When no more data needs to be consumed, close the stream
                  if (done) {
                  controller.close();
                  return;
                  }
                  // Enqueue the next data chunk into our target stream
                  controller.enqueue(value);
                  return pump();
              });
              }
          }
          })
  
          let new_response = await new Response(new_stream);
          let temp_json = await new_response.json();
          if (temp_json["query_completed"] == true){
              console.log("Stream completed");
              temp_count = 0;
              query_button.disabled = false;
              return;
  
          }
          // image_data.push("data:image/jpg;base64, " + temp_json["data"]);
          image_local_hash.push(temp_json["local_hash"]);
          image_src.push(temp_json["data"]);
          image_scores.push(Number(temp_json["score"]));
          sort_image_data();  // sort the image_local_hash/src/scores based on the image_sores.
  
  
          temp_count += 1;
          handleClick();
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
      <div class="relative grid md:grid-cols-3 2xl:grid-cols-4 gap-8 mt-6 grid-flow-row-dense">
      {#each image_src  as src,i}
        <div  class="flex flex-col">
          <!-- href works for local path only, This is local url, only works when running on local host. -->
            <a href={"/api/get_full_image/" + image_local_hash[i]} target="_blank"> 
              <img class="h-auto rounded-lg shadow-xl" src={src} alt="image">
            </a>
        </div>
      {/each}
      </div>
    </div>
  </div>
    
    
    
    