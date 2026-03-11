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

-- Kitty + tmux info hotkey (only active when Kitty is focused)
local kittyHotkey = hs.hotkey.new({"cmd", "shift"}, "i", function()
    local win = hs.window.focusedWindow()
    if not win then
        print("[kitty-tmux] No focused window")
        return
    end

    local app = win:application()
    if not app then
        print("[kitty-tmux] No application for focused window")
        return
    end

    local winId = win:id()
    local kittyPid = app:pid()
    local socketPath = string.format("unix:/tmp/kitty-%d", kittyPid)

    print(string.format("[kitty-tmux] Kitty window ID: %s, PID: %d, socket: %s", tostring(winId), kittyPid, socketPath))

    -- Use kitty @ ls via the PID-specific socket to get window/process info
    local kittyBin = "/opt/homebrew/bin/kitty"
    local lsCmd = string.format("%s @ --to %s ls 2>&1", kittyBin, socketPath)
    local output, status = hs.execute(lsCmd)

    if not status or not output then
        print("[kitty-tmux] Failed to query kitty remote control: " .. (output or "unknown error"))
        return
    end

    -- Parse the JSON output from kitty @ ls
    local json = hs.json.decode(output)
    if not json then
        print("[kitty-tmux] Failed to parse kitty @ ls output")
        return
    end

    -- Walk the kitty window tree to find the foreground process in the active tab/window
    for _, osWindow in ipairs(json) do
        if osWindow.is_focused then
            print(string.format("[kitty-tmux] Kitty OS window id: %d", osWindow.id))
            for _, tab in ipairs(osWindow.tabs) do
                if tab.is_focused then
                    for _, kittyWin in ipairs(tab.windows) do
                        if kittyWin.is_focused then
                            local fg = kittyWin.foreground_processes or {}
                            for _, proc in ipairs(fg) do
                                local cmdline = table.concat(proc.cmdline or {}, " ")
                                print(string.format("[kitty-tmux] Foreground process (pid %d): %s", proc.pid, cmdline))

                                -- Check if the foreground process is tmux client
                                if cmdline:match("tmux") then
                                    -- Get the tmux session for this specific client PID
                                    local tmuxCmd = string.format(
                                        "/opt/homebrew/bin/tmux list-clients -F '#{client_pid} #{session_name}' 2>&1"
                                    )
                                    local tmuxOut, tmuxOk = hs.execute(tmuxCmd)
                                    if tmuxOk and tmuxOut then
                                        for line in tmuxOut:gmatch("[^\n]+") do
                                            local clientPid, sessionName = line:match("^(%d+)%s+(.+)$")
                                            if clientPid and tonumber(clientPid) == proc.pid then
                                                print(string.format("[kitty-tmux] Active tmux session: %s (client pid: %s)", sessionName, clientPid))
                                                return
                                            end
                                        end
                                    end
                                    print("[kitty-tmux] tmux process found but could not match client to session")
                                end
                            end
                        end
                    end
                end
            end
        end
    end

    print("[kitty-tmux] No tmux session found in focused kitty window")
end)

-- Enable/disable the hotkey based on Kitty being focused
local kittyWatcher = hs.application.watcher.new(function(appName, eventType, _)
    if appName == "kitty" then
        if eventType == hs.application.watcher.activated then
            kittyHotkey:enable()
        elseif eventType == hs.application.watcher.deactivated then
            kittyHotkey:disable()
        end
    end
end)
kittyWatcher:start()

-- Enable immediately if Kitty is already focused
if hs.application.frontmostApplication():name() == "kitty" then
    kittyHotkey:enable()
end