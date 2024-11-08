# dotfiles

Configurations for Neovim, kitty, git, and other various developer tools.

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

NOTE: [`dotbot`](https://github.com/anishathalye/dotbot) is a utility app that supports syncing the settings of various applications to dotfiles (e.g. `kitty`, `skhd`).

```sh
sh ~/.dotfiles/install

# then run one of the following:
sh ~/.dotfiles/install personal
sh ~/.dotfiles/install work
sh ~/.dotfiles/install runner
sh ~/.dotfiles/install server
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

## TODO

- [x] Add zsh config
- [x] Add Brewfile
- [x] Add NVIM config
- [x] Add tmux config
- [x] Add kitty config
- [x] Separate brew packages into separate files
- [x] Clean up outdated /scripts/ folder
- [x] BUG: tmux requirement in .zshrc causes terminal crash when tmux is not yet installed
- [ ] Steps for initializing TMUX plugins
- [ ] Add VSCode config
- [ ] setup 1password in case passwords are needed for app installations
- [ ] post-install scripts for packages (e.g. Dart/Flutter is required for fvm)
- [ ] can `xcode-select --install` be run from the install script?
- [ ] does asdf have a zsh autocomplete plugin?

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
  - apple account signed in? (should this just be a part of the get started guide?)
  - accessibility/privacy settings per-app (e.g. Zoom needs screen-share access)
  - settings for apps that open on startup
    - BetterTouchTool
    - RayCast
  - auto-hide dock
  - allow holding down `hjkl` keys (I think this was a keyboard config?)
  - raycast did not override command+K
- vscode settings / profile not setup
  - note: extensions are set up (via brew), but not user settings (`~/Library/Application Support/Code/User/settings.json`)
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