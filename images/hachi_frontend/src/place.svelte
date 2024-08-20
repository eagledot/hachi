<!-- Display data grouped by persons -->

<script>
    import sample_bg from'./assets/sample_place_bg.jpg'
    import Photos from './photos.svelte';
    import {onMount, onDestroy} from "svelte"
    import {query_results_available} from "./stores.js" // update the writable query_results_available

    
    let state = {
        places: []  // all possible places.
    }

    // updated/fulfilled on mount.
    let image_data = {
        "list_metaData": [],
        "list_score": [],
        "list_dataHash": [],
    }

    // place data to be fulfilled on the click. for chose place.
    let place_data = {
        "list_metaData": [],
        "list_score": [],
        "list_dataHash": [],
        "done":false
    }


    //sample data
    let photos_interface_active = false;
    let data_downloaded = true; // not exactly being used for now.. (may be used during destroy .. to prevent )
    onMount(() =>{
        // we get the data for all the places at once only on mount. Needs to refresh to show very recent data or mount again.

        data_downloaded = false;

        // get the corresponding data for all places.
        fetch("/api/getGroup/place").
        then((response) => {
            response.json().then((data) => {
            let data_length = data["meta_data"].length;
            for(let i = 0; i < data_length; i++){
                image_data.list_dataHash.push(data["data_hash"][i]);
                image_data.list_score.push(data["score"][i]);
                image_data.list_metaData.push(data["meta_data"][i]);
            }
            data_downloaded = true;
            state.places = data["place"];
            });
        
        });
    })

    onDestroy(() => {
        console.log("destroying...");
    })

    async function handleClick(place_id){

        photos_interface_active = false;

        place_data = {
        "list_metaData": [],
        "list_score": [],
        "list_dataHash": [],
        "done":false
        }

        query_results_available.update((value) => structuredClone(place_data));

        // update place_data for this place_id.
        for(let i = 0; i<image_data.list_dataHash.length; i++){
            
            if(image_data.list_metaData[i]["place"].toLowerCase() === place_id.toLowerCase()){
                place_data.list_metaData.push(image_data.list_metaData[i]);
                place_data.list_dataHash.push(image_data.list_dataHash[i]);
                place_data.list_score.push(image_data.list_score[i]);
            }
        }
        place_data.done = true;  // should be enough to indicate svelte to render photos interface.
        photos_interface_active = true;
        
        // indicate query
        query_results_available.update((value) => structuredClone(place_data));
    }

// by default photos interface is not active,
// so we would just display possible places/div with a background image.
// let us try this to get that right !!!
// ok, then what are we supposed to do ??


</script>

{#if (data_downloaded === false)}
    <p> Loading, please wait...</p>
{:else if (photos_interface_active)}
    <Photos image_data = {place_data} show_exit_interface_button = {true} on:exitButtonPressed = {() => {console.log("pressed the hell out of it!"); photos_interface_active = false}}/>
{:else}
    <!-- some space to place some filters later. -->
    <div class = "flex w-screen h-[80px] bg-blue-100"></div>

    <!-- display each value in group as a clickable div, later on click we would use the PHOTOS component. -->
    <div class = "flex justify-center gap-6 items-center my-2 py-2 w-100 h-100 bg-blue-200 flex-wrap">
        <!-- a single div element -->
        {#each state.places as place}
            <div class = "flex-col cursor-pointer" on:click={(e) => {console.log("mine is: ", place); handleClick(place)}}>
                <div>
                    <div class = "h-[150px] w-[200px] bg-gray-800">
                        <img src={sample_bg} class="object-strech hover:opacity-50 w-full h-full border-gray-100 shadow-smr">
                    </div>
                    <div class = "flex text-xl text-white justify-center items-center">{ place.slice(0, 1).toUpperCase() + place.slice(1).toLowerCase()}</div>
                </div>
            </div>
        {/each}
    </div>
{/if}