# Feature Roadmap

## Work

- [x] refactor: remove Dart from workspace root
- [x] replace asdf with mise
- [x] refactor: move all individual app config dirs to `.config` directory
- configs to add:
  - [x] p10k (~/.p10k.zsh)
  - see: [docs/plans/harmonic-twirling-frost.md]
- script: combine vscode and cursor settings into one (see below)
- [x] fix: claude code + cursor; visible "/" when pressing SHIFT+ENTER
- [x] sync macOS defaults to this repo (see below)
- [ ] define a shell autocompletion strategy
  - files/dirs to store tool-specific autocompletions
  - how can we use auto completion scripts for tools we don't install globally?
    (e.g. `prisma` that is installed to a local repo)
- set oxlint as default formatter
- claude: how can we set name/session as window name in cursor?
- a way to default to ~/ having dotfiles visible
- disable excessive macOS animations
  - when navigating between windows/desktop views
- migrate brew CLI tools to mise (e.g. `neonctl`)

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
- fast scroll when holding hjkl in vim mode

### VSCode + Cursor Settings Sync (WIP)

Create scripts that sync vscode and cursor json settings together.

- create a unified schema, that has top-level namespaces for specific IDEs,
  similar to devcontainers spec
  - see: https://containers.dev/supporting
  - allow top-level `.meta.vscode` and `.meta.cursor` properties, that match the
    same schema (can we still have intellisense?)
- sync script: TODO

### Shell Prompt

Create shell prompt util that has:

- segments: TODO

### Shortcuts

- disconnect/connect AirPods
- open dotfiles repo

### Neovim

- statusline: `{}` for showing Language Status (incl. active LSP servers for a
  given buffer)
- migrate to nvim 0.12 (enhanced LSP support)
- vscode-like Command Palette for commands (to help with command visibility)
- support for images via kitty graphics protocol

#### Limitations

- no image support
  - related:
    - nvim image API: https://github.com/neovim/neovim/issues/30889
    - nvim open PR (expected to merge in Mar 2026):
      https://github.com/neovim/neovim/pull/37914
- no support for vector graphic icons (only supports monochrome icons)
  - may be related to image support limitation
- no support for variable text size and font family (would be useful for
  Debugger UI)
  - related:
    - (approved) kitty text scaling RFC:
      https://github.com/kovidgoyal/kitty/issues/8226
    - tmux doesnt yet support protocol
    - related nvim issue: https://github.com/neovim/neovim/issues/32539
    - "presentation mode" parent neovim issue:
      https://github.com/neovim/neovim/issues/31825
    - Goneovim (experimental neovim GUI that utilizes different text sizes per
      window): https://github.com/akiyosi/goneovim?tab=readme-ov-file
