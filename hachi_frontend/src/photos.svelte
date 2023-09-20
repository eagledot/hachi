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

</script>