<script>
  import DarkMode from './DarkMode.svelte';
  export let items = 0;
  let search_input;
  let settings = false;

  import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	function handleInput() {
		dispatch('message', {
			text: this.value
		});
	}

  // dark mode select
  let darkMode = false;
  
</script>
<!-- top bar for search and regular usable filters -->
<div class="mt-1 mb-4 flex items-center justify-between dark:text-white">
  <span class="text-sm">
    Total videos: <strong>{items}</strong>
  </span>
  <!-- search svg icon -->
  <div class="flex items-center select-none hover:border-b border-black dark:border-white"> 
    <button on:click={() => search_input.focus()} class="hover:text-pink-500 cursor-pointer mr-3">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="dark:text-white w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>        
    </button>
    <input bind:this={search_input} on:keyup={handleInput} class="bg-transparent focus:outline-none" placeholder="Search list">
  </div>
  <div class="flex items-center select-none">  
    <!-- export data -->
    <!-- <button class="flex items-center focus:outline-none border rounded-full py-2 px-6
      leading-none border-gray-500 select-none hover:bg-blue-300">
      <svg class="h-5 w-5 fill-current mr-1" viewBox="0 0 24 24">
        <path d="M12 1L8 5h3v9h2V5h3m2 18H6a2 2 0 01-2-2V9a2 2 0
          012-2h3v2H6v12h12V9h-3V7h3a2 2 0 012 2v12a2 2 0 01-2 2z">
        </path>
      </svg>
      <span>Export</span>
    </button> -->

    <!-- dark mode toggle -->
    <DarkMode darkMode={darkMode}/>

    <div class="flex items-center select-none">
      <!-- settings button -->
      <button on:click={() => settings = !settings } class="ml-3  rounded-full p-2 focus:outline-none hover:bg-blue-300 transition duration-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  </div>
</div>
<!-- end of option bar -->

{#if settings}
  <div class="absolute right-10 z-50 h-[40vh]  bg-pink-200">

  </div>
{/if}