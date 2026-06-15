import { describe, it, expect } from 'vitest';
import { applyFactors } from '@/lib/engine/factors';

const base = { homeLambda: 1.4, awayLambda: 1.1 };

describe('applyFactors', () => {
  it('is the identity with no context', () => {
    expect(applyFactors(base)).toEqual(base);
  });

  it('is the identity with an empty context', () => {
    expect(applyFactors(base, {})).toEqual(base);
  });

  it('league pace above the match total raises expected goals', () => {
    const out = applyFactors(base, { leaguePace: 3.2 });
    expect(out.homeLambda + out.awayLambda).toBeGreaterThan(base.homeLambda + base.awayLambda);
  });

  it('league pace below the match total lowers expected goals', () => {
    const out = applyFactors(base, { leaguePace: 1.5 });
    expect(out.homeLambda + out.awayLambda).toBeLessThan(base.homeLambda + base.awayLambda);
  });

  it('the blended total never overshoots the league pace', () => {
    const pace = 3.2;
    const out = applyFactors(base, { leaguePace: pace });
    const total = out.homeLambda + out.awayLambda;
    expect(total).toBeLessThan(pace);
    expect(total).toBeGreaterThan(base.homeLambda + base.awayLambda);
  });

  it('an unmotivated team scores less; the other is unchanged', () => {
    const out = applyFactors(base, { homeMotivated: false });
    expect(out.homeLambda).toBeLessThan(base.homeLambda);
    expect(out.awayLambda).toBe(base.awayLambda);
  });

  it('congestion on both sides lowers both', () => {
    const out = applyFactors(base, { congestion: 'both' });
    expect(out.homeLambda).toBeLessThan(base.homeLambda);
    expect(out.awayLambda).toBeLessThan(base.awayLambda);
  });

  it('never drives λ to zero or below', () => {
    const out = applyFactors(
      { homeLambda: 0.12, awayLambda: 0.12 },
      { leaguePace: 0.1, homeMotivated: false, awayMotivated: false, congestion: 'both' }
    );
    expect(out.homeLambda).toBeGreaterThan(0);
    expect(out.awayLambda).toBeGreaterThan(0);
  });

  it('ignores a non-positive league pace', () => {
    expect(applyFactors(base, { leaguePace: 0 })).toEqual(base);
  });

  it('handles a zero-total base without dividing by zero (clamps to the floor)', () => {
    const out = applyFactors({ homeLambda: 0, awayLambda: 0 }, { leaguePace: 2 });
    expect(out.homeLambda).toBeGreaterThan(0);
    expect(out.awayLambda).toBeGreaterThan(0);
  });
});
