import { defineConfig } from 'vitest/config';

// Test layout (see docs/ARCHITECTURE.md):
//   tests/unit/         pure functions — fast, deterministic, run in CI
//   tests/integration/  API routes / DB — run in CI (mocked externals)
//   tests/smoke/        live agent + real external APIs — LOCAL ONLY (not CI)
//
// Scripts pick the dirs to run (see package.json), so this config only holds
// shared settings: path aliases (@/ -> src/), node env, and coverage.
export default defineConfig({
  // Resolve the @/ alias from tsconfig "paths" natively (Vite 6+/Vitest 4).
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.d.ts'],
    },
  },
});
