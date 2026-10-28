# Dotfiles

Personal dotfiles managed with [dotbot](https://github.com/anishathalye/dotbot).

- see: @README.md
- Vite+ (`vp`) usage: AGENTS.md

## Agent rules

- **Bash commands**: Never combine multiple commands with `;`, `&&`, or pipes
  when the combined syntax triggers a re-approval prompt. Use separate parallel
  tool calls or dedicated tools (Read, Glob, Grep) instead.
- After adding/changing a symlink entry in `install.conf.yaml`, run `./install`
  to create the symlink.
- Kitty is the daily driver; ignore Ghostty.
- `~/.zshrc` links to `zsh/zshrc.starship`.
- Install skills with
  `pnpx skills add <repo> -g --skill <name> --agent claude-code --agent amp -y`.
- Shed CLIs: `pnpm add -g @pattobrien/<pkg>@latest` in mise `postinstall`.
