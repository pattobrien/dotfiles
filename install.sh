# Software Update (including Rosetta)
sudo softwareupdate --all --install --force

# Create symlinks for zshrc and gitconfig files
ln -s ~/.dotfiles/.zshrc ~/.zshrc
ln -s ~/.dotfiles/.gitconfig ~/.gitconfig

# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then pass in the Brewfile location...
brew bundle --file ~/.dotfiles/Brewfile
gem install bundler:2.2.22

# Install Mac App Store cli tool
brew install mas