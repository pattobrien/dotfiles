#!/usr/bin/env zsh

echo "\n<<< Setting up Oh My Zsh >>>\n"

if [ -d "$HOME/.oh-my-zsh" ]; then
    echo "Oh My Zsh already installed, skipping..."
else
    # --unattended: don't change the default shell or run zsh after install
    # --keep-zshrc: don't overwrite existing .zshrc (we manage it via dotfiles)
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended --keep-zshrc
fi

# Install custom plugins
ZSH_CUSTOM="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}"

# pnpm-shell-completion
if [ -d "$ZSH_CUSTOM/plugins/pnpm-shell-completion" ]; then
    echo "pnpm-shell-completion already installed, skipping..."
else
    echo "Installing pnpm-shell-completion..."
    git clone https://github.com/g-plane/pnpm-shell-completion.git "$ZSH_CUSTOM/plugins/pnpm-shell-completion"
fi
