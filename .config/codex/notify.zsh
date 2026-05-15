#!/bin/zsh
set -euo pipefail

payload="${@: -1}"
sound_file="/System/Library/Sounds/Ping.aiff"
terminal_notifier="/opt/homebrew/bin/terminal-notifier"
codex_icon="/Applications/Codex.app/Contents/Resources/electron.icns"

summary=$(
  /usr/bin/python3 - "$payload" <<'PY' 2>/dev/null || true
import json
import sys

try:
    event = json.loads(sys.argv[1])
except Exception:
    event = {}

message = event.get("last-assistant-message") or "Codex needs your attention."
message = " ".join(str(message).split())
print(message[:220])
PY
)

if [[ -z "${summary}" ]]; then
  summary="Codex needs your attention."
fi

if [[ -x "$terminal_notifier" ]]; then
  args=(
    -title "Codex"
    -message "$summary"
    -sound "Ping"
    -group "codex-agent"
  )

  if [[ -f "$codex_icon" ]]; then
    args+=(-appIcon "$codex_icon")
  fi

  "$terminal_notifier" "${args[@]}" >/dev/null 2>&1 || true
else
  (/usr/bin/afplay "$sound_file" >/dev/null 2>&1 &) || true

  /usr/bin/osascript \
    -e 'on run argv' \
    -e 'display notification (item 2 of argv) with title (item 1 of argv)' \
    -e 'end run' \
    "Codex" \
    "$summary" >/dev/null 2>&1 || true
fi
