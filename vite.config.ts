import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/cyber-agent/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@cyber-agent/sdk/trace': path.resolve(__dirname, './sdk/src/trace/schema.ts'),
      '@cyber-agent/sdk/adapter/contract': path.resolve(__dirname, './sdk/src/adapter/contract.ts'),
      // More specific plugin aliases first
      '@cyber-agent/sdk/plugin/registry': path.resolve(__dirname, './sdk/src/plugin/registry.ts'),
      '@cyber-agent/sdk/plugin/sandbox': path.resolve(__dirname, './sdk/src/plugin/sandbox.ts'),
      '@cyber-agent/sdk/plugin/loader': path.resolve(__dirname, './sdk/src/plugin/loader.ts'),
      // Base plugin alias
      '@cyber-agent/sdk/plugin': path.resolve(__dirname, './sdk/src/plugin/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        cookieJar: { allowSpecialUse: true },
      },
    },
    setupFiles: './src/test/setup.ts',
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
