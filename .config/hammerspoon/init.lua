-- Hammerspoon configuration
-- https://www.hammerspoon.org/

-- Load EmmyLua type annotations for autocomplete
hs.loadSpoon("EmmyLua")

-- Enable IPC for CLI communication (`hs` command)
require("hs.ipc")

-- Reload config automatically when this file changes
hs.loadSpoon("ReloadConfiguration")
spoon.ReloadConfiguration:start()

hs.alert.show("Hammerspoon loaded")

