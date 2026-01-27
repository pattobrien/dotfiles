# Plan: Migrate from asdf to mise

## Overview

Add mise alongside asdf for version management. Mise is backwards-compatible with `.tool-versions` files. asdf remains fully functional as a fallback while you validate mise in real-world use.

## Files to Modify

- `zsh/zshrc` - Add mise shell integration (keep asdf)
- `.config/mise/config.toml` - Create global mise config with tasks (new file)

## Implementation Steps

### Step 1: Install mise

```sh
brew install mise
```

**Test:** Run `mise --version` to confirm installation.

### Step 2: Add mise activation ALONGSIDE asdf

In `zsh/zshrc`, ADD mise activation after the existing asdf setup (lines 147-148). Don't remove asdf:

```bash
# Existing asdf setup stays:
. $(brew --prefix asdf)/libexec/asdf.sh
export ASDF_DIR="${ASDF_DATA_DIR:-$HOME/.asdf}"

# ADD this line after asdf setup:
eval "$(mise activate zsh)"
```

**Test:** Open new terminal. Both `asdf` and `mise` commands should work.

### Step 3: Install tools via mise

```sh
mise install
```

**Test:** Run `mise list` to see installed tools. Verify versions match what asdf had.

### Step 4: Verify mise works

```sh
mise doctor
node --version
go version
deno --version
```

**Test:** All tools should resolve correctly. If anything fails, asdf is still there as fallback.

### Step 5: Create global mise config with tasks

Create `~/.config/mise/config.toml` (will be symlinked from `.config/mise/config.toml`):

```toml
[tools]
# Global tools are managed in .tool-versions, so leave this empty
# or add any tools you want available globally but not in .tool-versions

[tasks.dotfiles]
description = "Navigate to dotfiles"
run = "cd ~/.dotfiles && exec $SHELL"

```

**Test:** From any directory, run `mise run test` or `mise tasks` to see available tasks.

### Step 6: Update dotbot install.conf.yaml

Add symlink for mise config:

```yaml
- link:
    ~/.config/mise/config.toml: .config/mise/config.toml
```

**Test:** Run `sh ~/.dotfiles/install` and verify symlink exists.

## Verification Checklist

- [ ] `mise --version` works
- [ ] `mise doctor` shows no critical issues
- [ ] `node --version`, `go version`, `deno --version` all work
- [ ] `asdf` commands still work (fallback intact)
- [ ] `mise tasks` shows global tasks
- [ ] `mise run test` works from a project directory

## Rollback

If mise causes issues, simply remove the `eval "$(mise activate zsh)"` line from zshrc. asdf remains fully functional.

---

## Future: Remove asdf (after validation)

Only do this after you've validated mise works reliably in real-world use.

### Step A: Remove asdf from zshrc

In `zsh/zshrc`:

1. Remove `asdf` from the oh-my-zsh plugins list (line 69)
2. Remove the asdf shell init lines (147-148):

```bash
# Remove these lines:
. $(brew --prefix asdf)/libexec/asdf.sh
export ASDF_DIR="${ASDF_DATA_DIR:-$HOME/.asdf}"
```

### Step B: Update maintenance script

In `scripts/maintain`:

```bash
# Change from:
echo "Updating asdf plugins..."
asdf plugin update --all

# To:
echo "Updating mise tools..."
mise upgrade
```

### Step C: Uninstall asdf

```sh
brew uninstall asdf
rm -rf ~/.asdf
```

**Final Test:** Fresh terminal. `mise doctor`. All tools work.
