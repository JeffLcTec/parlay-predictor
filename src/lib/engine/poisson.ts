import type { ScoreGrid } from './types';

/**
 * Poisson probability mass: P(X = k) for mean `lambda`.
 * Returns 0 for negative or non-integer k. λ must be >= 0.
 *
 * Computed in log space (k·ln λ − λ − ln k!) to stay numerically stable for
 * larger k instead of overflowing on λ^k / k!.
 */
export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return Math.exp(k * Math.log(lambda) - lambda - logFactorial(k));
}

function logFactorial(n: number): number {
  let sum = 0;
  for (let i = 2; i <= n; i++) sum += Math.log(i);
  return sum;
}

/**
 * Joint scoreline distribution assuming independent Poisson goals for each team:
 * grid[i][j] = P(home scores i) · P(away scores j), for i, j in 0..maxGoals.
 *
 * Goals above `maxGoals` are dropped and the grid is renormalized so it sums to
 * 1 — the truncated tail is negligible for realistic λ (~1-2 goals).
 */
export function buildScoreGrid(homeLambda: number, awayLambda: number, maxGoals = 8): ScoreGrid {
  const home: number[] = [];
  const away: number[] = [];
  for (let k = 0; k <= maxGoals; k++) {
    home.push(poissonPmf(k, homeLambda));
    away.push(poissonPmf(k, awayLambda));
  }

  const grid: ScoreGrid = [];
  let total = 0;
  for (let i = 0; i <= maxGoals; i++) {
    grid[i] = [];
    for (let j = 0; j <= maxGoals; j++) {
      const p = home[i] * away[j];
      grid[i][j] = p;
      total += p;
    }
  }

  if (total > 0) {
    for (let i = 0; i <= maxGoals; i++) {
      for (let j = 0; j <= maxGoals; j++) {
        grid[i][j] /= total;
      }
    }
  }
  return grid;
}
