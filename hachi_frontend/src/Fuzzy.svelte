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

    // async function handleValueChange(node) {
        // based of the current value in the Input (search), and current selected attribute, we try to suggestions.
    
    var map = {};
    function handleKeyDown(e){
        // keyup event also updates this map, on keyup set to false.
        map[e.keyCode] = (e.type == 'keydown') // it would be true, for keydownevent always.

        // check for shiftkey and enter
        if(map[13] == true  && e.shiftKey){
            console.log("shift enter combination.");
            sendQuery();
        }
    }

    async function handleKeyUp(e){
        // check for enter and shiftenter events, if shift sendQuery final.
        // else get suggestions based on the current selected attribute and query value.
        
        // NOTE: it waits for key to be released, so may feel a bit delayed. But good not to overwhelm the user suggestions/network requests.
        
        show_usage_message = false;
        map[e.keyCode] = false;  // donot remove it, handlekeyDown using it, to ascertain combination.

        let node = e.target;
        if(node.value.length == 0){
            dropdownItems = [];
            return;
        }
        console.log("current value: ", node.value);
        
        // update selectedFilters on pressing enter key.
        if(e.keyCode == 13){

            let ix = selectedFilters[selectedOption].length;
            if (node.value.length > 0 && (!selectedFilters[selectedOption].includes(node.value))){
                selectedFilters[selectedOption][ix] = node.value;
            }

            node.value = "";
            dropdownItems = [];
            showDropdown = false;
            return;
        }

        // update the dropDown items, based on the current query aka valueInput for an image attribute, 
        let result = await getSuggestion(selectedOption, node.value);
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

    function clearFilter(target, option, value) {

        // remove the particular value from option array.
        let idx = selectedFilters[option].indexOf(value);
        if (idx >= 0){
            selectedFilters[option].splice(idx, 1);
            selectedFilters = selectedFilters; // to trigger re-rendering..
        }

        if(selectedOption == option){
            dropdownItems = [];
        }
        
    }

    function handleListItemClick(selectedOption, item) {
        showDropdown = false;
        input_element.value = item;
        input_element.focus();
    }

    function handleOptionChange(option) {
        selectedOption = option;
        dropdownItems =  selectedFilters[selectedOption]  // set dropdown items to recent searches for that attribute.
        showDropdown = true;
        input_element.focus();
    }

    function sendQuery(node) {

        // update the selectedFilter too.. in case user clicks the button.
        let ix = selectedFilters[selectedOption].length;
        if (input_element.value.length > 0 && (!selectedFilters[selectedOption].includes(input_element.value))){
            selectedFilters[selectedOption][ix] = input_element.value;
        }

        //prepare final query:
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
        input_element.value = "";

        if(query_button.disabled == false)
        {
        dispatch('queryReady', {
        query: query_completed,
        attributes:selectedFilters
        });
        }
        else{
            console.log("chill dawg!!!");
        }
    }

let show_usage_message = false;
</script>

<div class="max-w-screen p-4 mx-auto">
    <div class="w-full relative place-content-center">
        <!-- A select input -->
        <!-- <form class="w-full" on:submit={handleFormSubmit} action=""> -->
        <div class="w-full">
            <div class="flex w-full items-center my-3 flex-wrap text-lg">
                {#each Object.keys(selectedFilters) as option}
                    {#if selectedFilters[option].length >= 1}
                    
                    {#each selectedFilters[option] as value }
                        <div class="flex items-center justify-center">
                            <div on:click={handleOptionChange(option)} class = "mx-1 px-2 bg-blue-200 rounded-md min-h-10">
                                <span  class="text-blue-800  ">
                                    {option.charAt(0).toUpperCase() +
                                        option.slice(1)}
                                </span>
                                
                                <span class="ml-1 text-sm font-semibold">{value + " "}</span>
                                
                                <span
                                    class="ml-1 text-red-600 cursor-pointer hover:text-blue-500"
                                    on:click={(e) => clearFilter(e.currentTarget, option, value)}
                                >
                                    x
                                </span>
                            </div>   
                        </div>
                    {/each}
                        
                        <!-- <div
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
                        </div> -->
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
                        on:focus|once={(e) => {if(e.target.value.length == 0){ show_usage_message = true;}}}
                        on:focusout={(e) => {show_usage_message = false;}}
                        on:keyup={handleKeyUp}
                        on:keydown={handleKeyDown}
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
        <!-- </form> -->
        </div>

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
    
        {#if (show_usage_message == true)}
        <div class = "flex-1 w-full min-h-40 p-3 bg-gray-300 text-sm">
            <p>
                Search interface allows combining multiple attributes in a single query. An attribute can be selected multiple times from left-side menu.
            </p>
            <p class="pt-1 pb-1">
                For example if you have tagged a person as <b>sam</b>, select attribute <b>person</b> and enter <b>sam</b>, then select <b>query</b> and enter <b>playing in the park</b>.
                And press <span class = "bg-blue-200 p-1 rounded-sm border-1">shift + enter</span> or click <span class = "bg-blue-200 p-1">Search</span> button.
            </p>
        </div>
        {/if}

    </div>

    
</div>
