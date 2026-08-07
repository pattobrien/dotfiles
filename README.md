# dotfiles

Configurations for Neovim, kitty, git, and other various developer tools.

## TypeScript Tooling

This repo includes a pnpm + [Vite+](https://github.com/nicepkg/vite-plus)
monorepo for TypeScript tools.

### Workspace structure

```
tools/scripts     # Standalone TS scripts (linear-edit)
tests/e2e         # Terminal e2e tests (kitty, nvim)
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

# VS Code extensions (run after essentials/personal so the `code` CLI exists)
sh ~/dev/pattobrien/dotfiles/install vscode
```

> **Note:** Some macOS settings (e.g. mouse/trackpad scaling, key repeat) only
> take effect after a logout or restart once the `install macos` step has run.

### 4. Set permissions

Sets permissions for required files (only required once on the system)

```sh
chmod +x ~/.local/scripts/tmux-sessionizer
```

### 5. Restore app settings (from 2026-07 machine migration)

Settings snapshots from the previous MacBook live in two places:

**In this repo** — `.config/macos-defaults/exports/` has `macos-defaults` YAML
dumps for Raycast, Shottr, superwhisper, FluidVoice, and eul. Apply each with:

```sh
macos-defaults apply ~/.config/macos-defaults/exports/<app>.yaml
```

Then restart the app (or log out/in). Also copy the FluidVoice custom
vocabulary into place:

```sh
mkdir -p ~/Library/Application\ Support/FluidVoice
cp ~/dev/pattobrien/dotfiles/.config/fluidvoice/parakeet_custom_vocabulary.json \
  ~/Library/Application\ Support/FluidVoice/
```

A full snapshot of everything that was installed on the old machine (beyond
the curated `personal`/`work` profiles) is in `brew/all/Brewfile`:

```sh
brew bundle --file=~/dev/pattobrien/dotfiles/brew/all/Brewfile
```

**In the private repo** —
[`pattobrien/machine-backup`](https://github.com/pattobrien/machine-backup)
holds anything too sensitive or personal for this public repo:

- `raycast/*.rayconfig` — the official Raycast export (extensions, snippets,
  quicklinks, hotkeys, extension tokens). Import via Raycast Settings →
  Advanced → Import. Prefer this over the raycast.yaml defaults dump.
- `shottr/shottr-full.yaml` — unredacted Shottr defaults **including the
  license key** (`kc-license`), which is stripped from the public export.
  Apply this one instead of `exports/shottr.yaml` on a trusted machine.
- `chrome/` — Bookmarks, Preferences, and extension ID lists for all three
  profiles, in case Chrome profile sign-in sync misses anything.
- `superwhisper/` — defaults plist plus agent/database dirs (models
  re-download on first launch).
- `zsh_history` — shell history from the old machine.

> SSH keys are intentionally absent: auth goes through the 1Password SSH
> agent, so signing into 1Password (step 3) restores SSH access.

## Maintenance

### Claude Code Accounts

Switch between Claude Code accounts with `cswap switch`.

### Brew Dump

Dumps a snapshot of all brew-installed applications. VS Code extensions live in
their own Brewfile (`brew/vscode/Brewfile`), so they are dumped separately.

```sh
# personal profile (formulae/casks/mas — excludes VS Code extensions)
brew bundle dump --force --describe --no-vscode --file=~/dev/pattobrien/dotfiles/brew/personal/Brewfile

# VS Code extensions
brew bundle dump --force --vscode --file=~/dev/pattobrien/dotfiles/brew/vscode/Brewfile
```

> `scripts/maintain` runs both dumps for you (and preserves the vscode Brewfile
> comment header).

## Keyboard Shortcuts

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
  - Herdr highlights: `Cmd+A`/`Cmd+N`/`Cmd+L` open-or-create claude / nvim /
    `pnpm dev` tab layouts (same roles as the old tmux bindings, via the
    [herdr-ensure-tab](https://github.com/pattobrien/herdr-ensure-tab) plugin;
    layouts in `.config/herdr/plugins/config/herdr-ensure-tab/layouts.toml`,
    also in the herdr-plus quick-actions picker as Open Agent / Open Neovim /
    Dev Server), `Cmd+[`/`Cmd+]` cycle
    agents, `Cmd+Shift+[`/`]` cycle tabs, `Cmd+1..9` tab N, `Cmd+T`/`W`
    new/close, `Cmd+;` last pane, `Cmd+Shift+D`/`Cmd+Shift+N` jump to the
    dotfiles / notes workspaces, `Cmd+Shift+;` back to the last project
    workspace (`scripts/herdr-workspace-jump`), `Cmd+E` worktrees, `Cmd+D` hunk diff of the
    working tree in a split (herdr-plugin-hunk; staged/branch variants in the
    palettes, also on `prefix+d`), `Ctrl+Alt+H/J/K/L` pane
    focus (direct, no relay). Displaced to prefix mode: `prefix+o` jump to
    agent needing attention, `prefix+shift+n` new workspace, `prefix+b`
    toggle sidebar
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

> **Before running the fix:** quit the affected apps and dismiss any pending
> "access data from other apps" dialog first. While a prompt is on screen (or the
> app is running), macOS keeps re-writing the entry back to the `5` limbo state,
> which clobbers the `UPDATE` below. If an entry reverts to `5` right after you
> fix it, a live prompt/app is the cause — close it and re-run.

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

### Notes from previous setup runs

- [x] existing real dotfiles (e.g. a stock `~/.zshenv`) are backed up to
      `<file>.bak` before linking, so the first `install` no longer fails on a
      fresh/migrated Mac — see `scripts/backup_dotfiles.zsh`
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
    - eul
  - [x] auto-hide dock
  - [x] allow holding down `hjkl` keys (I think this was a keyboard config?)
  - [ ] raycast did not override command+K
  - [ ] dock apps
- [ ] apps that require settings sync
  - [x] eul (`exports/eul.yaml`)
  - [x] raycast (`exports/raycast.yaml` + `.rayconfig` in machine-backup)
  - [x] shottr (`exports/shottr.yaml`; license in machine-backup)
  - [ ] Messages (disable notification sounds)
  - [ ]
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
  - chatgpt
  - slack
  - discord
  - zoom
  - loom
  - docker-desktop
  - expo-orbit
  - brave-browser
  - android-studio
  - obsidian
  - shottr (license setup)
- desktop apps (no auth needed, just need to be opened to initialize)
  - karabiner elements
- macOS permissions (grant via System Settings → Privacy & Security)
  - [ ] script to check each app's granted permissions (query TCC.db)
  - hammerspoon (Accessibility)
  - kitty (Full Disk Access)
- cli apps (most use web-based oauth):
  - claude-code
  - gh
  - vercel
  - expo
  - linear
  - neonctl
  - doctl
  - flyctl
  - railway
  - mas
