# Flutter and Dart setup

export PATH="$PATH":"$HOME/.pub-cache/bin" # adds all `dart pub global activate` packages to path

export PATH="${HOME}/Library/Android/sdk/tools:${HOME}/Library/Android/sdk/platform-tools:${PATH}"

# export PATH="$PATH:/Users/pattobrien/.dswitch/active"

# android studio
export ANDROID_HOME=$HOME/Library/Android/sdk
# export ANDROID_SDK_ROOT=~/Library/Android/sdk

# export PATH=$ANDROID_HOME/tools:$PATH
# export PATH=$ANDROID_HOME/platform-tools:$PATH
# export PATH=$ANDROID_HOME/build-tools/19.1.0:$PATH

# -- test cli apps --
alias fab="dart /Users/pattobrien/dev/pattobrien/app_builder/bin/main.dart"

# export JAVA_HOME="/usr/local/opt/openjdk@11"
# export JAVA_HOME="/usr/bin/java"
export PUB_CACHE="$HOME/.pub-cache"
export FVM_CACHE_PATH="$HOME/.fvm"
export FLUTTER_ROOT="$HOME/.fvm/default"

export PATH="$PATH:$FLUTTER_ROOT/bin"

# export PATH="$JAVA_HOME/bin:$PATH"

# export PATH="/Users/pattobrien/.shorebird/bin:$PATH"

alias fpg="flutter pub get"
alias f="flutter"
alias dpg="dart pub get"
alias d="dart"
