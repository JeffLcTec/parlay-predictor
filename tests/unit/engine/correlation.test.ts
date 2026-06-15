import { describe, it, expect } from 'vitest';
import { buildScoreGrid } from '@/lib/engine/poisson';
import { marketProbability } from '@/lib/engine/markets';
import { evaluateSynergy, describeMarket, type MatchInput } from '@/lib/engine/correlation';
import type { Leg, SoccerMarket } from '@/lib/engine/types';

/** Build a MatchInput whose calibration targets come from a known λ pair. */
function inputFrom(label: string, lh: number, la: number): MatchInput {
  const g = buildScoreGrid(lh, la);
  return {
    label,
    targets: {
      home: marketProbability(g, { type: 'result', pick: 'home' }),
      draw: marketProbability(g, { type: 'result', pick: 'draw' }),
      away: marketProbability(g, { type: 'result', pick: 'away' }),
      over: marketProbability(g, { type: 'over_under', line: 2.5, pick: 'over' }),
      line: 2.5,
    },
  };
}

const leg = (matchId: string, market: SoccerMarket, bookOdds: number): Leg => ({
  matchId,
  market,
  bookOdds,
});

describe('describeMarket', () => {
  it('renders human-readable Spanish labels for every market type', () => {
    expect(describeMarket({ type: 'result', pick: 'home' })).toMatch(/local/i);
    expect(describeMarket({ type: 'result', pick: 'away' })).toMatch(/visitante/i);
    expect(describeMarket({ type: 'result', pick: 'draw' })).toMatch(/empate/i);
    expect(describeMarket({ type: 'double_chance', pick: '1X' })).toContain('1X');
    expect(describeMarket({ type: 'btts', pick: 'yes' })).toMatch(/ambos/i);
    expect(describeMarket({ type: 'btts', pick: 'no' })).toMatch(/no ambos/i);
    expect(describeMarket({ type: 'over_under', line: 2.5, pick: 'over' })).toContain('2.5');
    expect(describeMarket({ type: 'over_under', line: 1.5, pick: 'under' })).toContain('under');
    expect(describeMarket({ type: 'asian_handicap', line: -1, side: 'home' })).toMatch(/local/i);
    expect(describeMarket({ type: 'asian_handicap', line: 1, side: 'away' })).toContain('+1');
  });
});

describe('evaluateSynergy', () => {
  it('flags mutually exclusive legs as a hard conflict and asks to revise', () => {
    const legs = [
      leg('m1', { type: 'result', pick: 'home' }, 2.1),
      leg('m1', { type: 'result', pick: 'away' }, 3.4),
    ];
    const report = evaluateSynergy(legs, { m1: inputFrom('A vs B', 1.5, 1.1) });
    expect(report.verdict).toBe('revise');
    expect(report.conflicts.some((c) => c.severity === 'hard')).toBe(true);
    expect(report.adjustedProbability).toBeLessThan(1e-6);
  });

  it('labels BTTS-yes + Over 2.5 as positive stacking and approves', () => {
    const legs = [
      leg('m1', { type: 'btts', pick: 'yes' }, 1.8),
      leg('m1', { type: 'over_under', line: 2.5, pick: 'over' }, 1.95),
    ];
    const report = evaluateSynergy(legs, { m1: inputFrom('A vs B', 1.6, 1.4) });
    expect(report.verdict).toBe('approve');
    expect(report.stacking.length).toBeGreaterThan(0);
    expect(report.perMatch[0].lift).toBeGreaterThan(1);
  });

  it('flags Under 2.5 + BTTS-yes as a soft (negative) conflict', () => {
    const legs = [
      leg('m1', { type: 'over_under', line: 2.5, pick: 'under' }, 2.0),
      leg('m1', { type: 'btts', pick: 'yes' }, 1.9),
    ];
    const report = evaluateSynergy(legs, { m1: inputFrom('A vs B', 1.5, 1.3) });
    expect(report.conflicts.some((c) => c.severity === 'soft')).toBe(true);
    expect(report.conflicts.some((c) => c.severity === 'hard')).toBe(false);
    expect(report.verdict).toBe('approve');
  });

  it('treats legs in different matches as independent (joint = product)', () => {
    const legs = [
      leg('m1', { type: 'result', pick: 'home' }, 2.0),
      leg('m2', { type: 'result', pick: 'home' }, 1.8),
    ];
    const matches = { m1: inputFrom('A vs B', 1.7, 1.0), m2: inputFrom('C vs D', 1.9, 1.1) };
    const report = evaluateSynergy(legs, matches);
    const p1 = report.perMatch[0].joint;
    const p2 = report.perMatch[1].joint;
    expect(report.adjustedProbability).toBeCloseTo(p1 * p2, 10);
    expect(report.verdict).toBe('approve');
  });

  it('fair odds is the reciprocal of the adjusted probability', () => {
    const legs = [leg('m1', { type: 'result', pick: 'home' }, 2.0)];
    const report = evaluateSynergy(legs, { m1: inputFrom('A vs B', 1.8, 1.0) });
    expect(report.fairOdds).toBeCloseTo(1 / report.adjustedProbability, 8);
  });

  it('naive odds is the product of the book odds', () => {
    const legs = [
      leg('m1', { type: 'btts', pick: 'yes' }, 1.8),
      leg('m2', { type: 'result', pick: 'home' }, 2.5),
    ];
    const matches = { m1: inputFrom('A vs B', 1.6, 1.4), m2: inputFrom('C vs D', 1.7, 1.0) };
    const report = evaluateSynergy(legs, matches);
    expect(report.naiveOdds).toBeCloseTo(1.8 * 2.5, 10);
  });

  it('falls back to independence when a match has no odds input', () => {
    const legs = [
      leg('m1', { type: 'result', pick: 'home' }, 2.0),
      leg('m1', { type: 'btts', pick: 'yes' }, 2.0),
    ];
    const report = evaluateSynergy(legs, {}); // no MatchInput for m1
    // independent fallback: joint = product of book-implied probs = 0.5 * 0.5
    expect(report.perMatch[0].joint).toBeCloseTo(0.25, 10);
    expect(report.perMatch[0].relation).toBe('neutral');
  });

  it('falls back to independence when the market cannot be calibrated', () => {
    const legs = [
      leg('m1', { type: 'result', pick: 'home' }, 2.0),
      leg('m1', { type: 'btts', pick: 'yes' }, 2.0),
    ];
    // A 50/50 with zero draw probability is impossible under Poisson, so no λ
    // fits → calibrate returns ok=false → the engine uses the independent path.
    const unfittable: MatchInput = { label: 'X vs Y', targets: { home: 0.5, draw: 0, away: 0.5 } };
    const report = evaluateSynergy(legs, { m1: unfittable });
    expect(report.perMatch[0].joint).toBeCloseTo(0.25, 10);
    expect(report.perMatch[0].relation).toBe('neutral');
  });

  it('reports a near-independent pair as neutral (no conflict, no stacking)', () => {
    const legs = [
      leg('m1', { type: 'result', pick: 'home' }, 2.0),
      leg('m1', { type: 'over_under', line: 1.5, pick: 'over' }, 1.3),
    ];
    const report = evaluateSynergy(legs, { m1: inputFrom('A vs B', 1.6, 1.3) });
    expect(report.conflicts).toHaveLength(0);
    expect(report.stacking).toHaveLength(0);
    expect(report.perMatch[0].relation).toBe('neutral');
    expect(report.verdict).toBe('approve');
  });

  it('handles a zero-probability leg without dividing by zero', () => {
    const legs = [
      leg('m1', { type: 'result', pick: 'home' }, 2.0),
      leg('m1', { type: 'over_under', line: 50.5, pick: 'over' }, 1.5), // unreachable total
    ];
    const report = evaluateSynergy(legs, { m1: inputFrom('A vs B', 1.5, 1.1) });
    expect(report.perMatch[0].lift).toBe(0);
  });
});
