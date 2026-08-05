export OP_PLUGIN_ALIASES_SOURCED=1

# doctl causes 1password prompt when re-sourcing zshrc file, for some reason... so we should not use this
# alias doctl="op plugin run -- doctl"
# alias gh="op plugin run -- gh"
alias openai="op plugin run -- openai"
alias terraform="op plugin run -- terraform"
alias wrangler="op plugin run -- wrangler"
alias pulumi="op plugin run -- pulumi"
unalias wrangler 2>/dev/null
unset -f wrangler 2>/dev/null
wrangler() {
    op plugin run -- wrangler "$@"
}
