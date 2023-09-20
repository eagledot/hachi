<!-- 
    Also contributed by akshay (@akshaymalik1995 gitlab).
 -->

<script>

import { createEventDispatcher } from 'svelte';
    // import Search from './lib/search.svelte';
    const dispatch = createEventDispatcher();  // attach dispatch to this instance. 


    let selectedOption = "query";
    let input_element;
    let query_button;

    export let query_button_disabled = false;
    $: if(query_button){
        query_button.disabled = query_button_disabled  // supposed to update query_button.disabled property based on a variable.
    }

    let query_completed = "";
    let dropdownItems = [];             // current dropDown specific option/Image-attribute selected.

    // holding the current value for image attributes.
    let selectedFilters = {
        person: [],
        query: [],
        place: [],
        filename: []
    };

    let valueInput = "";
    let showDropdown = false;

    async function getSuggestion(attribute, query){
        // return suggestion for a given attribute, and corresponding query.
        let url = "/api/getSuggestion"
        let data = new FormData();
        data.append("attribute", attribute);
        data.append("query", query);
        let response = await fetch(
            url,
            {
                method: "POST",
                body: data
            }
        )
        if (response.ok === true){
            return  await response.json();
        }
        else{
            return {};
        }
    }
    

</script>