# Devbox

A Namespace macOS Devbox (`goldengate` image, size M) set up like this Mac, so
coding agents can build and drive Tinycast there instead of here. The host CLI
is `devbox-mac` ([source](../tools/scripts/src/devbox-mac.ts)). The guest side
is [scripts/devbox/boot.ts](../scripts/devbox/boot.ts) plus the `devbox` dotbot
profile ([install.devbox.conf.yaml](../install.devbox.conf.yaml)).

## What persists

Only the `/Volumes/devbox` volume (150 GB) survives a stop and start. The home
directory, `/opt/homebrew`, `defaults`, the login keychain and the TCC database
reset on every start, so `up` runs on every boot. The boot links these into the
volume:

| Home path                                            | Volume path                                 |
| ---------------------------------------------------- | ------------------------------------------- |
| `~/dev`                                              | `/Volumes/devbox/dev`                       |
| `~/.local/share/mise`                                | `/Volumes/devbox/mise`                      |
| `~/Library/Application Support/com.tinycast.app.dev` | `/Volumes/devbox/state/tinycast-dev`        |
| `~/.config/tinycast-dev`                             | `/Volumes/devbox/state/tinycast-dev-config` |

`GH_CONFIG_DIR` points at `/Volumes/devbox/state/gh`, and `HOMEBREW_CACHE` at
`/Volumes/devbox/cache/homebrew`. Each boot writes per-step timings to
`/Volumes/devbox/state/last-boot.json`.

## Commands

```sh
devbox-mac create <name>          # create from the spec, then up
devbox-mac up <name>              # boot and seed secrets, see below
devbox-mac shot <name> [out.png]  # screenshot only
devbox-mac click <name> <x> <y>   # click at framebuffer pixels (2560x1600)
devbox-mac down <name>            # stop the Devbox
```

`up` runs these phases in order: pull the dotfiles onto the volume, `prepare`
(volume links, shell env, base `./install`, oh-my-zsh, the devbox Brewfile,
`xcode-select`, TCC grants, never sleep, wake), `devbox setup-github`, the
Doppler token, `install` (`./install devbox`, which is `mise install` and the
macOS defaults), then it clicks Allow on the "vmguest is requesting to bypass
the system private window picker" prompt that `prepare` raises on purpose, and
saves `<name>-up.png` in the current directory. Secrets land before `install` so
mise can use the GitHub token and the Doppler token on the first boot of a fresh
volume.

## Doppler

Each `up` mints a Doppler API token on the `sa-agent-builder` service account
through the Doppler SDK, using the host's own `doppler login`, and configures it
on the guest with `doppler configure set token --scope /`. The token is named
`devbox-<name>`, expires after seven days, and the next `up` revokes the
previous one before minting again. Nothing is stored on the host or in a vault.

The service account reads what it has been granted in Doppler. The global mise
config resolves its `[env]` with `doppler secrets get`, so a project or config
the account cannot read makes `mise env` exit 1 and the `mise activate` hook in
zshrc print an error at every prompt. Measured with mise 2026.10.10, the shims
still run, so `./install devbox` and the `install` phase of `up` pass either
way.

## Costs and limits

- $0.06/min running, $0 stopped, $0.20/GB-month for the volume.
- Each boot runs a cold `brew bundle` of `brew/devbox/Brewfile`. With the cache
  on the volume, that took 13.5 s.
- The first full `mise install` of the global config took 97 s. It put 17 GB on
  the volume, 20 GB used in total.
