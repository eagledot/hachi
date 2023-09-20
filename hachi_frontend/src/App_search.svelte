  
<script>
  // IMAGES INDEXING AND SEARCH INTERFACE.
  import Fuzzy from "./Fuzzy.svelte"
  import Sidebar from "./Sidebar.svelte"
  import Indexing from "./Indexing.svelte"
  import Photos from "./photos.svelte";
  import People from "./people.svelte";
  import Place from "./place.svelte";

  let image_src = [];
  let orig_image_src = []; // in case temporary access to image data..
  let image_scores = [];
  let image_local_hash = [];
  let image_metaData = [];
  let sorted_scoreIndex = [];   // this would hold the sorted (index, score ) pair, we would use to index into image_src, and on update of this, images would be rendered.

  let query_button;
  let formData;
  const url_prefix = "/api";
  let image_directory_input ;
  let image_dir_path;
  let show_image_directory_form = false;
  let index_progress = "0";
  let directory_being_indexed = "unknown"
  let indexing = false;
  let num_images_indexed = 0;
  let basic_interface = true;
  let current_score_threshold = 0;
  let current_statusEndpoint = "" // this is supposed to hold the endpoint being currently indexed.
  let query_completed = false;
  let topk_input = 3;

  let image_data_for_child  = {
            "list_metaData": [],
            "list_dataHash": [],
            "list_src": [],
            "list_score": [],
            "done":false              // indicating if query is finished.
        }

  let query_button_disabled = false
  let text_query = ""
  let query_attributes = {};        // child sends it when query is ready. // supposed to used to display possible filters for a query.

  async function getImageBinaryData(data_hash){

    let url = "/api/getRawData/" + data_hash;
    let response = await fetch(url);
    let myBlob = await response.blob();
    let objectURL = await URL.createObjectURL(myBlob);
    return objectURL
  }

  async function handleClick(client_id = "xxxxxxx", got_id = false)
    {   
        console.log("handleClick count", text_query, got_id, client_id);
        query_button_disabled = true;
        query_completed = false;
        let topk = topk_input;
        formData = new FormData();
        if (text_query.length === 0) return;
        formData.append('query', text_query);
        formData.append('topk', topk.toString());


        if (got_id == false){
          image_src = [];
          image_local_hash = [];
          image_scores = [];
          image_metaData = [];
          sorted_scoreIndex = [];
          current_score_threshold = 0;

          image_data_for_child  = {
            "list_metaData": [],
            "list_dataHash": [],
            "list_src": [],
            "list_score": [],
            "done":false,
        }

          formData.append("query_start", "true");
        }
        else{
          formData.append("query_start", "false");
          formData.append("client_id", client_id);  //send this key along with subsequent requests. We would get this from server.
        }

        const url = "/api/query";
        let response = await fetch(url, {
                method: 'POST',
                body: formData,
                })
        
        if (!response.ok) {
          query_button_disabled = false;
			    throw new Error(response);
        }
        
        let data = await response.json()
        console.log("data: ",data);
        
        let temp_id = data["client_id"] ;
        let list_metaData = data["meta_data"];  // list of dict mapping data_hash to meta_data.
        let list_dataHash = data["data_hash"];
        let list_scores = data["score"];

        for(let i = 0; i < list_metaData.length; i++){
          let data_hash = list_dataHash[i]
          let score = list_scores[i]
          image_local_hash.push(data_hash);
          image_scores.push(score);
          image_metaData.push(list_metaData[i]);


          let objectUrl = await getImageBinaryData(data_hash);

          // data for child.
          image_data_for_child.list_dataHash.push(data_hash);
          image_data_for_child.list_score.push(score);
          image_data_for_child.list_metaData.push(list_metaData[i])
          image_data_for_child.list_src.push(objectUrl);
        }

        if (data["query_completed"] == true){
          image_data_for_child.done = true; // this should be enough to indicate svelte..
        }
        else{
          image_data_for_child = image_data_for_child; // indicating svelte that image_data has been updated..
        }

        if (data["query_completed"] == true){
          orig_image_src = image_src;   // so that we have a reference to original data. in case of filter threshold.
          query_button_disabled = false;
          query_completed = true;
          return
        }
        
        await handleClick(temp_id, true);  // run it recursively, if query not completed yet.

    }
  
  let pollEndpointTimeoutId;
  async function pollEndpointNew(endpoint, count = 0){
    
    if(count == 0){
      indexing = true;
      show_image_directory_form = false;
    }
    
    let response = await fetch(endpoint, 
      {method: "GET"});
    let data = await response.json();
    let status_available = data["is_active"]

    if (status_available == true){
      
      if (data["done"] == true){
        indexing = false;              //it means server done indexing.
        let formData = new FormData();
        formData.append("ack", "true");

        let response = await fetch(endpoint,
          {
            method: "POST",
            body: formData
          })
        
          if (response.ok === false){
          console.log("index updated succesfully, but server should have responded with 200 code")
        }

        alert("Index Updated Successfully.");  
        return;
      }

      index_progress = data["progress"]
      directory_being_indexed = data["current_directory"]
      
      if(pollEndpointTimeoutId){
            clearTimeout(pollEndpointTimeoutId);
          }
      pollEndpointTimeoutId = setTimeout(function() {pollEndpointNew(endpoint, count + 1)} , 1000) // call this function again, after a second.
    }
    
  }

const
  state_interface = {
    "query":{
      "status":true, // default state.
      "context":{}
    },

    "indexing":{
      "status": false,
      "context": {}
    },

    "place_album":{
      "status": false,
      "context": {}
    },

    "people_album":{
      "status": false,
      "context": {}
  },

}

function make_interface_active(key){

  //make all available interfaces inactive.
  let temp_keys = Object.keys(state_interface);
  for(let i = 0; i < temp_keys.length; i++){ 
      if (state_interface[temp_keys[i]].status){
        state_interface[temp_keys[i]].status = false;
      }
  }

  // make specified interface active.
  if (state_interface[key]){
    state_interface[key].status = true;
  }
}


</script>