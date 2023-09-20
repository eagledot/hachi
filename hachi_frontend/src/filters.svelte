<script>
    import {createEventDispatcher, onMount} from "svelte";
    const dispatch = createEventDispatcher();  // attach dispatch to this instance. 

    export let filter_button_disabled = true;
    export let image_data = null;

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
    

    $: if (image_data){
        let temp_places = image_data.list_metaData.map((v,i) => {if(v.place) {return v.place}});
        let temp_person = [];
        image_data.list_metaData.map((v, i) => {
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
            console.log("temp: ", temp_indices);
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
        
        if (image_data){
            let places_array = [];
            let person_array = [];
            image_data.list_metaData.map((v,i) => {places_array.push(v.place); person_array.push(v.person)});
            let places_selected = state.selectFilters.place.values;

            let place_mask = apply_places_filter(places_array, places_selected);
            
            let person_selected = state.selectFilters.people.values;
            let people_mask = apply_person_filter(person_array, person_selected);

            let final_mask = apply_and_operation([place_mask, people_mask]);

            dispatch("filterApplied",{"mask":final_mask});  //send this event to parent along with filter mask, so that parent can actually apply filter.

        }

    }

    </script>