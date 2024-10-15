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

