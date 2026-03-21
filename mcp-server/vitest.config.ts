import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/core/types/domain.ts'],
    },
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1', // Handle .js imports in TypeScript
    },
    testTransformMode: {
      web: ['\\.tsx?$'],
    },
  },
});
