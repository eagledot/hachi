import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const outDir = "../static";

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        customElement: true, // compile Svelte as web components
      },
    }),
    tailwindcss(),
  ],
  build: {
    outDir,
    emptyOutDir: false,

    rollupOptions: {
      input: {
        main: "./index.html",
        imageSearch: "./image-search.html",
        people: "./people.html",
        indexing: "./indexing.html",
        folders: "./folders.html",
        folderPhotos: "./folder-photos.html",
        personPhotos: "./person-photos.html",
        googlePhotos: "./google-photos.html",
        extensions: "./extensions.html" // remote/non-native protocol support!
      },
    },
  },
  server: {
    open: "/",
  },
});
