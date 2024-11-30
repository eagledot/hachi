<script>
    // TODO: most of the code is being reused from people svelte. may be refactored. TODO in future.
    // TODO: handle rare case of PATH normalization, as linux PATH are case sensitive !!
    import Photos from './photos.svelte';
    import folder_svg from './assets/folder-regular.svg'
    import {onMount, onDestroy} from "svelte"
    import {query_results_available} from "./stores.js" // update the writable query_results_available
    
    let state = {
        local_directories: []  // all possible local directories in which indexed data resides.
    }

    // updated/fulfilled on mount.
    let image_data = {
        "list_metaData": [],
        "list_score": [],
        "list_dataHash": [],
    }

    // directory data to be fulfilled on the click. for chosen folder/directory.
    let directory_data = {
        "list_metaData": [],
        "list_score": [],
        "list_dataHash": [],
        "done":false,
        "progress":0
    }


    //sample data
    let photos_interface_active = false;
    let data_downloaded = true; // not exactly being used for now.. (may be used during destroy .. to prevent )
    let original_local_directories; // keeping a reference, in case of search for local directories.
    onMount(() =>{
        
        
        // get the corresponding data for all places.
        fetch("/api/getGroup/resource_directory").
        then((response) => {
            response.json().then((data) => {
            
            // just assume an array of unique values for person.
            state.local_directories = data;
            data_downloaded = true;
        
        
        // we get the data for all the places at once only on mount. Needs to refresh to show very recent data or mount again.

        // data_downloaded = false;

        // // get the corresponding data for all places.
        // fetch("/api/getGroup/resource_directory").
        // then((response) => {
        //     response.json().then((data) => {
        //     let data_length = data["meta_data"].length;
        //     for(let i = 0; i < data_length; i++){
        //         image_data.list_dataHash.push(data["data_hash"][i]);
        //         image_data.list_score.push(data["score"][i]);
        //         image_data.list_metaData.push(data["meta_data"][i]);
        //     }
        //     data_downloaded = true;
        //     state.local_directories = data["resource_directory"];
        //     original_local_directories = state.local_directories;
        // 
            });
        
        });
    })

    onDestroy(() => {
    })

    function handleClick(attribute){

        let filename = attribute.toString().toLowerCase()
        filename = filename.replaceAll("/", "|") // to convert back on server side without tripping bad-urls!

        fetch("/api/getMeta/resource_directory/" + filename).
        then((response) =>{
            response.json().then((temp_meta_data) => {
                photos_interface_active = false;
                directory_data = {
                "list_metaData": [],
                "list_score": [],
                "list_dataHash": [],
                "done":false,
                "progress":0
                }
                

                let count = (temp_meta_data["data_hash"]).length // any key all have equal length.
                console.log(count)
                for(let i = 0; i<count; i++){
                    // should be no need for this if condition .. as we collects meta data for this person id anyway!
                        directory_data.list_metaData.push(temp_meta_data["meta_data"][i]);
                        directory_data.list_dataHash.push(temp_meta_data["data_hash"][i]);
                        directory_data.list_score.push(temp_meta_data["score"][i]);
                    }
                
                directory_data.done = true;  // should be enough to indicate svelte to render photos interface.
                photos_interface_active = true;
                query_results_available.update((value) => structuredClone(directory_data));  // idk how much structuredClone effects but keep it so for now!
        
                })
        })

        
        // photos_interface_active = false;

        // directory_data = {
        // "list_metaData": [],
        // "list_score": [],
        // "list_dataHash": [],
        // "done":false,
        // "progress":0,
        // }
        
        // console.log("looking for attribute ",attribute)
        // for(let i = 0; i<image_data.list_dataHash.length; i++){

        //     if(image_data.list_metaData[i]["resource_directory"].toLowerCase().includes(attribute)){
        //         directory_data.list_metaData.push(image_data.list_metaData[i]);
        //         directory_data.list_dataHash.push(image_data.list_dataHash[i]);
        //         directory_data.list_score.push(image_data.list_score[i]);
                
        //     }
        // }
        // directory_data.done = true;  // should be enough to indicate svelte to render photos interface.
        // console.log(directory_data)
        
        // photos_interface_active = true;
        // if(original_local_directories){
        //     state.local_directories = original_local_directories;
        // }
        // query_results_available.update((value) => structuredClone(directory_data));

    }

function handleSearch(node){
    // update state.local_directories to only include resource directory having a substring same as query.
    let current_query = node.target.value;  // current query.
    current_query = current_query.toLowerCase();
    if(!current_query){
        if(original_local_directories){state.local_directories = original_local_directories}
        return;
    }
    
    if (current_query  && data_downloaded == true && original_local_directories)
    {
        state.local_directories  = [];       // set this is to empty.
        original_local_directories.forEach(
            (directory_id) => {
            if(directory_id.toLowerCase().includes(current_query)){
                state.local_directories.push(directory_id);
            }}
        )        
        }
    }
</script>

    {#if (data_downloaded === false)}
        <p> Loading, please wait...</p>
    {:else if (photos_interface_active)}
        <Photos image_data = {directory_data} show_exit_interface_button = {true} on:exitButtonPressed = {() => {console.log("pressed the hell out of it!"); photos_interface_active = false}}/>
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
                        <div class="flex text-lg font-semibold">Local Resources</div>

                        <!-- some background like gray-100 and rounded borders -->
                        <!-- should be able to add search icon from font awesome too... -->
                        <div class = "flex">
                            <input on:input={handleSearch} class = "text-md py-2 px-3 border-2 border-blue-600 text-slate-500 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-200 focus:border-blue-500 dark:text-slate-400 dark:placeholder:text-slate-600 dark:bg-slate-900 dark:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-600" type = "text" placeholder="Search directory">
                            <!-- <span class="flex px-2 items-center">S</span> -->
                        </div>
                    </div>
                </div>
                
                
                <!-- a single div element -->
                {#each state.local_directories as resource_directory}
                    <div class = "flex-col cursor-pointer p-2" title={resource_directory} on:click={(e) => {console.log("mine is: ", resource_directory); handleClick(resource_directory)}}>
                        <div>
                            <div class = "h-[100px] w-[100px] bg-gray-800 p-3">
                                <img src={folder_svg} class="object-contain hover:opacity-50 w-full h-full border-gray-100 shadow-smr">
                            </div>
                            <div class = "flex text-sm text-black justify-center items-center">{resource_directory.slice(0, 10) + '..'}</div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
