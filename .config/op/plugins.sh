export OP_PLUGIN_ALIASES_SOURCED=1

alias openai="op plugin run -- openai"
alias terraform="op plugin run -- terraform"
alias wrangler="op plugin run -- wrangler"
alias pulumi="op plugin run -- pulumi"
unalias wrangler 2>/dev/null
unset -f wrangler 2>/dev/null
wrangler() {
    op plugin run -- wrangler "$@"
}
