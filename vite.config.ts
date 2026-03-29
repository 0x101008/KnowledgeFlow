import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.DISABLE_HMR': JSON.stringify(env.DISABLE_HMR),
    },
    base: './', // 确保在 GitHub Pages 等子路径环境下资源路径正确
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
    },
    server: {
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
    }
  };
});
