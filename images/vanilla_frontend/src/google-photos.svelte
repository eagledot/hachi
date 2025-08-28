<script lang="ts">
  import { onMount } from "svelte";
  import { endpoints } from "./config";
  import { Layout } from "./components";
  import { fetchWithSession } from "./utils";

  new Layout({
    title: "Google Photos - Hachi",
    currentPage: "/google-photos.html",
    showNavbar: true,
  });

  type GClientInfo = {
    client_id: string;
    client_id_available: string;
    is_activated: boolean;
  };

  let gClientInfo$: GClientInfo | null = null;
  let displayActivationButton$ = false;
  let label$ = "Upload Client secret json";

  async function get_client_info() { // Fetch Google client info from the server
    const response = await fetchWithSession(endpoints.BASE_URL + "/api/gClientInfo"); // Fetch client info
    const data : GClientInfo = await response.json(); // Parse the JSON response
    if (data.client_id_available) { // Check if client_id is available
      gClientInfo$ = data; // If yes, store the client info
      displayActivationButton$ = !gClientInfo$.is_activated; // If not activated, show activation button
    }
  }

  onMount(() => {
    get_client_info();
  });

  async function pollActivationStatus() {
    const response = await fetchWithSession(endpoints.BASE_URL + "/api/statusGAuthFlow"); // Check the status of the Google authentication flow
    const data = await response.json(); // Parse the JSON response
    let isFinished = data["finished"]; // Check if the authentication flow is finished
    if (!isFinished) {
      // If the authentication flow is not finished
      return setTimeout(pollActivationStatus, 2000); // Wait for 2 seconds before polling again
    }

    displayActivationButton$ = false; // Hide the activation button
    alert("Account Activation: " + data["status"].toString()); // Show the activation status
    get_client_info(); // Refresh the client info
  }

  async function activate(event: Event) { // Handle activation button click
    event.preventDefault(); // Prevent default form submission
    const target = event.target as HTMLButtonElement; // Get the target button element
    target.disabled = true; // Disable the button
    target.innerText = "activation in progress..."; // Update button text

    const response = await fetchWithSession(endpoints.BASE_URL + "/api/beginGAuthFlow"); // Start the Google authentication flow
    if (!response.ok) { // Check if the response is not ok
      alert("Some error occurred while starting authorization flow!");
      target.disabled = false; // Enable the button
      target.innerText = "Activate Google Photos"; // Reset button text
      return;
    } 
    setTimeout(pollActivationStatus, 1000);
  }

  async function handleClientUpload(event: Event) {
    const expectedRedirect = "http://localhost:5000/api/OAuthCallback"; // Must match the redirect URI in the Google Cloud Console
    label$ = "upload in progress.."; // Update label to indicate upload progress
    event.preventDefault(); // Prevent default form submission
    const target = event.target as HTMLInputElement; // Get the file input element
    target.disabled = true; // Disable the file input element

    const file = target.files?.[0]; // Get the selected file
    if (!file) { // Check if a file was selected
      alert("No file selected"); // Show an alert if no file is selected
      target.disabled = false; // Enable the file input element
      label$ = "Upload Client secret json"; // Reset label
      return; // Stop further execution
    }

    const reader = new FileReader(); // Create a new FileReader instance
    reader.onload = async () => { // Set up the onload event handler
      try {
        const client_data = JSON.parse(reader.result as string); // Parse the JSON file
        const isWebApp = Object.keys(client_data).includes("web"); // Check if the web key exists
        let redirectUriValid = false; // Assume redirect_uris is invalid

        if (
          isWebApp &&
          client_data.web &&
          Array.isArray(client_data.web.redirect_uris)
        ) {
          redirectUriValid =
            client_data.web.redirect_uris.includes(expectedRedirect); // If the web key is available and redirect_uris is an array, check if it includes the expectedRedirect
        }

        if (isWebApp && redirectUriValid) {
          const form = new FormData(); // Create a new FormData instance
          form.append("client_data", reader.result as string); // Append the client data to the form

          const response = await fetchWithSession( // Send the form data to the server
            endpoints.BASE_URL + "/api/uploadClientData",
            {
              method: "POST",
              body: form,
            }
          );

          if (!response.ok) {
            throw new Error("Failed to upload client data");
          }

          label$ = "Upload Client secret json"; // Reset label
          target.disabled = false; // Enable the file input element
          displayActivationButton$ = true; // Show the activation button
          await get_client_info(); // Refresh client info
        } else {
          alert(
            "Must be a webapp and redirect_uris must contain: " +
              expectedRedirect
          );
          target.disabled = false;
        }
      } catch {
        alert("Invalid JSON file");
        target.disabled = false;
      }
    };
    reader.readAsText(file); // Read the file as text
  }
</script>

<div class="w-full flex items-center h-screen justify-center px-4">
  <div class="w-full max-w-2xl space-y-6">
    {#if gClientInfo$}
      <div
        class="rounded-lg border shadow-sm bg-white/70 backdrop-blur p-5 space-y-4"
      >
        <header class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Google Photos OAuth Client</h2>
          {#if gClientInfo$["is_activated"]}
            <span
              class="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-medium border border-emerald-200"
            >
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
              ></span> Active
            </span>
          {:else}
            <span
              class="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 px-3 py-1 text-xs font-medium border border-rose-200"
            >
              <span class="w-2 h-2 rounded-full bg-rose-500"></span> Inactive
            </span>
          {/if}
        </header>

        <div class="text-sm">
          <p
            class="font-mono break-all bg-gray-50 border rounded p-3 text-gray-700"
            aria-label="Client ID"
          >
            {gClientInfo$["client_id"]}
          </p>
        </div>

        {#if !gClientInfo$["is_activated"]}
          <p class="text-xs text-gray-500">
            Your client is registered but not yet activated. Click Activate to
            start the OAuth flow.
          </p>
        {/if}
      </div>
    {:else}
      <div
        class="rounded-lg border shadow-sm bg-white/70 backdrop-blur overflow-hidden"
      >
        <div class="p-5 space-y-4">
          <h2 class="text-lg font-semibold">Connect Google Photos</h2>
          <ul class="text-sm list-disc pl-5 space-y-1 text-gray-700">
            <li>
              Create an OAuth Client (Web application) in Google Cloud Console.
            </li>
            <li>Enable <b>Google Photos Library API</b>.</li>
            <li>
              Add redirect URI: <code
                class="bg-gray-100 px-1 py-0.5 rounded text-xs"
                >http://localhost:5000/api/OAuthCallback</code
              >
            </li>
            <li>Your data stays between you and Google.</li>
          </ul>

          <div class="mt-4">
            <span class="block text-xs font-medium mb-1 text-gray-600"
              >Upload client_secret.json</span
            >
            <label class="group cursor-pointer w-full">
              <div
                class="flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed p-6 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition"
              >
                <span
                  class="text-sm font-medium text-blue-700 group-hover:scale-105 transition"
                >
                  {label$}
                </span>
                <span class="text-[11px] text-blue-500"
                  >Only .json generated by Google Cloud Console</span
                >
              </div>
              <input
                id="file"
                type="file"
                class="hidden"
                accept=".json,application/json"
                on:change={handleClientUpload}
                aria-label="Upload Google OAuth client secret JSON"
              />
            </label>
          </div>
        </div>
      </div>
    {/if}

    {#if displayActivationButton$}
      <div class="flex justify-center">
        <button
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-5 py-2.5 rounded-md shadow-sm transition text-sm"
          on:click={activate}
        >
          Activate Google Photos
        </button>
      </div>
    {/if}
  </div>
</div>
