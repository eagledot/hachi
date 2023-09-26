<script>



    import {filter_metaData_store} from "./stores.js"
    import {createEventDispatcher, onMount} from "svelte";

    let filter_metaData = [];
    export let filter_button_disabled = true;
    filter_metaData_store.subscribe((value) =>{
        filter_button_disabled = false;
        filter_metaData = value;
    })
    const dispatch = createEventDispatcher();  // attach dispatch to this instance. 


      const state = {
        selectFilterActive : "",
        
        date : "",        
        selectFilters : {
          place : {
            name : "place",
            values : [],
            options : [],

          }, 
          people : {
            name : "people",
            values : [],  // have to add or remove to this.
            options : [],
          }, 
         
        }, 
      }
    

    $: if (filter_metaData){

        let temp_places = filter_metaData.map((v,i) => {if(v.place) {return v.place}});
        let temp_person = [];
        filter_metaData.map((v, i) => {
            if(v.person)
                {v.person.forEach((x) => temp_person.push(x))}
        })

        let places_array = [];
        new Set(temp_places).forEach((x) => places_array.push(x));

        let person_array = [];
        new Set(temp_person).forEach((x) => person_array.push(x));

        // update the selectFilters.
        state.selectFilters.place.values = places_array;
        state.selectFilters.place.options = places_array;

        state.selectFilters.people.values = person_array;
        state.selectFilters.people.options = person_array;

    }
    
      onMount(() => {
        document.addEventListener("mouseup", resetSelectDropdown) 
        // document.removeEventListener("mouseup", resetSelectDropdown); // should i call this on destroy ??
      })
    
      function resetSelectDropdown(e) {
        state.selectFilterActive = ""
      }
    
      function handleSelectChange(filter , option) {
        if (state.selectFilters[filter].values.includes(option)) {
          state.selectFilters[filter].values =state.selectFilters[filter].values.filter((p) => p !== option)
          return
        }
        state.selectFilters[filter].values = [option, ...state.selectFilters[filter].values]
      }
    
      function changeFilterDropdown(filter){
        if (state.selectFilterActive === filter) {
          state.selectFilterActive = ""
          return
        }
        state.selectFilterActive = filter
      }


function filter_base(data, value_to_compare, key = null, compare_function = ((a, b) =>{return(a === b)})){

    let temp_mask = [];
    for(let i = 0; i < data.length; i++){

        if (key){
            if (compare_function(data[i].key, value_to_compare)){
                temp_mask.push(1);
            }
            else{
                temp_mask.push(0);
          }}
        else{

            if (compare_function(data[i], value_to_compare)){
                temp_mask.push(1);
            }else{
                temp_mask.push(0)
            }
        }
    }
    return temp_mask
}

    function apply_places_filter(places_array, places_selected = []){
        let default_mask = []
        for(let i = 0; i < places_array.length; i++){
            default_mask.push(0);
        }
        for (let i = 0; i<places_selected.length; i++){
            let temp_indices = filter_base(places_array, places_selected[i]);
            for(let i = 0; i < default_mask.length; i++){
                default_mask[i] = Number(Boolean(default_mask[i]) || Boolean(temp_indices[i])); // or operation
            }
    }
    return default_mask
    }

    function apply_person_filter(person_array, person_selected = []){
        
        let default_mask = []
        for(let i = 0; i < person_array.length; i++){
            default_mask.push(0);
        }
        for (let i = 0; i<person_selected.length; i++){
            // compare function checks if a person id is included in the meta-data["person"] which can be null or an array .
            let temp_indices = filter_base(person_array, person_selected[i], null, ((a,b) => {
                                                            if(a){
                                                                return a.includes(b);
                                                            }
                                                            else{
                                                                return false;
                                                            }
                                                            }));
            for(let i = 0; i < default_mask.length; i++){
                default_mask[i] = Number(Boolean(default_mask[i]) || Boolean(temp_indices[i])); // or operation
            }
        }
    return default_mask
    }
    
    function apply_and_operation(mask_array){
        let count = mask_array[0].length
        let final_mask = mask_array[0];

        mask_array.forEach((mask, i) => {
            if(i > 0){
                if(mask.length !== count){
                    throw new Error("all mask must be of same length!!");
                }
                mask.forEach((value,j) => {final_mask[j] = Number(Boolean(final_mask[j]) && Boolean(value))})
            }       
        })
        return final_mask;

    }
    function handleFiltering(){
        
        if (filter_metaData){
            console.log(filter_metaData);

            let places_array = [];
            let person_array = [];
            filter_metaData.map((v,i) => {places_array.push(v.place); person_array.push(v.person)});
            let places_selected = state.selectFilters.place.values;

            let place_mask = apply_places_filter(places_array, places_selected);
            
            let person_selected = state.selectFilters.people.values;
            let people_mask = apply_person_filter(person_array, person_selected);

            let final_mask = apply_and_operation([place_mask, people_mask]);

            dispatch("filterApplied",{"mask":final_mask});  //send this event to parent along with filter mask, so that parent can actually apply filter.

        }

    }
    </script>


<div class="flex container mx-auto max-w-4xl">
    <div class="flex justify-center items-center gap-8 p-4 flex-wrap">

        <!--  data input/filter -->
        <span class="flex items-center text-md">From: <input class="mx-2 px-2 py-1 cursor-pointer border rounded hover:bg-blue-400 bg-blue-300 text-gray-600" type="date"></span>
        <span class="flex items-center text-md">To: <input class="mx-2 px-2 py-1 cursor-pointer border rounded hover:bg-blue-400 bg-blue-300 text-gray-600" type="date"></span>
        
        <!-- select filters -->
        {#each Object.keys(state.selectFilters) as filter}
            <div on:mouseup={(e) => e.stopPropagation()} class="relative">
                <!-- filter name/heading -->
                <div class="px-4 py-1 flex items-center gap-2 text-gray-600 cursor-pointer border rounded bg-blue-300 hover:bg-blue-400" on:click={() => changeFilterDropdown(filter)}>{filter} <i class="fa {state.selectFilterActive === filter ? "fa-caret-up" : "fa-caret-down"}"></i></div>
                
                
                <!-- fiter values, dropdown menu thing -->
                <div  class="{state.selectFilterActive !== filter && "hidden"} absolute flex flex-col z-10 max-w-50  p-4 rounded  bg-gray-700 text-gray-300 left-0  top-10 max-h-60 overflow-auto">
                {#each state.selectFilters[filter].options as option}
                    <div on:click={() => handleSelectChange(filter, option)} class="my-2 flex gap-2 items-center cursor-pointer">
                        <div class=" flex justify-center items-center w-4 h-4 min-w-4 min-h-4 border {state.selectFilters[filter].values.includes(option) && "bg-green-400 border-none"}">
                        {#if state.selectFilters[filter].values.includes(option)}
                            <i class="fa fa-plus text-xs text-black"></i>
                        {/if}
                        </div> 
                        <span> {option}</span>
                    </div>
                {/each}
                </div>
            </div>
        {/each}
      <button disabled = "{filter_button_disabled}" on:click={handleFiltering} class="px-4 py-1 text-white rounded bg-blue-600 disabled:bg-blue-200 {filter_button_disabled === true ? "disabled": ""}">Filter</button>
    </div>
</div>