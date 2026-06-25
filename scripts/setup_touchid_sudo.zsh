#!/usr/bin/env zsh
#
# Enable Touch ID for sudo, surviving OS updates via /etc/pam.d/sudo_local.
# pam_reattach (Homebrew) lets the Touch ID prompt reach the GUI session from
# inside tmux/screen, and must be listed before pam_tid.

set -euo pipefail

info() { printf '\033[0;34m[*]\033[0m %s\n' "$1"; }

SUDO_LOCAL="/etc/pam.d/sudo_local"
REATTACH="$(brew --prefix)/lib/pam/pam_reattach.so"

config="auth       sufficient     pam_tid.so"
if [ -f "$REATTACH" ]; then
  config="auth       optional       $REATTACH ignore_ssh
$config"
fi

if [ -f "$SUDO_LOCAL" ] && [ "$(cat "$SUDO_LOCAL")" = "$config" ]; then
  info "Touch ID for sudo already configured ($SUDO_LOCAL)."
  exit 0
fi

info "Writing $SUDO_LOCAL (prompts for your password once)..."
printf '%s\n' "$config" | sudo tee "$SUDO_LOCAL" >/dev/null
info "Touch ID for sudo enabled. Open a new sudo prompt to use it."
