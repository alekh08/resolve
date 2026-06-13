import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { spawn } from 'child_process';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'express-dev-server',
        configureServer(server) {
          console.log('📡 Spawning backend Express server on Port 5000...');
          const child = spawn('npx', ['tsx', 'server.ts'], {
            stdio: 'inherit',
            shell: true,
            env: {
              ...process.env,
              PORT: '5000',
              NODE_ENV: 'development',
            },
          });

          server.httpServer?.on('close', () => {
            console.log('🛑 Shutting down backend Express server...');
            child.kill();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Allow proxying api, websocket and upload routes to Express running on 5000
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:5000',
          ws: true,
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
