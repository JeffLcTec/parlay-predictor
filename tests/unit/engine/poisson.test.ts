import { describe, it, expect } from 'vitest';
import { poissonPmf, buildScoreGrid } from '@/lib/engine/poisson';

describe('poissonPmf', () => {
  it('P(0; λ) equals e^-λ', () => {
    expect(poissonPmf(0, 1)).toBeCloseTo(Math.exp(-1), 10); // 0.3678794…
    expect(poissonPmf(0, 2.5)).toBeCloseTo(Math.exp(-2.5), 10);
  });

  it('matches the closed form for a few known values', () => {
    expect(poissonPmf(1, 2)).toBeCloseTo(2 * Math.exp(-2), 10); // 0.270671…
    expect(poissonPmf(2, 3)).toBeCloseTo((9 / 2) * Math.exp(-3), 10); // 0.224042…
  });

  it('is a valid distribution: sums to ~1 over k', () => {
    let sum = 0;
    for (let k = 0; k <= 30; k++) sum += poissonPmf(k, 2.3);
    expect(sum).toBeCloseTo(1, 8);
  });

  it('λ = 0 puts all mass on 0', () => {
    expect(poissonPmf(0, 0)).toBe(1);
    expect(poissonPmf(1, 0)).toBe(0);
  });

  it('returns 0 for negative or non-integer k', () => {
    expect(poissonPmf(-1, 2)).toBe(0);
    expect(poissonPmf(1.5, 2)).toBe(0);
  });
});

describe('buildScoreGrid', () => {
  it('produces a (maxGoals+1) square matrix', () => {
    const grid = buildScoreGrid(1.4, 1.1, 6);
    expect(grid).toHaveLength(7);
    expect(grid.every((row) => row.length === 7)).toBe(true);
  });

  it('sums to 1 (residual tail renormalized)', () => {
    const grid = buildScoreGrid(1.7, 1.2, 8);
    const total = grid.flat().reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('cell equals the product of the per-team Poisson pmfs (before renorm, ~unchanged for big grid)', () => {
    const lh = 1.5;
    const la = 1.1;
    const grid = buildScoreGrid(lh, la, 10);
    // 1–0 scoreline
    const expected = poissonPmf(1, lh) * poissonPmf(0, la);
    // renormalization barely changes it for a 10-goal grid
    expect(grid[1][0]).toBeCloseTo(expected, 4);
  });

  it('higher home λ makes home wins more likely than away wins', () => {
    const grid = buildScoreGrid(2.2, 0.8, 8);
    let homeWin = 0;
    let awayWin = 0;
    for (let i = 0; i < grid.length; i++)
      for (let j = 0; j < grid.length; j++) {
        if (i > j) homeWin += grid[i][j];
        else if (j > i) awayWin += grid[i][j];
      }
    expect(homeWin).toBeGreaterThan(awayWin);
  });
});
