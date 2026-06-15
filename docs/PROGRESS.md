# Progress Log — Parlay Predictor

Sessions are added at the TOP (newest first).

---

## Session — 2026-06-14 (Milestone 2: Synergy Engine)

**Branch:** feature/engine-synergy (PR #2 → develop)
**Status:** engine complete, 100% coverage, pending PR review

### Design
- Brainstormed the deterministic correlation engine; decisions: soccer-first, all-three goals from one model, same-match + bounded cross-match factors, iterative AI↔engine loop, output = adjusted odds + conflicts + stacking labels, hybrid Poisson math.
- Spec written: `docs/superpowers/specs/2026-06-14-synergy-engine-design.md`. ADR-005 recorded.
- Process note: kept the execution plan in `docs/TASKS.md` (no separate plan doc) per user direction.

### Done (all TDD, 100% unit coverage, 58 tests)
- `src/lib/engine/` built module by module: `types`, `poisson` (scoreline grid), `vig` (de-vig), `markets` (each market = grid region; exact joint), `calibration` (fit λ via grid search, round-trip tested), `factors` (bounded λ nudges), `correlation` (evaluateSynergy → SynergyReport).
- Coverage 100% statements/branches/functions/lines. Excluded generated `coverage/` from eslint.
- A test caught my wrong intuition: "home win + Over 2.5" is *positively* correlated, not negative — the model corrected me.

### Next Steps
1. Open PR #2 `feature/engine-synergy` → develop, CI green, merge.
2. Follow-up (small): `parlay.ts` (extractJson, computeParlayStatus) + Zod `validation.ts` — pair these with the API work.
3. Milestone 3 — AI Agent: port agent/tools/prompts AND register `evaluate_parlay_synergy` as a tool with the iterative-loop prompt rules.

---

## Session — 2026-06-12 (Milestone 1: Project Scaffold)

**Branch:** chore/scaffold-nextjs → merged to develop via PR #1
**Status:** ✅ shipped — repo public at https://github.com/JeffLcTec/parlay-predictor, CI green on develop

### Done
- Scaffolded the app with `create-next-app@latest`: **Next.js 16.2.9 + React 19 + Tailwind v4 + ESLint 9** (flat config), App Router, `src/` dir, `@/*` alias
- Added testing: **Vitest 4** with `tests/{unit,integration,smoke}` split (unit+integration in CI, smoke local-only); native tsconfig path resolution (no plugin); v8 coverage
- Added **Prettier** (+ tailwind plugin), `.prettierrc`/`.prettierignore`, `format`/`format:check` scripts
- package.json scripts: `type-check`, `test`, `test:unit/integration/smoke`, `test:coverage`, `format`
- Pinned `turbopack.root` in `next.config.ts` (stray home-dir lockfile was confusing the workspace root)
- Created `.env.example` template; copied real `.env.local` from old project (gitignored)
- Updated CI to Node 22, runs unit+integration
- First real module + test (`src/lib/version.ts` + `tests/unit/version.test.ts`) — proves the full pipeline (alias + vitest + coverage)
- ADR-004 recorded (Next 16 / Tailwind v4 / Vitest 4 decision)
- **Verification all green:** type-check ✅ · lint ✅ · format:check ✅ · test ✅ · build ✅

### Next Steps
1. Commit + open PR `chore/scaffold-nextjs` → develop (needs `gh` CLI installed, or create via web)
2. Merge after CI green, then start **Milestone 2 — Core Engine** (`feature/engine-core`): port `engine.ts` + `parlay.ts` with 100%-coverage unit tests, add Zod `validation.ts`

### Heads-up for next session
- **Next.js 16 ≠ training data.** Before API routes / middleware / server components, read `node_modules/next/dist/docs/` (flagged in root `AGENTS.md`).
- 2 moderate npm audit advisories (transitive) — review before deploy, not blocking dev.

---

## Session — 2026-06-12

**Branch:** main (initial setup)
**Status:** merged

### Done
- Created repo from scratch with professional workflow infrastructure
- Set up 6 project-specific Claude Code skills (session-start, session-end, feature, commit, testing, architecture)
- Configured GitHub Actions CI (type-check + lint + test:unit on PR to main/develop)
- Created PR template with full checklist
- Created docs/ context system (PROGRESS.md, TASKS.md, ARCHITECTURE.md)
- Created CLAUDE.md as central project guide for Claude Code
- Context files in place — future sessions are self-contained

### In Progress
- Next.js project scaffold (not yet created)

### Next Steps
1. Scaffold Next.js 14 with TypeScript strict, Tailwind, Vitest
2. Create `develop` branch
3. First feature branch: `feature/engine-core` — port the deterministic engine from previous project
4. Second feature: `feature/agent-core` — port agent + tools with improvements
