---
name: watch
description: Measure UI timing from a screen recording, frame-accurate. Use for launch-to-paint, input latency, time-until-settled, or finding the exact frame something changed in.
---

ffmpeg produces every number. You only look at labelled boundary frames to
name what changed. Work in the scratchpad. The references use a terminal app as
the example. The method fits any app.

## 1. Stage

Open the app under test in a new window without taking focus, so the user
keeps working undisturbed. The window must stay visible and unobscured for the
whole take. Read its bounds from `CGWindowListCopyWindowInfo` through JXA
(`osascript -l JavaScript`).

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
- Use `-fps_mode passthrough` and hardware h264.
- Device indices shift when displays or phones connect, so list them first.

## 4. Measure

- Each frame's time is its PTS. Pass `-copyts` and `-fps_mode passthrough` on
  every decode too. Without passthrough, ffmpeg adds or drops frames and the
  frame indices silently misalign.
- Diff each frame against the previous one over the stage, downscaled. Ignore
  cursor-sized differences. Changed frames less than about 50ms apart form one
  change. A wider window merges separate changes. "Settled" means no change follows
  for a full second.
- Cross-check against any timing the app logs itself.
- Repeat the take and report the median.

## 5. Boundary frames

Build a contact sheet per change, from the frame before the change through its
end. Crop to native pixels. Run `drawtext` before `select`, so labels keep the
original frame numbers. See
[`references/boundary-frames.png`](references/boundary-frames.png).

Look at every sheet before describing a change. Name only what the frames
show.

## Report

Follow [`references/report-example.md`](references/report-example.md). Leave
the stage window open.
