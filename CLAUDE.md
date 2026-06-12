# Parlay Predictor — Claude Code Guide

## Project Overview
Sports betting parlay assistant for NBA and soccer (World Cup). Users generate AI-powered parlays or submit their own for evaluation. Stack: Next.js 14 + Supabase + Groq (Llama 3.3 70B).

## Skills — Use These Always
Project-specific skills live in `.claude/skills/`. Use them via the `Skill` tool:

| When | Skill |
|---|---|
| Start of every session | `predictor-session-start` |
| End of every session | `predictor-session-end` |
| Starting new feature | `predictor-feature` |
| Making any commit | `predictor-commit` |
| Writing tests | `predictor-testing` |
| Architecture questions | `predictor-architecture` |

**MANDATORY:** Always invoke `predictor-session-start` before doing anything else in a new conversation.

## Workflow Rules (non-negotiable)
1. **Never push directly to `main`** — PRs only, from `develop` or `feature/*`
2. **Never push directly to `develop`** — PRs from `feature/*` branches
3. **CI must be green** before merge: `type-check` + `lint` + `test:unit` all pass
4. **Conventional commits** — see `predictor-commit` skill
5. **Tests before merge** — new features need at least unit tests for business logic
6. **`docs/PROGRESS.md` updated every session** — this is how future sessions know where we are

## Branch Naming
```
feature/[scope]-[description]   # feature/agent-tool-player-stats
fix/[scope]-[description]       # fix/api-rate-limit-handling
chore/[scope]-[description]     # chore/ci-add-lint-step
test/[scope]-[description]      # test/engine-normalize-probs
refactor/[scope]-[description]  # refactor/agent-extract-retry-logic
```
Scopes: `agent` | `tools` | `ui` | `auth` | `db` | `api` | `engine` | `e2e` | `ci`

## Environment
- `.env.local` is gitignored — NEVER commit it
- Required keys: GROQ_API_KEY, TAVILY_API_KEY, FOOTBALL_DATA_API_KEY, ODDS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- All keys exist in the user's `.env.local` — just copy from previous project

## Architecture — Quick Reference
See `docs/ARCHITECTURE.md` for full decisions. Key patterns:
- AI agent: Groq tool-use loop with MODEL_CHAIN fallback (llama → qwen3 → gpt-oss)
- Anti-hallucination: ESPN APIs for real roster/stats, verified before any player prop
- Deterministic engine: implied probability math from real odds (no LLM estimation)
- Supabase RLS enabled on all tables, SSR client for auth

## Security Constraints
- RLS on every Supabase table
- No user input directly in SQL or shell commands
- API keys only in env vars, never hardcoded
- Input validation at API route boundaries (zod)

## Context Files (always up to date)
- `docs/PROGRESS.md` — session-by-session log, read this to understand current state
- `docs/TASKS.md` — prioritized backlog, update when completing/discovering work
- `docs/ARCHITECTURE.md` — design decisions and ADRs
