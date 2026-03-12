# Dotfiles

Personal dotfiles managed with [dotbot](https://github.com/anishathalye/dotbot).

- see: @README.md
- @docs/vite-plus.md (but instead of using `vite foo`, use `vp foo`)

## Agent rules

- **Bash commands**: Never combine multiple commands with `;`, `&&`, or pipes when the combined syntax triggers a re-approval prompt. Use separate parallel tool calls or dedicated tools (Read, Glob, Grep) instead.
