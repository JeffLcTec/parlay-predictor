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
