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

### 3. Run install.sh

```sh
sh ~/.dotfiles/install.sh
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
- Add VSCode config
- Add kitty config
- Clean up outdated /scripts/ folder
