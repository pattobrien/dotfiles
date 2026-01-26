# Plan: Add Config Files to Dotfiles Repository

## Current State

**Already tracked in dotfiles:**
- Shell: `~/.zshrc`, `~/.zshenv`, `~/.p10k.zsh`
- Dev tools: `~/.tool-versions`, `~/.actrc`
- Git: `~/.config/git`
- SSH: `~/.ssh/config`
- Terminals: `~/.config/kitty`, `~/.config/ghostty`, `~/.tmux.conf`
- Window mgmt: `~/.config/yabai`, `~/.config/skhd`
- Editor: `~/.config/nvim`
- CLI tools: `~/.config/gh`, `~/.config/op/plugins.sh`
- IDEs: Cursor settings, VSCode settings
- AI: `~/.claude/` (CLAUDE.md, settings.json, skills)

---

## Configs to ADD

### Shell & Terminal
| Item | What it is | Exists | Recommendation |
|------|-----------|--------|----------------|
| `~/.zprofile` | Login shell setup (Homebrew, Puro) | YES | **ADD** |
| `~/.zlogin` | Login shell init (RVM) | YES | **ADD** |
| `~/.config/fish/config.fish` | Fish shell config | YES | ADD |
| `~/.config/iterm2/` | iTerm2 terminfo files | YES | ADD |

### Development Tools
| Item | What it is | Exists | Recommendation |
|------|-----------|--------|----------------|
| `~/.docker/config.json` | Docker CLI config | YES | **ADD** (check for secrets) |
| `~/.condarc` | Conda channels config | YES | ADD |
| `~/.config/stripe/config.toml` | Stripe CLI config | YES | ADD |

### Applications
| Item | What it is | Exists | Recommendation |
|------|-----------|--------|----------------|
| `~/.config/raycast/` | Raycast extensions & config | YES | **ADD** |
| `~/.carbon-now.json` | Code screenshot styling | YES | ADD |
| `~/.mackup.cfg` | Mackup backup config | YES | ADD |
| `~/.n8n/config` | n8n automation config | YES | ADD (config file only) |

### Templates (contain secrets)
| Item | What it is | Exists | Recommendation |
|------|-----------|--------|----------------|
| `~/.s3cfg` | S3 config | YES | TEMPLATE |

---

## Configs to SKIP

### Contains Secrets/Auth
| Item | Reason |
|------|--------|
| `~/.config/neonctl/credentials.json` | Contains auth credentials |
| `~/.kube/config` | Contains cluster secrets |
| `~/.azure/` | Auth data |
| `~/.config/gcloud/` | Auth data |
| `~/.railway/` | Auth tokens |
| `~/.gnupg/` | Private keys |
| `~/.ssh/` | Private keys (config already tracked) |
| `~/.netrc` | Network auth |

### Caches & Package Data
| Item | Reason |
|------|--------|
| `~/.cache/` | General cache |
| `~/.npm/` | npm cache |
| `~/.yarn/` | Yarn cache |
| `~/.pub-cache/` | Dart packages |
| `~/.m2/` | Maven cache |
| `~/.gem/` | Ruby gems |
| `~/.cocoapods/` | iOS deps |
| `~/.terraform.d/` | Terraform plugins |
| `~/.pulumi/` | State data |
| `~/.skaffold/` | Cache |

### Runtime Installations
| Item | Reason |
|------|--------|
| `~/.asdf/` | Runtime installations |
| `~/.fvm/` | Flutter versions |
| `~/.rvm/` | Ruby versions |
| `~/.bun/` | Bun installation |
| `~/.ghcup/` | Haskell toolchain |
| `~/.go/` | Go installation |
| `~/.swiftenv/` | Swift versions |
| `~/.dotnet/` | .NET SDK |
| `~/.nuget/` | NuGet packages |

### Data Science
| Item | Reason |
|------|--------|
| `~/.conda/` | Environments |
| `~/.ipython/` | Session data |
| `~/.jupyter/` | Notebooks data |
| `~/.keras/` | Model cache |
| `~/.matplotlib/` | Font cache |
| `~/.tensorflow/` | Model cache |

### Mobile Dev
| Item | Reason |
|------|--------|
| `~/.android/` | Android SDK |
| `~/.dart/` | Dart SDK cache |
| `~/.flutter-devtools/` | DevTools data |
| `~/.fastlane/` | Build data |
| `~/.expo/` | Expo cache |
| `~/.shorebird/` | Shorebird cache |

### Editor/IDE Data (settings already tracked)
| Item | Reason |
|------|--------|
| `~/.cursor/` | Data dir |
| `~/.vscode/` | Data dir |
| `~/.vscode-insiders/` | Extensions/data |
| `~/.vim/` | Moved to nvim |
| `~/.continue/` | Extension data |

### Misc
| Item | Reason |
|------|--------|
| `~/.terminfo/` | System-managed |
| `~/.SynologyDrive/` | Sync data |
| `~/.minikube/` | Large VM files |
| `~/.mongodb/` | DB data |
| `~/.pgadmin/` | DB tool data |
| `~/.n8n/database.sqlite` | Local DB |
| `~/.profile` | Use zprofile instead |

### Does Not Exist
| Item |
|------|
| `~/.npmrc` |
| `~/.gitignore_global` |
| `~/.cargo/config.toml` |

---

## User-Selected Items

Based on your preferences:
- [x] Shell files (`.zprofile`, `.zlogin`)
- [x] Docker config
- [x] Raycast settings

---

## Implementation Steps

### 1. Add Shell Files
```yaml
# install.conf.yaml
~/.zprofile: zsh/zprofile
~/.zlogin: zsh/zlogin
```

### 2. Add Docker Config
```yaml
~/.docker/config.json: .config/docker/config.json
```
Note: Review for auth tokens before committing

### 3. Add Raycast Settings
```yaml
~/.config/raycast: .config/raycast
```

---

## Verification
1. Run `./install` to create symlinks
2. Open new terminal - verify shell loads correctly
3. Run `docker info` - verify Docker works
4. Open Raycast - verify settings persist
