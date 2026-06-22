#!/usr/bin/env zsh

echo "\n<<< Setting up tmux (TPM + plugins) >>>\n"

# Install TPM (Tmux Plugin Manager) if not already present
if [ -d "$HOME/.tmux/plugins/tpm" ]; then
    echo "TPM already installed, skipping clone..."
else
    git clone https://github.com/tmux-plugins/tpm "$HOME/.tmux/plugins/tpm"
fi

# Install the plugins declared in .tmux.conf. TPM's installer needs the tmux
# binary (it starts a server to read the @plugin list) and reads ~/.tmux.conf,
# so this must run after tmux is installed (essentials Brewfile) and after the
# config is symlinked (base install step). The installer is idempotent — it
# skips plugins that are already present.
if command -v tmux >/dev/null 2>&1 && [ -f "$HOME/.tmux.conf" ]; then
    "$HOME/.tmux/plugins/tpm/bin/install_plugins"
else
    echo "Skipping tmux plugin install — needs tmux installed and ~/.tmux.conf symlinked first."
fi
