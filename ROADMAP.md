# Feature Roadmap

## Work

- [x] refactor: remove Dart from workspace root
- replace asdf with mise
- [x] refactor: move all individual app config dirs to `.config` directory
- configs to add:
  - [x] p10k (~/.p10k.zsh)
  - see: [docs/plans/harmonic-twirling-frost.md]
- script: combine vscode and cursor settings into one (see below)
- [x] fix: claude code + cursor; visible "/" when pressing SHIFT+ENTER
- [x] sync macOS defaults to this repo (see below)
- [ ] define a shell autocompletion strategy
  - files/dirs to store tool-specific autocompletions
  - how can we use auto completion scripts for tools we don't install globally? (e.g. `prisma` that is installed to a local repo)
- set oxlint as default formatter

## Feature Wishlist

- better terminal statusline
  - script: worktree-aware shell prompt

## Planning

### macOS defaults

1. pick a tool to use for syncing / declaring defaults settings declaratively.
2. export to this repo and begin sync process

#### Defaults Wishlist

- caps lock remap to super key
  - TODO: decide what super key does
- screenshot remap to Shottr app
- play button remap to Spotify (?)

### VSCode + Cursor Settings Sync (WIP)

Create scripts that sync vscode and cursor json settings together.

- create a unified schema, that has top-level namespaces for specific IDEs, similar to devcontainers spec
  - see: https://containers.dev/supporting
  - allow top-level `.meta.vscode` and `.meta.cursor` properties, that match the same schema (can we still have intellisense?)
- sync script: TODO

### Shell Prompt

Create shell prompt util that has:

- segments: TODO
