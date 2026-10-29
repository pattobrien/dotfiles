# Maintenance

## Claude Code Accounts

Switch between Claude Code accounts with `cswap switch`.

## Claude Code Telemetry

Claude Code exports OTLP/HTTP to `https://otlp.finedesigns.io`, which sits
behind Cloudflare Access. Its `otelHeadersHelper` runs
`tools/scripts/src/claude-otel-headers.ts` (linked to
`~/.local/bin/claude-otel-headers`), which reads the service token
`OTLP_ACCESS_CLIENT_ID` and `OTLP_ACCESS_CLIENT_SECRET` from Doppler
`shed/prod`. Claude Code runs the helper off the startup path, at the first
export and every 29 minutes after.

## Process Tracing (proctrace)

Every process on this Mac becomes a span in ClickHouse `otel.otel_traces` under
`ServiceName = 'proctrace'`. Two pieces:

- `launchd/dev.pattobrien.eslogger.plist` runs Apple's `eslogger exec fork exit`
  as a root LaunchDaemon and appends JSON lines to
  `/var/log/proctrace/events.ndjson`. The installer leaves that file owned by
  you, so the reducer can truncate it once it has drained 64 MB; launchd's
  append-mode descriptor keeps writing at the new end.
- `tools/scripts/src/proctrace.ts` (linked to `~/.local/bin/proctrace`) runs as
  the mise launchd agent `dev.mise.proctrace`. It tails the file, turns each
  exec to exit into a span parented by the pid tree, joins a process to the
  Claude Code trace when its environment carries a `TRACEPARENT` its parent did
  not have, and exports with the same `claude-otel-headers` token. Only
  processes owned by your uid are exported. Cursor and open spans persist in
  `~/.local/state/proctrace/state.json`; the log is
  `~/.local/state/proctrace/proctrace.log`.

Install or update the daemons:

```sh
sudo ~/.local/share/mise/installs/bun/latest/bin/bun ~/.local/bin/proctrace-install
```

Then grant Full Disk Access once: System Settings > Privacy & Security > Full
Disk Access > `+`, press Cmd+Shift+G, enter `/usr/bin/eslogger`. launchd retries
eslogger every 10 s until the grant takes; `cat /var/log/proctrace/eslogger.err`
shows the refusal.

Debug a capture offline with `proctrace replay <file>`, which prints spans as
JSON without exporting. The reducer counts kernel-side drops from
`global_seq_num` gaps in its log line.

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
