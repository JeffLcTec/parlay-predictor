# Task Backlog — Parlay Predictor

Priority: 🔴 High | 🟡 Medium | 🟢 Low
Status: [ ] open | [~] in-progress | [x] done

---

## Milestone 0 — Workflow Infrastructure
- [x] Create repo with git init + main branch
- [x] Set up 6 Claude Code skills (session-start, session-end, feature, commit, testing, architecture)
- [x] GitHub Actions CI workflow
- [x] PR template
- [x] docs/ context system (PROGRESS.md, TASKS.md, ARCHITECTURE.md)
- [x] CLAUDE.md

## Milestone 1 — Project Scaffold
- [x] Scaffold Next.js (16, TypeScript strict, Tailwind v4, App Router) — was planned as 14, see ADR-004
- [x] Configure Vitest with separate unit/integration/smoke globs
- [x] Configure ESLint (flat config) + Prettier
- [x] Configure path aliases (`@/` → `src/`) — native Vitest 4 resolution
- [x] Create `.env.local` from previous project keys + `.env.example` template
- [x] Create `develop` branch
- [x] Open PR `chore/scaffold-nextjs` → develop — merged as PR #1, CI green

## Milestone 2 — Synergy Engine (soccer-first)
Design: `docs/superpowers/specs/2026-06-14-synergy-engine-design.md`
Build order in `src/lib/engine/`, TDD, 100% unit coverage (pure math):
- [x] `types.ts` — Leg, SoccerMarket, ScoreGrid, MatchModel, SynergyReport
- [x] `poisson.ts` + tests — poissonPmf, buildScoreGrid
- [x] `vig.ts` + tests — impliedProbability, removeVig (port deterministic odds math)
- [x] `markets.ts` + tests — marketPredicate, marketProbability, jointProbability
- [x] `calibration.ts` + tests — fit λ from de-vigged odds (round-trip tests)
- [x] `factors.ts` + tests — bounded cross-match λ adjustments
- [x] `correlation.ts` + tests — evaluateSynergy → SynergyReport (conflicts/stacking/fair odds)
- [x] ADR-005: Poisson scoreline model for soccer same-game correlation
- [x] Engine at 100% unit coverage (58 tests) — PR #2
- [ ] 🟡 `parlay.ts` + tests — extractJson, computeParlayStatus (follow-up, pairs with API work)
- [ ] 🟡 Zod validation schemas (`src/lib/validation.ts`) (follow-up, pairs with API routes)

> AI integration of the engine (register `evaluate_parlay_synergy` as a tool +
> prompt rules for the iterative propose→validate→revise loop) lands in
> Milestone 3, when the agent is built.

## Milestone 3 — AI Agent
- [ ] 🔴 Port `src/lib/ai/agent.ts` with MODEL_CHAIN, retry logic, context trimming
- [ ] 🔴 Unit tests for `parseRetryAfterSeconds` and `trimOldToolResults`
- [ ] 🔴 Port `src/lib/ai/tools.ts` with all 6 tools (ESPN, Tavily, Odds, football-data)
- [ ] 🔴 Port `src/lib/ai/prompts.ts` with anti-hallucination + role player rules
- [ ] 🔴 Register `evaluate_parlay_synergy` tool (wraps Milestone 2 engine) + prompt rules for the iterative propose→validate→revise loop
- [ ] 🟡 Smoke test: get_player_stats returns real data
- [ ] 🟡 Smoke test: full parlay generation with role player diversification

## Milestone 4 — Database
- [ ] 🔴 Create Supabase project (or reuse existing)
- [ ] 🔴 Write SQL migrations for 4 tables (user_profiles, parlays, parlay_legs, outcomes)
- [ ] 🔴 Enable RLS on all tables with policies
- [ ] 🔴 `src/lib/supabase/server.ts` — SSR client
- [ ] 🔴 `src/lib/supabase/client.ts` — browser client

## Milestone 5 — API Routes
- [ ] 🔴 `POST /api/parlay/generate` — calls agent, saves to Supabase
- [ ] 🔴 `POST /api/parlay/evaluate` — evaluates user's parlay
- [ ] 🔴 `PATCH /api/parlay/outcome` — mark leg hit/miss
- [ ] 🔴 `GET /api/parlay/history` — returns user's parlays with legs
- [ ] 🟡 Integration tests for all routes (happy path + auth error + bad input)

## Milestone 6 — Auth
- [ ] 🔴 `src/middleware.ts` — protect app routes
- [ ] 🔴 Login page with Supabase Auth
- [ ] 🔴 Register page
- [ ] 🟡 SSR session handling

## Milestone 7 — UI
- [ ] 🔴 Generate parlay page
- [ ] 🔴 Evaluate parlay page  
- [ ] 🔴 History page with leg outcome marking
- [ ] 🟡 Loading states, error states
- [ ] 🟡 Responsive design
- [ ] 🟢 Dark mode

## Milestone 8 — Deployment
- [ ] 🔴 Vercel project setup
- [ ] 🔴 Environment variables in Vercel dashboard
- [ ] 🔴 Production deployment from `main`
- [ ] 🟡 Preview deployments from PRs

## Backlog (no milestone yet)
- [ ] 🟢 E2E tests with Playwright (post-UI-stable)
- [ ] 🟢 World Cup soccer fixtures (confederation cups data)
- [ ] 🟢 User settings page
- [ ] 🟢 Parlay sharing (public link)
- [ ] 🟢 Win rate stats on history page
