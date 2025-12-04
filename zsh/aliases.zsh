alias k="kubectl"

alias gc="git commit -m"
alias ga="git add ."
alias gs="git status"

alias p="pnpm"
alias pi="pnpm install"
alias pd="pnpm dev"
alias pf="pnpm format"
alias pl="pnpm lint"
alias pt="pnpm test"
alias px="pnpx"

alias jq="jq -C"  # always colorize

alias l="ls -la"
alias ll="ls -lah"

alias cat="bat"
alias grep="rg"
alias find="fd"

alias preview="fzf --preview 'bat --color=always {}'" # preview files in fzf
alias branches="git branch | fzf | xargs git switch" # switch to a branch in fzf

# alias npm="pnpm"
# alias npx="pnpx"
