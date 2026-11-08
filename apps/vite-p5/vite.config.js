// // import { resolve } from 'path'
// import { defineConfig } from 'vite'

// export default defineConfig({
//   publicDir: '../../public',
//   // build: {
//   //   rollupOptions: {
//   //     input: {
//   //       main: resolve(__dirname, 'index.html'),
//   //       single: resolve(__dirname, 'single.html'),
//   //       multi: resolve(__dirname, 'multi.html')
//   //     }
//   //   }
//   // }
// })

// vite.config.js
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'

export default {
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        explore: resolve(import.meta.dirname, 'explore/index.html'),
      },
    },
  },
  // publicDir: "../../public",
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    open: true,
  },
}
