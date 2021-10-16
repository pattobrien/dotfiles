PROMPT='CLI Environment: pattobrien

%1~ %# '

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PATH="$PATH:/Users/pattobrien/Development/flutter/bin"
export PATH="${HOME}/Library/Android/sdk/tools:${HOME}/Library/Android/sdk/platform-tools:${PATH}"
export FLUTTER_ROOT="$PATH:/Users/pattobrien/Development/flutter/"
export PATH="/Library/Frameworks/Python.framework/Versions/3.9/bin:${PATH}"
eval $(/opt/homebrew/bin/brew shellenv)
export NVM_DIR="/Users/pattobrien/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
export GEM_HOME="$HOME/.gem" 

