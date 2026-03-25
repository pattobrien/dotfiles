# Installs xcode-select cli tools and accepts the license

sudo xcode-select --install
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

sudo xcodebuild -license
sudo xcodebuild -runFirstLaunch