import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Crucial for Electron/Capacitor (file:// protocol)
  assetsInclude: ['**/*.lottie'],
  define: {
    'process.env.APP_VERSION': JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
