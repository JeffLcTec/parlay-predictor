import { buildScoreGrid } from './poisson';
import { marketProbability } from './markets';
import type { SoccerMarket } from './types';

/** De-vigged market probabilities a match is calibrated against. */
export interface MarketTargets {
  /** 1X2 de-vigged probabilities (should sum to ~1). */
  home: number;
  draw: number;
  away: number;
  /** Optional Over/Under: de-vigged "over" probability at `line`. */
  over?: number;
  line?: number;
}

export interface Calibration {
  homeLambda: number;
  awayLambda: number;
  /** false when no λ fits the targets well — caller should use an independent fallback. */
  ok: boolean;
}

const HOME: SoccerMarket = { type: 'result', pick: 'home' };
const DRAW: SoccerMarket = { type: 'result', pick: 'draw' };
const AWAY: SoccerMarket = { type: 'result', pick: 'away' };

// Realistic expected-goals bounds for a single team in one match.
const MIN_LAMBDA = 0.2;
const MAX_LAMBDA = 3.5;
const COARSE_STEP = 0.1;
const FINE_STEP = 0.01;
const FIT_TOLERANCE = 5e-3; // max SSE to consider the fit usable

/** Sum of squared errors between the model's market probs and the targets. */
function modelError(homeLambda: number, awayLambda: number, t: MarketTargets): number {
  const g = buildScoreGrid(homeLambda, awayLambda);
  let e =
    (marketProbability(g, HOME) - t.home) ** 2 +
    (marketProbability(g, DRAW) - t.draw) ** 2 +
    (marketProbability(g, AWAY) - t.away) ** 2;
  if (t.over !== undefined && t.line !== undefined) {
    const over: SoccerMarket = { type: 'over_under', line: t.line, pick: 'over' };
    e += (marketProbability(g, over) - t.over) ** 2;
  }
  return e;
}

/** Scan a λ grid [lo, hi] in both dimensions, returning the lowest-error point. */
function search(
  loH: number,
  hiH: number,
  loA: number,
  hiA: number,
  step: number,
  t: MarketTargets
): { lh: number; la: number; err: number } {
  let best = { lh: loH, la: loA, err: Infinity };
  const steps = (lo: number, hi: number) => Math.round((hi - lo) / step);
  for (let i = 0; i <= steps(loH, hiH); i++) {
    const lh = loH + i * step;
    for (let j = 0; j <= steps(loA, hiA); j++) {
      const la = loA + j * step;
      const err = modelError(lh, la, t);
      if (err < best.err) best = { lh, la, err };
    }
  }
  return best;
}

/**
 * Recovers the expected goals (λ_home, λ_away) whose independent-Poisson model
 * best reproduces the de-vigged market. Two-stage grid search (coarse then fine)
 * — fully deterministic, no randomness. `ok` is false if even the best fit is
 * poor, signalling the caller to treat the match's legs as independent.
 */
export function calibrate(t: MarketTargets): Calibration {
  const coarse = search(MIN_LAMBDA, MAX_LAMBDA, MIN_LAMBDA, MAX_LAMBDA, COARSE_STEP, t);
  const fine = search(
    Math.max(MIN_LAMBDA, coarse.lh - COARSE_STEP),
    coarse.lh + COARSE_STEP,
    Math.max(MIN_LAMBDA, coarse.la - COARSE_STEP),
    coarse.la + COARSE_STEP,
    FINE_STEP,
    t
  );
  return {
    homeLambda: Math.round(fine.lh * 100) / 100,
    awayLambda: Math.round(fine.la * 100) / 100,
    ok: fine.err < FIT_TOLERANCE,
  };
}
