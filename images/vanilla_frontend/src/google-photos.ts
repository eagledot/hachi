import GooglePhotos from "./google-photos.svelte";
import { mount } from "svelte";
mount(GooglePhotos, {
    target: document.getElementById("main")!
});