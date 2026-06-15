import type { MatchContext } from './types';

export interface Lambdas {
  homeLambda: number;
  awayLambda: number;
}

const MIN_LAMBDA = 0.1;
const PACE_WEIGHT = 0.2; // how strongly league pace pulls the match total
const MOTIVATION_FACTOR = 0.9; // a team with nothing to play for scores ~10% less
const CONGESTION_FACTOR = 0.95; // a fatigued side scores ~5% less

/**
 * Cross-match adjustments to expected goals (λ). Each is a bounded, conservative
 * nudge — the same-match scoreline model remains the primary signal. Returns the
 * input unchanged when no context is given.
 */
export function applyFactors(base: Lambdas, ctx?: MatchContext): Lambdas {
  if (!ctx) return base;
  let { homeLambda: lh, awayLambda: la } = base;

  // League pace: blend the match total toward the league's average goals/game.
  if (ctx.leaguePace !== undefined && ctx.leaguePace > 0) {
    const total = lh + la;
    if (total > 0) {
      const target = total * (1 - PACE_WEIGHT) + ctx.leaguePace * PACE_WEIGHT;
      const scale = target / total;
      lh *= scale;
      la *= scale;
    }
  }

  // Motivation: nothing to play for → score a bit less.
  if (ctx.homeMotivated === false) lh *= MOTIVATION_FACTOR;
  if (ctx.awayMotivated === false) la *= MOTIVATION_FACTOR;

  // Fixture congestion: the fatigued side(s) score a touch less.
  if (ctx.congestion === 'home' || ctx.congestion === 'both') lh *= CONGESTION_FACTOR;
  if (ctx.congestion === 'away' || ctx.congestion === 'both') la *= CONGESTION_FACTOR;

  return { homeLambda: Math.max(MIN_LAMBDA, lh), awayLambda: Math.max(MIN_LAMBDA, la) };
}
