---
name: watch
description: Measure UI timing from a screen recording, frame-accurate. Use for launch-to-paint, input latency, time-until-settled, or finding the exact frame something changed in.
---

Frame timestamps are exact to the frame, while an agent eyeballing a video
misjudges time and misses small changes between near-identical frames.

ffmpeg should produce every measurement. Look at labelled boundary frames only
to name what changed. The references use a terminal app as the example, but this
method fits any kind of app or use case that needs to be perf-proven. The code
blocks come from the nvim test in the references; treat them as examples, not a recipe.

## 1. Stage

The stage is the `watch-stage` virtual screen. Apps render on it as on a real
display, and the user never sees it. [`scripts/stage.ts`](scripts/stage.ts)
brings it up, opens a kitty OS window on it without taking focus, sizes it in
cells, and prints the ffmpeg device, crop and record command. Run it with
`bun` from the directory the app should start in. Geometry and gotchas:
[`references/virtual-screen.md`](references/virtual-screen.md).

```sh
bun ~/.claude/skills/watch/scripts/stage.ts --cols 100 --rows 24
```

Size the window appropriately. Keep it small enough that the video and frames
stay cheap to analyze, and large enough that every detail stays legible. Record
the whole app window, never a slice of it. For nvim, about 20 lines of code plus
the status line is right for most tests e.g. capturing when syntax-highlighting
is shown.

Optional: run `tshock stopwatch` in a small terminal window in a top corner,
inside the recorded region. It is a human-readable cross-check, not a data
source.

## 2. Zero

Time zero is the trigger: a launch, keypress, or click. Log it on the host
clock (`mach_absolute_time`), which avfoundation stamps frames with.
[`scripts/clap.ts`](scripts/clap.ts) does this for a launch. Run it with `bun`.
This zero includes the display pipeline, so it measures what the user sees.

```sh
kitty @ --to unix:/tmp/kitty-90145 send-text --match title:watch-stage \
  'bun ~/.claude/skills/watch/scripts/clap.ts --log run-1.json -- nvim --startuptime startuptime-1.log tests/e2e/src/nvim.ts\r'
```

Optional, for pure app time: pass `--clapper`. The script draws a solid block
in its terminal, holds it about 50ms, then clears it and launches. Zero is the
block's first frame plus the logged hold. The block and the app share the
pipeline, so its latency cancels.

The app under test stays unmodified.

## 3. Record

Record with ffmpeg's avfoundation screen input. The display's refresh rate caps
the frame rate.

- Pass `-copyts`, so frame times stay on the host clock.
- Crop to the stage. ffmpeg cannot capture a single window.
- Hide the cursor.
- For a keypress trigger, run KeyCastr with its overlay inside the stage. Zero
  is the first frame showing the key.
- Use `-fps_mode passthrough` and hardware h264.
- Name the device; indices shift when displays or phones connect.

```sh
ffmpeg -f avfoundation -capture_cursor 0 -framerate 60 -t 8 -i "Capture screen 1:none" \
  -copyts -vf crop=800:440:100:68 -fps_mode passthrough \
  -c:v h264_videotoolbox -b:v 20M nvim-take.mp4
```

## 4. Measure

- Each frame's time is its PTS. Pass `-copyts` and `-fps_mode passthrough` on
  every decode too. Without passthrough, ffmpeg adds or drops frames and the
  frame indices silently misalign.
- Diff each frame against the previous one over the stage, downscaled. Ignore
  cursor-sized differences. Changed frames less than about 50ms apart form one
  change. A wider window merges separate changes. "Settled" means no change
  follows for a full second.
- Cross-check against any timing the app logs itself.
- Repeat the take and report the median.

```sh
ffmpeg -copyts -i nvim-take.mp4 -fps_mode passthrough \
  -vf signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=- -f null -
ffmpeg -copyts -i nvim-take.mp4 -fps_mode passthrough \
  -vf scale=200:110,format=gray -f rawvideo -
```

The first prints each frame's `pts_time`. The second streams the 4× downscaled
grayscale frames to diff. In the nvim test, a pixel changed when it moved by
more than 16 levels, and a frame changed when at least 30 pixels did.

## 5. Boundary frames

Build a contact sheet per change, from the frame before the change through its
end. Show the whole window at native pixels. Run `drawtext` before `select`, so
labels keep the original frame numbers. See
[`references/boundary-frames.png`](references/boundary-frames.png).

```sh
ffmpeg -copyts -i nvim-take.mp4 -fps_mode passthrough -vf "drawtext=fontfile=/System/Library/Fonts/Menlo.ttc:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.8:x=w-tw-8:y=6:text='frame %{n}   +%{eif\:(t-185012.017447)*1000+0.5\:d}ms',select='between(n\,83\,85)+between(n\,89\,90)',tile=1x5:padding=4" \
  -frames:v 1 boundary-frames.png
```

`185012.017447` is the `triggerAt` from `run-1.json`.

Read every sheet yourself, and describe only what the frames visibly show,
before telling the user. The pipeline delays everything, so a change just after
zero can come from before it, such as the shell redrawing its prompt.

## 6. Tear down

Tear the stage down as soon as the last take is recorded:

```sh
bun ~/.claude/skills/watch/scripts/stage.ts --down
```

A stage left up breaks the user's desktop. The hidden kitty window can take
focus on Cmd+Tab, so the user's real kitty window never comes forward. The
virtual screen also stays connected and the mouse can wander onto it.

Keep the stage up only when more takes are coming soon in this session. If you
do, tell the user the stage is still up and how to take it down.

## Report

Follow [`references/report-example.md`](references/report-example.md).
