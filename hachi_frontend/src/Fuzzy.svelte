<!-- 
    Also contributed by akshay (@akshaymalik1995 gitlab).
 -->

 <script lang = "ts">

    let suggestions  = [];
    let TEST_COMPONENT = true;

    async function get_suggestions(current_query){
        if (current_query){
            if (TEST_COMPONENT === false)
            {
                // let formData = new FormData();
                // formData.append("query", current_query)

                // const res = await fetch("/api/fuzzySearch", {
                //     method: 'POST',
                //     body: formData,
                //   })
                // if (!res.ok) {
                //         throw new Error(res);
                // }
                // else{
                // suggestions = await res.json();
                // }
            }
            else{
                suggestions = [
                    {"title": "banana is my name", "score":"0.2"},
                    {"title": "apple got the game", "score":"0.34"},
                    {"title": "orange is not lame", "score":"0.11"},
                    {"title": "mango got the fame", "score":"0.8"},
                ]
            }
        }
    }


    function handleInputKeyDown(event) {
    if (suggestions && is_search_focused){
        //  TODO Use TAB to move around suggestions. (when get time ..)
        if (event.key === "ArrowUp") {
            event.preventDefault()
            selectedSuggestion = selectedSuggestion <= 0 ? 0 : selectedSuggestion - 1
        } else if (event.key === "ArrowDown") {
            event.preventDefault()
            selectedSuggestion = Math.min(suggestions.length - 1, selectedSuggestion + 1 )
        }
        else if (event.key === "Enter" && selectedSuggestion !== -1) {
            event.preventDefault();
            
            // TODO: disable the input element.
            search_text = suggestions[selectedSuggestion].title  // JUST set the search_text to the chosen suggestion.
            selectedSuggestion = 0
            let formData = new FormData();
            formData.append("query", search_text)
            if (selectedSuggestion != -1){
                formData.append("chosen", "true" );
            }else{
                formData.append("chosen", "false"); // indicating user has not chosen any suggestion.
            }
            
            // if user has indeed chosen, then it makes to easier to get the corresponding data/images very quickly on the server side.

            // TODO: Call already written such as for App_search.svelte.
            // let response = await fetch()
            // let data = await response.json()
            // display data if you want 
            }
        }
    }

    let search_text = "" // user search text.
    let selectedSuggestion = -1    // going to use this let server know, let user has chosen a suggestion.
    let is_search_focused = false;

    $: {   // since search_text is referenced here, it would run reactively of search text.
        get_suggestions(search_text)  // make a request to server to get suggestions..
        .then(() => {
            // console.log("promise is done")
            // TODO: donot show any suggestions when search text is empty, but kind of tricky to sync the state.
            // as svelete would be calling this block, whenever search_text is updated.
            // here i think can check if search_text is empty !!
            if (search_text.length === 0){
                suggestions = []  // leading to re-render such as there are no suggestions. good enough for now.
            }
        })
    }
</script>

<div>
    <div class="max-w-md mx-auto relative" >
        <input type="search" bind:value={search_text} placeholder="Enter query"
        class="w-full border border-gray-300 rounded p-2"
        on:keydown={handleInputKeyDown}
        on:focusin={() => {is_search_focused = true}}
        on:focusout={() => {is_search_focused = false}}
        >
        <!--  Do i need absolute, only needs INPUT search to be absolute !! -->
        <ul class="absolute left-0 right-0 mt-2 border border-gray-300 bg-white rounded" > 
            {#each suggestions as suggestion, index}
            <li class="{selectedSuggestion === index ? 'bg-blue-200' : '' } p-4 hover:bg-blue-100 cursor-pointer"
            style="padding-top: 0px;padding-bottom: 0px;">
            <b>Title: </b>{suggestion.title}  <b>score: </b>{suggestion.score}
            </li>
            {/each}
        </ul>
    </div>
</div>
