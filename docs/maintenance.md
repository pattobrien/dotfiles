# Maintenance

## Claude Code Accounts

Switch between Claude Code accounts with `cswap switch`.

## Brew Dump

Dumps a snapshot of all brew-installed applications. VS Code extensions live in
their own Brewfile (`brew/vscode/Brewfile`), so they are dumped separately.

```sh
# personal profile (formulae/casks/mas — excludes VS Code extensions)
brew bundle dump --force --describe --no-vscode --file=~/dev/pattobrien/dotfiles/brew/personal/Brewfile

# VS Code extensions
brew bundle dump --force --vscode --file=~/dev/pattobrien/dotfiles/brew/vscode/Brewfile
```

> `scripts/maintain` runs both dumps for you (and preserves the vscode Brewfile
> comment header).
