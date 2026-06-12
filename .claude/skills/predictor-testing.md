---
name: predictor-testing
description: Testing standards for parlay-predictor. Use when writing any test to ensure correct coverage, placement, and patterns.
---

# Testing Standards — Parlay Predictor

## Test Runner: Vitest
```bash
npm run test:unit    # runs tests/unit/** (CI-safe, no API keys needed)
npm run test:smoke   # runs tests/smoke/** (needs .env.local, NOT in CI)
```

## Test Types and Where They Live

### Unit Tests — `tests/unit/`
**What:** Pure functions with no external dependencies.
**When required:** Every function in `src/lib/engine.ts`, `src/lib/parlay.ts`, `src/lib/ai/agent.ts` (exported utils), any utility with logic.
**Pattern:**
```typescript
import { describe, it, expect } from 'vitest';
import { functionUnderTest } from '@/lib/module';

describe('functionName', () => {
  it('describes expected behavior in plain English', () => {
    expect(functionUnderTest(input)).toBe(expectedOutput);
  });
  it('edge case: zero/null/empty input', () => { ... });
  it('edge case: boundary values', () => { ... });
});
```

### Integration Tests — `tests/integration/`
**What:** API routes with mocked Supabase + mocked agent. Tests the HTTP layer.
**When required:** Every `/api/**` route needs at least: happy path + auth failure + malformed input.
**Pattern:** Use `msw` or direct function import with mocked deps.

### Smoke Tests — `tests/smoke/`
**What:** Live agent calls with real API keys. Validates end-to-end tool use.
**NEVER run in CI** — these consume Groq quota.
**When to run:** Manually, locally, before a feature/agent merge.
```typescript
// tests/smoke/agent.smoke.ts
// Marked with .smoke.ts suffix so CI glob excludes them
```

## Coverage Requirements
| Area | Minimum |
|---|---|
| `src/lib/engine.ts` | 100% — pure math, no excuses |
| `src/lib/parlay.ts` | 100% — pure utils |
| `src/lib/ai/agent.ts` (exported utils) | 80%+ |
| API routes | happy path + 2 error cases each |
| `src/lib/ai/tools.ts` | smoke tests only (external APIs) |

## What NOT to test
- Next.js framework behavior (routing, middleware wiring) — trust the framework
- Supabase SDK internals — mock the client, test your code
- UI rendering — save for Playwright (future)
- Tool implementations that are just fetch calls — covered by smoke tests

## Naming Rules
- File: `[module].test.ts` for unit, `[module].integration.test.ts` for integration, `[module].smoke.ts` for smoke
- Test description: **plain English, describes behavior** — not implementation
  - ✅ `it('returns null when no retry pattern found')`
  - ❌ `it('parseRetryAfterSeconds returns null')`

## Vitest Config (vitest.config.ts)
```typescript
// Unit test glob — excludes smoke tests
include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts']
exclude: ['tests/smoke/**']
```
