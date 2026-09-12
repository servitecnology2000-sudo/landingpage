import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    test: {
      environment: 'node',
      globals: true,
      include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
      env,
      testTimeout: 25000,
      hookTimeout: 25000,
    },
  };
});
