  
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
        

</script>