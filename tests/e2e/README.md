# e2e

Terminal tests for the dotfiles' nvim, tmux, herdr, and kitty configs, split
into two Vitest projects:

- **integration** (default) — headless terminal emulator ([Termless]'s ghostty
  backend) drives real nvim / tmux / herdr processes under a node-pty PTY.
  Fast (~20s for 33 tests), no windows, no focus stealing.
- **e2e** — real kitty OS windows, for what an emulator can't verify:
  kitty-graphics rendering and pixel-level output.

[Termless]: https://www.npmjs.com/package/@termless/core

## Run

```bash
vp test                  # integration project (default)
pnpm test:ui             # same, in the Vitest UI (watch mode)
pnpm test:kitty          # e2e project (opens real kitty windows)
vp test <file>           # single file — prefer paths over name filters
```

Run from this directory (`tests/e2e/`), not the repo root.

## Fixtures

Everything is created fresh and torn down — there is no persistent fixture to
manage anymore (the old `-L e2e-test` tmux server model is retired).

- `nvim` (worker) — fresh nvim + LazyVim under an emulator PTY, RPC control
  plane over a socket, `resetBuffer` + start-state guard around every test
- `tmux` (worker) — fresh tmux server on a unique scoped socket, loading the
  real `~/.tmux.conf`; for tmux-as-subject tests (bindings, copy-mode,
  undercurl passthrough)
- `herdr` (test) — isolated named herdr server/session loading the real
  `~/.config/herdr/config.toml`, controlled through `herdr-ts-sdk`, asserted
  through the emulator screen
- `kitty` (worker, e2e project only) — real kitty window attached to the tmux
  fixture

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
  why graphics assertions stay on real kitty in the e2e project.
- xterm.js (`src/term/xterm.ts`, exercised by the conformance file) — kept as
  an evaluation fallback. Ergonomics are notably worse than Termless: CJS-only
  headless build, no click support, no built-in waitFor/recording, and screen
  reads require manual buffer walking.

Backend eval notes (2026-08): Termless 0.8.4 is pinned exact — its
`backend("<name>")` registry mis-resolves `backends.json` in the published
dist, so `src/term/termless.ts` imports backend factories directly. node-pty's
`spawn-helper` loses its exec bit under pnpm; the package `postinstall`
restores it.

## Host requirements

- kitty installed (`brew install --cask kitty`) — for the e2e project and the
  optional kitty emulator backend
- herdr on `PATH` for the herdr behavior tests
- the diagnostic-rendering test needs a `tmux-256color` terminfo entry with
  undercurl capabilities (`Smulx`, `Setulc`, `Su`); macOS's system entry lacks
  them:

```bash
tic -x -o ~/.terminfo \
  ../../.config/tmux/tmux-256color-undercurl.terminfo
```

Verify with `infocmp -x tmux-256color | grep -E 'Smulx|Setulc|Su[, ]'`.
