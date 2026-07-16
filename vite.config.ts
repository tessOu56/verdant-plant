import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// 多頁應用：platform 控制台 + 四個花草服務各一入口
export default defineConfig({
  plugins: [react()],
  server: {
    // dev 模式：把 API 與 WebSocket 轉發到控制台 orchestrator（node server/server.js @ 4000）
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
      },
    },
  },
});
