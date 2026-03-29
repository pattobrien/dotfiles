---
name: computer-use
description:
  Control the user's macOS desktop — send keystrokes to terminal apps via tmux
  (preferred) or AppleScript, take screenshots across multiple monitors, and
  verify results visually. Use when asked to interact with a visible app window.
disable-model-invocation: true
---

# Computer Use (macOS)

## Preferred: tmux send-keys (background, no focus steal)

- Create a dedicated session: `tmux new-session -d -s test`
- Optionally open it in a new kitty window:
  `kitty --title "test" -e tmux attach-session -t test &; disown`
- Send commands/keystrokes without foregrounding:
  `tmux send-keys -t test "command" Enter`
- Works for nvim too — use literal key names: `tmux send-keys -t test Escape`,
  `tmux send-keys -t test Space c d`

## Fallback: AppleScript (requires foreground)

- `osascript` + `System Events` sends keystrokes but **steals focus** — avoid
  when possible.
- App process names may be lowercase (e.g. `ghostty` not `Ghostty`). Verify
  with:
  `tell application "System Events" to get name of every application process whose visible is true`.
- Use `keystroke` for characters, `key code` for special keys (36=Return,
  53=Escape). Add `delay 0.2` between keystrokes that traverse layers (terminal
  → tmux → nvim).

## Screenshots

### Headless: tmux + freeze (preferred)

Capture any tmux pane as an image without a GUI window. Works in CI, SSH,
headless — anywhere tmux runs.

```bash
tmux capture-pane -pet <target> | freeze -o /tmp/screenshot.png
```

Requires `brew install charmbracelet/tap/freeze`. Renders ANSI colors, syntax
highlighting, and TUI elements (nvim, htop, etc.) to PNG/SVG/WebP. Runs in
~0.5s. Do NOT use `-c full` (adds ~7s).

### GUI: screencapture

- **All screens** (user has multiple monitors):
  `screencapture -x /tmp/s1.png /tmp/s2.png` — each arg captures one screen.
- **Single window** by app name and title, using `scripts/get-window-id.sh`:
  ```bash
  screencapture -l$(scripts/get-window-id.sh kitty test) -x /tmp/window.png
  ```
  The script uses JXA + CoreGraphics to look up the CGWindowID — no external
  dependencies. Pass app name as arg 1, optional window title as arg 2.

## Waiting for output

Use `scripts/wait-for-text.sh` instead of `sleep` to wait for specific text in a
tmux pane. Event-driven via tmux's `pane-output-changed` hook — no polling.

```bash
scripts/wait-for-text.sh <tmux-target> <pattern> [timeout_secs]
```

- `pattern` is an extended regex (ERE), matched against the full pane content
- Default timeout is 10 seconds
- Exits immediately if the text is already on screen

Examples:

```bash
# Wait for a build to finish
tmux send-keys -t dev "npm run build" Enter
scripts/wait-for-text.sh dev "Build completed"

# Wait for nvim to load (shows mode line)
scripts/wait-for-text.sh editor "NORMAL|INSERT"

# Wait for a prompt to reappear after a command
scripts/wait-for-text.sh test '^\$' 5
```

### Alternatives

- **`expect`** — classic tool for waiting on terminal output. Useful when you
  own the pty directly (not via tmux send-keys). Install: `brew install expect`.
- **Polling with `capture-pane`** — simpler but less efficient fallback:
  ```bash
  while ! tmux capture-pane -t session -p | grep -q "text"; do sleep 0.1; done
  ```

### General

- After sending keys, always screenshot to verify — don't assume it worked.
- Prefer `wait-for-text.sh` over `sleep` — it's faster and deterministic.
