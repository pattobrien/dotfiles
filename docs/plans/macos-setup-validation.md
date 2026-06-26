# macOS Setup Validation E2E Plan

## Summary

Create an opt-in macOS setup validation suite that runs against a fresh Namespace
macOS machine, not the developer's local Mac.

Add `docs/plans/macos-setup-validation.md`, a new
`.github/workflows/validate-macos-setup.yml`, app setup script hooks under
`scripts/app-setup/`, and e2e tests under `tests/e2e`.

Use TDD red/green:

1. First create failing e2e validations.
2. Then implement the matching app setup processes until the validations pass.
3. Failures are acceptable only when they fail for the expected missing setup
   reason.

## Key Changes

- Add `validate-macos-setup.yml`, inspired by
  `validate-macos-install.yaml`.
  - Run on `namespace-profile-mac`.
  - Trigger on setup/test/app-config paths plus `workflow_dispatch`.
  - Run base install steps: `./install`, `./install homebrew`,
    `./install essentials`, `./install macos`, `./install mise`.
  - Keep `./install xcode` skipped.
  - Do not run `./install personal`.
  - Install only v1 extra apps missing from essentials: `shottr`, `spotify`,
    `docker-desktop`, `claude`, `codex`, Chrome if needed by setup flows.
  - Install Peekaboo explicitly from `@steipete/peekaboo`.
- Add opt-in e2e scripts in `tests/e2e/package.json`:
  - `test:macos-gui`
  - `test:apps`
  - `test:setup-validation`
- Add Vitest tags:
  - `macos-gui`: global shortcuts, Raycast, Shottr, GUI automation.
  - `apps`: real app workflow checks.
  - Keep `kitty` opt-in.
- Add `scripts/app-setup/` with one idempotent setup script per app.
  - Workflow runs existing setup scripts before tests.
  - Missing setup scripts produce notices, not setup-step failures.
  - Tests may fail afterward with expected app-state failures.

## Remote Validation Flow

- Do not run the full setup validation tests locally.
- For manual red/green work, create a fresh Namespace macOS instance with
  `nsc create` using the workspace's mac profile/defaults inferred from the
  existing `namespace-profile-mac` CI setup.
- SSH into it with `nsc ssh <instance-id>`.
- Place the repo at `~/dev/pattobrien/dotfiles`, matching README setup
  assumptions.
- Run the same sequence as the workflow:
  - base install scripts,
  - extra app install step,
  - app setup script runner,
  - `cd tests/e2e && vp run test:setup-validation`.
- Tests must be idempotent and safe to rerun on the same instance while
  debugging.
- Destroy the Namespace instance after the validation session.

## Test Scenarios

- Terminal setup:
  - `zsh -lic 'echo shell-ok'` succeeds without missing source/plugin errors.
  - `vp --version` prints a version-like value.
- Kitty/tmux:
  - Update stale tests to current bindings.
  - Preserve `Cmd+Shift+D` as "switch/open dotfiles session."
  - Assert current F-key and User-key mappings.
- Tmux plugins:
  - Test one real tmux-resurrect/continuum behavior in a scoped tmux socket.
  - Create session/window, save, restart scoped server, assert restored
    session/window.
- Shottr:
  - Use Calculator fixture.
  - Drive `Cmd+Shift+4`, `Space`, click window.
  - Assert new file in `~/Documents/Screenshots`.
  - Assert clipboard contains image data.
- Raycast:
  - `Cmd+Space` opens Raycast.
  - Query with multiple results.
  - `Ctrl+j`/`Ctrl+k` changes selected row, proving vim navigation.
- Docker:
  - Wait for Docker Desktop daemon.
  - Run `docker run --rm hello-world`.
- Spotify:
  - Launch Spotify.
  - Play one hardcoded public track URI.
  - Assert playback enters `playing`.
  - Pause in cleanup.
  - Initial failing state should clearly distinguish:
    - Spotify app missing: install workflow bug.
    - Spotify app installed but logged out: expected missing setup process.
    - Spotify app logged in but playback fails: app workflow/setup bug.
- Claude/Codex CLIs:
  - Start each in a controlled tmux pane.
  - Assert interactive UI opens without setup/auth errors.
  - Do not send model prompts.
- Skip Linear and Obsidian in v1.

## Setup Process Follow-Up

After the failing tests exist, implement setup scripts iteratively.

Spotify setup is expected to require a dependency chain:

- 1Password desktop must be installed, signed in, and CLI/browser-extension
  integration must be usable.
- Chrome must have an existing usable profile.
- The 1Password Chrome extension must be installed and unlocked/configured.
- Spotify sign-in uses OAuth in Chrome.
- Once the browser OAuth flow completes, Spotify desktop should be authenticated
  and the playback validation should pass.

Do not solve the full 1Password/Chrome/Spotify OAuth chain in the first
failing-test pass. The test should expose the missing state cleanly so each
setup script can be built in order.

## Assumptions

- `validate-macos-setup.yml` is intentionally blocking, even while red during
  TDD.
- Red is acceptable only when the failure proves a missing app setup use case.
- 1Password auth/setup is not part of the first failing-test implementation, but
  it is in scope for later setup-process work, especially for Spotify.
- App setup scripts are responsible for login/config state when available.
- The new tests are opt-in and may steal focus, alter clipboard, launch apps,
  and briefly play audio.
