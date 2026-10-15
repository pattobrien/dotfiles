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
devbox-mac create <name>             # create the Devbox from the spec, then up
devbox-mac up <name>                 # pull dotfiles, boot, gh auth, 1Password token, screenshot
devbox-mac shot <name> [out.png]     # screenshot only
devbox-mac click <name> <x> <y>      # click at framebuffer pixels (2560x1600)
devbox-mac down <name>               # stop the Devbox
devbox-mac seed-doppler <name> <op-reference>
```

`up` clicks Allow on the "vmguest is requesting to bypass the system private
window picker" prompt, which the boot raises on purpose with its first
`screencapture`. Then it saves `<name>-up.png` in the current directory.

## Doppler

The global mise config resolves its `[env]` with
`doppler secrets get … -p platform -c prod`. Without a Doppler token, `mise env`
and every mise shim exit 1, so mise tools on the Devbox stay broken.
`setup_macos.zsh` calls `macos-defaults` through a shim, so `./install devbox`,
and with it `up`, exits non-zero until a token is configured.

None of the tokens in the 1Password item "Doppler Service Tokens" can read
project `platform`. To fix this, an operator creates a `platform/prod` service
token in Doppler and stores it in 1Password. After that, run this before `up` on
every boot:

```sh
devbox-mac seed-doppler <name> "op://<vault>/<item>/<field>"
```

`up` cannot persist the token, because Doppler keeps it in the login keychain
with a reference in `~/.doppler`, and both reset on every start. On a brand-new
Devbox, the Doppler binary only exists after the first `up` has run
`mise install`, so seed after that first run.

## Costs and limits

- $0.06/min running, $0 stopped, $0.20/GB-month for the volume.
- The Developer plan allows one Devbox per user.
- Each boot runs a cold `brew bundle` of `brew/devbox/Brewfile`. With the cache
  on the volume, that took 13.5 s.
- The first full `mise install` of the global config took 97 s. It put 17 GB on
  the volume, 20 GB used in total.
