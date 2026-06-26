#!/usr/bin/env zsh
#
# brew bundle wrapper that installs VS Code extensions separately and TWICE.
#
# Why: `brew bundle` installs entries via a parallel thread pool, so it fires
# many `code --install-extension` processes at once. Those race VS Code's
# extensions.json (atomic temp-file rewrite) and a handful fail on the first
# pass — especially extension *packs*, which do many writes per install. The
# failed ones are usually already on disk, so the next `code` invocation
# reconciles the registry and a second `brew bundle` pass skips them and
# completes clean.
#
# So: install formulae/casks/taps normally (parallel, strict), then install the
# `vscode` entries in two passes — pass 1 tolerates the race failures, pass 2
# must succeed (a real, persistent failure then fails the install / CI).

set -uo pipefail

brewfile="${1:?usage: brew_bundle.zsh <Brewfile>}"

main="$(mktemp)"
vsx="$(mktemp)"
trap 'rm -f "$main" "$vsx"' EXIT

grep -vE '^vscode ' "$brewfile" > "$main"
grep -E  '^vscode ' "$brewfile" > "$vsx" || true

# Formulae / casks / taps: parallel, strict.
brew bundle --file "$main"

# VS Code extensions: parallel, but run twice (see header).
if [ -s "$vsx" ]; then
  count="$(grep -c . "$vsx" | tr -d ' ')"
  echo "Installing $count VS Code extensions (pass 1/2 — tolerating concurrent-install races)..."
  brew bundle --file "$vsx" || true
  echo "Installing VS Code extensions (pass 2/2 — must succeed)..."
  brew bundle --file "$vsx"
fi
