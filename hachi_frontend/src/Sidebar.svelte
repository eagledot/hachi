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

