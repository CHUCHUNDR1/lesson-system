import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// http://localhost:5173 -> proxy /api and /socket.io to backend
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
