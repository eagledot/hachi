<!-- Display data grouped by persons -->

<script>
    import sample_bg from'./assets/sample_place_bg.jpg'
    import Photos from './photos.svelte';
    import {onMount, onDestroy} from "svelte"

    async function getImageBinaryData(data_hash){
    
        let url = "/api/getRawData/" + data_hash;
        let response = await fetch(url);
        let myBlob = await response.blob();
        let objectURL = await URL.createObjectURL(myBlob);
        return objectURL
    }

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
        "list_src": [],
        "done":false
    }


    //sample data
    let image_src_downloading = false; // indicating that image data is being downloaded !!
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
            console.log("data length: ", data_length);
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

        const batch_size = 10         // i.e update the interface for a batch of 10 images atleast, otherwise not good to wait for all data to download.
        let temp_count = 0
        photos_interface_active = false;

        place_data = {
        "list_metaData": [],
        "list_score": [],
        "list_dataHash": [],
        "list_src": [],
        "done":false
        }

        image_src_downloading = true;
        // update place_data for this place_id.
        for(let i = 0; i<image_data.list_dataHash.length; i++){
            
            if (image_src_downloading === false){
                console.log("stopping...")
                return;
            }

            if(image_data.list_metaData[i]["place"].toLowerCase() === place_id.toLowerCase()){
                place_data.list_metaData.push(image_data.list_metaData[i]);
                place_data.list_dataHash.push(image_data.list_dataHash[i]);
                place_data.list_score.push(image_data.list_score[i]);
                let objectUrl = await getImageBinaryData(image_data.list_dataHash[i]);
                place_data.list_src.push(objectUrl);
                
                temp_count += 1;
                if((temp_count % batch_size) == 0){
                    place_data = place_data  // indicate svelte to re-render photos
                    photos_interface_active = true;
                }

            }
        }
        place_data.done = true;  // should be enough to indicate svelte to render photos interface.
        photos_interface_active = true;
        image_src_downloading = false;
    }

</script>


{#if (photos_interface_active)}
    <Photos image_data = {place_data} show_exit_interface_button = {true} on:exitButtonPressed = {() => {console.log("pressed the hell out of it!"); photos_interface_active = false; image_src_downloading = false;}}/>
{:else if (image_src_downloading === true)}
    <p> Loading, please wait...</p>
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