import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Unit tests for the plain helpers (money, dates, permissions, URL params). Run once with `npm test`.
// TZ is pinned so date tests give the same result on any PC; tests that need a US time zone switch it with vi.stubEnv.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts'],
      environment: 'node',
      env: { TZ: 'UTC' },
      unstubEnvs: true,
      restoreMocks: true,
    },
  }),
)
