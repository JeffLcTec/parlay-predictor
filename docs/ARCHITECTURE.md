# Architecture — Parlay Predictor

See `.claude/skills/predictor-architecture.md` for the full architecture reference used by Claude Code.

This file is for human-readable architectural documentation and ADRs.

---

## System Overview

Parlay Predictor is a sports betting assistant that generates NBA/soccer parlays backed by real-time data. It combines a deterministic probability engine (implied odds math) with an LLM agent that fetches live data before making recommendations.

```
Browser (Next.js) ──► /api/parlay/generate
                              │
                      runAgent(prompt, msg)
                              │
                    [Groq tool-use loop]
                    ┌─────────┴──────────┐
                    │                    │
              ESPN APIs            The Odds API
           (roster, stats)        (live odds)
                    │              Tavily API
                    │            (news, injuries)
                    └──► AI Response (JSON)
                              │
                       Supabase (persist)
                              │
                       Response to browser
```

## ADRs

### ADR-001: Deterministic probability engine over LLM estimation
**Status:** accepted  
**Date:** 2026-06-12  
**Context:** LLMs estimate probabilities from training data, which is always stale and biased by narrative (big market teams get inflated win probability in training text).  
**Decision:** Fetch real market odds, compute implied probability via `1/decimalOdds`, normalize across all outcomes to remove the bookmaker vig, and classify the game from that number. Pass the result to the LLM as a computed `analysis` field.  
**Consequences:** Game classification is always based on current market consensus. LLM can't override it. Adds `engine.ts` as a pure math layer with 100% test coverage requirement.

### ADR-002: Groq MODEL_CHAIN over single model
**Status:** accepted  
**Date:** 2026-06-12  
**Context:** Groq free tier has per-model daily quotas (~100K tokens/day for Llama). During development and multi-request sessions, quotas exhaust quickly.  
**Decision:** Chain three models (llama-3.3-70b-versatile → qwen/qwen3-32b → openai/gpt-oss-20b), each with independent daily quotas. On `rate_limit_exceeded`, try next model immediately.  
**Consequences:** Resilience against quota exhaustion. Added complexity: qwen3 needs `reasoning_effort: 'none'` or it burns tokens thinking; qwen3's `reasoning` field must be stripped before passing messages to llama.

### ADR-003: Anti-hallucination via ESPN roster verification
**Status:** accepted  
**Date:** 2026-06-12  
**Context:** LLMs propose player props for players who left teams seasons ago. This produces confident but wrong predictions.  
**Decision:** `get_team_roster` and `get_player_stats` tools fetch current ESPN data. `get_player_stats` includes ghost-player check: if player not found on current roster, return error + actual roster list. Prompt rules prohibit using any player not confirmed by tool data.  
**Consequences:** Every player prop requires 2 tool calls (roster + stats). More iterations, more tokens. The accuracy improvement justifies the cost.

### ADR-004: Scaffold on Next.js 16 (not 14) with Tailwind v4 and Vitest 4
**Status:** accepted  
**Date:** 2026-06-12  
**Context:** Original plan targeted Next.js 14. At scaffold time, `create-next-app@latest` on Node 25 installs Next.js 16 + React 19 + Tailwind v4 + ESLint 9 (flat config). Pinning to 14 risks Node 25 incompatibility and dated tooling.  
**Decision:** Adopt the latest stable toolchain (Next 16 / React 19 / Tailwind v4 / Vitest 4). Test layout split into `tests/{unit,integration,smoke}`: unit+integration run in CI, smoke (live external APIs) is local-only. Path alias `@/` resolved natively by Vitest 4 (no `vite-tsconfig-paths` plugin). Workspace root pinned via `turbopack.root` in `next.config.ts` to avoid a stray home-dir lockfile being treated as root.  
**Consequences:** Next 16 has breaking changes vs older training data — Next-specific code must be checked against `node_modules/next/dist/docs/` (flagged in root `AGENTS.md`). Tailwind v4 uses CSS-based config (no `tailwind.config.js`). Verification gate per PR: `type-check` + `lint` + `test` + `build` all green locally before opening, enforced again by GitHub Actions CI.

### ADR-005: Poisson scoreline model for soccer same-game correlation
**Status:** accepted  
**Date:** 2026-06-14  
**Context:** Parlay odds were multiplied assuming leg independence, which is false for same-match legs (e.g. "home win" + "home star scores" are positively correlated; "home win" + "double chance away" are mutually exclusive). We needed correlation to be *calculated*, not inferred by the LLM. Full design: `docs/superpowers/specs/2026-06-14-synergy-engine-design.md`.  
**Decision:** Model soccer goals as independent Poisson per team. Calibrate λ_home/λ_away from de-vigged 1X2 (+ over/under) odds via a deterministic grid search. Every market is a region of the scoreline grid P(i,j); the exact joint of same-match legs is the sum of grid cells satisfying all of them — no invented correlation coefficients. Different matches stay independent (joint probabilities multiply). Cross-match factors (league pace, motivation, congestion) are bounded nudges to λ. The engine is exposed to the agent as a deterministic `evaluate_parlay_synergy` tool driving an iterative propose→validate→revise loop. Soccer first (team markets only); NBA is a follow-up.  
**Consequences:** Correlation, conflicts, and fair vs naive odds are deterministic and 100% unit-tested. Calibration is a numerical fit (grid search) rather than closed-form. Half-integer over/under and Asian handicap lines only in v1 (no push). When a match lacks odds or cannot be calibrated, the engine falls back to treating its legs as independent rather than failing. Learned/empirical correlation (from outcome history) is left for later — the schema leaves room for it.
