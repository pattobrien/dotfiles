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
git clone https://github.com/pattobrien/dotfiles.git ~/.dotfiles
```

### 3. Run dotbot install script

NOTE: [`dotbot`](https://github.com/anishathalye/dotbot) is a utility app that
supports syncing the settings of various applications to dotfiles (e.g. `kitty`,
`skhd`).

```sh
sh ~/.dotfiles/install            # symlinks dotfiles to ~, creates ~/dev
sh ~/.dotfiles/install homebrew   # installs Homebrew package manager
sh ~/.dotfiles/install essentials # zsh, 1password, cursor, cli tools
sh ~/.dotfiles/install 1password  # signs into 1Password CLI, configures SSH agent
sh ~/.dotfiles/install macos      # applies macOS system preferences
sh ~/.dotfiles/install mise       # installs dev tools from .tool-versions (node, go, etc.)
sh ~/.dotfiles/install xcode      # installs the latest Xcode.app via xcodes (needs 1password step)

sh ~/.dotfiles/install personal   # all personal brew packages (or: work, runner, server)
```

### Installing the full Xcode app

The `xcode` step installs the full **Xcode.app** with
[`xcodes`](https://github.com/XcodesOrg/xcodes) (for just the Command Line
Tools, see step 1). It reads the Apple ID from the 1Password "Apple" item and
exports it as `XCODES_USERNAME` / `XCODES_PASSWORD`, so it depends on the
`1password` step having run first (an active `op` session). The download is
several GB, and on a new machine you'll be prompted once for an Apple two-factor
code and for `sudo`.

```sh
sh ~/.dotfiles/install xcode                 # latest stable Xcode
./scripts/setup_xcodes.zsh 16.2              # or a specific version
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
brew bundle dump --force --describe --file=~/.dotfiles/brew/personal/Brewfile
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
- [ ] Steps for initializing TMUX plugins
- [ ] setup 1password in case passwords are needed for app installations
- [ ] can `xcode-select --install` be run from the install script?
- [ ] docs: setup navigation when holding down hjkl on mac
  - see:
    https://github.com/vscode-neovim/vscode-neovim/issues/2170#issuecomment-2569887113
- [x] does asdf have a zsh autocomplete plugin?

### Notes from Fern setup

- existing zshrc file not overridden (probably good)'
- error:

```
/Users/fern/.zshrc:source:97: no such file or directory: /Users/fern/.oh-my-zsh/oh-my-zsh.sh
```

- brew: too many apps were installed
  - should maintain a `work` set of apps
- mac settings
  - mouse/trackpad
  - window / desktop transition
  - finder settings
  - apple account signed in? (should this just be a part of the get started
    guide?)
  - accessibility/privacy settings per-app (e.g. Zoom needs screen-share access)
  - settings for apps that open on startup
    - BetterTouchTool
    - RayCast
    - 1Password
  - auto-hide dock
  - allow holding down `hjkl` keys (I think this was a keyboard config?)
  - raycast did not override command+K
- vscode settings / profile not setup
  - note: extensions are set up (via brew), but not user settings
    (`~/Library/Application Support/Code/User/settings.json`)
- manual app setup steps:
  - 1password sign-in
  - github sign-in
- make `/dev` default directory
- chrome settings
  - 1password extensions (and others)
  - bookmarks?
- install default sdks (asdf, fvm)
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

- automatically accept xcode license (`xcodebuild -license accept`)
- needed to comment out `1password` zsh plugin in `.zshrc`, because `op` doesnt
  have the proper permissions
- xcode select tools:
  - update to latest version (using `softwareupdate` ?)
  - approve terms (using `softwareupdate` ?)
