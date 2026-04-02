#!/usr/bin/env bash
# Screenshot and screen recording settings
#
# com.apple.screencapture    — controls where screenshots save (also used by the
#                              `screencapture` CLI tool).
# com.apple.screencaptureui  — the GUI toolbar (Cmd+Shift+5). Stores its own save
#                              path via NSNavLastRootDirectory. Without this, screen
#                              recordings default to Desktop regardless of the above.

defaults write com.apple.screencapture location ~/Documents/Screenshots
defaults write com.apple.screencapture style window
defaults write com.apple.screencapture target file
defaults write com.apple.screencaptureui NSNavLastRootDirectory ~/Documents/Screenshots

killall SystemUIServer
killall screencaptureui 2>/dev/null
