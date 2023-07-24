

<script lang = "ts">
    let movie_titles  = [];
    async function get_suggestions(current_query){
        if (current_query){
            let formData = new FormData();
            formData.append("query", current_query)

            const res = await fetch("/api/fuzzySearch", {
                method: 'POST',
                body: formData,
              })
            if (!res.ok) {
                    throw new Error(res);
            }
            else{
            movie_titles = await res.json();
            console.log(movie_titles);
        }
    }
}

    let search_text = "" // user search text.
    $: {   // since search_text is referenced here, it would run reactively of search text.
        console.log("Current query: ");
        get_suggestions(search_text)  // make a request to server to get suggestions..
        .then(() => {
            console.log("promise is done")
        })
        console.log("i am leaving anyway");
    }
</script>

<div>
    <div class="max-md:flex flex-1 bg-gray-300 dark:bg-gray-600 overflow-y-auto">
        <input bind:value={search_text} type="text" placeholder="Enter query">
        <br>
        {#each movie_titles as data }
            <p>Title: <b>{data.title}</b>     Score: <b>{data.score}</b></p>
        {/each}
    </div>
</div>
