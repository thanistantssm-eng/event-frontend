import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Component creation can exceed Vitest's 5-second default on slower CI hosts.
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
