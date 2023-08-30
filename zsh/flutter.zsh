# Flutter and Dart setup
export PATH="$PATH:${HOME}/.fvm/default/bin"
export PATH="$PATH:${HOME}/.fvm/default/bin/cache/dart-sdk/bin"

export PATH="$PATH":"$HOME/.pub-cache/bin"

export PATH="${HOME}/Library/Android/sdk/tools:${HOME}/Library/Android/sdk/platform-tools:${PATH}"
export PATH="$JAVA_HOME/bin:$PATH"


# export JAVA_HOME="/usr/local/opt/openjdk@11"
export PUB_CACHE="$HOME/.pub-cache"
export FVM_HOME="$HOME/.fvm"
export FLUTTER_ROOT="$HOME/.fvm/default"


## [Completion] 
## Completion scripts setup. Remove the following line to uninstall
[[ -f /Users/pattobrien/.dart-cli-completion/zsh-config.zsh ]] && . /Users/pattobrien/.dart-cli-completion/zsh-config.zsh || true
## [/Completion]