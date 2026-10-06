# nvim opening `tests/e2e/src/nvim.ts`

- Trigger: `nvim tests/e2e/src/nvim.ts` launched in a fresh kitty window.
- Zero: launch, from the clapper, so the 28–44ms display pipeline is excluded.
- Recording: 60fps. Each value is ±1 frame (17ms).
- Runs: 1.

| Since launch | Δ      | Frame | What changed                                     |
| ------------ | ------ | ----- | ------------------------------------------------ |
| +32ms        | +32ms  | 312   | nvim takes over the screen                       |
| +216ms       | +184ms | 323   | File text appears, no colors                     |
| +316ms       | +100ms | 329   | Syntax highlighting and buffer tab appear        |
| +432ms       | +116ms | 336   | Status line appears, showing oxfmt and tsgo      |
| +782ms       | +350ms | 357   | copilot and oxlint attach; settled after 1s idle |

nvim's own `--startuptime` log puts the first screen update at 209.8ms. The
video shows it at 216ms, within one frame.

Proof:

- Boundary frames 322–329: [boundary-frames.png](boundary-frames.png)
- Recording: [nvim-open.mp4](/abs/scratchpad/nvim-open.mp4)
- Trigger log: [clap.json](/abs/scratchpad/clap.json)
- App log: [nvim-startuptime.log](/abs/scratchpad/nvim-startuptime.log)

The stage is the `perf-demo` kitty window on the right half of the display. It
is still open.
