export PATH="/usr/local/opt/ruby/bin:$PATH"
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PATH="$PATH:${HOME}/fvm/default/bin"
# export PATH="$PATH:${HOME}/fvm/default/bin/dart"
# export PATH="$PATH:${HOME}/fvm/default/bin/cache/dart-sdk"
export PATH="$PATH:${HOME}/fvm/default/bin/cache/dart-sdk/bin"
export PATH="${HOME}/Library/Android/sdk/tools:${HOME}/Library/Android/sdk/platform-tools:${PATH}"
export PATH="/Library/Frameworks/Python.framework/Versions/3.9/bin:${PATH}"
eval $(/opt/homebrew/bin/brew shellenv)
export NVM_DIR="${HOME}/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
export GEM_HOME="$HOME/.gem" 
export PATH="$PATH":"$HOME/.pub-cache/bin"
export PUB_CACHE="$HOME/.pub-cache"
## [Completion] 
## Completion scripts setup. Remove the following line to uninstall
[[ -f /Users/pattobrien/.dart-cli-completion/zsh-config.zsh ]] && . /Users/pattobrien/.dart-cli-completion/zsh-config.zsh || true
## [/Completion]

