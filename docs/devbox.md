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
`xcode-select`, TCC grants, the replayd screen-capture approval for
`/opt/namespace/vmguest`, never sleep, wake), `devbox setup-github`, the Doppler
token, `install` (`./install devbox`, which is `mise install` and the macOS
defaults), then it saves `<name>-up.png` in the current directory. The replayd
approval is what keeps the "vmguest is requesting to bypass the system private
window picker" dialog from appearing on the first screenshot; TCC rows alone do
not cover it. Secrets land before `install` so mise can use the GitHub token and
the Doppler token on the first boot of a fresh volume.

## Instances

`devbox-mac instance` runs the same boot on a raw Namespace compute instance
(`nsc create`, `macos/arm64:6x14`, macOS 27) instead of a Devbox. An instance
can attach a cache volume, which a Devbox cannot, so it mounts the Xcode
compilation cache under the cache tag `tinycast-xcode-agent`. Tinycast CI's
`agent-cache` job builds Debug into that tag on every Tinycast pull request.
CI's Release build writes `tinycast-xcode`, which an instance never mounts.

```sh
devbox-mac instance up <name>    # reuse or create, then run the boot phases
devbox-mac instance ssh <name>   # nsc ssh into the instance
devbox-mac instance vnc <name>   # nsc vnc, the only way to see the screen
devbox-mac instance down <name>  # nsc destroy
```

What differs from the Devbox:

- An instance carries two volumes. A persistent volume tagged `<name>` (100 GB)
  mounts at `/Volumes/devbox`, so the boot and everything under
  [What persists](#what-persists) work unchanged. The `tinycast-xcode-agent`
  cache volume (50 GB) mounts at `/Volumes/cache`.
- The boot runs with `--cache /Volumes/cache`. That links
  `~/Library/Developer/Xcode/DerivedData/CompilationCache.noindex` to
  `/Volumes/cache/Users/runner/Library/Developer/Xcode/DerivedData/CompilationCache.noindex`,
  where CI's cache action leaves it, and exports
  `COMPILATION_CACHE_ENABLE_CACHING_DEFAULT=YES`. The build log then shows
  `Cache hit` or `Cache miss` per compile job. The `compilation cache` step
  prints the size of the forked cache, so an empty fork shows in the `up`
  output.
- There is no display API. The boot skips the vmguest TCC rows, the replayd
  approval and the screen-capture probe, which only the Devbox passes with
  `--display`, and there is no `screenshot` phase. Use `nsc vnc` to look.
- GitHub auth comes from the host. `up` pipes `gh auth token` into
  `gh auth login --with-token` on the guest and runs `gh auth setup-git`.
- An instance has no stop. `up` labels it `devbox-mac=<name>`, reuses a running
  instance with that label, and otherwise creates one with `--duration 8h`.
  Namespace destroys it when the duration ends. Each create starts from a fresh
  home, so `up` runs the full boot again on the persistent volume.
- A create forks the newest cache generation that the node it lands on holds.
  Namespace copies a new generation to other nodes in the background, and a node
  without a copy mounts an empty volume
  ([cache volumes](https://namespace.so/docs/architecture/storage/cache-volumes.md#cache-hits-and-misses)).
  An instance created within about a minute of a commit to the tag can fork an
  empty volume and build cold once.
- `down` destroys the instance, and Namespace commits the instance's own
  generation back to `tinycast-xcode-agent`. The next `agent-cache` run forks it
  and commits a fresh one.

An instance costs $0.06/min while it runs, which is $3.60 an hour and $28.80 for
a full 8 h duration.

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
