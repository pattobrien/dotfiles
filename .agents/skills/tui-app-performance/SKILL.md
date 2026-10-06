---
name: tui-app-performance
description: "Building fast OpenTUI + Bun terminal apps and herdr popups: single-binary compile, lazy imports, unix-socket herdr SDK, first-frame-before-data, popup config, and measuring with /watch."
---

## OpenTUI + Bun

- Build a single binary: `bun build --compile --bytecode --format=esm`. First run after a rebuild is ~200-500 ms slower (macOS validates the new binary), every run after is fast.
- Import lazily: keep OpenTUI and any third-party clients (e.g. herdr SDK) out of the top-level import graph for subcommands that do not need them. This was the biggest win before compiling.
- Render the first frame before fetching data, then fill in. A blank popup is what you notice, not the total time. On stock herdr the socket request still has to go out first (see below).
- When measuring performance, do so with the `/watch` video recording skill, not with wall-clock timers inside the app, which could miss details that the user sees.

## herdr

- Talk to herdr over the unix socket with the Bun SDK connector, not by shelling out to the `herdr` CLI. First API call is ~3 ms.
  - Needs the 100 ms first-request stall fix from [pattobrien/herdr#1](https://github.com/pattobrien/herdr/pull/1); stock herdr still has the bug.
- Herdr popups (like for pickers) need nothing special: `type = "popup"` adds ~10 ms over a direct tty. On stock herdr, end the command with `</dev/null` so a tty stdin does not trigger the 100 ms stall on the first socket call, which shows as a blank popup.
- On stock herdr, await the first socket request before `createCliRenderer`, not after: renderer startup delays the write past herdr's single read, so the request waits 100 ms and the list sits blank ~110 ms after the first frame. Measured on the compiled picker: fetch-then-render fills the list at ~60 ms, render-then-fetch at ~175 ms.

## Source

All numbers above were measured in Claude Code session `0aa31406-c230-4405-b02d-a0e4496d764b` (dotfiles project, 2026-10-06).
