<!-- Svelte component to manage Google Photos related functionalities. -->
<script>
import { onMount } from "svelte";

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
onMount(()=>{
    get_client_info();
})

function pollActivationStatus(){
    //keep polling for account activation progress, every 2 seconds.
    fetch("/api/statusGAuthFlow")
    .then((response) => {
        response.json()
        .then((data) => {
        let is_finished = data["finished"];
        if(is_finished == false){
            setTimeout(pollActivationStatus, 2000);
        }
        else{
            display_activation_button = false;
            alert("Account Activation: " + data["status"].toString());
            get_client_info();
        }
    })
    })
}
function activate(event){
    event.target.disabled = true;
    event.target.innerText = "activation in progress..."
    
    fetch(
        "/api/beginGAuthFlow"
    ).then((response) => {
        if (response.ok == false){
            alert("Some error occured while starting authorization flow !");
            event.target.disabled = false;
            event.target.innerText = "Activate Google Photos"
        } 
        else{
            setTimeout(pollActivationStatus, 1000);
        }
    })
}



</script>