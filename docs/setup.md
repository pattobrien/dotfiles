# Setup

## 1. Install Xcode CLI tools

```sh
xcode-select --install
```

## 2. Clone repository

```sh
git clone https://github.com/pattobrien/dotfiles.git ~/dev/pattobrien/dotfiles
```

## 3. Run dotbot install script

NOTE: [`dotbot`](https://github.com/anishathalye/dotbot) is a utility app that
supports syncing the settings of various applications to dotfiles (e.g. `kitty`,
`skhd`).

```sh
# symlink dotfiles into ~ and create ~/dev
sh ~/dev/pattobrien/dotfiles/install

# essential installs and setups
sh ~/dev/pattobrien/dotfiles/install homebrew
sh ~/dev/pattobrien/dotfiles/install essentials
sh ~/dev/pattobrien/dotfiles/install 1password
sh ~/dev/pattobrien/dotfiles/install macos
sh ~/dev/pattobrien/dotfiles/install mise
sh ~/dev/pattobrien/dotfiles/install xcode

# optional installs
sh ~/dev/pattobrien/dotfiles/install personal

# VS Code extensions (run after essentials/personal so the `code` CLI exists)
sh ~/dev/pattobrien/dotfiles/install vscode
```

> **Note:** Some macOS settings (e.g. mouse/trackpad scaling, key repeat) only
> take effect after a logout or restart once the `install macos` step has run.

The zsh config also uses these oh-my-zsh custom plugins, which are plain clones:

```sh
cd ~/.oh-my-zsh/custom/plugins
git clone https://github.com/Aloxaf/fzf-tab.git
git clone https://github.com/junegunn/fzf-git.sh.git
git clone https://github.com/michakfromparis/zsh-pnpm-completions.git
```

## 4. Restore app settings (from 2026-07 machine migration)

Settings snapshots from the previous MacBook live in two places:

**In this repo** — `.config/macos-defaults/exports/` has `macos-defaults` YAML
dumps for Raycast, Shottr, superwhisper, FluidVoice, and eul. Apply each with:

```sh
macos-defaults apply ~/.config/macos-defaults/exports/<app>.yaml
```

Then restart the app (or log out/in). Also copy the FluidVoice custom vocabulary
into place:

```sh
mkdir -p ~/Library/Application\ Support/FluidVoice
cp ~/dev/pattobrien/dotfiles/.config/fluidvoice/parakeet_custom_vocabulary.json \
  ~/Library/Application\ Support/FluidVoice/
```

**In the private repo** —
[`pattobrien/machine-backup`](https://github.com/pattobrien/machine-backup)
holds anything too sensitive or personal for this public repo:

- `raycast/*.rayconfig` — the official Raycast export (extensions, snippets,
  quicklinks, hotkeys, extension tokens). Import via Raycast Settings → Advanced
  → Import. Prefer this over the raycast.yaml defaults dump.
- `shottr/shottr-full.yaml` — unredacted Shottr defaults **including the license
  key** (`kc-license`), which is stripped from the public export. Apply this one
  instead of `exports/shottr.yaml` on a trusted machine.
- `chrome/` — Bookmarks, Preferences, and extension ID lists for all three
  profiles, in case Chrome profile sign-in sync misses anything.
- `superwhisper/` — defaults plist plus agent/database dirs (models re-download
  on first launch).
- `zsh_history` — shell history from the old machine.

> SSH auth keys are intentionally absent: auth goes through the 1Password SSH
> agent, so signing into 1Password (step 3) restores SSH access. Commit signing
> uses a local passphrase-less key instead, so a new machine needs
> `ssh-keygen -t ed25519 -N "" -C git-signing -f ~/.ssh/git-signing`, then
> `gh ssh-key add --type signing -t "<host> git-signing" ~/.ssh/git-signing.pub`
> and its public key line in `.config/git/allowed_signers`.
