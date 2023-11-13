<script>

    import { createEventDispatcher, onMount } from 'svelte';
    import { no_images_indexed, unique_people_count, unique_place_count, unique_resource_directories_count } from './stores';
    const dispatch = createEventDispatcher();  // attach dispatch to this instance. 

    export let sidebarOpen = false;      // can control it from parent (generally used during initialization).
    const state = {
        sidebarOpen : sidebarOpen,
    }

    const menuItems = [
		{
			icon : "image",
			path : "#",
			name : "Photos",
			count: 0
		},
		{
			icon : "video",
			path : "#",
			name : "Videos",
			count: 0
		},
		{
			icon : "book-atlas",
			path : "#",
			name : "Index Library",
			count: 0
		},
		{
			icon : "user-tag",
			path : "#",
			name : "People",
			count: 0
		},
		{
			icon : "location-dot",
			path : "#",
			name : "Places",
			count: 0
		},

		{
			icon : "folder",
			path : "#",
			name : "Local",
			count: 0
		},

		{
			icon : "image",
			path : "#",
			name : "Google Photos",
			count: 0
		}
	
	]

	onMount(() => {
		// can also indicate ongoing indexing indicator..
		// instead subscribe here to update the stats.. updated
		no_images_indexed.subscribe((value) => {
			if(menuItems){menuItems[0].count = value}
		})
		unique_people_count.subscribe((value) => {if(menuItems){menuItems[3].count = value;}})
		unique_place_count.subscribe((value) => {if(menuItems){menuItems[4].count = value;}})
		unique_resource_directories_count.subscribe((value) => {if(menuItems){menuItems[5].count = value;}})
		
	})

    function openSidebar() {
		state.sidebarOpen = true
	}

	function closeSidebar() {
		state.sidebarOpen = false
	}

	function handleMenuItemClick(i){
		// based on one of the menu items click, we would dispatch en event to handle by parent.
		let item_ix = i;
		dispatch('menuClick', {
        	item: menuItems[item_ix],
        });

	}

    // based on the update in sidebaropen state, we would dispatch en event.
	$: if (state){
		dispatch("sidebarStateChange",{
			"open": state.sidebarOpen
		})
	}

</script>

<div class="flex h-100 text-white">
  <!-- Sidebar -->
  <aside class="{state.sidebarOpen && "w-64"} bg-green-50">
    <div class="flex h-16 items-center justify-between bg-green-100 font-semibold text-black">

			{#if state.sidebarOpen}
<span class="px-4">Hachi</span>
      <span on:click={closeSidebar} class="cursor-pointer px-4">
        <i class="fa-solid fa-arrow-left"></i>
    </span>
			{:else}
				 <span on:click={openSidebar} class="px-4">
        <i class="fa-solid fa-bars cursor-pointer"></i>
      </span>
			{/if}
			
    </div>
    <nav class="mt-6">
		{#each menuItems as item,i}
			<div on:click = {() => {handleMenuItemClick(i)}} class="flex items-center space-x-2 px-4 py-3 text-black hover:bg-green-100 hover:text-black">

				<i class="fa-solid fa-{item.icon}"></i>

				<!-- Hiding the names of menu items when sidebar is closed -->
				{#if state.sidebarOpen}
					<div class="flex w-full justify-between">
						<div class="flex" data-ix = {i}>{item.name}</div>
						<div class="px-3 flex text-black text-md text-bold">{item.count}</div>
					</div>
				{/if}
			</div>
		{/each}
    </nav>
  </aside>

</div>
