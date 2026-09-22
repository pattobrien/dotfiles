alias k="kubectl"

alias gc="git commit -m"
alias ga="git add ."
alias gs="git status"

alias pn="pnpm"
alias pnpx="pnpm dlx"

# alias jq="jq -C"  # always colorize

# alias ls="eza --git-ignore"
# alias l="ls -la"
# alias ll="ls -lah"

# alias cat="bat"
# alias grep="rg"
# alias find="fd"

alias preview="fzf --preview 'bat --color=always {}'" # preview files in fzf
alias gbr="git branch | fzf | xargs git switch"       # switch to a branch in fzf (also: Ctrl-G Ctrl-B via fzf-git.sh)

alias maestro="maestro-runner --platform ios"

alias reload="source ~/.zshrc"
alias resource="source ~/.zshrc"
alias rss="source ~/.zshrc"

alias claude="claude --allow-dangerously-skip-permissions"
alias cc="claude"
alias ccr="claude --resume"
alias ccf="claude --model \"claude-fable-5-1[1m]\""
alias ccfr="claude --model \"claude-fable-5-1[1m]\" --resume"
alias cco="claude --model \"claude-opus-4-8[1m]\""
alias ccor="claude --model \"claude-opus-4-8[1m]\" --resume"
alias ccp="claude --model \"claude-opus-5-5[1m]\""
alias ccpr="claude --model \"claude-opus-5-5[1m]\" --resume"
alias ccs="claude --model \"claude-sonnet-5[1m]\""
alias ccsr="claude --model \"claude-sonnet-5[1m]\" --resume"

alias cx="codex"
alias cxr="codex resume"
alias cxs="codex --model gpt-5.6-sol"
alias cxsr="codex resume --model gpt-5.6-sol"
alias cxt="codex --model gpt-5.6-terra"
alias cxtr="codex resume --model gpt-5.6-terra"
alias cxa="codex --model gpt-6-astra"
alias cxar="codex resume --model gpt-6-astra"

alias oc="opencode"

alias wm="workmux"
