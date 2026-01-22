# Feature Roadmap

## Work

- refactor: remove Dart from workspace root
- replace asdf with mise
- refactor: move all individual app config dirs to `.config` directory
- configs to add:
  - p10k (~/.p10k.zsh)
- script: combine vscode and cursor settings into one (see below)

## Feature Wishlist

- better terminal statusline
  - script: worktree-aware shell prompt


## Planning

### VSCode + Cursor Settings Sync (WIP)

Create scripts that sync vscode and cursor json settings together.

- create a unified schema, that has top-level namespaces for specific IDEs, similar to devcontainers spec
  - see: https://containers.dev/supporting 
  - allow top-level `.meta.vscode` and `.meta.cursor` properties, that match the same schema (can we still have intellisense?)
- sync script: TODO

### Shell Prompt

Create shell prompt util that has:

- segments: TODO