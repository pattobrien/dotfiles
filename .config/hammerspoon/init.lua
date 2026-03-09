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

-- Load Hammerflow for declarative Leader-key bindings
hs.loadSpoon("Hammerflow")
spoon.Hammerflow.loadFirstValidTomlFile({
    "hammerflow.toml",
    "home.toml",
    "work.toml",
    "Spoons/Hammerflow.spoon/sample.toml"
})
-- optionally respect auto_reload setting in the toml config.
if spoon.Hammerflow.auto_reload then
    hs.loadSpoon("ReloadConfiguration")
    -- set any paths for auto reload
    -- spoon.ReloadConfiguration.watch_paths = {hs.configDir, "~/path/to/my/configs/"}
    spoon.ReloadConfiguration:start()
end