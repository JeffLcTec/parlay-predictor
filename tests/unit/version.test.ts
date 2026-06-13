import { describe, it, expect } from 'vitest';
// Imported via the @/ alias on purpose: proves vite-tsconfig-paths resolves
// the same path mapping vitest -> tsconfig that the app uses at build time.
import { APP_NAME, appBanner } from '@/lib/version';

describe('version', () => {
  it('exposes the app name', () => {
    expect(APP_NAME).toBe('Parlay Predictor');
  });

  it('builds a banner string', () => {
    expect(appBanner()).toMatch(/^Parlay Predictor v\d+\.\d+\.\d+$/);
  });
});
