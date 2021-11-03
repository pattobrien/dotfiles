# Installation Notes:
# Install XCode from App Store
# After Android Studio is installed, you will need to open the GUI to install Android SDK command line tools


# Install Java JDK
# brew cask install java
brew install --cask AdoptOpenJDK/openjdk/adoptopenjdk12
# brew install --cask homebrew/cask-versions/adoptopenjdk8
# brew install --cask homebrew/cask-versions/adoptopenjdk12
# brew install --cask homebrew/cask-versions/adoptopenjdk13

# Step 1 - Install SDKs
brew install --cask android-studio
# brew install --cask android-SDK # may be deprecated now?
brew install --cask android-commandlinetools # comment out (untested replacement for deprecated android-SDK install)
brew install android-commandlinetools
brew install android-platform-tools # comment out (untested replacement for deprecated android-SDK install)
# brew install --cask android-ndk # may not be needed now?
brew install --cask flutter

# Open Android Studio to install SDK tools
# open -a 'Android Studio'

# Step 2 - Update Your Path
# vi ~/.bash_profile
export PATH="`pwd`/flutter/bin:$PATH" # might not be needed if using a shared .zsch file


# Step 3 - Install Xcode
xcode-select --install
xcode-select --switch /Applications/Xcode.app/Contents/Developer
/Applications/Xcode.app/Contents/Developer/
sudo xcodebuild -license
sudo xcodebuild -runFirstLaunch
open -a Simulator
brew install cocoapods

# Accept SDK Licenses
flutter doctor --android-licenses

# Step 4 - Run Flutter Doctor
flutter doctor
/usr/local/Caskroom/android-sdk

# Step 5 - Downgrade to the SDK version you want
flutter downgrade 2.2.3

# Step 7 - Flutter Doctor to check if everything installed correctly
flutter doctor

# To get Android Studio and Android SDK properly configured,
# you may need to manually open Android Studio, download CLI tools, and follow
# the steps given here to have the SDK path properly configured:
# https://stackoverflow.com/questions/52256569/android-sdkmanager-tool-not-found
