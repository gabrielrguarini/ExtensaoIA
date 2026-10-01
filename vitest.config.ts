import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    hookTimeout: 30_000,
    testTimeout: 10_000,
  },
});
