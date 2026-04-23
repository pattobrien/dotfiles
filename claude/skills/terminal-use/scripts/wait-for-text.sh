#!/usr/bin/env bash
# Wait for specific text to appear in a tmux pane using event-driven hooks.
# Usage: wait-for-text.sh <tmux-target> <pattern> [timeout_secs]
#
# Uses tmux's pane-output-changed hook + wait-for channel to block without
# polling. Falls back to a single capture-pane check first (text may already
# be present).

set -euo pipefail

target="$1"
pattern="$2"
timeout="${3:-10}"
channel="wait-for-text-$$"

# Text might already be on screen
if tmux capture-pane -t "$target" -p | grep -qE "$pattern"; then
  exit 0
fi

# Hook: on every output change, check for pattern → signal channel
tmux set-hook -t "$target" pane-output-changed \
  "if-shell 'tmux capture-pane -t \"$target\" -p | grep -qE \"$pattern\"' 'wait-for -S \"$channel\"'"

cleanup() {
  tmux set-hook -u -t "$target" pane-output-changed 2>/dev/null || true
}
trap cleanup EXIT

# Block until signaled or timeout
if ! timeout "$timeout" tmux wait-for "$channel"; then
  echo "timeout after ${timeout}s waiting for: $pattern" >&2
  exit 1
fi
