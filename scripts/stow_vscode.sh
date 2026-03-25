#!/bin/sh

# Script to stow VSCode configuration files.
# Assumes dotfiles are in ~/.dotfiles and the package is named 'vscode'.

# Exit on error
set -e

DOTFILES_DIR="$HOME/.dotfiles"
PACKAGE="vscode"
TARGET_DIR="$HOME"

echo "Stowing VSCode configuration from '$DOTFILES_DIR/$PACKAGE' to '$TARGET_DIR'..."
# -d: specifies the stow directory (where your packages live)
# -t: specifies the target directory (where symlinks will be created, usually $HOME)
# -R: restow (deletes existing symlinks if they point to the stow dir, then relinks)
# -v: verbose output (optional, remove -v for less output)
stow -d "$DOTFILES_DIR" -t "$TARGET_DIR" -R -v "$PACKAGE"

echo "VSCode configuration stowed successfully."

exit 0 