import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/MeasureTwice/',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf-vendor';
          if (id.includes('node_modules/docx'))    return 'docx-vendor';
          if (id.includes('node_modules/react'))   return 'react-vendor';
          if (id.includes('lucide-react'))         return 'icons';
        },
      },
    },
  },
})
