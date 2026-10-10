#!/usr/bin/env zsh

echo "\n<<< Starting macOS Setup >>>\n"

# Apply macOS defaults from YAML config
echo "Applying macOS defaults from ~/.config/macos-defaults/..."
macos-defaults apply ~/.config/macos-defaults/

# Run shell-based defaults (not handled by macos-defaults)
for script in ~/.config/macos-defaults/*.sh; do
    [ -f "$script" ] && bash "$script"
done

echo "\n<<< macOS Setup Complete. >>>\n"
echo "Note: mouse/trackpad scaling (and some other settings) require a logout or restart to take effect."
