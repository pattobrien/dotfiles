-- Hammerspoon configuration
-- https://www.hammerspoon.org/

-- Enable IPC for CLI communication (`hs` command)
require("hs.ipc")

-- Reload config automatically when this file changes
hs.loadSpoon("ReloadConfiguration")
spoon.ReloadConfiguration:start()

hs.alert.show("Hammerspoon loaded")
