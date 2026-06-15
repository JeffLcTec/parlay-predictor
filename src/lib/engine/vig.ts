/**
 * Implied probability of decimal odds: 1 / odds.
 * Odds <= 1 are nonsensical (no payout) and clamp to certainty.
 */
export function impliedProbability(decimalOdds: number): number {
  if (decimalOdds <= 1) return 1;
  return 1 / decimalOdds;
}

/**
 * Removes the bookmaker margin (vig) from a set of mutually exclusive outcomes
 * (e.g. the three 1X2 prices, or an over/under pair) by normalizing their
 * implied probabilities to sum to 1. Returns the de-vigged probabilities in the
 * same order.
 */
export function removeVig(odds: number[]): number[] {
  const raw = odds.map(impliedProbability);
  const sum = raw.reduce((a, b) => a + b, 0);
  return sum === 0 ? raw : raw.map((p) => p / sum);
}
