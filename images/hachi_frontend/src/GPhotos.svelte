<!-- Svelte component to manage Google Photos related functionalities. -->
<script>
import { onMount } from "svelte";

let gClientInfo = null;
let display_activation_button = false;
let label = "Upload Client secret json"

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


function handleClientUpload(event){
    let expected_redirect = "http://localhost:5000/api/OAuthCallback"
    label = "upload in progress.."
    event.preventDefault();
    console.log(event.target);
    event.target.disabled = true;

    var reader = new FileReader();
    reader.onload = function() {
      var client_data = JSON.parse(reader.result);
      let temp_keys = Object.keys(client_data);
      
      // client side checking for valid credentials..
      let is_web_app = temp_keys.includes("web");
      let redirect_uri_valid = false;
      
      if (is_web_app){
        if (Object.keys(client_data["web"]).includes("redirect_uris")){
            redirect_uri_valid =  client_data["web"]["redirect_uris"].includes(expected_redirect)
        }
      }

        if ((is_web_app === true) && (redirect_uri_valid == true)){
           let temp_data = new FormData();
           temp_data.append("client_data", reader.result);

            fetch("/api/uploadClientData",
                {
                "method": "POST",
                "body": temp_data
                })
                .then((response) => {
                    if (response.ok == false){
                        alert("Some error occured !!")
                    }
                    else{
                        label = "Upload Client secret json"
                        get_client_info();
                        event.target.disabled = false;
                        display_activation_button = true;
                    }
                })
        }
        else{
            alert("Must be a webapp and redirect_uris must contain: " + expected_redirect);
            return;
        }};
    reader.readAsText(event.target.files[0]);
}

</script>

<div class = "flex w-full justify-center items-center">
    {#if gClientInfo}
        <p class="bg-gray-100 p-2 border-2 border-black">{gClientInfo["client_id"]}</p>
        {#if gClientInfo["is_activated"]}
            <p class="bg-green-300 p-2 border-2 border-black">Active</p>
        {:else}
            <p class="bg-rose-300 p-2 border-2 border-black">Inactive</p>
        {/if}
    {:else}
        <div class = "border-2 flex-1 justify-center items-center bg-blue-200">
            <p class= "p-4">
                * Make sure you have created an OAuth credential at google Cloud-Console for this app and have enabled <b>Google Photos Api</b>. For details visit <b>https://developers.google.com/photos/library/guides/get-started</b><br>
                * <b>App type</b> must be chosen as <b>Web app</b> and One of Redirect URIs must be set as <b> http://localhost:5000/api/OAuthCallback </b> in corresponding credential.<br>
                * Except <b>You</b> and <b>Google</b> , <b>No-one</b> would have access to your personal data. 
            </p>
            <!-- allow uploading json file -->
            <div class="flex items-center justify-center text-md p-2 bg-blue-300">
                <label for="file">{label}</label>
                <input type="file" accept = ".json" on:change={handleClientUpload}/>
            </div>
        </div>
    {/if}
    
</div>

{#if display_activation_button}
    <div class="flex justify-center items-center m-3">
        <button class="bg-blue-400 p-2 text-md disabled:bg-blue-200" on:click={activate}>Activate Google photos</button>
    </div>
{/if}
