import { resolve } from 'path'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const root = resolve(__dirname, 'src')
const outDir = resolve(__dirname, '../static')

// https://vitejs.dev/config/
export default defineConfig({
  // to change *root folder* location
  // root: 'src',
  root,
  build: {
    // outDir: '../static',
    outDir,
    emptyOutDir: true,

    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
      },
      // output: {
      //   assetFileNames: (assetInfo) => {
      //     return assetInfo.name;
      //   },
      // },
    },
  },
  plugins: [svelte()],
})
