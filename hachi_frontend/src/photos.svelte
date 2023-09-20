<script>

import { createEventDispatcher, onDestroy, onMount } from 'svelte';
import Filters from './filters.svelte';
const dispatch = createEventDispatcher();  // attach dispatch to this instance. 
export let show_exit_interface_button = false;    // in case to exit this component, depeneding on the parent. we can have a such button.

export let image_data  = {
            "list_metaData": [],
            "list_dataHash": [],
            "list_src": [],
            "list_score": [],
            "done":false
    }

    let filter_button_disabled = true;
    let final_image_data = null;
    $:if(image_data){
      filter_button_disabled = !image_data.done
      if(image_data.done){
        final_image_data = image_data
      }
    }

    onDestroy(() => {
      image_data  = {
        "list_metaData": [],
        "list_dataHash": [],
        "list_src": [],
        "list_score": [],
        "done":false}
    })

    let image_card_data = {} 
    let meta_data_available = false; 
    let sorted_scoreIndex = [];  

    $: if (image_data){
      sorted_scoreIndex = argsort(image_data.list_score);
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
    image_card_data.url = image_data.list_src[image_data_ix];
    image_card_data.data_hash = image_data.list_dataHash[image_data_ix];

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
function scale_face_bboxes(node){

  let card_rects = node.target.getClientRects()[0];
  let card_width = card_rects.width;
  let card_height = card_rects.height;

  let result = [];
  let original_bboxes = image_card_data.face_bboxes;
  if(original_bboxes){


    let image_width = image_card_data.width;
    let image_height = image_card_data.height;

    for(let i = 0; i < original_bboxes.length; i++){
      let temp_bbox = structuredClone(original_bboxes[i])        // [x1, y1, x2, y2]
     
      let w_scale = Number(card_width) / (Number(image_width) + 1e-4);
      let h_scale = Number(card_height) / (Number(image_height) + 1e-4);      

      temp_bbox.top = (temp_bbox[1])*h_scale;
      temp_bbox.height = (temp_bbox[3] - temp_bbox[1])*h_scale;

      temp_bbox.left = (temp_bbox[0])*w_scale;
      temp_bbox.width = (temp_bbox[2] - temp_bbox[0])*w_scale;

      result.push(temp_bbox);
    }
  }
  console.log(result);
  scaled_face_bboxes = result;

}

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
  sorted_scoreIndex = argsort(image_data.list_score, filter_mask);
  filter_button_disabled = false;
}


</script>