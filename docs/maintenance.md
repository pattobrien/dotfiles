# Maintenance

## Claude Code Accounts

Switch between Claude Code accounts with `cswap switch`.

## Claude Code Telemetry

Claude Code exports OTLP/HTTP to `https://otlp.finedesigns.io`, which sits
behind Cloudflare Access. Its `otelHeadersHelper` runs
`tools/scripts/src/claude-otel-headers.ts` (linked to
`~/.local/bin/claude-otel-headers`), which reads the service token
`OTLP_ACCESS_CLIENT_ID` and `OTLP_ACCESS_CLIENT_SECRET` from Doppler
`shed/prod`.

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
