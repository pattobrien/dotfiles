# e2e agent notes

- see: @README.md
- The nvim fixture shares my real nvim state (shada, snacks frecency db): keep
  test files in temp dirs and never `:edit` real repo files. `LazyVim.root()`
  needs a buffer inside the temp dir, not only `:cd`.
- `getbufinfo().lastused` has 1s resolution and keeps updating while a buffer is
  current: tests that depend on recent order must stay a tick in each file
  (`editAndTick` in `tests/integration/nvim-picker.test.ts`).
- Pixel tests: launch the fixture as
  `kitty @ launch --type=os-panel --keep-focus --os-panel edge=none --os-panel layer=top`
  and capture with `screencapture -l <platform_window_id>`. Occluded kitty
  windows return stale frames. Never focus or raise a test window.
- Graphics tests use a real multi-colour image with a transparent background,
  never a solid-colour square; assert blend-through at transparent coordinates.
