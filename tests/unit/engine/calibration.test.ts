import { describe, it, expect } from 'vitest';
import { buildScoreGrid } from '@/lib/engine/poisson';
import { marketProbability } from '@/lib/engine/markets';
import { calibrate, type MarketTargets } from '@/lib/engine/calibration';
import type { SoccerMarket } from '@/lib/engine/types';

const HOME: SoccerMarket = { type: 'result', pick: 'home' };
const DRAW: SoccerMarket = { type: 'result', pick: 'draw' };
const AWAY: SoccerMarket = { type: 'result', pick: 'away' };

/** Build exact 1X2 (+over 2.5) targets from a known pair of λ. */
function targetsFrom(lh: number, la: number): MarketTargets {
  const g = buildScoreGrid(lh, la);
  return {
    home: marketProbability(g, HOME),
    draw: marketProbability(g, DRAW),
    away: marketProbability(g, AWAY),
    over: marketProbability(g, { type: 'over_under', line: 2.5, pick: 'over' }),
    line: 2.5,
  };
}

describe('calibrate', () => {
  it('round-trips: recovers λ that generated the market (even match)', () => {
    const res = calibrate(targetsFrom(1.3, 1.3));
    expect(res.ok).toBe(true);
    expect(res.homeLambda).toBeCloseTo(1.3, 1);
    expect(res.awayLambda).toBeCloseTo(1.3, 1);
  });

  it('round-trips: strong home favourite', () => {
    const res = calibrate(targetsFrom(2.3, 0.7));
    expect(res.ok).toBe(true);
    expect(res.homeLambda).toBeCloseTo(2.3, 1);
    expect(res.awayLambda).toBeCloseTo(0.7, 1);
  });

  it('round-trips: away-leaning, low-scoring match', () => {
    const res = calibrate(targetsFrom(0.8, 1.4));
    expect(res.ok).toBe(true);
    expect(res.homeLambda).toBeCloseTo(0.8, 1);
    expect(res.awayLambda).toBeCloseTo(1.4, 1);
  });

  it('works from 1X2 only (no over/under target)', () => {
    const full = targetsFrom(1.6, 1.1);
    const res = calibrate({ home: full.home, draw: full.draw, away: full.away });
    expect(res.ok).toBe(true);
    expect(res.homeLambda).toBeCloseTo(1.6, 1);
    expect(res.awayLambda).toBeCloseTo(1.1, 1);
  });

  it('the fitted λ reproduce the input probabilities closely', () => {
    const t = targetsFrom(1.9, 1.2);
    const res = calibrate(t);
    const g = buildScoreGrid(res.homeLambda, res.awayLambda);
    expect(marketProbability(g, HOME)).toBeCloseTo(t.home, 2);
    expect(marketProbability(g, AWAY)).toBeCloseTo(t.away, 2);
  });
});
