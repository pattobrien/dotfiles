# Keyboard Shortcuts

Shortcuts are split across layers, each scoped to a specific context.

- **Terminal Cmd+key** — high-frequency multiplexer actions (tabs, panes,
  agents, popups, clear)
  - Defined in: Kitty (`kitty.conf`), Ghostty (`config`), Herdr
    (`.config/herdr/config.toml`), tmux (`.tmux.conf`), zsh (`zshrc`)
  - Flow: terminal sends an F-key escape sequence → whichever multiplexer is
    running (Herdr day-to-day, or tmux) intercepts it → runs the equivalent
    action. Herdr only recognizes F1–F12 plus modified F-keys
    (`CSI <code>;<mod>~`) and CSI-u chords — bare F13+ sequences (`CSI 25~`+)
    are invisible to it, so overflow slots use `shift+F5`-style encodings.
  - Herdr highlights: `Cmd+A`/`Cmd+N`/`Cmd+L`/`Cmd+D` open-or-create claude /
    nvim / `pnpm dev` / nvim PR diff (`nvim +AtlasPr`) tab layouts (same roles
    as the old tmux bindings; inline shell in `config.toml` that tags each new
    pane with `herdr pane report-metadata --token layout=<name>` and finds it
    again by that token, also in the herdr-plus quick-actions picker as Open
    Agent / Open Neovim / Dev Server / Open PR Diff), `Cmd+[`/`Cmd+]` cycle
    agents, `Cmd+Shift+A` recent-navigator agents picker, `Cmd+Shift+[`/`]`
    cycle tabs, `Cmd+1..9` tab N, `Cmd+T`/`W` new/close, `Cmd+;` last pane,
    `Cmd+Shift+D`/`Cmd+Shift+N` jump to the dotfiles / notes workspaces,
    `Cmd+Shift+;` toggle to the last project, `Cmd+O` workspace picker and
    `Cmd+B` open-worktree picker in frecency order (all inline in `config.toml`,
    reading the per-item JSON files the
    `.config/herdr/plugins/workspace-frecency` plugin writes under its state dir
    on `workspace.focused`: workspace labels in `workspaces/`, linked worktree
    branches in `worktrees/`; linked with `herdr plugin link`), `Cmd+E`
    worktrees, `prefix+d` hunk diff of the working tree in a split
    (herdr-plugin-hunk; staged/branch variants in the palettes),
    `Ctrl+Alt+H/J/K/L` pane focus (direct, no relay). Displaced to prefix mode:
    `prefix+o` jump to agent needing attention, `prefix+shift+n` new workspace,
    `prefix+b` toggle sidebar
  - Avoid overriding:
    - Cmd+Q/H/M/W/N (macOS window mgmt)
    - Cmd+C/V/X/Z (clipboard)
    - Cmd+Space/Tab (Raycast, app switcher)
    - Cmd+, (preferences)
- **Clicked `file://` URLs** — open in the Neovim of the workspace that owns the
  file, at its line and column, instead of in Cursor
  - Defined in: `shed/tools/herdr-open-file` (Herdr `[[link_handlers]]`, linked
    with `herdr plugin link`), and `.config/kitty/open-actions.conf` pointing at
    the same script
  - `Ctrl+click` is the Herdr gesture (captured mouse reports can't tell
    Cmd-click from a plain click); `Ctrl+Shift+click` is the one kitty keeps for
    itself even while Herdr has the mouse. Herdr only sees `file://` through OSC
    8 metadata; kitty also detects it as plain text
- **Terminal Cmd+Shift+key** — less frequent or destructive terminal actions
  - Defined in: same as above (Kitty, Ghostty, tmux)
  - Same F-key relay pattern as Cmd+key
- **Hammerflow (F18 leader)** — system-wide app switching and cross-app
  workflows
  - Defined in: `.config/hammerspoon/hammerflow.toml`
  - F18 is mapped from Right Cmd via Karabiner
- **Hammerspoon direct hotkeys** — system-wide shortcuts that need scripting
  logic
  - Defined in: `.config/hammerspoon/init.lua`
  - `Hyper+Space` toggles Tinycast centred over the window OmniWM reports as
    focused (`omniwmctl query focused-window` → `tinycast://toggle?frame=…`);
    trial key, moves to Cmd+Space once confirmed
- **Karabiner** — hardware-level key remaps (Caps Lock → Esc/Ctrl, Right Cmd →
  F18)
  - Defined in: `.config/karabiner/karabiner.json`
- **Neovim** — editor keymaps (leader = Space)
  - Defined in: `.config/nvim/lua/config/keymaps.lua`,
    `.config/nvim/lua/plugins/*.lua`
