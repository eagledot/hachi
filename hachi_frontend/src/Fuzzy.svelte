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

<div class="max-w-screen p-4 mx-auto">
    <div class="w-full relative place-content-center">
        <!-- A select input -->
        <form class="w-full" on:submit={handleFormSubmit} action="">
            <div class="flex w-full items-center my-2 flex-wrap">
                {#each Object.keys(selectedFilters) as option}
                    {#if selectedFilters[option].length >= 1}
                        <div
                            class="px-4 py-2 self-center bg-blue-200 rounded-md inline-flex place-self-center items-center mr-2 mb-2 h-10"
                        >
                            <span on:click={() => handleOptionChange(option)} class="cursor-pointer">
                                <span  class="text-blue-800  ">
                                    {option.charAt(0).toUpperCase() +
                                        option.slice(1)}
                                </span>
                                
                                {#each selectedFilters[option] as value }
                                    <span class="ml-1">{value + " "}</span>
                                {/each}
                            
                            </span>
                           
                            <span
                                class="ml-2 text-red-600 cursor-pointer hover:text-blue-500"
                                on:click={(e) => clearFilter(e.currentTarget, option)}
                            >
                                x
                        </span>
                        </div>
                    {/if}
                {/each}
            </div>

            <div class="flex space-x-2">
                <select
                    on:change={(e) => handleOptionChange(e.target.value)}
                    class="px-4 py-2 border  rounded-md focus:outline-none focus:border-blue-500"
                    name="select-option"
                    id="select-option"
                    bind:value={selectedOption}
                >   
                    <!--  code to display all possible options as attributes in a select element as parent. -->
                    {#each Object.keys(selectedFilters) as option}
                        <option value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                        </option>
                    {/each}
                </select>

                <div
                    class=" bg-blue-200 rounded-md flex-grow h-10"
                >
                    <input
                        bind:this={input_element}
                        bind:value={valueInput}
                        on:input={handleValueChange}
                        class="px-4 py-4 rounded-md focus:outline-none bg-blue-200 h-full w-full"
                        type="search"
                        placeholder="Enter value here"
                    />
                </div>

                <div class="flex">
                    <button  class="bg-blue-600 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold px-4 rounded"
                    on:click={sendQuery}
                    bind:this={query_button}>Search</button>
                </div>
            
            </div>
        </form>

        <!-- Menu options list -->
        {#if dropdownItems.length > 0}
            <div
                class="{!showDropdown
                    ? 'hidden'
                    : ''} w-full bg-white border rounded-md shadow-md mt-1"
            >
                <ul class="divide-y max-h-36 overflow-y-auto divide-gray-200">
                    {#each dropdownItems as item}
                        <li
                            on:click={() =>
                                handleListItemClick(selectedOption, item)}
                            class="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        >
                            {item}
                        </li>
                    {/each}
                </ul>
                <div class="flex w-full justify-center items-center">
                    <button
                        class="w-full bg-gray-300 border text-gray-900 hover:bg-gray-500 hover:text-gray-100 py-1 px-4 shadow-md"
                        on:click={() => (showDropdown = false)}
                    >
                        Close
                    </button>
                </div>
            </div>
        {/if}
       
</div>
</div>
