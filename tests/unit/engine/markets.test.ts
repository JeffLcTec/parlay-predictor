import { describe, it, expect } from 'vitest';
import { buildScoreGrid } from '@/lib/engine/poisson';
import { marketProbability, jointProbability } from '@/lib/engine/markets';
import type { SoccerMarket } from '@/lib/engine/types';

const home: SoccerMarket = { type: 'result', pick: 'home' };
const away: SoccerMarket = { type: 'result', pick: 'away' };
const draw: SoccerMarket = { type: 'result', pick: 'draw' };
const over25: SoccerMarket = { type: 'over_under', line: 2.5, pick: 'over' };
const under25: SoccerMarket = { type: 'over_under', line: 2.5, pick: 'under' };
const bttsYes: SoccerMarket = { type: 'btts', pick: 'yes' };
const dc1X: SoccerMarket = { type: 'double_chance', pick: '1X' };

describe('marketProbability', () => {
  it('result outcomes partition the probability space (home+draw+away ≈ 1)', () => {
    const grid = buildScoreGrid(1.6, 1.2);
    const sum =
      marketProbability(grid, home) + marketProbability(grid, draw) + marketProbability(grid, away);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('equal λ makes home and away wins equally likely', () => {
    const grid = buildScoreGrid(1.3, 1.3);
    expect(marketProbability(grid, home)).toBeCloseTo(marketProbability(grid, away), 10);
  });

  it('over and under at 2.5 are complementary (no push at half lines)', () => {
    const grid = buildScoreGrid(1.7, 1.4);
    expect(marketProbability(grid, over25) + marketProbability(grid, under25)).toBeCloseTo(1, 10);
  });

  it('double chance 1X equals home + draw', () => {
    const grid = buildScoreGrid(1.5, 1.1);
    expect(marketProbability(grid, dc1X)).toBeCloseTo(
      marketProbability(grid, home) + marketProbability(grid, draw),
      10
    );
  });

  it('Asian handicap home -0.5 is identical to a home win', () => {
    const grid = buildScoreGrid(1.8, 1.0);
    const ahHomeMinusHalf: SoccerMarket = { type: 'asian_handicap', line: -0.5, side: 'home' };
    expect(marketProbability(grid, ahHomeMinusHalf)).toBeCloseTo(marketProbability(grid, home), 10);
  });

  it('double chance 12 equals home + away (i.e. not a draw)', () => {
    const grid = buildScoreGrid(1.5, 1.2);
    const dc12: SoccerMarket = { type: 'double_chance', pick: '12' };
    expect(marketProbability(grid, dc12)).toBeCloseTo(
      marketProbability(grid, home) + marketProbability(grid, away),
      10
    );
  });

  it('double chance X2 equals draw + away', () => {
    const grid = buildScoreGrid(1.5, 1.2);
    const dcX2: SoccerMarket = { type: 'double_chance', pick: 'X2' };
    expect(marketProbability(grid, dcX2)).toBeCloseTo(
      marketProbability(grid, draw) + marketProbability(grid, away),
      10
    );
  });

  it('BTTS-no is the complement of BTTS-yes', () => {
    const grid = buildScoreGrid(1.4, 1.3);
    const bttsNo: SoccerMarket = { type: 'btts', pick: 'no' };
    expect(marketProbability(grid, bttsYes) + marketProbability(grid, bttsNo)).toBeCloseTo(1, 10);
  });

  it('Asian handicap away -0.5 is identical to an away win', () => {
    const grid = buildScoreGrid(1.0, 1.8);
    const ahAwayMinusHalf: SoccerMarket = { type: 'asian_handicap', line: -0.5, side: 'away' };
    expect(marketProbability(grid, ahAwayMinusHalf)).toBeCloseTo(marketProbability(grid, away), 10);
  });
});

describe('jointProbability', () => {
  it('joint of a market with itself equals its marginal (idempotent)', () => {
    const grid = buildScoreGrid(1.4, 1.2);
    expect(jointProbability(grid, [home, home])).toBeCloseTo(marketProbability(grid, home), 10);
  });

  it('contradictory legs (home win AND away win) have zero joint', () => {
    const grid = buildScoreGrid(1.4, 1.2);
    expect(jointProbability(grid, [home, away])).toBe(0);
  });

  it('joint never exceeds the smallest marginal', () => {
    const grid = buildScoreGrid(1.6, 1.3);
    const joint = jointProbability(grid, [home, over25]);
    expect(joint).toBeLessThanOrEqual(marketProbability(grid, home));
    expect(joint).toBeLessThanOrEqual(marketProbability(grid, over25));
  });

  it('BTTS-yes and Over 2.5 are positively correlated (joint > product)', () => {
    const grid = buildScoreGrid(1.5, 1.3);
    const joint = jointProbability(grid, [bttsYes, over25]);
    const product = marketProbability(grid, bttsYes) * marketProbability(grid, over25);
    expect(joint).toBeGreaterThan(product);
  });

  it('Under 2.5 and BTTS-yes are negatively correlated (joint < product)', () => {
    // BTTS needs >=1 each (total >= 2) while Under 2.5 needs total <= 2, so the
    // only score satisfying both is 1-1. That squeeze makes the joint sit well
    // below the independence product — a robust negative correlation.
    const grid = buildScoreGrid(1.5, 1.3);
    const joint = jointProbability(grid, [under25, bttsYes]);
    const product = marketProbability(grid, under25) * marketProbability(grid, bttsYes);
    expect(joint).toBeLessThan(product);
  });
});
