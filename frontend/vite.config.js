import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Use "/FYP/" for GitHub Pages deployment (build), "/" for local development (serve)
  base: command === 'build' ? "/FYP/" : "/",
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'build'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
}))




