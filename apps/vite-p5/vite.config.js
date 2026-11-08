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
import tailwindcss from '@tailwindcss/vite'

export default {
  plugins: [tailwindcss()],
  // publicDir: "../../public",
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    open: true,
  },
}
