import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/FYP/",
  server: {
    host: true,
    port: 3000
  },
  build: {
    outDir: 'build'
  }
})

