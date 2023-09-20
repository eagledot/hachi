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
        console.log("destroying...");
    })

    async function handleClick(person_id){

        const batch_size = 10         // i.e update the interface for a batch of 10 images atleast, otherwise not good to wait for all data to download.
        let temp_count = 0
        photos_interface_active = false;

        people_data = {
        "list_metaData": [],
        "list_score": [],
        "list_dataHash": [],
        "list_src": [],
        "done":false
        }

        image_src_downloading = true;
        for(let i = 0; i<image_data.list_dataHash.length; i++){
            if (image_src_downloading === false){
                console.log("stopping...")
                return;
            }

            if(image_data.list_metaData[i]["person"].includes(person_id)){
                people_data.list_metaData.push(image_data.list_metaData[i]);
                people_data.list_dataHash.push(image_data.list_dataHash[i]);
                people_data.list_score.push(image_data.list_score[i]);
                let objectUrl = await getImageBinaryData(image_data.list_dataHash[i]);
                people_data.list_src.push(objectUrl);
                
                temp_count += 1;
                if((temp_count % batch_size) == 0){
                    people_data = people_data  // indicate svelte to re-render photos
                    photos_interface_active = true;
                }

            }
        }
        people_data.done = true;  // should be enough to indicate svelte to render photos interface.
        photos_interface_active = true;
        image_src_downloading = false;
    }

</script>