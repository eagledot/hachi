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

    async function handleValueChange(e) {
        // based of the current value in the Input (search), and current selected attribute, we try to suggestions.

        if (valueInput.length === 0) {
            return;
        }
        
        // update the dropDown items, based on the current query aka valueInput for an image attribute, 
        let result = await getSuggestion(selectedOption, valueInput);
        if (selectedOption in result)
        {
            dropdownItems = result[selectedOption];
            showDropdown = true;
        }
        else
        {
        dropdownItems = [];
        showDropdown = false;
        }
    }

    function clearFilter(target, option) {
        selectedFilters[option] = [];
        if(selectedOption == option){
            dropdownItems = [];
        }
    }

    function handleListItemClick(selectedOption, item) {
        showDropdown = false;
        valueInput = item; // Update inputValue with clicked item's value
        input_element.focus();
    }

    function handleOptionChange(option) {
        selectedOption = option;
        dropdownItems =  selectedFilters[selectedOption]  // set dropdown items to recent searches for that attribute.
        showDropdown = true;
        input_element.focus();
    }

    function handleFormSubmit(e) {
        if(e){
            e.preventDefault();
        }
        showDropdown = false;
        let ix = selectedFilters[selectedOption].length;
        if (valueInput.length > 0 && (!selectedFilters[selectedOption].includes(valueInput))){
            selectedFilters[selectedOption][ix] = valueInput;
        }
        valueInput = "";
        
        let temp_keys = Object.keys(selectedFilters);

        query_completed = ""
        for (let i = 0; i < temp_keys.length; i ++){
            let key = temp_keys[i];
            let values  = selectedFilters[key];
            
            query_completed += (key + ":")

            for (let j = 0;j < values.length; j++ ){
                query_completed += values[j];
                if (j != values.length - 1){
                    query_completed += "-";
                }
                
            }

            if (i != (temp_keys.length -1)){
                query_completed += ",";
            }

        }
        console.log("Completed: " + query_completed);
    }

    function sendQuery(node) {
        // dispatch queryReady event, to let listener handle it.
        handleFormSubmit();
        dispatch('queryReady', {
        query: query_completed,
        attributes:selectedFilters
        });
    }



</script>