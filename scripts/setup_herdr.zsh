#!/usr/bin/env zsh

echo "\n<<< Setting up herdr (pane terminfo) >>>\n"

# herdr panes run with TERM=xterm-256color. macOS's stock entry lacks
# Smulx/Setulc, so nvim inside herdr won't emit undercurl for diagnostic
# squiggles. ~/.terminfo takes precedence over /usr/share/terminfo.
# Restart nvim after this runs. Verified by tests/e2e nvim-diagnostics test.
if infocmp -x xterm-256color 2>/dev/null | grep -q Smulx; then
    echo "xterm-256color terminfo already has Smulx, skipping tic..."
else
    tic -x -o "$HOME/.terminfo" "${0:a:h}/../.config/herdr/xterm-256color.terminfo"
    echo "Compiled xterm-256color terminfo with undercurl support into ~/.terminfo"
fi
