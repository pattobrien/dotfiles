# e2e

End-to-end tests for the dotfiles' nvim, tmux, and kitty configs. Tests drive
a persistent nvim instance over RPC inside a scoped tmux session
(`-L e2e-test`).

## Run

```bash
vp test                  # all e2e tests
vp test <pattern>        # subset
```

Run from this directory (`tests/e2e/`), not the repo root — root-level
`vp test` walks every workspace and surfaces unrelated tests.

## Persistent fixture

The first `vp test` run launches a tmux session and an nvim process; subsequent
runs reuse them for fast startup. The fixture is left alive on purpose. **Do
not** kill it manually between runs — the test harness self-heals on a clean
cold start, but a half-state (tmux alive without nvim, or vice versa) breaks
every nvim-dependent test.

If you genuinely need a fresh fixture (e.g. after editing tmux.conf or nvim
options that only load at startup):

```bash
tmux -L e2e-test kill-server
rm -f /tmp/nvim-e2e.sock
```

`-L e2e-test` is critical — never run an unscoped `tmux kill-server`, which
would wipe your real session.

## Host requirements

Beyond the standard dotbot install, the diagnostic-rendering tests require a
`tmux-256color` terminfo entry with the `Smulx`, `Setulc`, and `Su`
capabilities. The system entry on macOS lacks these, so nvim degrades
undercurl to a flat underline under tmux. Install the override once:

```bash
tic -x -o ~/.terminfo \
  ../../.config/tmux/tmux-256color-undercurl.terminfo
```

Verify:

```bash
infocmp -x tmux-256color | grep -E 'Smulx|Setulc|Su[, ]'
```

After installing, restart the fixture (`tmux -L e2e-test kill-server`) so the
next nvim launch reads the new terminfo.
