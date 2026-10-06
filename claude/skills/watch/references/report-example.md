# nvim opening `tests/e2e/src/nvim.ts`

Zero is the launch. 60fps, ±17ms. Medians of 5 runs.

| Since launch | Δ      | Frame | What changed                                |
| ------------ | ------ | ----- | ------------------------------------------- |
| +41ms        | +41ms  | 809   | nvim clears the screen                      |
| +170ms       | +129ms | 817   | File text appears, already highlighted      |
| +254ms       | +84ms  | 822   | Buffer tab appears                          |
| +328ms       | +74ms  | 827   | Status line appears                         |
| +637ms       | +309ms | 845   | copilot appears in the status line; settled |

- Run 3: [run3-changes.png](/abs/scratchpad/run3-changes.png)
- Run 1 (cold): [boundary-frames.png](boundary-frames.png)
- Scripts, mp4 recording, and timestamp logs: [scratchpad/](/abs/scratchpad/)
