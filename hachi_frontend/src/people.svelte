<script>
    import sample_bg from'./assets/sample_place_bg.jpg'
    import Photos from './photos.svelte';
    import {onMount, onDestroy} from "svelte"
    import {query_results_available} from "./stores.js" // update the writable query_results_available
    
    let state = {
        people: []  // all possible person ids.
    }

    // updated/fulfilled on mount.
    let image_data = {
        "list_metaData": [],
        "list_score": [],
        "list_dataHash": [],
    }

    // people data to be fulfilled on the click. for chosen person.
    let people_data = {
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
        fetch("/api/getGroup/person").
        then((response) => {
            response.json().then((data) => {
            let data_length = data["meta_data"].length;
            console.log("data length: ", data_length);
            for(let i = 0; i < data_length; i++){
                image_data.list_dataHash.push(data["data_hash"][i]);
                image_data.list_score.push(data["score"][i]);
                image_data.list_metaData.push(data["meta_data"][i]);
            }
            data_downloaded = true;
            state.people = data["person"];
            });
        
        });
    })

    onDestroy(() => {
        console.log("destroying... people..");
    })

    async function handleClick(person_id){

        photos_interface_active = false;

        people_data = {
        "list_metaData": [],
        "list_score": [],
        "list_dataHash": [],
        "done":false
        }

        for(let i = 0; i<image_data.list_dataHash.length; i++){

            if(image_data.list_metaData[i]["person"].includes(person_id)){
                people_data.list_metaData.push(image_data.list_metaData[i]);
                people_data.list_dataHash.push(image_data.list_dataHash[i]);
                people_data.list_score.push(image_data.list_score[i]);
                
            }
        }
        people_data.done = true;  // should be enough to indicate svelte to render photos interface.
        photos_interface_active = true;

        query_results_available.update((value) => structuredClone(people_data));

    }

</script>

    {#if (data_downloaded === false)}
        <p> Loading, please wait...</p>
    {:else if (photos_interface_active)}
        <Photos image_data = {people_data} show_exit_interface_button = {true} on:exitButtonPressed = {() => {console.log("pressed the hell out of it!"); photos_interface_active = false}}/>
    {:else}
        <!-- some space to place some filters later. -->
        <div class = "flex w-screen h-[80px] bg-blue-100"></div>

        <!-- display each value in group as a clickable div, later on click we would use the PHOTOS component. -->
        <div class = "flex justify-center gap-6 items-center my-2 py-2 w-100 h-100 bg-blue-200 flex-wrap">
            <!-- a single div element -->
            {#each state.people as person_id}
                <div class = "flex-col cursor-pointer" on:click={(e) => {console.log("mine is: ", person_id); handleClick(person_id)}}>
                    <div>
                        <div class = "h-[150px] w-[200px] bg-gray-800">
                            <img src={sample_bg} class="object-strech hover:opacity-50 w-full h-full border-gray-100 shadow-smr">
                        </div>
                        <div class = "flex text-xl text-white justify-center items-center">{ person_id.slice(0, 1).toUpperCase() + person_id.slice(1).toLowerCase()}</div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
