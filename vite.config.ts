import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import eslintPlugin from 'vite-plugin-eslint'
import { resolve } from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), eslintPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        embed: resolve(__dirname, 'embed.html'),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    reporters: ['verbose'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: [],
    },
  },
})
