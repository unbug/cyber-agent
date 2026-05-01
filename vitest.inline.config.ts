import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': '/Users/unbug/.openclaw/workspace-cyberagent/cyber-agent/src',
    },
  },
});
