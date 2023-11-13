<!-- Svelte component to manage Google Photos related functionalities. -->
<script>

let gClientInfo = null;
let display_activation_button = false;

function get_client_info(){
    fetch("/api/gClientInfo")
    .then((response) => {
        response.json()
        .then((data) => {
            if(data["client_id_available"] === true)
            {
            gClientInfo = data;
                if (data["is_activated"] == false){
                    display_activation_button = true;
                }
            }
            
        })
    }
    )
}


</script>