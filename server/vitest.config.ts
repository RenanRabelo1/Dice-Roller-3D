import { defineConfig } from 'vitest/config';

// Its own config, so the front end's (one folder up) is not picked up.
export default defineConfig({ test: { include: ['test/**/*.test.ts'], environment: 'node', testTimeout: 30_000, hookTimeout: 300_000 } });
