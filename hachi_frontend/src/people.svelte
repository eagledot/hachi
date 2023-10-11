<script>
    import sample_bg from'./assets/sample_place_bg.jpg'
    import Photos from './photos.svelte';
    import {onMount, onDestroy} from "svelte"
    import {query_results_available} from "./stores.js" // update the writable query_results_available
    import { STATUS_CODES } from 'http';
    
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
    let original_person_ids; // keeping a reference, in case of search for person ids.
    onMount(() =>{
        // we get the data for all the places at once only on mount. Needs to refresh to show very recent data or mount again.

        data_downloaded = false;

        // get the corresponding data for all places.
        fetch("/api/getGroup/person").
        then((response) => {
            response.json().then((data) => {
            let data_length = data["meta_data"].length;
            for(let i = 0; i < data_length; i++){
                image_data.list_dataHash.push(data["data_hash"][i]);
                image_data.list_score.push(data["score"][i]);
                image_data.list_metaData.push(data["meta_data"][i]);
            }
            data_downloaded = true;
            state.people = data["person"];
            original_person_ids = state.people;
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
        if(original_person_ids){
            state.people = original_person_ids;
        }
        query_results_available.update((value) => structuredClone(people_data));

    }

function handleSearch(node){
    // update state.people to only include person_id having a substring same as query.
    let current_query = node.target.value;  // current query.
    current_query = current_query.toLowerCase();
    if(!current_query){
        if(original_person_ids){state.people = original_person_ids}
        return;
    }
    
    if (current_query  && data_downloaded == true && original_person_ids)
    {
        state.people  = [];       // set this is to empty.
        original_person_ids.forEach(
            (person_id) => {
            if(person_id.toLowerCase().includes(current_query)){
                state.people.push(person_id);
            }}
        )        
        }
    }
</script>

    {#if (data_downloaded === false)}
        <p> Loading, please wait...</p>
    {:else if (photos_interface_active)}
        <Photos image_data = {people_data} show_exit_interface_button = {true} on:exitButtonPressed = {() => {console.log("pressed the hell out of it!"); photos_interface_active = false}}/>
    {:else}
        <!-- some space to place some filters later. -->
        <!-- Todo add some header to indicate the iterface.. -->
        <!-- <div class = "flex w-screen h-[80px] bg-blue-200">
            <p class="flex text-md items-center">People Album</p>
        </div> -->

        <!-- display each value in group as a clickable div, later on click we would use the PHOTOS component. -->
        <!--  decrease the maximum width, reduce bg -->
        
        <div class = "flex w-full justify-center items-center">
            <div class = "flex justify-center gap-10 items-center px-3 bg-gray-100 flex-wrap max-w-6xl">
                
                <!-- Some header information space for this album -->
                <div class = "flex w-screen h-[80px]">
                    <div class = "flex w-full justify-between items-center">
                        <div class="flex text-lg font-semibold">People Album</div>

                        <!-- some background like gray-100 and rounded borders -->
                        <!-- should be able to add search icon from font awesome too... -->
                        <div class = "flex">
                            <input on:keyup={handleSearch} class = "text-md py-2 px-3 border-2 border-rose-600 text-slate-500 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-rose-200 focus:border-rose-500 dark:text-slate-400 dark:placeholder:text-slate-600 dark:bg-slate-900 dark:border-rose-500 dark:focus:ring-rose-900 dark:focus:border-rose-600" type = "text" placeholder="Search person">
                            <!-- <span class="flex px-2 items-center">S</span> -->
                        </div>
                    </div>
                </div>
                
                
                <!-- a single div element -->
                {#each state.people as person_id}
                    <div class = "flex-col cursor-pointer" on:click={(e) => {console.log("mine is: ", person_id); handleClick(person_id)}}>
                        <div>
                            <div class = "h-[160px] w-[160px] bg-gray-800">
                                <!-- <img src={sample_bg} class="object-strech hover:opacity-50 w-full h-full border-gray-100 shadow-smr"> -->
                                <img src={"/api/getPreviewPerson/" + person_id} class="object-strech hover:opacity-50 w-full h-full border-gray-100 shadow-smr">
                            </div>
                            <div class = "flex text-md text-black justify-center items-center">{ person_id.slice(0, 1).toUpperCase() + person_id.slice(1).toLowerCase()}</div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
