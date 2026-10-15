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
devbox-mac instance up <name>              # reuse or create, boot, screenshot
devbox-mac instance shot <name> [out.png]  # screenshot over the instance's VNC
devbox-mac instance click <name> <x> <y>   # click at framebuffer pixels
devbox-mac instance ssh <name>             # nsc ssh into the instance
devbox-mac instance vnc <name>             # nsc vnc, to watch the screen
devbox-mac instance down <name>            # nsc destroy
```

What differs from the Devbox:

- An instance carries one volume, the `tinycast-xcode-agent` cache volume (50
  GB) at `/Volumes/cache`. Every instance measured with a second volume,
  persistent or another cache volume, forked an empty cache volume. Of two
  instances created in the same second against the tag, the cache-only one
  forked 577 MB and the one that also attached a persistent volume got an empty
  cache. So there is no persistent volume.
- A tag can hand out an empty fork for a while after empty-fork machines are
  destroyed. On 2026-10-15 three probes that had forked empty were destroyed
  around 12:42 UTC, and CI's `agent-cache` runner and an instance both forked
  `0B` at 12:44, while `nsc volume list` kept reporting the tag at 578 MB. CI's
  run reseeded the tag, and the next instance forked 577 MB and hit 199 of 199
  compiles. The cause is not confirmed. What is measured is that when the
  `compilation cache` step prints `0B`, the next preview run heals it.
- `/Volumes/devbox` is a plain directory on the instance disk, owned by
  `runner`, which the `devbox dir` phase creates before the boot. The boot and
  every path under [What persists](#what-persists) work unchanged, but nothing
  there outlives the instance, which lives at most 8 h. Push work before `down`.
- The boot runs with `--cache /Volumes/cache`. That links
  `~/Library/Developer/Xcode/DerivedData/CompilationCache.noindex` to
  `/Volumes/cache/Users/runner/Library/Developer/Xcode/DerivedData/CompilationCache.noindex`,
  where CI's cache action leaves it, and exports
  `COMPILATION_CACHE_ENABLE_CACHING_DEFAULT=YES`. The build log then shows
  `Cache hit` or `Cache miss` per compile job. The `compilation cache` step
  prints the size of the forked cache, so an empty fork shows in the `up`
  output.
- `shot` and `click` use the same VNC service a Devbox's display API uses.
  `GetVNCConfig` on the regional Compute API, picked from the instance's
  `ingress_domain`, returns the endpoint and credentials, and the SDK's generic
  `@namespacelabs/sdk/vnc` client connects with the ingress bearer token. The
  boot runs with `--display`, so the vmguest TCC rows, the replayd approval and
  the screen-capture probe run as on a Devbox, and `up` ends with a
  `<name>-up.png` screenshot.
- Apple's Screen Sharing drops pointer and key events for 2 s after its agent
  reports the cursor position, which happens at session start and 0.6 s after
  every cursor move, unless the viewer sent Apple's `SetMode` message (type 10,
  mode 2) after the handshake. The published SDK never sends it, so
  `patches/@namespacelabs__sdk@1.5.1.patch` adds the write under Apple Remote
  Desktop authentication until
  [pattobrien/typescript-sdk@vnc-setmode](https://github.com/pattobrien/typescript-sdk/tree/vnc-setmode)
  lands upstream. Measured on fresh daemons, a click 1.2 s into the session
  landed 3 of 3 times with the message and 0 of 3 without.
- Each new VNC session makes macOS show "Your screen is being controlled", which
  takes focus 0.3 to 1.6 s after connecting and closes any open menu. Launching
  apps is unaffected. Menu-driving work needs one session per task, or clicks
  from inside the guest over `nsc ssh`.
- GitHub auth comes from the host. `up` pipes `gh auth token` into
  `gh auth login --with-token` on the guest and runs `gh auth setup-git`.
- An instance has no stop. `up` labels it `devbox-mac=<name>`, reuses a running
  instance with that label, and otherwise creates one with `--duration 8h`.
  Namespace destroys it when the duration ends, and `/Volumes/devbox` goes with
  it. Each create runs the full boot, `mise install` included.
- Xcode keys each compile by the canonical source path, so the hits only come
  for a build from `~/dev/pattobrien/tinycast`, which resolves to
  `/Volumes/devbox/dev/pattobrien/tinycast`, the path CI's `agent-cache` job
  builds at. A checkout anywhere else reuses only the SDK module tasks.
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
