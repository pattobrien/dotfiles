#!/usr/bin/env zsh
#
# dotbot won't clobber a real file at a link target, so move pre-existing
# dotfiles aside to <file>.bak before linking. Symlinks are left for dotbot.

set -euo pipefail

managed=(
  .zshrc
  .zshenv
  .p10k.zsh
  .tmux.conf
  .hushlogin
  .actrc
)

for name in "${managed[@]}"; do
  target="$HOME/$name"
  [ -e "$target" ] || continue
  [ -L "$target" ] && continue

  backup="$target.bak"
  [ -e "$backup" ] && backup="$target.$(date +%Y%m%d%H%M%S).bak"

  echo "Backing up existing $target -> $backup"
  mv "$target" "$backup"
done
