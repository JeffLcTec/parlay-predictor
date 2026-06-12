---
name: predictor-architecture
description: Architecture reference for parlay-predictor. Read this before designing or modifying any significant part of the system.
---

# Architecture — Parlay Predictor

## Stack
| Layer | Technology | Why |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) | Full-stack, Vercel-native, SSR for auth |
| Database + Auth | Supabase | RLS, realtime, free tier generous |
| AI | Groq (Llama 3.3 70B) | Free tier, fast inference, tool use |
| Deployment | Vercel | Zero-config Next.js |
| Language | TypeScript strict mode | Catch errors at compile time |
| Testing | Vitest | Fast, ESM-native, vitest config simple |
| Validation | Zod | Runtime type-safety at API boundaries |

## Folder Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Route group: login, register
│   ├── (app)/              # Route group: protected routes
│   │   ├── generate/       # Generate parlay page
│   │   ├── evaluate/       # Evaluate parlay page
│   │   └── history/        # History page
│   └── api/
│       └── parlay/
│           ├── generate/route.ts
│           ├── evaluate/route.ts
│           ├── outcome/route.ts
│           └── history/route.ts
├── lib/
│   ├── ai/
│   │   ├── agent.ts        # Groq tool-use loop
│   │   ├── tools.ts        # Tool implementations
│   │   └── prompts.ts      # System prompts
│   ├── engine.ts           # Deterministic probability math
│   ├── parlay.ts           # Pure utils: extractJson, computeParlayStatus
│   ├── validation.ts       # Zod schemas for API inputs
│   └── supabase/
│       ├── server.ts       # SSR client (cookies)
│       └── client.ts       # Browser client
├── components/             # React components
│   ├── ui/                 # Primitives (Button, Input, Card)
│   └── parlay/             # Domain components (ParlayForm, LegCard)
├── middleware.ts           # Auth protection
└── types/                  # Shared TypeScript types

tests/
├── unit/                   # Pure function tests (CI-safe)
├── integration/            # API route tests (CI-safe)
└── smoke/                  # Live agent tests (local only)

supabase/
└── migrations/             # SQL migrations (not schema dump)
```

## AI Agent Architecture
```
User Request
    ↓
runAgent(systemPrompt, userMessage)
    ↓
[Groq tool-use loop, max 12 iterations]
    ├─ createWithRetry() ← MODEL_CHAIN fallback
    │   ├─ llama-3.3-70b-versatile  (primary)
    │   ├─ qwen/qwen3-32b           (fallback 1, reasoning_effort: 'none')
    │   └─ openai/gpt-oss-20b       (fallback 2)
    ├─ trimOldToolResults()         ← keeps context under TPM limit
    └─ executeTool(name, args)      ← dispatches to tool implementations
         ├─ get_nba_games_today()   ← ESPN scoreboard
         ├─ get_team_roster()       ← ESPN roster (anti-hallucination)
         ├─ get_player_stats()      ← ESPN athlete overview + gamelog
         ├─ get_odds()             ← The Odds API + deterministic analysis
         ├─ get_soccer_fixtures_today() ← football-data.org
         └─ search_web()           ← Tavily
    ↓
AgentResult { json, rawText, transcript }
    ↓
Save to Supabase
```

## Key Patterns

### Anti-hallucination
Before any player prop: `get_team_roster` confirms player exists on current roster, `get_player_stats` ghost-player check returns actual roster if not found. No LLM memory of rosters allowed.

### Deterministic Engine
Odds → `impliedProbability()` → `normalizeProbabilities()` (removes vig) → `classifyGame()`. The LLM receives the computed `analysis` field and must use it, not estimate from memory.

### Rate Limit Resilience
`parseRetryAfterSeconds()` → if wait ≤ 45s, wait and retry; else try next model in chain. `MAX_WAIT_ROUNDS = 2`. `maxRetries: 0` on Groq client (we handle retry ourselves).

### Context Pruning
`trimOldToolResults()` truncates tool results older than last 4 to 400 chars. Prevents context growing beyond 8K TPM limit on fallback models.

### Auth Pattern
Supabase SSR client reads session from cookies (server-side). Middleware protects `/generate`, `/evaluate`, `/history`, `/api/parlay/*`. Client components use `@supabase/supabase-js` browser client.

## ADRs
Architecture Decision Records live in `docs/adr/`. Format:
```
# ADR-NNN: [title]
Status: accepted | superseded
Date: YYYY-MM-DD
Context: [why this decision was needed]
Decision: [what was decided]
Consequences: [what this enables/constrains]
```

## Supabase Schema
4 tables with RLS:
- `user_profiles` (id, email, created_at)
- `parlays` (id, user_id, sport, type, total_odds, status, ai_reasoning, created_at)
- `parlay_legs` (id, parlay_id, game, bet_type, description, estimated_odds, confidence, hit)
- `outcomes` (id, parlay_id, user_id, won, created_at)
