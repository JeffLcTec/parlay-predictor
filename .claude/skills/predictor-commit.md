---
name: predictor-commit
description: Conventional commit standards for parlay-predictor. Use before every git commit to ensure consistent history.
---

# Commit Standards — Parlay Predictor

## Format
```
<type>(<scope>): <short description>

[optional body — explain WHY, not what]

[optional footer — breaking changes, closes issues]
```

## Types
| Type | When to use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `test` | Adding or fixing tests |
| `refactor` | Code restructure without behavior change |
| `perf` | Performance improvement |
| `docs` | Documentation only (including PROGRESS.md, TASKS.md) |
| `chore` | Tooling, deps, config (no production code) |
| `ci` | GitHub Actions, CI configuration |

## Scopes
`agent` | `tools` | `ui` | `auth` | `db` | `api` | `engine` | `e2e` | `ci` | `deps`

## Rules
- **Subject line**: max 72 chars, imperative mood, no period at end
- **No "what"**: the diff shows what changed. The message explains WHY.
- **No task references in commit messages** — those go in PR descriptions
- **Atomic commits**: one logical change per commit, not "misc fixes"

## Examples

Good:
```
feat(engine): add vig-removal probability normalization

Implied probability from raw odds overestimates the favorite because of
the bookmaker margin. Normalization removes the vig so classification
thresholds (blowout/trap/competitive) reflect true market probability.
```

```
fix(agent): cap wait-and-retry to MAX_WAIT_SECONDS

GPT-oss-20b was returning "try again in 51s" which exceeded the 45s cap,
causing the chain to throw instead of trying the next model.
```

```
feat(tools): ghost-player protection in get_player_stats

If the requested player is not on the current ESPN roster, return an
error plus the actual roster list so the LLM can self-correct without
hallucinating a player that left last season.
```

```
test(engine): add normalizeProbabilities edge cases
```

```
chore(deps): upgrade groq-sdk to 0.9.0
```

Bad (don't do these):
```
fix stuff                           # no type/scope, vague
feat: added the player stats tool   # past tense, too generic
WIP                                 # never commit WIP to develop
update code                         # meaningless
```

## Co-author line (add to every commit)
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
