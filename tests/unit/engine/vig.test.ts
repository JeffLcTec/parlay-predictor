import { describe, it, expect } from 'vitest';
import { impliedProbability, removeVig } from '@/lib/engine/vig';

describe('impliedProbability', () => {
  it('is 1 / decimal odds', () => {
    expect(impliedProbability(2)).toBeCloseTo(0.5, 12);
    expect(impliedProbability(4)).toBeCloseTo(0.25, 12);
  });

  it('clamps nonsensical odds (<= 1) to certainty', () => {
    expect(impliedProbability(1)).toBe(1);
    expect(impliedProbability(0.5)).toBe(1);
  });
});

describe('removeVig', () => {
  it('returns probabilities that sum to 1', () => {
    const probs = removeVig([1.9, 1.9]); // book with margin
    expect(probs[0] + probs[1]).toBeCloseTo(1, 12);
  });

  it('a fair two-way book (2.0/2.0) yields 50/50', () => {
    expect(removeVig([2, 2])).toEqual([0.5, 0.5]);
  });

  it('keeps the favourite as the higher probability', () => {
    const [pHome, , pAway] = removeVig([1.5, 4.2, 7.0]); // 1X2-style
    expect(pHome).toBeGreaterThan(pAway);
  });

  it('strips the margin: de-vigged probs are below raw implied', () => {
    const raw = 1 / 1.9 + 1 / 1.9; // > 1 because of vig
    const probs = removeVig([1.9, 1.9]);
    expect(raw).toBeGreaterThan(1);
    expect(probs[0]).toBeLessThan(1 / 1.9);
  });

  it('an empty input returns an empty array (no divide by zero)', () => {
    expect(removeVig([])).toEqual([]);
  });
});
