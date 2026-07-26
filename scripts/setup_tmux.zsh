#!/usr/bin/env zsh

echo "\n<<< Setting up tmux (TPM + plugins) >>>\n"

# Install TPM (Tmux Plugin Manager) if not already present
if [ -d "$HOME/.tmux/plugins/tpm" ]; then
    echo "TPM already installed, skipping clone..."
else
    git clone https://github.com/tmux-plugins/tpm "$HOME/.tmux/plugins/tpm"
fi

# Compile the patched tmux-256color terminfo into ~/.terminfo. macOS's stock
# entry lacks Smulx/Setulc, so nvim (inside tmux) won't emit undercurl for
# diagnostic squiggles. ~/.terminfo takes precedence over /usr/share/terminfo.
# Restart nvim after this runs. Verified by tests/e2e nvim-diagnostics test.
if infocmp -x tmux-256color 2>/dev/null | grep -q Smulx; then
    echo "tmux-256color terminfo already has Smulx, skipping tic..."
else
    tic -x -o "$HOME/.terminfo" "${0:a:h}/../.config/tmux/tmux-256color.terminfo"
    echo "Compiled tmux-256color terminfo with undercurl support into ~/.terminfo"
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
