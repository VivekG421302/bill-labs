import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset paths relative, so the app works from any sub-path
// (GitHub Pages, Vercel, Netlify, a folder on a shared server).
export default defineConfig({
  base: './',
  plugins: [react()],
})
