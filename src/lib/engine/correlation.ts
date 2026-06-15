import { buildScoreGrid } from './poisson';
import { marketProbability, jointProbability } from './markets';
import { calibrate, type MarketTargets } from './calibration';
import { applyFactors } from './factors';
import { impliedProbability } from './vig';
import type {
  Leg,
  SoccerMarket,
  ScoreGrid,
  MatchContext,
  SynergyReport,
  MatchSynergy,
  Conflict,
  Stacking,
  Relation,
} from './types';

/** Per-match odds + context the engine needs to model correlation. */
export interface MatchInput {
  label: string;
  targets: MarketTargets;
  context?: MatchContext;
}

// Classification thresholds (see design spec §4.4). lift = joint / product.
const HARD = 1e-6; // joint below this → legs are mutually exclusive
const SOFT = 0.85; // lift below this → negative correlation
const STACK = 1.15; // lift above this → positive stacking
const EDGE_BAND = 0.02; // naive/fair within this → "fair"

/** Short Spanish label for a market, used in the report. */
export function describeMarket(m: SoccerMarket): string {
  switch (m.type) {
    case 'result':
      return m.pick === 'home' ? 'gana local' : m.pick === 'away' ? 'gana visitante' : 'empate';
    case 'double_chance':
      return `doble oportunidad ${m.pick}`;
    case 'btts':
      return m.pick === 'yes' ? 'ambos anotan' : 'no ambos anotan';
    case 'over_under':
      return `${m.pick === 'over' ? 'over' : 'under'} ${m.line}`;
    case 'asian_handicap':
      return `hándicap ${m.side === 'home' ? 'local' : 'visitante'} ${m.line > 0 ? '+' : ''}${m.line}`;
  }
}

function classifyRelation(joint: number, lift: number): Relation {
  if (joint < HARD) return 'contradictory';
  if (lift > STACK) return 'positive';
  if (lift < SOFT) return 'slightly_negative';
  return 'neutral';
}

function classifyEdge(naiveOdds: number, fairOdds: number): SynergyReport['edge'] {
  if (!Number.isFinite(fairOdds) || fairOdds === 0) return 'fair';
  const ratio = naiveOdds / fairOdds;
  if (ratio > 1 + EDGE_BAND) return 'underpriced'; // book pays more than fair → value
  if (ratio < 1 - EDGE_BAND) return 'overpriced'; // book pays less than fair
  return 'fair';
}

/** Build a match's scoreline grid (calibrate + cross-match factors), or null if no usable fit. */
function buildMatchGrid(input: MatchInput | undefined): ScoreGrid | null {
  if (!input) return null;
  const cal = calibrate(input.targets);
  if (!cal.ok) return null;
  const adj = applyFactors({ homeLambda: cal.homeLambda, awayLambda: cal.awayLambda }, input.context);
  return buildScoreGrid(adj.homeLambda, adj.awayLambda);
}

/**
 * The correlation primitive in one call: groups legs by match, computes each
 * match's true joint probability from its scoreline model (independent fallback
 * when a match lacks odds), combines across matches, and reports conflicts,
 * positive stacking, and fair vs naive odds.
 */
export function evaluateSynergy(legs: Leg[], matches: Record<string, MatchInput>): SynergyReport {
  const byMatch = new Map<string, Leg[]>();
  for (const leg of legs) {
    const arr = byMatch.get(leg.matchId) ?? [];
    arr.push(leg);
    byMatch.set(leg.matchId, arr);
  }

  let adjustedProbability = 1;
  const perMatch: MatchSynergy[] = [];
  const conflicts: Conflict[] = [];
  const stacking: Stacking[] = [];

  for (const [matchId, matchLegs] of byMatch) {
    const input = matches[matchId];
    const label = input?.label ?? matchId;
    const markets = matchLegs.map((l) => l.market);
    const labels = matchLegs.map((l) => describeMarket(l.market));
    const grid = buildMatchGrid(input);

    if (!grid) {
      // Independent fallback: no scoreline model, so joint = product of the
      // book-implied leg probabilities.
      const product = matchLegs.reduce((acc, l) => acc * impliedProbability(l.bookOdds), 1);
      adjustedProbability *= product;
      perMatch.push({ match: label, legs: labels, joint: product, product, lift: 1, relation: 'neutral' });
      continue;
    }

    const marginals = markets.map((m) => marketProbability(grid, m));
    const product = marginals.reduce((a, b) => a * b, 1);
    const joint = jointProbability(grid, markets);
    adjustedProbability *= joint;
    const lift = product > 0 ? joint / product : 0;
    perMatch.push({
      match: label,
      legs: labels,
      joint,
      product,
      lift,
      relation: classifyRelation(joint, lift),
    });

    // Pairwise conflicts / stacking within the match.
    for (let i = 0; i < matchLegs.length; i++) {
      for (let k = i + 1; k < matchLegs.length; k++) {
        const pairJoint = jointProbability(grid, [markets[i], markets[k]]);
        const pairProduct = marginals[i] * marginals[k];
        const pairLift = pairProduct > 0 ? pairJoint / pairProduct : 0;
        const pair = [labels[i], labels[k]];
        if (pairJoint < HARD) {
          conflicts.push({ legs: pair, reason: 'no pueden cumplirse juntas (mutuamente excluyentes)', severity: 'hard' });
        } else if (pairLift < SOFT) {
          conflicts.push({ legs: pair, reason: 'correlación negativa: bajan el valor combinado', severity: 'soft' });
        } else if (pairLift > STACK) {
          stacking.push({ legs: pair, reason: 'correlación positiva: suelen ganar juntas', lift: pairLift });
        }
      }
    }
  }

  const naiveOdds = legs.reduce((a, l) => a * l.bookOdds, 1);
  const fairOdds = adjustedProbability > 0 ? 1 / adjustedProbability : Infinity;
  const verdict = conflicts.some((c) => c.severity === 'hard') ? 'revise' : 'approve';

  return {
    adjustedProbability,
    fairOdds,
    naiveOdds,
    edge: classifyEdge(naiveOdds, fairOdds),
    perMatch,
    conflicts,
    stacking,
    verdict,
  };
}
