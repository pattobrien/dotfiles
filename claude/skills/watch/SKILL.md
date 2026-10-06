---
name: watch
description: Measure terminal UI timing from a 60fps screen recording, frame-accurate. Use for launch-to-paint, time-until-settled, or seeing exactly which frame something changed in.
---

ffmpeg produces every number. You only look at a few labelled boundary
frames to name what changed. Work in the scratchpad.

## 1. Stage

The stage is a separate kitty OS window running its own herdr session, so the
user keeps working undisturbed.

- Launch it through kitty remote control with `--keep-focus`, running
  `herdr --session <name>`. `KITTY_LISTEN_ON` inside herdr panes can point at a
  dead socket. Use the live `/tmp/kitty-<pid>` of the running kitty.
- Drive the session by setting `HERDR_SOCKET_PATH` to its socket, from
  `herdr session list --json`. Always pass `--no-focus`.
- Optional: put `tshock stopwatch` in a top pane, sized to fit. It is a
  human-readable cross-check, not a data source. herdr will not shrink a split
  below a 0.1 ratio.
- The recording captures whatever is on screen in the window's region. The
  stage must stay visible and unobscured for the whole take. Get its bounds
  from `CGWindowListCopyWindowInfo`. Compile Swift helpers with
  `/usr/bin/swiftc`, because mise's `swift` cannot JIT AppKit.

## 2. Clapper

The clapper is the shared zero point between the video and the logs. A small
wrapper clears the pane, draws a solid block, and holds it about 50ms so it
lands in a frame. Only then does it launch the command under test, logging
both times. The app under test stays unmodified. All its timings come from
the video.

## 3. Record

Record with ffmpeg's avfoundation screen input at 60fps:
- Crop to the stage window. ffmpeg cannot capture a single window.
- Hide the cursor.
- Use `-fps_mode passthrough` and hardware h264.
- Device indices shift when displays or phones connect, so list them first.

Use the 60Hz external display by default. 60fps resolves to about 17ms, which
is enough for nearly all work. Use the MacBook's built-in ProMotion screen
only when finer timing is truly needed. It needs the lid open, and ffmpeg
tops out around 89fps there, never 120.

## 4. Measure

- Each frame's time is its PTS. Pass `-fps_mode passthrough` on every
  decode too. Without it, ffmpeg adds or drops frames and the frame indices
  silently misalign.
- Clapper onset is the first frame where the marker crop's brightness jumps.
- Diff each frame against the previous one over the pane, downscaled. Ignore
  changes smaller than a blinking cursor. Group changes into bursts with a
  gap of about 50ms. Wider gaps merge separate events. "Settled" means the
  frame where no change follows for a full second.
- Time zero is the launch: the clapper frame plus the hold.
- Cross-check against any timing the app logs itself, such as
  `nvim --startuptime`. The two should agree within a frame.
- Repeat the take several times and report the median. A single run mixes
  cold and warm caches.

## 5. Boundary frames

Build a contact sheet for each burst. Include the frame before the change and
every frame through its end.
- Crop to native pixels rather than scaling, and keep the strips short.
- Run `drawtext` before `select`, so the labels keep the original frame
  numbers. Label each frame with its number and the time since launch.

The target format is
[`references/boundary-frames.png`](references/boundary-frames.png). It shows
nvim opening a file: empty at frame 322, plain text from 323, and syntax
highlighting at 329.

Look at every sheet before describing a change. Name only what the frames
show. The burst grouping does not tell you what changed.

## Report

Give a table with these columns:
- time since launch
- Δ since the previous row
- frame number
- what changed on screen

Say that each value is ±1 frame. Link the sheets. Leave the stage window open
and tell the user where it is.
