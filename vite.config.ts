import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// 多頁應用：platform 控制台 + 花草服務 + atelier
export default defineConfig({
  plugins: [react()],
  server: {
    // dev 模式：把 API 與 WebSocket 轉發到控制台 orchestrator（node server/server.js @ 4000）
    // atelier 本機 API 在 :4105；開發 UI 時請由控制台啟動後開該埠，或另設 proxy。
    proxy: {
      '/api': 'http://localhost:4000',
      '/ws': { target: 'ws://localhost:4000', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        platform: resolve(__dirname, 'index.html'),
        garden: resolve(__dirname, 'garden.html'),
        bloom: resolve(__dirname, 'bloom.html'),
        meadow: resolve(__dirname, 'meadow.html'),
        scene: resolve(__dirname, 'scene.html'),
        atelier: resolve(__dirname, 'atelier.html'),
      },
    },
  },
});
