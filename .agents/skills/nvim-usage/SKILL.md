---
name: nvim-usage
description: "Neovim keystroke, command and hardtime logs plus a keymap dump. Use for most-used keys, unused mappings, inefficient motions, or changing the logger."
---

# Neovim usage tracking

## Overview

| Piece         | Where                                                 | What                                                                             |
| ------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| keylog module | `.config/nvim/lua/keylog.lua`, loaded from `init.lua` | `vim.on_key` listener and `CmdlineLeave` autocmd, flushed every 10 s and on exit |
| key log       | `~/.local/state/nvim/keylog/YYYY-MM-DD.jsonl`         | one JSON object per keypress or `:` command                                      |
| keymap dump   | `~/.local/state/nvim/keylog/keymaps.json`             | written by `:KeylogDump`                                                         |
| hardtime.nvim | spec in `.config/nvim/lua/plugins/coding.lua`         | hint-only coaching, logs each hint                                               |
| hardtime log  | `~/.local/state/nvim/hardtime.nvim.log`               | `[INFO <date>] <hint>` lines                                                     |

Everything is local. Nothing syncs anywhere.

## 1. Key log format

Keypress rows:

```json
{ "t": 1791255896820, "mode": "no", "pid": 4425, "ft": "lua", "keys": "w" }
```

Command rows:

```json
{ "t": 1791255896835, "mode": "c", "pid": 4425, "ft": "lua", "cmd": "echo 1" }
```

- `t` is Unix milliseconds. `pid` groups rows by Neovim instance.
- `keys` is what was physically typed, run through `keytrans`, so a mapping
  press arrives as one row (`<Space>ff`), not as its expansion. Keys that a
  mapping or macro expands to are never logged.
- `mode` is the mode before the key applied: `i` shows as mode `n`, and the
  `w` in `dw` shows as `no`.
- Insert, replace, terminal and cmdline typing is never recorded. `:` commands
  are recorded once on `CmdlineLeave`, except `:!` shell commands.
- Keys read with `getchar()` are invisible to `vim.on_key`, so flash.nvim jump
  labels and `f`/`t` targets are missing.
- which-key intercepts prefix keys (`g`, `z`, `<Space>`, operators) and replays
  the finished sequence as typed input. The logger drops the trigger press and
  the captured keys and records only the replay, so `gg` is two `g` rows,
  `ciw` is `c` then `iw` in mode `no`, and `<Space>ff` is one row.
- Rows from `nvim --headless` runs (agents, tests) land in the same file. Filter
  them out by `pid` if they skew counts.

## 2. Querying the key log

Most used normal-mode keys this week:

```sh
cat ~/.local/state/nvim/keylog/2026-10-0*.jsonl \
  | jq -r 'select(.mode == "n") | .keys' | sort | uniq -c | sort -rn | head -30
```

Most used `:` commands:

```sh
cat ~/.local/state/nvim/keylog/*.jsonl \
  | jq -r 'select(.cmd) | .cmd' | sort | uniq -c | sort -rn | head
```

Leader mappings by count:

```sh
cat ~/.local/state/nvim/keylog/*.jsonl \
  | jq -r 'select(.keys | startswith("<Space>")) | .keys' | sort | uniq -c | sort -rn
```

Runs of the same key within a second (the `jjjjj` pattern):

```sh
cat ~/.local/state/nvim/keylog/*.jsonl \
  | jq -r 'select(.mode == "n") | "\(.t) \(.keys)"' \
  | awk '$2 == prev && $1 - pt < 1000 { run++ } $2 != prev || $1 - pt >= 1000 { if (run >= 4) print run, prev; run = 1 } { prev = $2; pt = $1 }' \
  | sort | uniq -c | sort -rn | head
```

For anything heavier, load the files into SQLite:

```sh
sqlite3 /tmp/keylog.db "CREATE TABLE k(t INT, mode TEXT, pid INT, ft TEXT, keys TEXT, cmd TEXT);"
cat ~/.local/state/nvim/keylog/*.jsonl \
  | jq -r '[.t, .mode, .pid, .ft, .keys, .cmd] | @csv' \
  | sqlite3 /tmp/keylog.db ".import --csv /dev/stdin k"
```

## 3. Keymap dump

Regenerate before cross-referencing, since mappings change with the config:

```sh
nvim --headless -c KeylogDump -c 'qa!'
```

`keymaps.json` has four sections:

- `global`: every global mapping in modes n, x, o, i, c, t with `lhs`, `rhs`,
  `desc` and `src`. `src` is the file that defined it. Lazy-loaded plugin keys
  show `src` as lazy's `handler/keys.lua` stub until the plugin loads.
- `lazy`: every key lazy.nvim registered for a plugin, with `plugin`, `mode`,
  `lhs` and `desc`. Use this to attribute a leader mapping to its plugin.
- `lsp`: the LSP keys from the merged nvim-lspconfig `servers[*].keys`
  (`gd`, `gr`, `K`, `<leader>ca`, ...), with `server`, `has` capability and
  `desc`. These are buffer-local at runtime and never appear in `global`.
- `buffer`: mappings local to the buffer the dump ran in, with its `filetype`.
  Empty for a headless run. Run `:KeylogDump` inside a code buffer with an LSP
  attached to capture ftplugin and attached-LSP mappings for that filetype.

`lhs` in `global` uses a literal space for leader (`" ff"`); `lazy` and the
key log use `<leader>ff` and `<Space>ff` respectively. Normalize before joining.

Unused mappings: take every `lazy[].lhs`, replace `<leader>` with `<Space>`, and
subtract the distinct `keys` values in the log.

## 4. hardtime.nvim

Installed in hint mode: it never blocks a key, arrows and mouse stay enabled.
It notifies on repeated `hjkl` (more than 3 in 1 s) and on 38 built-in
patterns such as `dwi` → `cw`, `$a` → `A`, `Vjjd` → `d2j`. Every hint is
appended to the log before the notification.

- `:Hardtime report` ranks the most frequent hints in a popup.
- `:Hardtime toggle` pauses it for a session.
- Count hints from the shell:

```sh
sed -E 's/^\[INFO [^]]*\] //' ~/.local/state/nvim/hardtime.nvim.log | sort | uniq -c | sort -rn | head
```

Options live in the spec in `lua/plugins/coding.lua`. Useful knobs: `max_count`
and `max_time` for the repeat threshold, `restricted_keys` to watch more keys,
`hints` to add patterns (see the repo's custom-hints discussions),
`force_exit_insert_mode` with `max_insert_idle_ms` to kick back to normal mode
when idle, `callback` to route hints somewhere other than `vim.notify`,
`disabled_filetypes` to silence it in pickers and terminals.

## 5. Changing the logger

The module is `lua/keylog.lua`. The `skip` table lists first-letter modes that
are never recorded. Add fields inside `record` if more context is needed, for
example `vim.api.nvim_buf_get_name(0)`, and keep insert-mode text out.

## Guidelines

- Read the log, do not edit it. Delete a day file if a probe polluted it.
- Rerun `:KeylogDump` before any "unused mapping" claim.
- Treat hardtime hints as hints. Some, like `Use I instead of ^i`, fire on
  habits that are fine in context.
- Never log insert-mode text or terminal buffers, even when asked for "all keys".
