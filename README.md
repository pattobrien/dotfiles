# .dotfiles

## Installation Instructions

### 1. Install Xcode CLI tools

```sh
xcode-select --install
```

### 2. Use HTTPS to clone repository

```sh
git clone https://github.com/pattobrien/.dotfiles.git ~/.dotfiles
```

### 3. Run dotbot install script

```sh
sh ~/.dotfiles/install
```

### 4. Set permissions

Sets permissions for required files (only required once on the system)

```sh

chmod +x ~/.local/scripts/tmux-sessionizer
```

## Maintainance

### Brew Dump

```sh
brew bundle dump --force --describe --file=~/.dotfiles/brew/Brewfile
```

## TODO

- [x] Add zsh config
- [x] Add Brewfile
- [x] Add NVIM config
- [x] Add tmux config
- [x] Add kitty config
- Add VSCode config
- Clean up outdated /scripts/ folder
- Separate brew packages into separate files (based on if/when they would be needed to be installed)

  - e.g. on a pipeline runner, few apps are needed

- setup 1password in case passwords are needed for app installations
- BUG: tmux requirement in .zshrc causes terminal crash when tmux is not yet installed
- post-install scripts for packages (e.g. Dart/Flutter is required for fvm)
- can `xcode-select --install` be run from the install script?
