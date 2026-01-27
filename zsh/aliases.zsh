alias k="kubectl"

alias gc="git commit -m"
alias ga="git add ."
alias gs="git status"

alias p="pnpm"
alias pni="pnpm install"
alias pnd="pnpm dev"
alias pnf="pnpm format"
alias pnl="pnpm lint"
alias pnt="pnpm test"
alias pnu="pnpm update"
alias pnx="pnpx"

alias pn="pnpm"

alias jq="jq -C"  # always colorize

alias ls="eza --git-ignore"
alias l="ls -la"
alias ll="ls -lah"

alias cat="bat"
alias grep="rg"
alias find="fd"

alias preview="fzf --preview 'bat --color=always {}'" # preview files in fzf
alias branches="git branch | fzf | xargs git switch" # switch to a branch in fzf

# cd shortcuts
alias ..="cd .."
alias ...="cd ../.."
alias ....="cd ../../.."
alias .....="cd ../../../.."

# alias npm="pnpm"
# alias npx="pnpx"

alias pnpx="pnpm dlx"

alias cl="claude"
alias clr="claude --resume"
