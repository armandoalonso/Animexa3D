import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Separate config for smoke tests with Node.js environment
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/smoke/setup.js'],
    testTimeout: 15000,
    include: ['tests/smoke/**/*.test.js'],
    coverage: {
      enabled: false
    }
  },
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@modules': path.resolve(__dirname, './src/renderer/modules')
    }
  }
});
