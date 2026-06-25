#!/usr/bin/env zsh

echo "\n<<< Starting macOS Setup >>>\n"

# Check if macos-defaults is installed
if ! command -v macos-defaults &> /dev/null; then
    echo "macos-defaults not found. Install with: brew install dsully/tap/macos-defaults"
    exit 1
fi

# Apply macOS defaults from YAML config
echo "Applying macOS defaults from ~/.config/macos-defaults/..."
macos-defaults apply ~/.config/macos-defaults/

# Run shell-based defaults (not handled by macos-defaults)
for script in ~/.config/macos-defaults/*.sh; do
    [ -f "$script" ] && bash "$script"
done

echo "\n<<< macOS Setup Complete. >>>\n"
echo "Note: mouse/trackpad scaling (and some other settings) require a logout or restart to take effect."
