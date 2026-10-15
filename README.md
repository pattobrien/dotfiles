# dotfiles

Configurations for Neovim, kitty, git, and other various developer tools.

## TypeScript Tooling

This repo includes a pnpm + [Vite+](https://github.com/nicepkg/vite-plus)
monorepo for TypeScript tools.

### Workspace structure

```
tools/scripts     # Standalone TS scripts (linear-edit, claude-otel-headers)
tests/e2e         # Terminal e2e tests (kitty, nvim)
```

### Development

```sh
vp install          # install dependencies
vp check            # format + lint + typecheck
vp test             # run tests
vp run build -r     # build all packages
```

## Docs

- [Setup](docs/setup.md)
- [Maintenance](docs/maintenance.md)
- [Keyboard Shortcuts](docs/keyboard-shortcuts.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Devbox](docs/devbox.md)
- [TODO](docs/todo.md)
