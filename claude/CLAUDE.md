# Claude Instructions

name: Patt O'Brien.

## Response Style

- Lead every response with the takeaway: the one- or two-sentence answer,
  outcome, or decision comes first; supporting detail after, only if needed.
- Number the steps for any multi-step result or instruction; one action per
  step.
- No preamble, no recap of what I asked, no closing summary or sign-off.
- Stay on scope: no tangents, alternatives I didn't ask about, or "you could
  also" suggestions unless something important is at stake.
- Put important caveats, failures, or surprises on their own line prefixed
  with `**Note:**` — never buried mid-paragraph.
- Compress the prose: cut filler, hedges, and transitions ("essentially",
  "it's worth noting", "in other words"); prefer "Fixed X. Cause was Y." over
  a full sentence when the fragment loses nothing.
- Say it once — never restate the same point in different words, and never
  re-explain something from earlier in the conversation.

## User Directories

Common directories/repositories to be aware of:

- `~/dev/*`: where all git repositories live
- `~/dev/pattobrien/<repo-name>`: place to clone my personal repos
- `~/dev/pattobrien/dotfiles`: personal dotfiles (symlinked to their respective
  applications' directories); use this repo to declare any global/userland tools
- `~/dev/<org-name>/<repo-name>`: non-personal repos, e.g. work orgs
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

## Personal Platform

- `pattobrien/dotfiles`
- `pattobrien/ts-workflows`: ??
- `pattobrien/shed`: reusable, importable, but private TS tools and packages
  (e.g. personal lint rules, vite plugins, turbo base configs, etc)
