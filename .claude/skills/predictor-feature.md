---
name: predictor-feature
description: Full workflow for implementing a feature on parlay-predictor. Use when starting any new feature, from branch creation through PR.
---

# Feature Workflow — Parlay Predictor

Follow these steps every time you work on a new feature or significant change.

## Step 1 — Branch from develop
```bash
git checkout develop
git pull origin develop  # sync before branching
git checkout -b feature/[scope]-[short-description]
```

**Scope must be one of:** `agent` | `tools` | `ui` | `auth` | `db` | `api` | `engine` | `e2e` | `ci`

Examples:
- `feature/engine-deterministic-probs`
- `feature/tools-player-stats`
- `feature/ui-parlay-generate-page`
- `feature/auth-supabase-ssr`

## Step 2 — Plan before coding
Before writing any code, read:
- `docs/ARCHITECTURE.md` — understand where the new code fits
- Any existing files in the affected area

For non-trivial features (>2 files changed), write a brief plan in the PR description draft before implementing.

## Step 3 — Implement with tests
- Write tests alongside or before the implementation (not after)
- Each logical unit needs a test: pure functions → unit test, API routes → integration test
- See `predictor-testing` skill for test standards
- Keep commits atomic — one logical change per commit

## Step 4 — Pre-PR checklist
Run all three locally before opening a PR:
```bash
npm run type-check   # zero TypeScript errors
npm run lint         # zero ESLint warnings/errors
npm run test:unit    # all unit tests pass
```

If any fail, fix before creating the PR.

## Step 5 — Create PR
```bash
gh pr create --base develop --title "[type]: [description]" --body "$(cat .github/PULL_REQUEST_TEMPLATE.md)"
```

PR rules:
- **Base branch: `develop`** — NEVER `main` directly
- Fill every section of the PR template
- Link to the TASKS.md item (e.g., "Closes task: [task name]")
- Self-review the diff before marking ready

## Step 6 — CI must pass
GitHub Actions runs on PR open:
- `npm run type-check`
- `npm run lint`
- `npm run test:unit`

Do not merge until all checks are green.

## Step 7 — Post-merge
```bash
git checkout develop
git pull origin develop
git branch -d feature/[scope]-[description]  # delete local branch
```

Update `docs/TASKS.md` to mark the task complete.

## Scope Reference
| Scope | What it covers |
|---|---|
| `agent` | Groq tool-use loop, MODEL_CHAIN, retry logic |
| `tools` | ESPN/Tavily/odds API tool implementations |
| `ui` | Next.js pages, components, layouts |
| `auth` | Supabase auth, middleware, SSR client |
| `db` | Supabase schema, migrations, RLS policies |
| `api` | Next.js API routes (/api/**) |
| `engine` | Deterministic probability math |
| `e2e` | Playwright end-to-end tests |
| `ci` | GitHub Actions workflows |
