# Plan: Tmux + Claude Sessions

## TODOs

- create worktree from linear issue number/name
- create tmux session from worktree
- rename tmux session to have worktree name
- auto-run worktree setup script on new worktree creation

## Setup

### Hot Keys

- Hyper Key - for app shortcuts
- Caps Lock (tap) -> Escape - for nvim escape
- Caps Lock (hold) -> Ctrl - for tmux navigation

## Tmux Cheatsheet

Prefix is `Ctrl-a`.

### Sessions

| Action            | Command                       |
| ----------------- | ----------------------------- |
| New session       | `tmux new -s <name>`          |
| List sessions     | `tmux ls`                     |
| Attach to session | `tmux a -t <name>`            |
| Detach            | `Prefix + d`                  |
| Rename session    | `Prefix + $`                  |
| Switch session    | `Prefix + s`                  |
| Kill session      | `tmux kill-session -t <name>` |

### Windows

| Action             | Command          |
| ------------------ | ---------------- |
| New window         | `Prefix + c`     |
| Next window        | `Prefix + n`     |
| Previous window    | `Prefix + p`     |
| Select window by # | `Prefix + <0-9>` |
| Rename window      | `Prefix + ,`     |
| Close window       | `Prefix + &`     |
| List windows       | `Prefix + w`     |

### Panes

| Action               | Command                               |
| -------------------- | ------------------------------------- |
| Split horizontal     | `Prefix + \|`                         |
| Split vertical       | `Prefix + -`                          |
| Navigate panes (vim) | `Ctrl + h/j/k/l` (vim-tmux-navigator) |
| Resize down          | `Prefix + j` (repeatable)             |
| Resize up            | `Prefix + k` (repeatable)             |
| Resize right         | `Prefix + l` (repeatable)             |
| Resize left          | `Prefix + h` (repeatable)             |
| Toggle zoom          | `Prefix + m`                          |
| Close pane           | `Prefix + x`                          |

### Copy Mode (vi keys)

| Action          | Command      |
| --------------- | ------------ |
| Enter copy mode | `Prefix + [` |
| Start selection | `v`          |
| Copy selection  | `y`          |
| Paste           | `Prefix + ]` |
| Search forward  | `/`          |
| Search backward | `?`          |

### Other

| Action          | Command                |
| --------------- | ---------------------- |
| Reload config   | `Prefix + r`           |
| Install plugins | `Prefix + Shift + I`   |
| Command prompt  | `Prefix + :`           |
| Toggle mouse    | mouse is on by default |
