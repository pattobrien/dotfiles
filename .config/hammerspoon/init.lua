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

-- Load Hammerflow for declarative Leader-key bindings (optional)
local hammerflowOk, hammerflowErr = pcall(function()
    hs.loadSpoon("Hammerflow")
    spoon.Hammerflow.loadFirstValidTomlFile({
        "hammerflow.toml",
        "home.toml",
        "work.toml",
        "Spoons/Hammerflow.spoon/sample.toml"
    })
    if spoon.Hammerflow.auto_reload then
        hs.loadSpoon("ReloadConfiguration")
        spoon.ReloadConfiguration:start()
    end
end)
if not hammerflowOk then
    print("[init.lua] Hammerflow failed to load: " .. tostring(hammerflowErr))
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

-- Worktree switcher hotkey (Cmd+Shift+I)
-- Detects the tmux session in the focused Kitty window, looks up the repo,
-- and opens the Raycast worktree switch UI scoped to that repo.
local repoMap = {
    meagain = os.getenv("HOME") .. "/dev/getdots/meagain-bare/.worktrees/main",
}

hs.hotkey.bind({"cmd", "shift"}, "i", function()
    print("[init.lua] Cmd+Shift+I hotkey triggered")
    hs.timer.doAfter(0, function()
        local sessionName = getKittyTmuxSession()
        if not sessionName then return end

        local repoName = sessionName:match("^(.+)%-%-")
        if not repoName then return end

        local rootDir = repoMap[repoName]
        if not rootDir then return end

        local argsJson = hs.json.encode({ cwd = rootDir })
        local encoded = hs.http.encodeForQuery(argsJson)
        hs.urlevent.openURL("raycast://extensions/pattobrien/wt-manager/switch?arguments=" .. encoded)
    end)
end)

