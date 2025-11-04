import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/voice-controlled-maze/',
  plugins: [react()],
  server: {
    open: true,
  },
})
