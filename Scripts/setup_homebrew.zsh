#!/usr/bin/env zsh

echo "\n<<< Setting up Homebrew >>>\n"

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# disable gatekeeping just for the initial install
export HOMEBREW_CASK_OPTS="--no-quarantine"

brew bundle --file brew/Brewfile
