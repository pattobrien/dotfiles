# dotfiles

Configurations for Neovim, kitty, git, and other various developer tools.

## TypeScript Tooling

This repo includes a pnpm + [Vite+](https://github.com/nicepkg/vite-plus)
monorepo for TypeScript tools.

### Workspace structure

```
packages/git      # Git client library (worktrees, branches, project discovery)
packages/tmux     # Tmux client library (sessions, windows, keys)
packages/utils    # Shared utilities
tools/wt-cli      # Worktree manager CLI (trpc-cli)
tools/wt-raycast  # Worktree manager Raycast extension
tools/picker      # macOS picker (Swift, not in pnpm workspace)
```

### Development

```sh
vp install          # install dependencies
vp check            # format + lint + typecheck
vp test             # run tests
vp run build -r     # build all packages
```

## Setup

### 1. Install Xcode CLI tools

```sh
xcode-select --install
```

### 2. Clone repository

```sh
git clone https://github.com/pattobrien/dotfiles.git ~/dev/pattobrien/dotfiles
```

### 3. Run dotbot install script

NOTE: [`dotbot`](https://github.com/anishathalye/dotbot) is a utility app that
supports syncing the settings of various applications to dotfiles (e.g. `kitty`,
`skhd`).

```sh
# symlink dotfiles into ~ and create ~/dev
sh ~/dev/pattobrien/dotfiles/install

# essential installs and setups
sh ~/dev/pattobrien/dotfiles/install homebrew
sh ~/dev/pattobrien/dotfiles/install essentials
sh ~/dev/pattobrien/dotfiles/install 1password
sh ~/dev/pattobrien/dotfiles/install macos
sh ~/dev/pattobrien/dotfiles/install mise
sh ~/dev/pattobrien/dotfiles/install xcode

# optional installs (personal, work, runner, server)
sh ~/dev/pattobrien/dotfiles/install personal
```

### 4. Set permissions

Sets permissions for required files (only required once on the system)

```sh
chmod +x ~/.local/scripts/tmux-sessionizer
```

## Maintenance

### Brew Dump

Dumps a snapshot of all brew-installed applications.

```sh
brew bundle dump --force --describe --file=~/dev/pattobrien/dotfiles/brew/personal/Brewfile
```

## Keyboard Shortcuts

Shortcuts are split across layers, each scoped to a specific context.

- **Terminal Cmd+key** — high-frequency tmux actions (popups, session switching,
  clear)
  - Defined in: Kitty (`kitty.conf`), Ghostty (`config`), tmux (`.tmux.conf`),
    zsh (`zshrc`)
  - Flow: terminal sends F-key escape sequence → tmux `bind-key -n` intercepts →
    runs command
  - Avoid overriding:
    - Cmd+Q/H/M/W/N (macOS window mgmt)
    - Cmd+C/V/X/Z (clipboard)
    - Cmd+Space/Tab (Raycast, app switcher)
    - Cmd+, (preferences)
- **Terminal Cmd+Shift+key** — less frequent or destructive terminal actions
  - Defined in: same as above (Kitty, Ghostty, tmux)
  - Same F-key relay pattern as Cmd+key
- **Hammerflow (F18 leader)** — system-wide app switching and cross-app
  workflows
  - Defined in: `hammerflow.toml`
  - F18 is mapped from Right Cmd via Karabiner
- **Hammerspoon direct hotkeys** — system-wide shortcuts that need scripting
  logic
  - Defined in: `hammerspoon/init.lua`
- **Karabiner** — hardware-level key remaps (Caps Lock → Esc/Ctrl, Right Cmd →
  F18)
  - Defined in: `karabiner/karabiner.json`
- **Neovim** — editor keymaps (leader = Space)
  - Defined in: `nvim/lua/pattobrien/remap.lua`, `nvim/after/plugin/*.lua`

## Troubleshooting

### macOS "would like to access data from other apps" dialog keeps reappearing

On macOS Sequoia, apps can get stuck in a limbo permission state
(`auth_value=5`) in the TCC database, causing the "would like to access data
from other apps" dialog to reappear on every restart.

**Check for stuck entries:**

```sh
sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
  "SELECT client, auth_value FROM access WHERE service = 'kTCCServiceSystemPolicyAppData' AND auth_value = 5;"
```

**Fix all stuck entries:**

```sh
sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
  "UPDATE access SET auth_value = 2 WHERE service = 'kTCCServiceSystemPolicyAppData' AND auth_value = 5;"
```

This sets the permission to "allowed" (2) directly, which persists across
reboots. Using `tccutil reset` does **not** work — it deletes the entry, causing
macOS to re-create it in the same broken state.

## TODO

- [x] Add zsh config
- [x] Add Brewfile
- [x] Add NVIM config
- [x] Add tmux config
- [x] Add kitty config
- [x] Separate brew packages into separate files
- [x] Clean up outdated /scripts/ folder
- [x] BUG: tmux requirement in .zshrc causes terminal crash when tmux is not yet
      installed
- [x] Add VSCode config
- [x] Steps for initializing TMUX plugins
- [x] setup 1password in case passwords are needed for app installations
- [x] can `xcode-select --install` be run from the install script?
- [x] does asdf have a zsh autocomplete plugin?
- [ ] Raycast settings import script (Cloud Sync is premium; the exported
      `.config/macos-defaults/exports/raycast.yaml` is currently never applied)

### Notes from Fern setup

- [x] existing zshrc file not overridden (probably good)
- [x] error: zshrc sourced oh-my-zsh.sh before it existed — `setup_omz.zsh` now
      installs Oh My Zsh first

```
/Users/fern/.zshrc:source:97: no such file or directory: /Users/fern/.oh-my-zsh/oh-my-zsh.sh
```

- brew: too many apps were installed
  - [x] should maintain a `work` set of apps
- mac settings
  - [x] mouse/trackpad
  - [ ] window / desktop transition
  - [x] finder settings
  - [ ] apple account signed in? (should this just be a part of the get started
    guide?)
  - [ ] accessibility/privacy settings per-app (e.g. Zoom needs screen-share
    access)
  - [ ] settings for apps that open on startup
    - BetterTouchTool
    - RayCast
    - 1Password
  - [x] auto-hide dock
  - [x] allow holding down `hjkl` keys (I think this was a keyboard config?)
  - [ ] raycast did not override command+K
- [x] vscode settings / profile (synced via `stow_vscode.sh`; extensions via
      brew)
- manual app setup steps:
  - [x] 1password sign-in
  - [ ] github sign-in
- [ ] make `/dev` default directory
- chrome settings
  - [ ] 1password extensions (and others)
  - [ ] bookmarks?
- [x] install default sdks (migrated asdf → mise; `mise install` bootstraps from
      config)
  - e.g. `fvm install stable && fvm install beta && fvm install master`
  - sdks to install:
    - flutter (fvm)
    - node (asdf)
    - ts (asdf)
    - go (asdf)
    - typescript (via `npm i -g`)

```console
asdf plugin add golang && asdf plugin add nodejs && asdf plugin add deno
asdf install golang latest && asdf install nodejs latest && asdf plugin install deno latest
asdf global golang latest && asdf global nodejs latest && asdf global deno latest
```

- [ ] automatically accept xcode license (`xcodebuild -license accept`)
- [x] needed to comment out `1password` zsh plugin in `.zshrc`, because `op`
      doesnt have the proper permissions (now re-enabled)
- xcode select tools:
  - [ ] update to latest version (using `softwareupdate` ?)
  - [ ] approve terms (using `softwareupdate` ?)

### TODO: Agentic App Authorization

Using Claude Code + computer_use/browser_use plugins to authorize apps using 
the credentials stored in 1password (without the agent needing to copy/paste
credentials into it's session).

- web apps:
  - chrome profile login
  - google apps (e.g. gmail)
  - github
  - claude
  - reddit (personal)
  - vercel
  - expo
  - neon DB
  - cursor
  - vs-code
  - youtube (personal account, which has YT red/premium)
  - figma (personal)
  - linear (personal)
  - spotify
  - raycast
- desktop apps (most use web-based oauth):
  - claude desktop
  - cursor
  - spotify
  - linear
  - vscode
  - codex app
  - figma
  - raycast
- cli apps (most use web-based oauth):
  - claude-code
  - gh
  - vercel
  - expo
  - linear
  - neon

