---
name: predictor-session-start
description: Use at the start of EVERY work session on parlay-predictor. Loads context from docs, checks git state, and orients the session before doing anything else.
---

# Session Start — Parlay Predictor

This skill runs before any other action. It gives you a complete picture of where things stand so you don't repeat work or miss context.

## Steps (run in order)

### 1. Read context files
Read both files in parallel:
- `docs/PROGRESS.md` — last session summary, what's in-flight
- `docs/TASKS.md` — current backlog, priorities

### 2. Check git state
Run these in parallel:
```bash
git status
git log --oneline -10
git branch -a
```
Also check for open PRs if gh CLI is available:
```bash
gh pr list --state open
```

### 3. Verify environment
Check that `.env.local` exists (don't read it):
```bash
Test-Path .env.local
```
If missing, remind the user the keys need to be copied from the previous project.

### 4. Report to user
Summarize in this format:
```
**Sesión iniciada — Parlay Predictor**

📍 Branch actual: [branch]
🔀 PRs abiertos: [list or "ninguno"]

**Última sesión** (resumen de PROGRESS.md):
[1-3 bullet points from last session]

**Próximas tareas** (de TASKS.md):
1. [top priority]
2. [second]
3. [third]

**Estado del proyecto**: [one sentence on overall health]

¿En qué trabajamos hoy?
```

### 5. Invoke the right skill next
- If starting a new feature → invoke `predictor-feature`
- If fixing a bug → create `fix/[scope]-[description]` branch first
- If continuing existing work → check PROGRESS.md for the current branch
