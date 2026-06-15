// Vocabulary for the synergy engine. See
// docs/superpowers/specs/2026-06-14-synergy-engine-design.md

/** Decimal odds as quoted by a bookmaker (e.g. 2.50). Always > 1. */
export type DecimalOdds = number;

/**
 * A soccer team market the engine models as a region of the scoreline grid.
 * Adding a market = adding one case here and one predicate in markets.ts.
 */
export type SoccerMarket =
  | { type: 'result'; pick: 'home' | 'draw' | 'away' }
  | { type: 'double_chance'; pick: '1X' | '12' | 'X2' }
  | { type: 'btts'; pick: 'yes' | 'no' }
  | { type: 'over_under'; line: number; pick: 'over' | 'under' }
  | { type: 'asian_handicap'; line: number; side: 'home' | 'away' };

/** One leg of a parlay. `matchId` groups legs that share a scoreline model. */
export interface Leg {
  matchId: string;
  market: SoccerMarket;
  bookOdds: DecimalOdds;
}

/** P[i][j] = probability of the final score i (home) – j (away). Square, 0..maxGoals. */
export type ScoreGrid = number[][];

/** A calibrated match: expected goals plus its scoreline distribution. */
export interface MatchModel {
  homeLambda: number;
  awayLambda: number;
  grid: ScoreGrid;
  /** 'fitted' = calibrated from odds; 'independent-fallback' = legs treated as independent. */
  source: 'fitted' | 'independent-fallback';
}

/** Cross-match context that nudges expected goals (λ). All fields optional. */
export interface MatchContext {
  /** Average goals/game for the league, used to pull λ toward the league norm. */
  leaguePace?: number;
  /** false = the team has nothing to play for (already qualified/relegated). */
  homeMotivated?: boolean;
  awayMotivated?: boolean;
  /** Which side(s) are fixture-congested/fatigued. */
  congestion?: 'home' | 'away' | 'both' | null;
}

export type ConflictSeverity = 'hard' | 'soft';

export type Relation = 'positive' | 'neutral' | 'slightly_negative' | 'contradictory';

/** Per-match correlation result between the legs that share a match. */
export interface MatchSynergy {
  match: string;
  legs: string[];
  joint: number;
  product: number;
  lift: number;
  relation: Relation;
}

export interface Conflict {
  legs: string[];
  reason: string;
  severity: ConflictSeverity;
}

export interface Stacking {
  legs: string[];
  reason: string;
  lift: number;
}

/** The full report returned by evaluateSynergy and surfaced to the agent/UI. */
export interface SynergyReport {
  /** True combined probability, accounting for correlation. */
  adjustedProbability: number;
  /** 1 / adjustedProbability. */
  fairOdds: number;
  /** Product of individual book odds (the naive, independence-assuming number). */
  naiveOdds: number;
  edge: 'overpriced' | 'underpriced' | 'fair';
  perMatch: MatchSynergy[];
  conflicts: Conflict[];
  stacking: Stacking[];
  /** 'revise' iff there is at least one hard conflict; else 'approve'. */
  verdict: 'approve' | 'revise';
}
