import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const outDir = '../static'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],  build: {
    
    outDir,
    emptyOutDir: false,

    rollupOptions: {
      input: {
        main: './index.html',
        imageSearch: './image-search.html',
        people: './people.html',
        indexing: './indexing.html',
        folders: './folders.html',
        folderPhotos: './folder-photos.html',
        personPhotos: './person-photos.html',
      }
    }
  },
  server: {
    open: '/'
  }
})