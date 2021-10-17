# Step 1 - Install SDKs
brew install --cask android-studio
brew install --cask homebrew/cask-versions/adoptopenjdk8
brew install --cask android-SDK
brew install --cask android-ndk
brew install --cask flutter

# Step 2 - Update Your Path
vi ~/.bash_profile
export PATH="`pwd`/flutter/bin:$PATH"


# Step 3 - Install Xcode
xcode-select --install
/Applications/Xcode.app/Contents/Developer/
sudo xcodebuild -license
open -a Simulator
brew install cocoapods

# Step 4 - Run Flutter Doctor
flutter doctor
/usr/local/Caskroom/android-sdk

# Step 5 - Downgrade to the SDK version you want
flutter downgrade 2.2.3

# Step 6 - Install Chrome for Web
brew install --cask google-chrome

# Step 7 - Flutter Doctor to check if everything installed correctly
flutter doctor

# To get Android Studio and Android SDK properly configured,
# you may need to manually open Android Studio, download CLI tools, and follow
# the steps given here to have the SDK path properly configured:
# https://stackoverflow.com/questions/52256569/android-sdkmanager-tool-not-found
