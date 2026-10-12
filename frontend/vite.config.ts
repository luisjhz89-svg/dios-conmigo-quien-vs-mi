/**
 * SANACIÓN INTEGRAL — Bienestar espiritual, psicológico y emocional
 * © 2026 Luis Jiménez (@luisjhz89-svg). Todos los derechos reservados.
 * Uso sujeto a los términos de /LICENSE.md.
 */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3001',
    },
  },
})
