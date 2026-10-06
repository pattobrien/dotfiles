# nvim opening `tests/e2e/src/nvim.ts`

- Trigger: `clap.ts` launches `nvim tests/e2e/src/nvim.ts` in a 100×24-cell
  kitty window.
- Zero: launch on the host clock, so values include the display pipeline.
- Recording: 60fps. Each value is ±1 frame (17ms).
- Runs: 5. Times are medians. Frames are from run 3.

| Since launch | Δ      | Frame | What changed                                      |
| ------------ | ------ | ----- | ------------------------------------------------- |
| +41ms        | +41ms  | 809   | nvim clears the screen                            |
| +170ms       | +129ms | 817   | File text appears, already highlighted            |
| +254ms       | +84ms  | 822   | Buffer tab appears                                |
| +328ms       | +74ms  | 827   | Status line appears                               |
| +637ms       | +309ms | 845   | copilot appears in the status line; settled      |

Run 1 was cold. Its text appeared plain at +174ms (frame 84), and highlighting
arrived with the buffer tab at +274ms (frame 90). See
[boundary-frames.png](boundary-frames.png).

nvim's own `--startuptime` log puts the first screen update at 142.8ms
(median). The video shows it 11–36ms later per run. That gap is the display
pipeline plus frame rounding.

Proof:

- Boundary frames per change, run 3: [run3-changes.png](/abs/scratchpad/run3-changes.png)
- Recording: [nvim-take.mp4](/abs/scratchpad/nvim-take.mp4)
- Trigger logs: [run-1.json](/abs/scratchpad/run-1.json) through
  [run-5.json](/abs/scratchpad/run-5.json)
- App logs: [startuptime-1.log](/abs/scratchpad/startuptime-1.log) through
  [startuptime-5.log](/abs/scratchpad/startuptime-5.log)

The stage is the `watch-stage` kitty window at the top right of the display.
It is still open.
