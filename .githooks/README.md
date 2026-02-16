# Git Hooks

This directory contains git hooks that enforce project standards.

## Installation

Hooks are centralised in `.githooks/` and activated by git via:
```bash
git config core.hooksPath .githooks
```

## Available Hooks

### commit-msg
Prevents AI attribution in commit messages to enforce the "NO AI ATTRIBUTION" rule from AGENTS.md.

**Blocked patterns:**
- `Co-Authored-By: Claude`
- `🤖 Generated with`
- `noreply@anthropic.com`
- `Claude Code`
- etc.

**Example of blocked commit:**
```
feat(walks): add new search feature

Co-Authored-By: Claude Sonnet <noreply@anthropic.com>
```

**This will be rejected with:**
```
❌ COMMIT REJECTED: AI attribution detected in commit message
```

### pre-push
Runs the test suite and auto-bumps the app version when pushing to `main` or `pre-main`.

**Behaviours:**
- Blocks the push if typecheck or tests fail.
- Skips for other branches.
- After checks pass, runs `scripts/auto-changelog.mjs` to auto-bump the version.

### Auto-changelog (`scripts/auto-changelog.mjs`)
Parses conventional commits since the last version bump and updates `src/lib/version.ts`.

**Rules:**
- `feat` commits trigger a **minor** version bump.
- `fix` commits trigger a **patch** version bump.
- `build`, `chore`, `ci`, `docs`, `test`, and `style` commits are ignored (no bump).
- `refactor` entries are included in the changelog only if a feat/fix also triggered a bump.
- Duplicate descriptions are deduplicated.

## How It Works

1. Hooks live in `.githooks/` (tracked by git).
2. Git uses `core.hooksPath` to run them directly from this directory.
3. Git automatically runs these hooks at the appropriate time.

## Bypassing Hooks (Not Recommended)

If absolutely necessary, you can bypass hooks with:
```bash
git commit --no-verify
```

**However, this violates project standards and should not be used.**
