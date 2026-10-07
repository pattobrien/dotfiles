# The watch-stage virtual screen

macOS apps stop drawing when their window is occluded, minimized, or on another
Space. kitty checks `NSWindowOcclusionStateVisible` before every frame. A
window on a BetterDisplay virtual screen counts as visible, renders at full
rate, and never shows on the user's physical display.

`betterdisplaycli` ships with the `betterdisplay` cask. `scripts/stage.ts`
creates the screen on first use: 1600x1000, no HiDPI, 60 Hz, extended. It
persists across reboots and stays disconnected between takes.

```sh
betterdisplaycli set -name=watch-stage -connected=on
betterdisplaycli set -name=watch-stage -connected=off
betterdisplaycli get -name=watch-stage -resolution -hiDPI -refreshRate -connected
```

`betterdisplaycli discard` without `-name=` deletes every virtual device.

## Geometry

- The screen attaches at the left edge of the desktop, so its global CG
  origin is (-1600, 0). `--os-window-position` takes global top-left points,
  so stage coordinates have negative X.
- It has its own menu bar. Keep windows below y=40.
- `resize-os-window` keeps the bottom edge fixed. Re-read bounds after it.
- ffmpeg's crop is in the screen's own pixels:
  `(window - screen origin) * backingScaleFactor`. Scale is 1 here.
- ffmpeg names the screen `Capture screen N`, where N is its position in
  `CGGetActiveDisplayList`. Pass the name, not the index. Indices shift when
  a phone or display connects.

## Gotchas

- 60 Hz caps takes at ±17ms. 120 Hz virtual screens need BetterDisplay Pro.
- The mouse can wander onto the screen, and a dialog that opens under the
  mouse lands there unseen. `-capture_cursor 0` keeps the pointer out of the video.
- `send-text` types its command over about 140ms, so shell echo changes frames
  before `triggerAt`.
- With `-copyts`, `-t` after `-i` writes an empty file. Put `-t` before `-i`
  or stop ffmpeg with SIGINT.
- Every take logs "Configuration of video device failed, falling back to
  default" and a pixel format switch to uyvy422. Both are harmless.
