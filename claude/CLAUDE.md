# Claude Instructions

name: Patt O'Brien.

## Response Style

- ALWAYS activate and adhere to the `iso-24495-1` Plain Language skill across
  all responses
- use bullet points instead of long paragraphs of text
- No preamble, no recap of what I asked, no closing summary or sign-off.
- Stay on scope: no tangents, alternatives I didn't ask about, or "you could
  also" suggestions unless something important is at stake.
- Put important caveats, failures, or surprises on their own line prefixed with
  `**Note:**` — never buried mid-paragraph.
- Compress the prose: cut filler, hedges, and transitions ("essentially", "it's
  worth noting", "in other words"); prefer "Fixed X. Cause was Y." over a full
  sentence when the fragment loses nothing.
- A stated size ("one line", "a single bullet") is exact; add no headings or
  extras.
- Completion reports: only new information; never re-list what we already
  discussed.
- Always write a reference as a markdown link, so I can click it in chat:
  - any web url: `[github.com/settings/apps](https://github.com/settings/apps)`
  - Linear issue: `[INFRA-123](https://linear.app/finedesigns/issue/INFRA-123)`
  - GitHub repo, PR or issue:
    `[owner/repo#12](https://github.com/owner/repo/pull/12)`
  - npm package: `[pathe](https://www.npmjs.com/package/pathe)`
  - docs or any other web page: link the page itself
  - local file: the absolute path as the target, a short path as the text, and
    the position as a fragment:
    - line: `[src/a.ts:42](/abs/path/src/a.ts#L42)`
    - line and column: `[src/a.ts:42:7](/abs/path/src/a.ts#L42C7)`
    - line range: `[src/a.ts:42-50](/abs/path/src/a.ts#L42-L50)`

## Memory

- Never save a memory on your own initiative. Only write to auto memory when I
  explicitly ask (e.g. "remember this").

## Parallel Research

- When a question spans more than one source, fan out subagents instead of
  answering serially — e.g. one reading local package source, one fetching the
  current changelog/release notes, one searching for the canonical GitHub
  tracking issue. Synthesize with a citation per claim.
- Default to fan-out for decisions that matter (tool selection, version
  migrations, architecture comparisons) and for any audit that sweeps many
  files, runs, or logs.

## No Hacks or Shortcuts

- Never propose a type cast (`as any`, `as unknown as X`), a version pin, or a
  workaround shim as the fix. Find the supported path first — a config option,
  an official SDK method, a provider bump.
- Use the official client for every API: Octokit for GitHub, the provider SDK in
  Pulumi. Never hand-roll `fetch` + pagination.
- If only a hack exists, say so explicitly and ask before writing it.
- Restore my existing tool, or use its built-in config key, before building
  anything custom. If no package exists, drop the feature.
- No `command -v` guards, silent fallbacks or invented env-var gates; let
  missing tools fail loudly.

## Verification

- Validate and reproduce everything yourself in staging; never hand me a test
  checklist. Screenshot before claiming any browser state.
- If your conclusion contradicts what I said about my own system, check the
  source first.

## Herdr

- Never launch anything with focus; always `--no-focus`, then tell me where it
  is.
- Test herdr only in a separate `herdr --session <name>`, never my live session.
- PR branches go in `herdr worktree create`; the main checkout stays on `main`.
- Run tests in their own herdr tab, never the Bash tool; never pipe through
  `tail`.

## Visual Artifacts

- Always prefer dark mode for anything visual I'll look at — HTML
  artifacts/wireframes/mockups, generated UIs, charts, screenshots of themed
  tools. Default to a dark palette.
- Always render HTML artifacts in a true herdr pane next to the conversation so
  we can view them together:
  1. `herdr pane split --current --direction right --cwd "$PWD" --no-focus`
  2. `herdr pane run <new-pane-id> "terminal-browser open <file>"` Never use
     `terminal-browser --split` — it bypasses herdr and splits via kitty remote
     control, leaving the pane unmanaged.

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

- Monitor tool: use `timeout_ms: 480000` unless a shorter watch fits; never
  above `600000`.
- Use `gh` for anything GitHub-related, not WebSearch.
- Use `pnpx`, never `npx`.
- Poll command output with ~5s timeouts and repeat; no long blocking waits.

### Typical Commands in a Monorepo

Vite+ (`vp`) conventions:

```sh
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm check # `vp check`: format, lint and typecheck. `vp check --fix` to fix
pnpm ready # root only: `vp check && vp run -r test && vp run -r build`
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

## General Coding Rules

- write scripts in Typescript (Node or Bun), not bash/zsh
- DO NOT USE EXCESSIVE DOC COMMENTS; well-written code is self-documenting
- No explanatory or meta comments in any file (code, configs, docs)
