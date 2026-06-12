---
name: predictor-session-end
description: Use at the end of EVERY work session on parlay-predictor. Updates progress docs, verifies clean state, and prepares for the next session.
---

# Session End — Parlay Predictor

Run this before closing the conversation. A session ended properly means the next session can pick up instantly without needing this conversation's context.

## Steps (run in order)

### 1. Verify the branch is clean
```bash
git status
```
If there are uncommitted changes, either commit them (use `predictor-commit` skill) or stash them with a descriptive message.

### 2. Run checks (if any code was written this session)
```bash
npm run type-check
npm run lint
npm run test:unit
```
Fix any failures before closing. The next session should start green.

### 3. Update docs/PROGRESS.md
Append a new session entry at the TOP of the file:

```markdown
## Session — YYYY-MM-DD

**Branch:** [current branch]
**Status:** [in-progress | pr-open | merged | blocked]

### Done
- [bullet: what was implemented/fixed]
- [bullet]

### In Progress
- [bullet: what was started but not finished, with branch name]

### Discovered (add to TASKS.md)
- [anything new that needs doing]

### Next Steps
- [what should happen in the next session]
```

### 4. Update docs/TASKS.md
- Mark completed tasks as `[x]`
- Add newly discovered tasks
- Re-prioritize if needed
- Delete tasks that are no longer relevant

### 5. Commit the docs changes
```bash
git add docs/PROGRESS.md docs/TASKS.md
git commit -m "docs: session progress YYYY-MM-DD"
```

### 6. If feature branch is complete
- Ensure all checks pass
- Create PR (base: `develop`) if not already open
- Post PR link in session summary

### 7. Report to user
```
**Sesión cerrada — Parlay Predictor**

✅ Checks: [type-check | lint | test — all pass / [X] failing]
📝 Docs: PROGRESS.md y TASKS.md actualizados
🌿 Branch: [branch] ([committed | pr-open: #N | merged])

**Hecho esta sesión:**
- [bullet]

**Próxima sesión empieza con:**
- [top task from TASKS.md]
```
