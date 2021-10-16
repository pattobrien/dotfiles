# Install XCode CLI tools
xcode-select --Install

# ...or use HTTPS and switch remotes later.
git clone https://github.com/pattobrien/environment.git ~/.dotfiles

# Creating symlinks for zshrc and gitconfig files
ln -s ~/.dotfiles/.zshrc ~/.zshrc
ln -s ~/.dotfiles/.gitconfig ~/.gitconfig

# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then pass in the Brewfile location...
brew bundle --file ~/.dotfiles/Brewfile

# Install VSCode
brew install --cask visual-studio-code