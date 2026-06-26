#!/usr/bin/env zsh

echo "\n<<< Setting up Homebrew >>>\n"

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# HOMEBREW_CASK_OPTS=--no-quarantine was removed in Homebrew 5, so casks are
# quarantined on install. scripts/dequarantine.zsh strips the quarantine flag
# after each profile's brew bundle so apps don't prompt on first launch.

