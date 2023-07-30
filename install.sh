# Software Update (including Rosetta) 
# TODO: was this necessary for M1 chips? might not be needed anymore
# sudo softwareupdate --all --install --force

# Create symlinks for zshrc and gitconfig files
ln -s ~/.dotfiles/zsh/zshrc ~/.zshrc
ln -s ~/.dotfiles/git/.gitconfig ~/.gitconfig
ln -s ~/.dotfiles/nvim ~/.config/nvim

# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then pass in the Brewfile location...
brew bundle --file ~/.dotfiles/brew/Brewfile