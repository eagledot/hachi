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


</script>