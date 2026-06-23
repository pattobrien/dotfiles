#!/usr/bin/env zsh
#
# Install the full Xcode.app with `xcodes`, reading the Apple ID from 1Password.
#
# `xcodes` downloads Xcode from Apple's Developer portal, which requires signing
# in with an Apple ID. Rather than typing credentials, we read them from the
# 1Password "Apple" item and export them as XCODES_USERNAME / XCODES_PASSWORD so
# xcodes can authenticate. A two-factor code is still prompted for interactively
# on the first login from a new machine, and sudo is needed to place the app and
# run its first launch.
#
# This installs the full Xcode.app. For just the Command Line Tools (and license
# acceptance), see setup_xcode.zsh.
#
# Usage: setup_xcodes.zsh [version]   # defaults to the latest stable release

set -euo pipefail

# 1Password "Apple" item, referenced by its stable item ID (Private vault).
OP_APPLE_ITEM="op://Private/m7ew5few3bg73nvkmmt2al4j7e"

info() { printf '\033[0;34m[*]\033[0m %s\n' "$1"; }
warn() { printf '\033[0;31m[!]\033[0m %s\n' "$1" >&2; }

# 1. Ensure xcodes (and aria2, which xcodes uses for faster parallel downloads).
if ! command -v xcodes >/dev/null 2>&1; then
  info "Installing xcodes + aria2 via Homebrew..."
  brew install xcodes aria2
fi

# 2. Ensure the 1Password CLI has an active session.
if ! command -v op >/dev/null 2>&1; then
  warn "1Password CLI (op) not found. Run the 'essentials' + '1password' steps first."
  exit 1
fi
if ! op account get >/dev/null 2>&1; then
  info "Starting a 1Password session..."
  eval "$(op signin)"
fi

# 3. Pull the Apple ID into the environment for xcodes. Scrub the password from
#    the environment on exit, even if the install fails.
info "Reading Apple ID from 1Password..."
export XCODES_USERNAME="$(op read "$OP_APPLE_ITEM/username")"
export XCODES_PASSWORD="$(op read "$OP_APPLE_ITEM/password")"
trap 'unset XCODES_PASSWORD' EXIT

# 4. Install Xcode and select it. Prompts once for the Apple 2FA code and sudo.
#    Several GB are downloaded, so this can take a while.
VERSION="${1:-}"
if [ -n "$VERSION" ]; then
  info "Installing Xcode $VERSION (downloads several GB; this can take a while)..."
  xcodes install "$VERSION" --select
else
  info "Installing the latest Xcode (downloads several GB; this can take a while)..."
  xcodes install --latest --select
fi

info "Done. Active developer dir: $(xcode-select -p)"
