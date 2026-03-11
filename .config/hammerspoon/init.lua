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

-- Get the tmux session name attached in the focused Kitty window via kitty remote control.
-- Returns the session name string, or nil if not found.
local function getKittyTmuxSession()
    local win = hs.window.focusedWindow()
    if not win then return nil end

    local app = win:application()
    if not app then return nil end

    local kittyPid = app:pid()
    local socketPath = string.format("unix:/tmp/kitty-%d", kittyPid)
    local kittyBin = "/opt/homebrew/bin/kitty"

    local output, status = hs.execute(string.format("%s @ --to %s ls 2>&1", kittyBin, socketPath))
    if not status or not output then return nil end

    local json = hs.json.decode(output)
    if not json then return nil end

    -- Walk the kitty window tree to find the tmux client PID in the focused window
    for _, osWindow in ipairs(json) do
        if osWindow.is_focused then
            for _, tab in ipairs(osWindow.tabs) do
                if tab.is_focused then
                    for _, kittyWin in ipairs(tab.windows) do
                        if kittyWin.is_focused then
                            for _, proc in ipairs(kittyWin.foreground_processes or {}) do
                                local cmdline = table.concat(proc.cmdline or {}, " ")
                                if cmdline:match("tmux") then
                                    local tmuxOut, tmuxOk = hs.execute(
                                        "/opt/homebrew/bin/tmux list-clients -F '#{client_pid} #{session_name}' 2>&1"
                                    )
                                    if tmuxOk and tmuxOut then
                                        for line in tmuxOut:gmatch("[^\n]+") do
                                            local clientPid, sessionName = line:match("^(%d+)%s+(.+)$")
                                            if clientPid and tonumber(clientPid) == proc.pid then
                                                return sessionName
                                            end
                                        end
                                    end
                                end
                            end
                        end
                    end
                end
            end
        end
    end

    return nil
end

-- Kitty worktree switcher hotkey (only active when Kitty is focused)
-- Parses the tmux session name (<repo>--<worktree>), looks up the repo,
-- and opens the Raycast worktree switch UI scoped to that repo.
local kittyHotkey = hs.hotkey.new({"cmd", "shift"}, "i", function()
    local sessionName = getKittyTmuxSession()
    if not sessionName then
        hs.alert.show("No tmux session found in this Kitty window")
        return
    end

    print(string.format("[kitty-tmux] Session: %s", sessionName))

    -- Parse session name: <repo>--<worktree>
    local repoName = sessionName:match("^(.+)%-%-")
    if not repoName then
        hs.alert.show("Session name doesn't match <repo>--<worktree> format: " .. sessionName)
        return
    end

    -- Look up repo via wt repos list (use login shell for PATH)
    local output, status = hs.execute("wt repos list 2>&1", true)
    if not status or not output or output == "" then
        print("[kitty-tmux] wt repos list failed: " .. (output or "nil"))
        hs.alert.show("Failed to list repos")
        return
    end

    local repos = hs.json.decode(output)
    if not repos then
        hs.alert.show("Failed to parse repo list")
        return
    end

    -- Find matching repo by name
    local rootDir = nil
    for _, repo in ipairs(repos) do
        if repo.repoName == repoName then
            rootDir = repo.rootDir
            break
        end
    end

    if not rootDir then
        hs.alert.show("No repo found matching: " .. repoName)
        return
    end

    print(string.format("[kitty-tmux] Repo: %s -> %s", repoName, rootDir))

    -- Open Raycast switch command scoped to this repo
    local argsJson = hs.json.encode({ cwd = rootDir })
    local encoded = hs.http.encodeForQuery(argsJson)
    local deeplink = "raycast://extensions/pattobrien/wt-manager/switch?arguments=" .. encoded
    print(string.format("[kitty-tmux] Opening: %s", deeplink))
    hs.urlevent.openURL(deeplink)
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