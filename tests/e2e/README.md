# e2e

Terminal tests for the dotfiles' nvim, tmux, herdr, and kitty configs. Each test
declares what it needs: most run against a headless terminal emulator
([Termless]'s ghostty backend) driving real nvim / tmux / herdr processes under
a node-pty PTY — fast (~20s for 33 tests), no windows, no focus stealing. Tests
that need a real kitty OS window (graphics/pixel assertions an emulator can't
verify) carry the `e2e-kitty` tag, which the config excludes by default
(`tagsFilter: ["!e2e-kitty"]`) — a bare `vp test` can never open windows.

[Termless]: https://www.npmjs.com/package/@termless/core

## Run

```bash
vp test                        # everything except e2e-kitty (default)
vp run test:ui                 # same, in the Vitest UI (watch mode)
vp run test:kitty              # e2e-kitty tag (opens real kitty windows)
vp test <file>                 # single file — prefer paths over name filters
```

Run from this directory (`tests/e2e/`), not the repo root.

## Fixtures

Everything is created fresh and torn down — there is no persistent fixture to
manage anymore (the old `-L e2e-test` tmux server model is retired).

- `nvim` (worker) — fresh nvim + LazyVim under an emulator PTY, RPC control
  plane over a socket, `resetBuffer` + start-state guard around every test
- `tmux` (worker) — fresh tmux server on a unique scoped socket, loading the
  real `~/.tmux.conf`; for tmux-as-subject tests (bindings, copy-mode, undercurl
  passthrough)
- `herdr` (test) — isolated named herdr server/session loading the real
  `~/.config/herdr/config.toml`, controlled through `herdr-ts-sdk`, asserted
  through the emulator screen
- `claudeCode` (test) — `render(assistantText, { waitFor })` resumes a
  hand-written transcript in the real `claude` TUI under a throwaway
  `CLAUDE_CONFIG_DIR` (onboarding + trust pre-seeded, no login, hooks, plugins,
  MCP servers, or API calls); `links()` lists the OSC 8 hyperlinks in the raw
  PTY stream, since Termless 0.8.4 does not populate `Cell.hyperlink`
- `kitty` (worker, `e2e-kitty`-tagged tests only) — real kitty window attached
  to the tmux fixture

## Recordings

Every emulator session is captured as an asciicast
(`test-results/recordings/*.cast`) with a marker per test, and each test's
output links a deep-linked viewer page (`test-results/viewer/index.html`) —
play/seek/speed controls, marker chapters, works over `file://`:

```bash
terminal-browser open test-results/viewer/index.html
```

Failures additionally dump screen text + SVG screenshot to
`/tmp/e2e-fail-<test>.{txt,svg}`, and herdr tests attach a final-screen SVG
visible in the Vitest UI / HTML report.

## Terminal backends

The suite runs against a small `TermBackend` seam (`src/term/`); pick the
emulator with `E2E_TERM_BACKEND`:

- `ghostty` (default) — Termless's WASM build of ghostty's VT engine.
  In-process, fast, full API (keys, clicks, regions, SVG screenshots,
  recordings).
- `kitty` — kitty's own VT parser via `kitty +runpy` subprocess replay
  (`@termless/kitty`). Passes the herdr behavior tests unchanged; ~35ms per
  mutation (full replay per query), so keep sessions short. Exposes
  `kittyGraphics` only as a capability flag — no placed-image state — which is
  why graphics assertions stay on real kitty in the `e2e-kitty` tests.
- xterm.js (`src/term/xterm.ts`, exercised by the conformance file) — kept as an
  evaluation fallback. Ergonomics are notably worse than Termless: CJS-only
  headless build, no click support, no built-in waitFor/recording, and screen
  reads require manual buffer walking.

Backend eval notes (2026-08): Termless 0.8.4 is pinned exact — its
`backend("<name>")` registry mis-resolves `backends.json` in the published dist,
so `src/term/termless.ts` imports backend factories directly. node-pty's
`spawn-helper` loses its exec bit under pnpm; the package `postinstall` restores
it.

## Host requirements

- a `~/.npmrc` with `GH_PKG_TOKEN` — `@pattobrien/herdr-ts-sdk` installs from
  GitHub Packages
- kitty installed (`brew install --cask kitty`) — for the `e2e-kitty` tests and
  the optional kitty emulator backend
- herdr on `PATH` for the herdr behavior tests
- the diagnostic-rendering tests need terminfo entries with undercurl
  capabilities (`Smulx`, `Setulc`, `Su`) for `tmux-256color` (tmux path) and
  `xterm-256color` (herdr panes); macOS's system entries lack them:

```bash
tic -x -o ~/.terminfo ../../.config/tmux/tmux-256color.terminfo
tic -x -o ~/.terminfo ../../.config/herdr/xterm-256color.terminfo
```

Verify with `infocmp -x <name> | grep -E 'Smulx|Setulc|Su[, ]'`.
