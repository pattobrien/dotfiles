# Claude Instructions

## User Directories

Common directories/repositories to be aware of:

- `~/dev/*`: where all git repositories live
- `~/dev/pattobrien/<repo-name>`: place to clone my personal repos
- `~/dev/pattobrien/dotfiles`: personal dotfiles (symlinked to their respective
  applications' directories); use this repo to declare any global/userland tools
- `~/dev/exploring/<repo-name>`: place to clone any external repo that needs to
  be explored

## Tools

### Typical Commands in a Monorepo

```sh
pnpm install
pnpm dev
pnpm build
pnpm test # or `pnpm test:watch`
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
pnpm typecheck # or `pnpm typecheck:watch`
pnpm validate # combines `lint`, `typecheck`, and `test`
```

### API Keys

- When you need an API key, don't ask me first — just look it up directly via
  the `op` CLI (e.g. `op item list --categories "API Credential"` to discover,
  then `op read "op://<vault>/<item>/credential"` to fetch). Each read still
  requires manual approval in 1Password, so it's safe. Prefer piping the secret
  straight into an `.env` file or env var rather than printing to chat.
