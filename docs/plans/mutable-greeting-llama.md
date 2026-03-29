# Progressive PR rendering in `wt list`

## Context

`wt list` now fetches GitHub PR status via `gh pr list`, which adds ~600ms of
network latency. The table should render instantly with the data we already have
(worktrees, sessions), then fill in the PR column once the `gh` call completes.

## Approach

**Plain table mode** (default): progressive render with ANSI cursor rewrite

- Print table header + all rows immediately with `…` in the PR column
- Once `fetchPrsByBranch` resolves, move cursor up and overwrite each row's PR
  cell
- Only do cursor rewriting when `process.stdout.isTTY` — when piped, fall back
  to awaiting all data before printing (current behavior)

**fzf picker mode** (`--pick`): no change

- fzf requires complete input upfront, so keep the current await-then-render
  behavior

## Files to modify

- `tools/wt-cli/src/list.ts` — restructure rendering into two phases

## Implementation details

### Rendering flow (plain table, TTY)

```
1. Start fetchPrsByBranch() (returns a Promise, don't await yet)
2. Render header + separator
3. For each worktree row, print with "…" as PR placeholder
4. Await the PR promise
5. Move cursor up N lines (one per worktree row)
6. Reprint each row with actual PR data
```

### ANSI escapes (no library needed)

- `\x1b[{n}A` — move cursor up n lines
- `\x1b[2K` — clear entire current line
- `\x1b[1B` — move cursor down 1 line

### Non-TTY fallback

When `!process.stdout.isTTY` (piped output), await all data before printing —
identical to current behavior. This prevents ANSI garbage in piped output.

### Refactoring plan

Extract a `renderRow(repo, wt, session, pr, widths)` function to avoid
duplicating the row formatting logic between initial render and update pass.

## Verification

1. `cd ~/dev/gd/meagain && wt list` — table should appear instantly, PR column
   updates after ~600ms
2. `wt list | cat` — should wait for all data, no ANSI codes in output
3. `wt list --pick` — fzf should show PR data (same as current)
4. `cd ~/.dotfiles && wt list` — works with single worktree, no PRs
