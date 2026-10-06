---
name: atuin
description: "Atuin shell history: every command with cwd, exit, duration and author. Use for what ran, what failed, how long it took, what an agent ran, or atuin config, import and hooks."
---

# Atuin

## Overview

Atuin hooks zsh's preexec/precmd and records each command with its working
directory, exit code, duration, session id and host into
`~/.local/share/atuin/history.db`. On this machine it is a passive recorder
only: Ctrl-R and Up arrow stay with Television, the AI assistant is off, and
sync is off. The `.zsh_history` file keeps being written as before.

Everything lives in the dotfiles repo (`~/dev/pattobrien/dotfiles`):

| What | Where |
|------|-------|
| install | `.config/mise/config.toml` under `[tools]` |
| shell hook | `zsh/zshrc`, the `atuin init zsh` line |
| config | `.config/atuin/config.toml`, symlinked to `~/.config/atuin/config.toml` |
| db | `~/.local/share/atuin/history.db` (not in the repo) |

## Instructions

### 1. Install

Atuin is declared in mise, never Homebrew:

```toml
atuin = "latest"
```

`mise install atuin` installs or upgrades it. `update_check = false` is set in
the config; never run `atuin update`.

### 2. Shell integration

`zsh/zshrc` has exactly one init line:

```zsh
eval "$(atuin init zsh --disable-up-arrow --disable-ctrl-r --disable-ai)"
```

Do not add a second `atuin init`, drop a flag, or bind atuin widgets. Only new
shells pick up changes to this line or to the config.

### 3. Running atuin from an agent

Every atuin command needs `ATUIN_SESSION` in its environment, and there is no
default: it is the id of the current shell session, which the `atuin init`
hook in `.zshrc` sets with `atuin uuid`. The Bash tool runs `zsh -c` from a
shell snapshot, so `.zshrc` never loads there and the variable is absent.
Prefix every call:

```sh
ATUIN_SESSION=agent atuin search --cmd-only -- ''
```

Any non-empty value works for read commands. Pass the query after `--` so an
empty query is accepted.

For the same reason nothing the Bash tool runs is recorded: the preexec hook
is not loaded. Only interactive shells (kitty, herdr panes, `zsh -i`) record.
Agent hooks (section 7) are what capture Bash tool commands.

### 4. Import

`atuin import zsh` backfilled `~/.zsh_history` once. Imported rows have
directory `unknown`, exit code `-1` and duration `0`, so directory and
workspace filters never match them and they are useless for timing. Do not
re-import.

### 5. Search

`atuin search` is the query tool. `filter_mode = "global"` in the config, so
nothing is scoped unless you ask. Prefix search by default; `*` and `%` are
wildcards.

```sh
atuin search --cmd-only --limit 20 -- 'git push'
atuin search --cwd "$PWD" --exit 0 -- 'pnpm'                  # successes here
atuin search --exclude-exit 0 --after 'yesterday' -- ''        # recent failures
atuin search --after '2026-10-01' --before '2026-10-05' -- 'vp'
atuin search --filter-mode workspace -- ''                     # this git repo
atuin search --filter-mode session -- ''                       # this shell only
atuin search --author '$all-agent' -- ''                       # agent-run only
atuin search --author '$all-user' -- ''                        # human-run only
atuin search --author claude-code --include-duplicates -- ''
atuin search --delete -- 'AWS_SECRET'                          # purge matches
```

Other flags: `--exclude-cwd`, `--offset`, `--reverse`, `--human`, `--shell`,
`--search-mode prefix|fulltext|fuzzy`, `--tz`. `--filter-mode` accepts global,
host, session, directory, workspace. `--after` and `--before` take a date
(`2026-10-05`, `2026-10-05 14:00`) or a phrase like `yesterday`, `12 hours
ago`, `last week`; `today` and `now` are rejected. `--format` placeholders:
`{time}`, `{exit}`, `{duration}`, `{directory}`, `{command}`, `{host}`,
`{user}`, `{relativetime}`.

A search that matches nothing prints nothing and exits 1 with no message, so
an empty result is not an error.

```sh
atuin search --format '{time}  {exit}  {duration}  {directory}  {command}' --limit 50 -- ''
```

`atuin history list` dumps everything in `history_format` order from the
config, which includes `{author}` and `{intent}`. It has no filter-mode flag;
`--cwd` and `--session` are its only scopes.

Exit code `-1` means no end was recorded: the row was imported, the shell was
killed, or the command ran `exit` itself. Duration is `0s` for those rows.

For aggregates, query the db directly. Columns: `id`, `timestamp` (ns since
epoch), `duration` (ns), `exit`, `command`, `cwd`, `session`, `hostname`,
`deleted_at`, `author`, `author_kind`, `intent`, `shell`.

```sh
sqlite3 ~/.local/share/atuin/history.db \
  "select cwd, count(*), round(avg(duration)/1e9,1) from history where exit > 0 group by cwd order by 2 desc limit 10"
```

### 6. Stats

```sh
atuin stats                       # since the beginning
atuin stats week --count 20       # also: today, month, year, a date, "last friday"
atuin stats -n 2                  # most common two-command sequences
atuin stats --filter-mode workspace
```

`[stats]` in the config lists which first words count their subcommand
(`git push` vs `git commit`), which prefixes to strip (`sudo`), and which
commands to ignore.

### 7. Agent attribution

Commands an agent runs through its Bash tool are not recorded by the shell
hook, and commands it runs in an interactive pane are recorded as author
`patt` with no intent. Atuin's agent hooks fix both: the agent calls
`atuin hook <agent>` before and after each Bash tool call, which records the
command with the agent name as author, the tool call's description as
`intent`, and `author_kind = agent`.

`atuin hook install <agent>` runs for claude-code, codex, opencode and pi
from the mise `postinstall` hook in `.config/mise/config.toml`, so every
`mise install` re-applies them. Each run skips when its hook is already
present. Mise is the only installer that does not run atuin's `install.sh`,
which would otherwise do this automatically. The hooks write straight to
SQLite and do not need the daemon.

| Agent | What the installer writes |
|-------|---------------------------|
| claude-code | PreToolUse, PostToolUse, PostToolUseFailure on `^Bash$` in `~/.claude/settings.json`, a dotbot symlink to `claude/settings.json` |
| codex | the same entries in `~/.codex/hooks.json` |
| opencode | plugin `~/.config/opencode/plugins/atuin.ts`; restart opencode |
| pi | extension `~/.pi/agent/extensions/atuin.ts`; `/reload` or restart pi |

Only the Claude Code file is tracked in the repo; the other three are
generated and re-created by the postinstall hook.

`atuin search --author '$all-agent' -- ''` shows agent rows; `history list`
prints `{author}` and `{intent}`.

Commands an agent types into an interactive pane (herdr, tmux) are recorded
as `patt`. Export `ATUIN_HISTORY_AUTHOR=claude-code` in that pane to tag them
as agent-run.

### 8. MCP server

`atuin mcp` serves read-only `atuin_history`, `atuin_output` and
`atuin_output_search` tools over stdio. Register it with
`claude mcp add atuin -- atuin mcp`. The CLI above covers the same ground, so
it is not registered.

### 9. Sync

Off. `auto_sync = false`, no account, no key. Do not run `atuin register`,
`atuin login` or `atuin sync`. If sync is ever wanted: register, back up
`atuin key` into 1Password, and set `sync_address` before registering when
self-hosting. Self-hosting is not used.

### 10. Output capture

Off. `atuin config enable output-capture` would start the daemon and a pty
proxy to store each command's terminal output for `atuin output search` and
the MCP output tools. Not enabled; leave it off unless asked.

### 11. Configure

Edit `.config/atuin/config.toml` in the repo, not the symlink target. Keys are
top-level. `atuin config get <key>` reads the effective value,
`atuin default-config` prints every option with its default. What is set and
why:

| Key | Value | Why |
|-----|-------|-----|
| `filter_mode` | `global` | `history list` honours it and has no override flag |
| `workspaces` | `true` | the TUI and `--filter-mode workspace` scope to the git root |
| `search_mode` | `fuzzy` | CLI search uses it too |
| `history_format` | time, exit, duration, directory, command | `history list` columns |
| `store_failed` | `true` | failures are the interesting rows |
| `secrets_filter` | `true` | skips commands containing known token shapes |
| `enter_accept` | `false` | TUI Enter edits instead of runs, if ever opened |
| `auto_sync`, `update_check` | `false` | passive, offline |

To hide a command from the log add a regex to `history_filter`; to hide a
directory add one to `cwd_filter`. Commands typed with a leading space are
never recorded.

## Examples

### Example 1: Why did the last test run fail, and how long did it take?

```sh
ATUIN_SESSION=agent atuin search --cwd "$PWD" --exclude-exit 0 --limit 5 \
  --format '{time}  exit={exit}  {duration}  {command}' -- 'vp test'
```

### Example 2: What did an agent run in this repo today?

```sh
ATUIN_SESSION=agent atuin search --filter-mode workspace --author '$all-agent' \
  --after '12 hours ago' --format '{time}  {exit}  {duration}  {command}' -- ''
```

Before the hooks are installed this returns nothing. Agent work in
interactive panes shows up as author `patt`; scope it by directory instead,
since agent scratch work runs under `/private/tmp/claude-501/`.

### Example 3: Slowest commands this week

```sh
sqlite3 ~/.local/share/atuin/history.db \
  "select round(duration/1e9) as s, cwd, command from history
   where timestamp > (strftime('%s','now','-7 days') * 1000000000) and cwd != 'unknown'
   order by duration desc limit 10"
```

## Guidelines

- Atuin records everything, including inline secrets in agent commands. Keep
  `secrets_filter` on, add `history_filter` patterns for new token formats,
  purge leaks with `atuin search --delete`, and rotate the secret anyway.
- Never change the `atuin init` flags, enable keybindings, sync, the daemon,
  AI, or output capture without being asked.
- Do not edit `~/.config/atuin/config.toml` through `atuin config set` when a
  repo edit will do; both write the same file, but the repo is the source.
- The db is a convenience log, not an audit trail: a killed shell leaves
  `exit = -1`, and anything typed with a leading space is absent.
