import type { ScoreGrid, SoccerMarket } from './types';

/** Whether a final score (homeGoals, awayGoals) satisfies a market. */
type ScorePredicate = (homeGoals: number, awayGoals: number) => boolean;

/**
 * Maps a soccer market to a predicate over the final score. Every market is
 * just a region of the scoreline grid — this is the single place that defines
 * what each market means.
 *
 * Over/Under and Asian handicap are supported on half-integer lines (the common
 * case), where no push is possible. Integer/quarter lines are not modelled yet.
 */
export function marketPredicate(market: SoccerMarket): ScorePredicate {
  switch (market.type) {
    case 'result':
      if (market.pick === 'home') return (h, a) => h > a;
      if (market.pick === 'away') return (h, a) => h < a;
      return (h, a) => h === a; // draw

    case 'double_chance':
      if (market.pick === '1X') return (h, a) => h >= a; // home or draw
      if (market.pick === '12') return (h, a) => h !== a; // home or away
      return (h, a) => h <= a; // X2: draw or away

    case 'btts':
      return market.pick === 'yes' ? (h, a) => h >= 1 && a >= 1 : (h, a) => h === 0 || a === 0;

    case 'over_under':
      return market.pick === 'over'
        ? (h, a) => h + a > market.line
        : (h, a) => h + a < market.line;

    case 'asian_handicap':
      // The handicapped side covers when its goal margin plus the line is > 0.
      return market.side === 'home'
        ? (h, a) => h - a + market.line > 0
        : (h, a) => a - h + market.line > 0;
  }
}

/** Probability of a single market: sum of grid cells where its predicate holds. */
export function marketProbability(grid: ScoreGrid, market: SoccerMarket): number {
  const holds = marketPredicate(market);
  return sumWhere(grid, (h, a) => holds(h, a));
}

/**
 * Exact joint probability that ALL markets hit together, read off the same
 * scoreline grid. This is the correlation primitive: for same-match legs it is
 * the true joint, not the product of marginals.
 */
export function jointProbability(grid: ScoreGrid, markets: SoccerMarket[]): number {
  const predicates = markets.map(marketPredicate);
  return sumWhere(grid, (h, a) => predicates.every((p) => p(h, a)));
}

function sumWhere(grid: ScoreGrid, keep: ScorePredicate): number {
  let total = 0;
  for (let h = 0; h < grid.length; h++) {
    for (let a = 0; a < grid[h].length; a++) {
      if (keep(h, a)) total += grid[h][a];
    }
  }
  return total;
}
