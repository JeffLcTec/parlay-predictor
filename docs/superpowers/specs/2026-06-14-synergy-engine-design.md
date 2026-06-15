# Synergy Engine — Design Spec

**Date:** 2026-06-14
**Milestone:** 2 — Core Engine (synergy/correlation)
**Status:** approved design, pending implementation plan
**Sport scope (v1):** Soccer only (NBA is a follow-up)

---

## 1. Problem

Today the parlay's total odds are computed by **multiplying** the individual leg
probabilities, which assumes the legs are **independent**. In sports betting that
is frequently false:

- *"Home win" + "home star scores"* → positively correlated (if they win big, the
  star probably scored). The parlay is **more likely** than the product says.
- *"Home win" + "double chance away (X2)"* → mutually exclusive (contradictory).
- *"BTTS Yes" + "Over 2.5"* → positively correlated (both need goals).

The current system has **no model of correlation**. The only real math is the
per-game implied probability (`1/odds`, vig removed). "Synergy" is whatever the
LLM infers from hand-written prompt rules — qualitative, not computed.

This milestone adds a **deterministic correlation engine** that the LLM consults,
so the parlay's combined probability, conflicts, and positive stacking are
**calculated**, not guessed.

## 2. Goals

All three derive from a single correlation primitive:

1. **Honest pricing** — adjusted combined probability and "fair odds" that account
   for correlation, shown next to the book's nominal odds.
2. **Conflict detection** — flag legs that contradict or negatively correlate.
3. **Positive stacking** — label leg pairs that tend to win together.

Non-goal (v1): a single 0–100 "synergy score". Not requested; omitted (YAGNI).

## 3. Key insight (why soccer first)

Every soccer team market (1X2, double chance, BTTS, over/under, Asian handicap) is
a different **question about the same final scoreline**. Goals follow a
Poisson-like distribution, so from the market odds we can reconstruct the
**scoreline distribution** `P(i, j)` (home goals `i`, away goals `j`), and from it
compute the **exact joint probability** of any combination of same-match markets:

> joint(markets) = Σ over all (i, j) that satisfy **every** market of `P(i, j)`

We do not invent correlation coefficients — we **calculate** correlation from the
scoreline, which itself comes from real market odds. Soccer also uses **team
markets only** (no player props), which keeps the model clean.

## 4. Math approach — Hybrid (chosen)

- **Same-match correlation:** Poisson scoreline model (primary signal, exact).
- **Cross-match factors:** bounded adjustments to expected goals λ (league pace,
  motivation, fixture congestion). Different matches remain independent of each
  other; their per-match joint probabilities multiply.

### 4.1 Pipeline

```
market odds (1X2 + O/U) ──de-vig──► calibrate λ_home, λ_away
        │                                   │  (cross-match factors adjust λ)
        ▼                                   ▼
   scoreline distribution P(i, j)  ◄────────┘
        │
        ├─► P(any market)      = Σ cells in that market's region
        └─► P(joint of legs)   = Σ cells satisfying ALL legs    ← the synergy
```

### 4.2 Calibration

Fit `λ_home, λ_away` (2 parameters) so the independent-Poisson model's implied
1X2 (and Over/Under, when available) probabilities match the **de-vigged** market
probabilities, via a small numerical solve (grid search / Newton). A
Dixon-Coles-style low-score correction (better fit for 0-0, 1-1) is an **optional
refinement**, deferred unless calibration error is unacceptable.

### 4.3 Combining across the parlay

1. Group legs by `matchId`.
2. For each match, build its scoreline grid and compute the **joint** of that
   match's legs.
3. Multiply the per-match joint probabilities (matches are independent).
4. `adjusted_probability` = that product; `fair_odds = 1 / adjusted_probability`.
5. `naive_odds` = product of individual book odds (for comparison).

### 4.4 Conflicts & stacking (per match)

- `lift = joint / product_of_marginals`
- `lift ≈ 0` (joint ≈ 0) → **hard conflict** (mutually exclusive legs).
- `lift < SOFT_THRESHOLD` → **soft conflict** (negative correlation, reported only).
- `lift > STACK_THRESHOLD` → **positive stacking** label.

Thresholds are named constants, tuned with tests (initial: soft `< 0.85`,
stack `> 1.15`, hard when joint `< 1e-6`). Lift in the neutral band
(`0.85–1.15`) is reported as informational `relation` only, not a conflict.

## 5. Division of labor — Iterative loop

The engine is exposed to the agent as a **deterministic tool**
`evaluate_parlay_synergy(legs)` (pure math, no network calls). The existing
tool-use loop drives the iteration:

```
1. LLM gathers data (existing tools) and proposes N legs
2. LLM calls evaluate_parlay_synergy(legs)
3a. verdict = "revise"  (the engine returns this iff there is a HARD conflict)
       → LLM reads conflicts/stacking, proposes revised legs → back to step 2
3b. verdict = "approve"  (no hard conflicts)
       → LLM may still adjust legs to move fair_odds toward the user's target,
         then finalizes the parlay JSON, embedding the synergy report
```

- **The engine's `verdict` depends only on hard conflicts** — it does not know the
  user's target odds. Hitting the target is the LLM's judgement, using `fair_odds`
  from the report. This keeps the boundary clean (engine = math, LLM = judgement).
- The prompt mandates: *call `evaluate_parlay_synergy` before finalizing and
  resolve every HARD conflict.*
- Cap at ~3 revision rounds to bound token use; if a hard conflict remains, keep
  the best version and mark it as a warning.
- The engine **judges and explains only** — it never swaps legs itself. The LLM
  makes the changes. Boundary stays clean: **engine = math, LLM = judgement.**

## 6. Output — `SynergyReport`

```jsonc
{
  "adjusted_probability": 0.184,   // true combined probability
  "fair_odds": 5.43,               // 1 / adjusted_probability
  "naive_odds": 6.10,              // product of individual book odds
  "edge": "overpriced",            // naive vs fair: overpriced | underpriced | fair
  "per_match": [
    { "match": "Madrid vs Getafe", "legs": ["home", "over_2.5"],
      "joint": 0.41, "product": 0.46, "lift": 0.89, "relation": "slightly_negative" }
  ],
  "conflicts": [
    { "legs": ["home", "double_chance_X2"], "reason": "mutually exclusive",
      "severity": "hard" }
  ],
  "stacking": [
    { "legs": ["btts_yes", "over_2.5"], "reason": "both require goals", "lift": 1.28 }
  ],
  "verdict": "approve"             // approve | revise
}
```

## 7. Module architecture

New folder `src/lib/engine/` (each module one responsibility, independently
testable):

| Module | Responsibility | Depends on |
|---|---|---|
| `types.ts` | `Leg`, `SoccerMarket`, `ScoreGrid`, `MatchModel`, `SynergyReport` | — |
| `poisson.ts` | `poissonPmf(k, λ)`, `buildScoreGrid(λh, λa, maxGoals=8)` | — |
| `markets.ts` | `marketPredicate`, `marketProbability(grid, m)`, `jointProbability(grid, m[])` | poisson, types |
| `vig.ts` | `impliedProbability(odds)`, `removeVig(odds[])` (port from old engine) | — |
| `calibration.ts` | `calibrate(deVigged) → {λh, λa, ok}` (numerical fit) | poisson, markets |
| `factors.ts` | `applyFactors({λh, λa}, ctx) → {λh, λa}` (bounded nudges) | — |
| `correlation.ts` | `evaluateSynergy(legs[], matchData) → SynergyReport` (orchestrator) | all above |

`SoccerMarket` is a discriminated union:
`result | double_chance | btts | over_under | asian_handicap`. Adding a market =
adding one predicate case.

The old monolithic `engine.ts` (implied probability, normalize, classify) is
folded into this folder (`vig.ts` + a `classify.ts` if still needed).

## 8. Error handling

The engine is **pure** (no network), so failures are data-shaped, not I/O:

- Match lacks odds to calibrate → **independent fallback** for that match
  (joint = product), flagged `"no correlation model for this match"`. Not fatal.
- Calibration solver does not converge → same fallback.
- Unknown/unsupported market → treated as an independent leg, noted.
- Score grid capped at `maxGoals` per side (8); residual mass renormalized so the
  grid sums to 1.
- Contradictory legs → `joint ≈ 0` → hard conflict (by design, not an error).

## 9. Testing strategy

Pure math, no external APIs → **100% unit-test coverage target** (`tests/unit/`).

- `poisson`: known pmf values (`Poisson(0; 1) = e⁻¹`); grid sums ≈ 1.
- `calibration`: **round-trip** — pick λ, generate market probs, refit, recover λ
  within tolerance (heavy favorite, even, draw-heavy cases).
- `markets`: predicate truth tables; `marketProbability` matches hand sums;
  `joint` of contradictory markets = 0; `joint` of a market with itself = its
  marginal; `joint ≤ min(marginals)`.
- `factors`: league pace shifts total goals monotonically and within bounds;
  identity when context is empty.
- `correlation`: BTTS+Over → lift > 1 (stacking); home + away → hard conflict;
  legs in different matches → joint = product (independence); fallback path when
  odds missing.
- One full `legs[] → SynergyReport` snapshot for a known fixture.

## 10. Out of scope (this milestone)

- NBA correlation rules (player props, same-game NBA correlations) — follow-up.
- Learned/empirical correlations from historical outcomes (the "C" approach) — the
  schema leaves room for it, but it needs outcome data we do not have yet.
- UI rendering of the report — this milestone delivers the engine + tool + types;
  display comes with the generate/evaluate pages.

## 11. ADR

To be recorded as **ADR-005** in `docs/ARCHITECTURE.md`: "Poisson scoreline model
for soccer same-game correlation (hybrid with bounded cross-match factors)".
