#!/usr/bin/env zsh
#
# Strip com.apple.quarantine from installed apps so their first launch doesn't
# trigger Gatekeeper's "<App> is an app downloaded from the internet. Are you
# sure you want to open it?" prompt.
#
# Homebrew removed HOMEBREW_CASK_OPTS=--no-quarantine in v5, so this post-install
# sweep is the supported replacement. Only apps that actually carry the
# quarantine flag are touched (Apple/system apps don't, so they're skipped) —
# in a fresh setup those are exactly the casks just installed. Needs sudo
# because cask app bundles in /Applications are usually root-owned.

set -uo pipefail

found=0
for app in /Applications/*.app; do
  [ -d "$app" ] || continue
  xattr -p com.apple.quarantine "$app" >/dev/null 2>&1 || continue
  echo "De-quarantining: ${app:t}"
  sudo xattr -dr com.apple.quarantine "$app" 2>/dev/null || true
  found=1
done

[ "$found" -eq 1 ] || echo "No quarantined apps in /Applications."
