<script>

// on svelte components... it is difficult to handle../ so what..
// what we are supposed to do then..
window.onresize = function (){
  if (interface_state){
    if (interface_state.image_card_fullscreen == true){
        let target = document.getElementById("content_full_screen")
        handleFullImageLoad(target);
    }
  }
}

// just want to raise an event when query full data has been received.
// then can generate filter data page by page.
// on more items click can generate again the event..

import {filter_metaData_store, query_results_available} from "./stores.js"

import { createEventDispatcher, onDestroy, onMount } from 'svelte';
import Filters from './filters.svelte';
const dispatch = createEventDispatcher();  // attach dispatch to this instance. 
export let show_exit_interface_button = false;    // in case to exit this component, depeneding on the parent. we can have a such button.

export let image_data  = {
            "list_metaData": [],
            "list_dataHash": [],
            "list_score": [],
            "done":false,
            "progress": 0      // to indicate progress for ongoing query.
    }

    let filter_button_disabled = true;
    onDestroy(() => {
      image_data  = {
        "list_metaData": [],
        "list_dataHash": [],
        "list_score": [],
        "done":false,
        "progress": 0
      }

      filter_metaData_store.update((value) => []); // reset any filter metadata to empty.
    })

    let image_card_data = {} 
    let meta_data_available = false; 
    let sorted_scoreIndex = [];  
    let original_sorted_scoreIndex = [];

    let page_size = 18;
    let offset  = 0;
    let total_downloaded = 0
    let query_progress = 0;
    let flag_set = false; // indicating if should count, how many images have been downloaded to show al

    function showMoreResults(node)
    {
      if(flag_set == true){
        // console.log("downloading in progress!!");
        return;
      }
      
      flag_set = true;
      total_downloaded = 0;
      query_progress = 0;

      offset = offset + page_size;
      sorted_scoreIndex = original_sorted_scoreIndex.slice(offset, offset + page_size)
      filter_metaData_store.update((value) => generateFilterMetaData(sorted_scoreIndex));
    }

    function generateFilterMetaData(sorted_scoreIndex){
        let temp_filter_metaData = [];

        // collect meta_data based on current sorted_scoreIndex array
        let temp_length = sorted_scoreIndex.length;
        for (let i = 0; i< temp_length; i++){
          let image_ix = sorted_scoreIndex[i].ix;  // absolute index into (unsorted) original image data.
          temp_filter_metaData.push(image_data.list_metaData[image_ix]);
        }
        return temp_filter_metaData;
      }
    
    query_results_available.subscribe((value) => 
                                  { query_progress = value.progress;
                                    if(value.done == true){
                                    afterAllQueryData(value);
                                    query_progress = 0;      // indicating all meta-data downloaded i.e query finished.
                                  }
                                  else{
                                    offset = 0;
                                    sorted_scoreIndex = [];
                                  }});

    function afterAllQueryData(query_data){
      original_sorted_scoreIndex = argsort(query_data.list_score);  // store in original array
      sorted_scoreIndex = original_sorted_scoreIndex.slice(0, 0 + page_size);
      filter_metaData_store.update((value) => generateFilterMetaData(sorted_scoreIndex));
    }


    $: if (image_data){
      original_sorted_scoreIndex = argsort(image_data.list_score);  // store in original array

      // todo remove this sorted_ScoreIndex dependency, actually remove this reactive block completely.
      if(image_data.done == false){
        sorted_scoreIndex = original_sorted_scoreIndex.slice(offset, offset + page_size) // idea is to use this until all query data is available.
      }
    }

    let interface_state = {
        // mutually exclusive states.
        "parent":true,
        "image_card":false,
        "image_card_edit_interface":false,  // if editing meta-data for an image_card
        "image_card_fullscreen":false
    }

    $: if(interface_state){
        let active = false;
        if(interface_state.image_card == true || interface_state.image_card_fullscreen == true){
            active = true;
        }
        dispatch("imageCardActive",{"active":active});
    }

    function set_state_active(state){
        let temp_keys = Object.keys(interface_state);
        for(let i = 0; i < temp_keys.length; i++){
            interface_state[temp_keys[i]] = false;
        }
        interface_state[state] = true;
    }

    function argsort(data, mask = [1], key = null){
   
      let temp_scoreIndex = []; // list of object containing score and index in descending order of score.
      if ((mask.length != 1 && mask.length != (data.length))){
        throw new Error("Assertion failed");
      }
      
        for(let i = 0; i < data.length; i++){
        
          let current_ix = i
          if (!(mask[i % mask.length] === 1)){
            current_ix = -1 // indicating invalid index, not to show/render this..
          }

          if(key){
            
            temp_scoreIndex.push({"ix":current_ix, "score":data[i][key]});
          }
          else{
            temp_scoreIndex.push({"ix":current_ix, "score":data[i]});
          }
      
      }

        // sort in place.
        temp_scoreIndex.sort((a, b) => {
        if (a.score > b.score) {
            return -1;
        }
        else if (a.score < b.score){
            return 1;
        }
        else{
            return 0;
        }
        })
        
    return temp_scoreIndex;
    }

    let current_box_ix;             // current selected face bbox for an image. 

    let tag_interface = {
  "active":false,
  "top":null,
  "left":null
}

function next_valid_index(ix){
    let result = {"sorted_ix":null, "image_ix":null};
    for (let i = ix; i < sorted_scoreIndex.length; i++){
        if(sorted_scoreIndex[i].ix !== -1){
        result.image_ix = sorted_scoreIndex[i].ix;
        result.sorted_ix = i;
        break
        }
    }
    return result;
}

let loadTimeoutId;
function update_image_card(ix){
    // this takes care of updating correct data in image_card_data.
    // even if we have invalid indices as a result of some threshold or filtering operation.
    
    editForm = {};
    meta_data_available  = false;
    scaled_face_bboxes = [];
    tag_interface = {
      "active":false,
      "top":null,
      "left":null
    }   

    let current_ix = ix
    let temp_length = sorted_scoreIndex.length
    if(current_ix < 0){
        current_ix = temp_length - 1;
    }
    if(current_ix > (temp_length - 1)){
        current_ix = 0;
    }
    
    
    let temp_data = next_valid_index(current_ix);
    let image_data_ix = temp_data.image_ix;
    current_ix = temp_data.sorted_ix;

    if (image_data_ix === null){
      temp_data = next_valid_index(0); // start search from 0.
      image_data_ix = temp_data.image_ix;
      current_ix = temp_data.sorted_ix;
    }

    // TODO: handle null values, to be easily displayed in markup code, when needed.
    image_card_data.ix = current_ix;
    image_card_data.data_hash = image_data.list_dataHash[image_data_ix];
    if(interface_state["image_card_fullscreen"] === true){
      loadTimeoutId = setTimeout(() => {full_image_loaded = false; console.log("set timeout...")}, 400) // after 400 milliseconds..
    }
    image_card_data.height = Number(image_data.list_metaData[image_data_ix]["height"])
    image_card_data.width = Number(image_data.list_metaData[image_data_ix]["width"])
    image_card_data.face_bboxes = image_data.list_metaData[image_data_ix]["face_bboxes"]
    image_card_data.person_ids = image_data.list_metaData[image_data_ix]["person"]
    if(image_card_data.person_ids === null){
      image_card_data.person_ids = [];
    }

    // update meta-data for selected image.
    image_card_data.resolution = image_card_data.height.toString() + " X " + image_card_data.width.toString();
    image_card_data.filename = image_data.list_metaData[image_data_ix]["filename"]
    image_card_data.taken_at = image_data.list_metaData[image_data_ix]["taken_at"]
    if(image_card_data.taken_at == null){
      image_card_data.taken_at = "Unknown"
    }
    image_card_data.last_modified = image_data.list_metaData[image_data_ix]["modified_at"]
    image_card_data.device = image_data.list_metaData[image_data_ix]["device"]
    if(image_card_data.device == null){
      image_card_data.device = "";
    }
    image_card_data.place = image_data.list_metaData[image_data_ix]["place"]
    image_card_data.absolute_path = image_data.list_metaData[image_data_ix]["absolute_path"]
    image_card_data.description = image_data.list_metaData[image_data_ix]["description"];
    image_card_data.tags = image_data.list_metaData[image_data_ix]["tags"];

    meta_data_available = true;

    }

function update_image_card_next(){
    update_image_card(image_card_data.ix + 1);
}

function update_image_card_previous(){
    update_image_card(image_card_data.ix - 1);
}

let scaled_face_bboxes = [];  // to hold the array of scaled face bboxes, according to dimensions of image being currently shown.
let person_aliases = [];      // to hold the corresponding  person id. to face bboxes.

let full_image_loaded = true;
let current_score_threshold = 0 // to hold the current value of threshold.
function scoresThresholdChange() {

    // idea is to invalidate indices, less than threshold, by providing a mask.
    let max_score = sorted_scoreIndex[0].score;
    let min_score = sorted_scoreIndex[(sorted_scoreIndex).length - 1].score;

    let temp_scores = image_data.list_score.map((score) => ( (score - min_score) / ((max_score - min_score) + 0.00001) ));
    let temp_mask = temp_scores.map((score) => {
                            if (score >= current_score_threshold)
                            {return 1}
                            else{
                                return 0
                            }
                            })

    sorted_scoreIndex =  argsort(image_data.list_score, temp_mask); // would trigger re-rendering.
}

function applyFilterMask(filter_mask){
  filter_button_disabled = true;
  
  let temp_scoreIndex = original_sorted_scoreIndex.slice(offset, offset + page_size);
  for(let i = 0; i < filter_mask.length; i++){
    if (filter_mask[i] == 0){
      sorted_scoreIndex[i].ix = -1;
    }
    else{
      sorted_scoreIndex[i].ix = temp_scoreIndex[i].ix;
    }
  }


  filter_button_disabled = false;
}

function updatePersonId(node){

    let new_person_id = node.target.value; // new person id
    let data_hash = image_card_data.data_hash;
    let old_person_id = image_card_data["person_ids"][current_box_ix];

    if(node.key == "Enter"){

    let data = new FormData();
    data.append("new_person_id", new_person_id);
    data.append("old_person_id", old_person_id);
    data.append("data_hash", data_hash);

    fetch("/api/tagPerson",{
        "method":"POST",
        "body": data
    }).
    then((response) => {
        if (!response.ok){
        //  use a notification to display error/failure
        throw new Error("Error occured");
        }
        else{
        // use a notification to display success.
        alert("Success");
        }
    })

    }

}


let editForm = {};  // to keep the edited/modified meta-data information.
function editFormUpdate(node){  
  editForm[node.target.name.toLowerCase()] = node.target.value;
}

async function editMetaData(node){
  node.target.disabled = true;
  node.target.innerText = "Saving...";

  let temp_keys = Object.keys(editForm);
  let formData = new FormData();
  for (let i = 0; i < temp_keys.length; i++){
    formData.append(temp_keys[i], editForm[temp_keys[i]]);
  }

  formData.append("data_hash", image_card_data.data_hash);    // append the corresponding data_hash.
  let response = await fetch("/api/editMetaData",
            {"method": "POST",
              "body": formData}
            );
  
  if(response.ok){
      // throw new Error("Error while updating meta-data !!");
    alert("Success!")
    let data = await response.json();   // TODO: use it later...
    interface_state.image_card_edit_interface = false;
  }
  else{
    alert("Error while saving. Contact Admin");
  }
  node.target.innerText = "Save";
  node.target.disabled = false;
  
}

function handleFullImageLoad(target){
  let url = "/api/getfaceBboxIdMapping/" + image_card_data.data_hash;
  
  // append cluster ids as a single string..
  let formdata = new FormData();
  let cluster_ids = ""
  for(let i = 0; i <= image_card_data.person_ids.length; i++){
    cluster_ids = cluster_ids + image_card_data.person_ids[i];
    cluster_ids = cluster_ids + "|" // separator
  }
  formdata.append("cluster_ids", cluster_ids);

  fetch(url, {
    "method":"POST",
    "body": formdata,
  }).then((response) => {
    if(response.ok == true){
      response.json().then((data) => {
        // data is supposed to be an array of (face-bbox, cluster_id) tuples/array.

        // get target dimensions to get correct scale.
        let card_rects = target.getClientRects()[0];
        let card_width = card_rects.width;
        let card_height = card_rects.height;
        
        // original image-resolution.
        let image_width = image_card_data.width;
        let image_height = image_card_data.height;

        let result = [];
        person_aliases = []; // empty this first !
        for(let i = 0; i<= data.length; i++){
          // TODO: should not return an undefined value BACKEND.. check logic.. when free!
          if (data[i] == null){
            continue;
          }
          
          // collect (x1, y1, x2, y2) and person_id
          let x1 = Number(data[i].x1)
          let y1 = Number(data[i].y1)
          let x2 = Number(data[i].x2)
          let y2 = Number(data[i].y2)
          let person_id = data[i].person_id;

          // estimate scales (based on the div/card dimensions/rects)
          let w_scale = Number(card_width) / (Number(image_width) + 1e-4);
          let h_scale = Number(card_height) / (Number(image_height) + 1e-4); 
          
          // generate scaled bbox.
          var temp_bbox = {};
          temp_bbox.top = (y1)*h_scale;
          temp_bbox.height = (y2 - y1)*h_scale;
          temp_bbox.left = (x1)*w_scale;
          temp_bbox.width = (x2 - x1)*w_scale;

          result.push(temp_bbox)
          person_aliases.push(person_id);
        }
      scaled_face_bboxes = result; // supposed to be reactive to start drawing these.
      if(loadTimeoutId){
        clearTimeout(loadTimeoutId);
      }
      full_image_loaded = true;
    })
    }

  })

}

function checkSomething(e){
  // flag set would only be after query is finished, only when more_results button is clicked
  if (flag_set){
  total_downloaded += 1;
  query_progress += (1 / page_size);
  // console.log(total_downloaded);
  if(total_downloaded == Math.min(sorted_scoreIndex.length, page_size)){
    query_progress = 0;
    flag_set = false;
  }
  // if (pagination_button){
  //   pagination_button.disabled = false;
  // }
}
  // idea is to keep calling this on each image load..
  // when all are done, be sure to 
}

</script>

{#if interface_state.image_card_fullscreen === true}
        <!-- image fullscreen interface -->
        <div class = "fixed top-0 left-0 bg-black h-screen w-screen flex justify-center items-center">
            <div class = "relative flex">  
                <!-- object cover would  -->
                <img id = "content_full_screen" on:load={(e) => handleFullImageLoad(e.target)} class="object-cover h-auto w-auto max-h-screen" src={"/api/getRawDataFull/" + image_card_data.data_hash} alt="">
                
                <!--  Todo: make loading icon better, being lazy.. -->
                {#if full_image_loaded == false}
                  <img class="object-cover h-screen w-full bg-black absolute top-0 left-0"  alt="">
                  <svg class="animate-spin h-5 w-5 mr-3 bg-indigo-500 top-10 left-50 absolute" viewBox="0 0 24 24"></svg>
                {/if}

                  <!-- TODO: calculate scale -->
                {#each scaled_face_bboxes as box, i}
                    <div on:click={(e) => {tag_interface = {"active":true,"top": box.top - 28, "left": box.left}; current_box_ix  = Number(e.target.attributes["data-ix"].value)}} data-ix = {i} class="absolute text-white cursor-pointer border-solid border-2 border-green-300 hover:opacity-40 hover:bg-green-300 bg-transparent" style = "top: {box.top}px ; left: {box.left}px; width: {box.width}px; height: {box.height}px"></div>
                {/each}

                {#if tag_interface.active}
                <div class="absolute flex h-auto w-240 bg-blue-300" style = "top: {tag_interface.top}px ; left: {tag_interface.left}px;">                      
                    <input autofocus value = {person_aliases[current_box_ix]} class = "flex-none placeholder-gray-800  w-200 text-xl text-black py-2 bg-blue-300 bg-blue-300 border-none" on:keyup={updatePersonId} placeholder="Enter person id" type="text"/>
                    <div on:click={() => {tag_interface.active = false;}} class="grow text-black hover:bg-blue-500 cursor-pointer text-xl px-2">X</div>
                </div>
                {/if}
            </div>
                  

            <div class = "absolute flex mx-auto items-center justify-between w-screen">
                <div class="text-white cursor-pointer" on:click={() => {update_image_card_previous()}}>
                    <i class="fa fa-arrow-left" />
                </div>
                    
                <div class="text-white cursor-pointer" on:click={() => {update_image_card_next()}}>
                    <i class="fa fa-arrow-right" />
                </div>
            </div>
        </div>
               

        <div class="fixed top-0 left-0 flex h-12 items-center justify-between w-screen">
            <div class="cursor-pointer hover:underline text-white" on:click={() => {set_state_active("parent")}}>
                <i  class="fa fa-arrow-left mr-1 text-white"></i>
                Back to Search
            </div>
                  
            <!--  -->
            <div title="Fullscreen" on:click={() => {set_state_active("image_card")}} class="cursor-pointer text-white">
                <i  class="fa fa-arrows-alt"></i>
            </div>
        </div>
        
        
        
{:else if (interface_state.image_card === true)}
        <!-- single image card with meta -data interface -->
        <div class="fixed w-screen h-screen overflow-auto left-0 top-0 bg-gray-700">
            <!-- navigation elements. -->
            <div class="flex h-6 items-center justify-between">
                <div class="cursor-pointer hover:underline text-gray-200" on:click={() => {set_state_active("parent")}}>
                    <i  class="fa fa-arrow-left mr-1 text-gray-200"></i>
                    Back to Search
                </div>
                <!--  -->
                <div title="Fullscreen" on:click={() => {set_state_active("image_card_fullscreen")}} class="cursor-pointer">
                    <i  class="fa fa-arrows-alt text-gray-200"></i>
                </div>
            </div>
                 
            <!-- image card in a fixed height div -->
            <div class="flex relative bg-black justify-center mx-auto h-[70vh] mt-2 gap-2">
                <!-- left arrow -->
                <div class="absolute text-xl cursor-pointer text-red -translate-y-2/4 top-2/4 left-10 text-white z-100" on:click={() => {update_image_card_previous()}}>
                    <i class="fa fa-arrow-left text-gray-200" />
                </div>

              <!-- image card + edit interface(if active) -->
              <div class="flex h-full items-center justify-center p-2 gap-4">
                <!-- image/card with fixed height and auto width -->
                <div class="flex shrink h-full">
                  <img class="w-auto cursor-pointer h-full" on:click={() => {console.log("hellll"); set_state_active("image_card_fullscreen")}} src={"/api/getRawData/" + image_card_data.data_hash} alt="">

                  <!-- to display a pencil like icon to edit some meta-data. -->
                  <div class="absolute text-xl cursor-pointer  right-4 top-4 text-gray-200 z-100" on:click={() => {interface_state.image_card_edit_interface = true;}}>
                    <i class="fa-solid fa-pen text-gray-200" />
                  </div>
                </div>

                <!-- edit interface -->
                {#if interface_state.image_card_edit_interface}
                  <div class="flex flex-col py-4 px-4 gap-4 h-full shrink-0 overflow-y-auto w-80 rounded bg-gray-700">
                    <div class="flex items-center">
                      <div class="grow text-xl text-gray-100 font-bold">Info</div>
                      <div class="text-gray-100 hover:bg-gray-400 px-2 py-1" on:click={() => {interface_state.image_card_edit_interface = false}}>X</div>
                    </div>
                    <div>
                      <div class="mb-1 text-gray-100">Description</div>
                      <input name = "Description" placeholder="" value = {image_card_data.description.toString()} on:change={editFormUpdate}  class="w-full rounded border-none bg-gray-800 px-2 py-2 text-sm text-white focus:outline-none" type="text" />
                    </div>
                    
                    <div>
                      <div class="mb-1 text-gray-100">place</div>
                      <input name = "place" value={image_card_data.place.toString()} on:change={editFormUpdate} class="w-full rounded border-none bg-gray-800 px-2 py-2 text-sm text-white focus:outline-none" type="text" />
                    </div>

                    <div>
                      <div class="mb-1 text-gray-100">Tags</div>
                      <input name = "tags" placeholder="Car, chair" value={image_card_data.tags.toString()} on:change={editFormUpdate}   class="w-full rounded border-none bg-gray-800 px-2 py-2 text-sm text-white focus:outline-none" type="text" />
                    </div>

                    <div>
                      <div class="mb-1 text-gray-100">Taken at: </div>
                      <input name = "taken_at" value="" type="date" on:change={editFormUpdate} class="w-full rounded border-none bg-gray-800 px-2 py-2 text-sm text-white focus:outline-none" />
                    </div>

                    <div>
                      <div class="mb-1 text-gray-100">device</div>
                      <input name = "device" placeholder="Canon" value = {image_card_data.device.toString()} on:change={editFormUpdate} class="w-full rounded border-none bg-gray-800 px-2 py-2 text-sm text-white focus:outline-none" type="text" />
                    </div>

                    <div>
                      <button class="px-4 bg-gray-200 py-2 rounded w-full cursor-pointer hover:bg-gray-400 disabled:bg-gray-600" on:click={editMetaData}>Save</button>
                    </div>

                  </div>
                {/if}
              </div>

              <!-- right arrow -->
              <div class="absolute text-xl cursor-pointer text-red -translate-y-2/4 top-2/4 right-10 text-white z-100" on:click={() => {update_image_card_next()}}>
                  <i class="fa fa-arrow-right text-gray-200" />
              </div>
            
            </div>
                
            <!-- meta-data -->
            {#if (meta_data_available)}
                

                <style>
                  /* Define the scrollbar track */
                ::-webkit-scrollbar {
                  width: 8px; /* Width of the scrollbar */
                }
                
                /* Define the scrollbar track */
                ::-webkit-scrollbar-track {
                  background-color: rgb(17 24 39) /* Dark gray background color for the track */
                }
                
                /* Define the scrollbar thumb */
                ::-webkit-scrollbar-thumb {
                  background-color: #64748b; /* Dark gray color for the thumb */
                  border-radius: 2px; /* Rounded corners for the thumb */
                }
                
                </style>
                
                  <!-- <div class="flex h-full w-full shrink items-center justify-center">
                    <img src="https://images.unsplash.com/photo-1693748961027-756b95c4f396?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=406&q=80" alt="" />
                  </div> -->
                  <!-- METADATA -->
                  <!-- Some basic information.. -->
                  <div class = "flex flex-col w-100 justify-center items-center bg-gray-700 py-2">
                    <div class="text-xl text-white"> {image_card_data.filename}</div>
                    <div class="text-white">UID: <span class="text-sm text-gray-400"> {image_card_data.data_hash}</span></div>
                    <div class="text-white">Last Modified:  <span class="text-sm text-gray-400">{image_card_data.last_modified}</div>
                  </div>                 
                  
                  <div class="flex w-full justify-center p-4">
                   <div class="flex h-full w-96 shrink-0 flex-col gap-4 rounded  text-white">
                    
                    <!-- Rest of meta data in 2 columns. -->
                    <div class="flex flex-col py-4 px-4 gap-1 overflow-y-auto">
                    
                      <!-- description -->
                      <div>
                        <div class="">Description</div>
                        <div class="text-sm text-gray-400">{image_card_data.description.toString()}</div>
                      </div>

                      <!-- taken at (photo date-time) -->
                      <div>
                        <div class="">Taken at</div>
                        <div class="text-sm text-gray-400">{image_card_data.taken_at.toString()}</div>
                      </div>
                      
                       <!-- tags -->
                       <div>
                        <div class="">Tags</div>
                        <div class="text-sm text-gray-400">{image_card_data.tags.toString()}</div>
                      </div>

                       <!-- taken at (photo date-time) -->
                       <div>
                        <div class="">Place</div>
                        <div class="text-sm text-gray-400">{image_card_data.place.toString()}</div>
                      </div>
                
                    
                    </div>
                    <!-- <div>
                      <button class="px-4 bg-gray-800 py-2 rounded w-full">Save</button>
                    </div> -->
                  </div>

                  <div class="flex h-full w-96 shrink-0 flex-col gap-4 rounded bg-gray-700  text-white">
                    <div class="flex flex-col py-4 px-4 gap-1 overflow-y-auto">
                      
                      <div>
                        <div class="">people</div>
                        <div class="text-sm text-gray-400">{image_card_data.person_ids.toString()}</div>
                      </div>
                      
                       <div>
                        <div class="">Device</div>
                        <div class="text-sm text-gray-400">{image_card_data.device.toString()}</div>
                      </div>

                       <div>
                        <div class="">Resolution</div>
                        <div class="text-sm text-gray-400">{image_card_data.resolution.toString()}</div>
                      </div>
                      
                      <div>
                        <div class="">Path</div>
                        <div class="text-sm text-gray-400">{image_card_data.absolute_path.toString()}</div>
                      </div>

                    </div>
                  </div>

                </div>

            {/if}
              
        </div>

  
<!--  set parent interface at final else block -->
{:else}

    {#if (show_exit_interface_button)}
    <!--  to exit from this interface.. -->
    <div class = "flex">
      <div class="top-0 left-0 flex h-12 items-center justify-between w-screen">
        <div class="cursor-pointer hover:underline text-black" on:click={() => {console.log("pressed me!!!"); sorted_scoreIndex = []; dispatch("exitButtonPressed") }}>
            <i  class="fa fa-arrow-left mr-1 text-black"></i>
            Back
        </div>
      </div>
    </div>
    {/if}

    <!-- filters interface, should allow us to invalidate some indices -->
    <Filters filter_button_disabled = {filter_button_disabled} on:filterApplied = {(event) => {applyFilterMask(event.detail.mask)}}/>

    <!-- Search Interface to show queried images -->
    <div class="flex">
      <!-- <Sidebar sidebarOpen = {sidebar_state} on:menuClick= {(event) => {SidebarItemClick(event)}} on:sidebarStateChange = {(event) => {sidebar_state = event.detail.open}}/> -->
      <div class="flex-1 overflow-y-auto min-h-full bg-blue-200 p-2 relative">
      
      <!-- show progress for ongoing query..  -->
      <!-- <div class="flex animate-pulse top-0 left-0 fixed">
        <div class="h-1 rounded bg-blue-600" style="width: {(query_progress * 100).toString()}%;"></div>
      </div> -->

      <!-- score threshold range interface  -->
      <div class="flex flex-row place-content-center mb-2 select-none mx-2">
        <div>
          <div class="my-2">
            <input on:change={scoresThresholdChange} type="range" min="0" max="1.0" step="0.01" bind:value={current_score_threshold} class="w-full">
            <label for="topk" class="dark:text-white">Score threshold: {current_score_threshold}.</label>
          </div>
        </div>
      </div>

      <!-- show all available photos/images -->
      <div class="grid grid-cols-6 2xl:grid-cols-6 gap-2 p-1 sm:p-8 px-auto justify-center">
        <!-- {#each image_src  as src,i} -->
        <!-- we only need to update the sorted_scoreIndex anyway, applicable for filter -->
        {#each sorted_scoreIndex as score_ix, i}
        <!-- (-1) here would indicate invalid index. so ignore that index -->
          {#if (score_ix["ix"] >= 0)}        
            <div on:click = {() => {update_image_card(i); set_state_active("image_card")}} class="flex justify-center bg-black">              
                <img on:load={checkSomething} class="sm:max-h-48 shadow-xl cursor-pointer" src={"api/getRawData/" +  image_data.list_dataHash[score_ix["ix"]]} alt="image">
            </div>
          {/if}
        {/each}
      </div>

      {#if sorted_scoreIndex.length >= page_size}
        <div class = "flex items-center justify-center">
          <button class = "px-4 py-1 text-white rounded bg-blue-400 disabled:bg-blue-200 hover:bg-blue-600" on:click={showMoreResults}>More results ..</button>
        </div>
      {/if}

    </div>
  </div>    
{/if}

<!-- show progress for ongoing query.  -->
<div class="flex animate-pulse">
  <div class="h-1 rounded top-0 left-0 bg-rose-600 fixed" style="width: {(query_progress * 100).toString()}%;"></div>
</div>