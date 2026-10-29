-- Hammerspoon configuration
-- https://www.hammerspoon.org/

-- Load EmmyLua type annotations for autocomplete
hs.loadSpoon("EmmyLua")

-- Enable IPC for CLI communication (`hs` command)
require("hs.ipc")

-- Register Hammerspoon as a login item so it starts on boot
hs.autoLaunch(true)

-- Reload config automatically when this file changes
hs.loadSpoon("ReloadConfiguration")
spoon.ReloadConfiguration:start()

hs.alert.show("Hammerspoon loaded")

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
                                        os.getenv("HOME") .. "/.local/share/mise/shims/tmux list-clients -F '#{client_pid} #{session_name}' 2>&1"
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


-- App launcher over the focused window (Hyper+Space while on trial; Cmd+Space once shipped)
-- Asks OmniWM for the focused window and toggles Tinycast centred over it; with no focused
-- window Tinycast opens at its usual spot. `open -g` keeps the caller frontmost, so Tinycast
-- still sees it as the paste target.
local omniwmctl = "/Applications/OmniWM.app/Contents/MacOS/omniwmctl"

local function openInBackground(url)
    hs.task.new("/usr/bin/open", nil, { "-g", url }):start()
end

local function tinycastToggleURL(focusedWindowJSON)
    local ok, reply = pcall(hs.json.decode, focusedWindowJSON)
    local window = ok and type(reply) == "table" and reply.ok and reply.result.payload.window
    local frame = type(window) == "table" and window.frame
    if not frame then return "tinycast://toggle" end
    return string.format(
        "tinycast://toggle?frame=%d,%d,%d,%d",
        frame.x, frame.y, frame.width, frame.height)
end

hs.hotkey.bind({"ctrl", "alt", "cmd"}, "space", function()
    hs.task.new(omniwmctl, function(_, stdout)
        openInBackground(tinycastToggleURL(stdout))
    end, { "query", "focused-window", "--format", "json" }):start()
end)
