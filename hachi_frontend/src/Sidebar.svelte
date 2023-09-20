<script>

    import { createEventDispatcher, onMount } from 'svelte';
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
		}

	]

    onMount(() => {
		// get some stats about indexed data.
		if (!localStorage.getItem("no_images_indexed")){
			fetch("/api/getMetaStats")
			.then((response) => {
				response.json()
				.then((data) => {
					menuItems[0].count = data["image"].count  // for now only for image.
					menuItems[3].count = data["image"].unique_people_count
					menuItems[4].count = data["image"].unique_place_count

					localStorage.setItem("no_images_indexed", menuItems[0].count.toString());
					localStorage.setItem("unique_people_count", menuItems[3].count.toString());
					localStorage.setItem("unique_place_count", menuItems[4].count.toString());

				})
			})
		}
		else{
			menuItems[0].count = Number(localStorage.getItem("no_images_indexed"));
			menuItems[3].count = Number(localStorage.getItem("unique_people_count"));
			menuItems[4].count = Number(localStorage.getItem("unique_place_count"));

		}
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

<div class="flex h-screen text-white">
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
