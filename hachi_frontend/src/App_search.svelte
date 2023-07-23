<script>
  import DarkMode from "./lib/DarkMode.svelte";
  let orig_image_src = [];  // to preserve the reference to original image data, in case of filtering based on threshold.
  let image_src = [];
  let image_scores = [];
  let image_local_hash = [];
  let query_button;
  let text_query = "";
  let formData;
  const url_prefix = "/api";
  let image_directory_input ;
  let image_dir_path;
  let show_image_directory_form = false;
  let index_progress = "0";
  let indexing = false;
  let num_images_indexed = 0;
  let basic_interface = true;
  let current_score_threshold = 0;
  let current_endpoint = "";     // supposed to point to the current endpoint being indexed.

  $: basic_interface = !indexing;
  
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

  // handle topk
  let topk_input = 3;

  async function getImageBinaryData(hash, data_generation_id){
    // get image data from the server, given a hash.
    // hash is generally received as a result of query.

    let url = "/api/imageBinaryData/" + hash + "/" + data_generation_id;
    let response = await fetch(url);
    let myBlob = await response.blob();
    let objectURL = await URL.createObjectURL(myBlob);
    return objectURL
  }

 async function handleClick(data_generation_id = "xxxxxxx", got_id = false)
    {   // called upon a new query, called recursively until server asks it to stop.
      // collects corresponding hashes (image-data) and scores for each call. 

        let topk = topk_input;
        formData = new FormData();
        if (!text_query) return;
        formData.append('text_query', text_query);
        formData.append('topk', topk.toString());

        if (got_id){
          formData.append("data_generation_id", data_generation_id);  //send this key along with subsequent requests. We would get this from server.
        }

        if (got_id == false){
          image_src = [];
          image_local_hash = [];
          image_scores = [];
          current_score_threshold = 0;
          formData.append("query_start", "true");
          query_button.disabled = true;
        }

        const url = url_prefix + "/search/image";
        let response = await fetch(url, {
                method: 'POST',
                body: formData,
                })
        
        if (!response.ok) {
          query_button.disabled = false;
			    throw new Error(response);
        }
        
        let data = await response.json()
        
        if (data["query_completed"] == true){
          query_button.disabled = false;
          orig_image_src = image_src;   // so that we have a reference to original data. in case of filter threshold.
          return
        }

        else{
          let temp_id = data["data_generation_id"] ;
          for(let i = 0; i < data["local_hashes"].length; i++){
            image_local_hash.push(data["local_hashes"][i]);
            image_scores.push(data["scores"][i]);
            let objectURL = await getImageBinaryData(data["local_hashes"][i], temp_id);
            image_src.push(objectURL);
            sort_image_data();
          }
                    
          await handleClick(temp_id, true);  // run it recursively.
        }

    }

  // process text query when enter is pressed while inputing text  
  function handleKeyUp(event) {
    if (event.key === 'Enter') {
      if(query_button.disabled == false) {
        handleClick();
      }
    }
  }

  // show updated result when slidebar value changes
  let topk_tag;        // i think not needed, TODO remove it.
  function topkValueChange() {
    console.log("topk: ", topk_input)
    handleClick();
  }

  function scoresThresholdChange() {
    // Event handler for threshold update.

    if (image_scores.length > 0 ){
      
      // generate a linear distribution from [0 - 1].
      let max_score = image_scores[0];  // image_scores would be a sorted array.
      let min_score = image_scores[image_scores.length - 1];
      let temp_scores = image_scores.map((value, index) => ( (value - min_score) / ((max_score - min_score) + 0.00001) ));

      // update the img_src, based on the threshold update event.
      image_src = orig_image_src.filter( (value, index) => (temp_scores[index] >= current_score_threshold));
    }
  }

  $: if(query_button) {
    topk_tag.disabled = query_button.disabled
  }

  // handle face database ids
  let ids = [];
  let showDropdown = false;
  let selected;
  let alreadyExec = false;
  let input_text_query;
  let idsDropdown;

  async function getFaceIds() {
    let res = await fetch("/api/faceIds");
    if(!res.ok){
      throw new Error(res);
    }
    else{
      let result = await res.json();
      ids = result["face_ids"].sort();
    } 
  }

  async function handleKeyDown(event) {
    if (event.key === '@') {
      showDropdown = true
      alreadyExec = false;
      await getFaceIds()
      idsDropdown.focus()
      selected = ids[0]
      console.log("faces: ", ids)
    }
    else if (event.key === 'Enter' || event.key === ' ') {
      showDropdown = false
    }
  }

  function selectIds() {
    if (!alreadyExec) {
      text_query = text_query + selected
      alreadyExec = true
    }
    input_text_query.focus()
    showDropdown = false
  }
  
  function handleKeyUpForIdsDropdown(event) {
    if (event.key === 'Enter') {
      selectIds();
    }
    if (event.key === 'Escape' || event.key === 'Backspace'){
      showDropdown = false
      input_text_query.focus()
    }
  }
  //.....................................................

  function select_dir(){
    show_image_directory_form = true;
  }
  
  // subscribe to the imageIndex progress events.
  async function getIndexCount(){
    let res = await fetch("/api/getIndexCount/image");
    if(!res.ok){
      throw new Error(res);
    }
    else{
      let result = await res.json();
      num_images_indexed = (result["index_count"]);
    }

  }

  let pollEndpointTimeoutId;
  async function pollEndpointNew(endpoint, count = 0){

    if(count == 0){
      indexing = true;
      show_image_directory_form = false;
    }
    
    let response = await fetch(endpoint, 
      {method: "GET"});
    let data = await response.json();
    let status_available = data["status_available"]
    if (status_available == true){
      
      // if status available, check for progress. TODO: check for a done flag, rather than progress, add it on the server side.
      if (data["done"] == true){
        indexing = false;              //it means server done indexing.
        await getIndexCount();         // count of total images indexed. 
        
        // code block, to acknowledge the done flag for current index.
        let formData = new FormData();
        formData.append("ack", "true");
        let response = await fetch(endpoint,
          {
            method: "POST",
            body: formData
          })
          if (response.ok === false){
          console.log("index updated succesfully, but server should have responded with 200 code")
        }
        
        alert("Index Updated Successfully.");
        return;
      }

      index_progress = data["progress"]
      
      //set it to poll this endpoint .
      if(pollEndpointTimeoutId){
            clearTimeout(pollEndpointTimeoutId);
          }
      pollEndpointTimeoutId = setTimeout(function() {pollEndpointNew(endpoint, count + 1)} , 1000) // call this function again, after a second.
    }
    
  }

  // routine to cancel and ongoing index.
  async function cancel_current_indexing(){
    let formData = new FormData();
    formData.append("cancel", "true");  // set cancel key as true.
    let response = await fetch(current_endpoint,
        {
          method: "POST",
          body: formData
        })
    if (!response.ok) {
        throw new Error(response);
      }
    
    // response ok is enough for now to know indexing has been cancelled successfully.
    alert("Indexing Cancelled.");
    }

  
  async function add_image_directory(){
    //send a request to index a particular image directory.
    
    console.log("Adding image directory: " + image_dir_path);
    if(query_button){
      query_button.disabled = true;
    }
   
    let form_data = new FormData();
    form_data.append("image_directory_path", image_dir_path);
    let url = "/api/indexImageDir";
    let response = await fetch(url, {method: 'POST', body: form_data}) ;
    let data = await response.json();
    let wasSuccess = data["success"] // indexing started successfully.
    if (wasSuccess){
      let endpoint = "/api/indexStatus/" + data.statusEndpoint;
      pollEndpointNew(endpoint) // keep polling that endpoint.
    }

    //check this later, if necessary !
    else{
        if (query_button){
          query_button.disabled = false;
        }
      }
  }


  getIndexCount();


  //####################################################################################################
  // code to update database . TODO: may be clean it a bit
  let uploadFacesToDatabase = false;
  let input_file_element;
  let fileList;
  let face_ids = [];
  function handleFiles() {
      fileList = [];
      face_ids = [];

      fileList = this.files; /* now you can work with the file list */
      console.log(fileList.length, "Files Selected");
      for(let i = 0; i < fileList.length; i++){
          let file = fileList[i];
          console.log("mimetype: ",file.type);
          face_ids.push("");
      }

      //display Modal to specify ids. 
      uploadFacesToDatabase = true
  }

    async function uploadFiles(e)
    {
        // upload files one by one.
        e.preventDefault();
        for(let i = 0; i < fileList.length; i++){
            
            let face_id = face_ids[i];
            let file = fileList[i];
            if (face_id === "")
            {
                alert("face ids cannot be empty");
                return
            }
            
            await uploadFile(file, face_id);
        }

        uploadFacesToDatabase = false;
    }

    async function uploadFile(file, face_id)
        {        
            let formdata = new FormData();
            formdata.append("mimetype", file.type); // string data-type
            formdata.append("id", face_id);      // string data-type
            formdata.append("imagedata", file); // file-data type
            
            // open an xhr request.
            const url = "/api/updateDatabase"
            const res = await fetch(url, {
                  method: 'POST',
                  body: formdata,
                })
            if (!res.ok) {
			    throw new Error(res);
	    	}
            else{
                const result = await res.json();
                alert(result["reason"]);                
            }
            
        }

    $: {
        console.log(fileList);
        console.log(face_ids);
        } // reactive, to run, i.e on change of face_ids ??
  // ####################################################################################################
  // face tagging
  let tag_face;
  let img_src;
  let currentPage;
  let tag_image;
  let tag_canvas;
  let tag_div;
  let bbpath = [];
  let tag_id_input;
  let show_image = false;
  let face_index = ''
  let tag_img_hash = ''

  async function getBoundingBoxes(hash) {
    let url = "/api/get_bboxes/" + hash
    const res = await fetch(url);
    const result = await res.json();
    if (!res.ok) {
			throw new Error(result);
		}
    let bboxes = result['bboxes']; // (x1, y1, x2, y2)
    console.log("bboxes: ", bboxes)

    drawBoundingBoxes(bboxes);
  }

  function handleTagClick(event) {
    const ctx = tag_canvas.getContext('2d')
    console.log("bbpath[0]: ", bbpath)
    const y_mul = tag_canvas.height/tag_canvas.clientHeight
    const x_mul = tag_canvas.width/tag_canvas.clientWidth
    console.log(tag_canvas)
    let isPointInPath = false;
    for (const i in bbpath) {
      isPointInPath = ctx.isPointInPath(bbpath[i], event.offsetX * x_mul, event.offsetY * y_mul)
      if (isPointInPath == true) {
        face_index = i
        break
      }
    }
    if (isPointInPath == true) {
      tag_id_input.hidden = false
      tag_id_input.focus()
      tag_id_input.style.left = event.offsetX + "px"
      tag_id_input.style.top = event.offsetY + "px"
    } else {
      tag_id_input.hidden = true
      face_index = ''
    }

    console.log("isPoint in path: ", isPointInPath, "id: ", face_index)
  }

  async function handleTagKeyUp(event) {
    if (event.key === 'Enter' && tag_id_input.value && tag_img_hash && face_index !== '') {
      let url = "/api/tag_face/" + tag_img_hash + "/" + face_index + '/' + tag_id_input.value
      const res = await fetch(url);
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result);
      }
      console.log("face tag result: ", res)
      tag_id_input.hidden = true
      alert("Face updated successfully")
    }
  }

  function drawBoundingBoxes(bboxes) {
    const h = tag_image.height
    const w = tag_image.width
    tag_canvas.height = h
    tag_canvas.width = w

    const ctx = tag_canvas.getContext('2d')
    ctx.drawImage(tag_image, 0, 0);
    ctx.beginPath();

    let width_multiplier = (h * w)/1000000
    width_multiplier = (width_multiplier < 1) ? 1 : (width_multiplier > 7 ? 7 : width_multiplier)
    console.log("width multiplier: ", width_multiplier)
    ctx.lineWidth = 3 * width_multiplier;
    ctx.strokeStyle = 'red';

    for (const i in bboxes) {
      let x = bboxes[i][0]
      let y = bboxes[i][1]
      let width = bboxes[i][2] - x
      let height = bboxes[i][3] - y
      let path = new Path2D()
      path.rect(x, y, width, height);
      ctx.stroke(path)
      bbpath[i] = path
    }
    
    ctx.stroke();
  }

  function handleTagFace(hash) {
    show_image = true;
    tag_face.classList.remove("w-0", "h-0", "opacity-0")
    tag_face.classList.add("w-screen", "h-screen", "bg-opacity-95", "inset-0")
    img_src = "/api/get_full_image/" + hash;
    tag_img_hash = hash
    // create img
    tag_image = new Image();
    tag_image.src = img_src;
    getBoundingBoxes(hash);
  }

  function closeTagFace() {
    show_image = false
    tag_face.classList.remove("w-screen", "h-screen", "bg-opacity-95", "inset-0")
    tag_face.classList.add("w-0", "h-0", "opacity-0")
    tag_img_hash = ''
  }

  // catch escape keydown
  document.addEventListener("keydown", function(event) {
    const key = event.key;
    if (key === "Escape") {
        closeTagFace()
    }
  });

  // copy image full path
  async function copyImagePath() {
    // get path from hash
    const hash = this.dataset.hash
    
    let patch = document.getElementsByClassName("addpatch-" + this.dataset.index)[0]
    if (patch.classList.contains('bg-green-500')) {
      patch.classList.remove("bg-green-500")
      patch.classList.add("bg-red-500")
    } else {
      patch.classList.remove("bg-red-500")
      patch.classList.add("bg-green-500")
    }

    let url = "/api/get_full_path/" + hash
    const res = await fetch(url);
    const path = await res.text();
    if (!res.ok) {
      throw new Error(path);
    }
    alert("Image full path:  " + path)
  }

  // testing purposes only
  let testt;
  $: console.log("image selected: ", testt);
  text_query = "@brucelee"
</script>
  
  
<div bind:this={currentPage} class="overflow-y-auto min-h-screen dark:bg-gray-600 p-2 relative">
  <!-- top row ... add image directory, update person database, and dark mode -->
  <div class=" flex flex-row mt-10 justify-center">
    <button on:click={select_dir} class="bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white py-1 px-3 mx-2 rounded-md">Add Image directory</button>
    <button on:click={() => {input_file_element.click();}} 
      class="bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white py-1 px-3 mx-2 rounded-md">Update Person Database</button>
    <DarkMode/>
  </div>
  
  <!-- image directory input and index progress -->
  <div class="flex flex-row place-content-center mb-10 select-none mx-2">
    <div>
      {#if show_image_directory_form}
      <div>
        <br>
        <input bind:this={image_directory_input}  bind:value={image_dir_path} type="text" class="bg-transparent w-72 focus:outline-none dark:text-white border-b border-black dark:border-white" placeholder="Provide absolute path to image directory.">
        <button on:click={add_image_directory} class="bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white py-1 px-3 m-2 rounded-md">Start Indexing</button>
        <button on:click={() => {show_image_directory_form = false}} class="bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white py-1 px-3 m-2 rounded-md">Cancel</button>
      </div>
      {/if}

      {#if indexing}
        <p class="dark:text-white">Indexing in progress...please wait for it to finish.</p>
        <progress class="bg-gray-400 h-3 mt-2 w-full" value={index_progress} max="1"></progress>
        <button on:click={cancel_current_indexing} class="bg-yellow-600 hover:bg-yellow-800 disabled:bg-yellow-400 text-white py-1 px-3 m-2 rounded-md">Cancel</button>
        {/if}
    </div>
  </div>
  
  {#if show_image_directory_form || indexing}
      <div class="flex-grow h-px my-5 bg-gray-500 dark:bg-white"></div> 
  {/if}

  <!-- select person face to upload -->
  <input bind:this={input_file_element} on:change={handleFiles} type="file"  multiple style="display:none" accept="image/png, image/jpeg, image/jpg" />
  <!-- upload face to database -->
  {#if uploadFacesToDatabase}
    <div class="flex flex-row place-content-center mt-10 mb-10 select-none mx-2">
      <div class="my-2">    
        {#each fileList as file, i}
          <img src={URL.createObjectURL(file)} class="max-w-[20rem] max-h-72" alt="selected face">
          <input bind:value={face_ids[i]} type="text" class="my-2" placeholder="enter unique Id">
          <span><p class="dark:text-white"> {file.name} </p></span>
          <br>
        {/each}
        <button on:click={uploadFiles} class="bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white py-1 px-3 m-2 rounded-md">Upload</button>
        <button on:click={() => {uploadFacesToDatabase = false}} class="bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white py-1 px-3 m-2 rounded-md">Cancel</button> 
      </div>
    </div>
    <div class="flex-grow h-px my-5 bg-gray-500 dark:bg-white"></div> 
  {/if}   
  
  <!-- image search query < input box and button >  -->
  <div class="flex flex-row place-content-center mb-10 select-none mx-2">
    <div>
      {#if (basic_interface && (num_images_indexed > 0))}
        <input bind:this={input_text_query} on:keyup={handleKeyUp} on:keydown={handleKeyDown} bind:value={text_query} autofocus class="bg-transparent focus:outline-none dark:text-white border-b border-black dark:border-white" placeholder="Search">
        <!-- Svelte complaints, that event handler must be a function rather than a promise if we just directly use handleClick, but this works! -->
        <button on:click={async (e) => {await handleClick()}} bind:this={query_button} class="bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white py-1 px-3 my-2 ml-2 rounded-md">Query All Images</button>
        {#if showDropdown}
          <div>
            <select on:click={selectIds} on:keyup={handleKeyUpForIdsDropdown} bind:value={selected} bind:this={idsDropdown} size={(ids.length < 10) ? ids.length : 10}>
              {#each ids as id}
                <option value={id}>
                  {id}
                </option>
              {/each}
            </select>
          </div>
        {/if}
        <p class="dark:text-white">{num_images_indexed} Images Indexed So far.</p>
      <div class="my-4">
        <input on:change={topkValueChange} bind:this={topk_tag} type="range" min="1" max="30" bind:value={topk_input} class="w-full">
        <label for="topk" class="dark:text-white">Displaying top {topk_input} images.</label>
      </div>
      
      <div class="my-4">
        <input on:change={scoresThresholdChange} type="range" min="0" max="1.0" step="0.01" bind:value={current_score_threshold} class="w-full">
        <label for="topk" class="dark:text-white">Score threshold: {current_score_threshold}.</label>
      </div>

      {/if}
    </div>
  </div>

  <!-- show all the matching images -->
  <div class="flex flex-wrap gap-6 p-4 sm:p-12 px-auto justify-center">
    {#each image_src  as src,i}
      <div class="relative group">
        <a href={"/api/get_full_image/" + image_local_hash[i]} target="_blank" rel="noreferrer" class="rounded text-grey-darkest no-underline shadow-md h-full max-w-fit">
            <!-- svelte-ignore a11y-img-redundant-alt -->
            <img class="sm:max-h-48 rounded-lg shadow-xl" src={src} alt="image">
        </a>

        <button on:click={() => handleTagFace(image_local_hash[i])} class="hidden group-hover:block absolute bottom-0 w-full p-1 bg-blue-500 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-b-lg">
          Tag Face
        </button>

        <button on:click={copyImagePath} data-hash={image_local_hash[i]} data-index={i} class="hidden group-hover:block absolute top-0 right-0 bg-slate-700 hover:bg-slate-500 text-white p-2 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
            <path d="M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM15.5 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
          </svg>         
        </button>

        <div class="absolute left-0 top-0 w-4 h-4 rounded-full bg-green-500 addpatch-{i} hidden"></div>
      </div>
    {/each}
  </div>
</div>

<!-- show window for tagging faces -->
<div bind:this={tag_face} class="fixed z-90 w-0 h-0 opacity-0 bg-gray-900">
  {#if show_image}
    <div  bind:this={tag_div} class="absolute flex justify-center items-center w-full h-full px-4 py-8 sm:px-24">
      <div class="relative">
        <canvas bind:this={tag_canvas} on:click={handleTagClick} class=" max-w-full max-h-screen">
        </canvas>
        <input on:keyup={handleTagKeyUp} class="absolute" type="text" bind:this={tag_id_input} hidden>

        <button on:click={closeTagFace} class="absolute top-0 right-0 text-pink-300 bg-slate-700 hover:text-pink-500 hover:bg-slate-500 p-2 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  {/if}
</div>

<!-- show properties windows -->
<!-- <div bind:this={show_image_properties} class="fixed z-90 w-0 h-0 opacity-0 flex justify-center items-center ">
  <div  bind:this={tag_div} class="absolute  max-w-[600px] max-h-full px-4 py-8 sm:px-24">
    <div class="relative w-40 h-96 bg-red-500">
      
    </div>
  </div>
</div> -->