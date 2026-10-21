# Claude Instructions

name: Patt O'Brien.

## Response Style

- Write in plain language.
- Put important caveats, failures, or surprises on their own line prefixed with
  `**Note:**` — never buried mid-paragraph.
- Short declarative sentences, one thought each. No fragments.
- A stated size ("one line", "a single bullet") is exact; add no headings or
  extras.

## Links

In Claude Code orchestrator sessions, where I'm talking with the agent, write
every reference as a markdown link, so I can click it in chat:

- Linear issue: `[INFRA-123](https://linear.app/finedesigns/issue/INFRA-123)`
- GitHub repo, PR or issue:
  `[owner/repo#12](https://github.com/owner/repo/pull/12)`
- local file: the absolute path as the target, a short path as the text, and the
  position as a fragment:
  - line: `[src/a.ts:42](/abs/path/src/a.ts#L42)`
  - line and column: `[src/a.ts:42:7](/abs/path/src/a.ts#L42C7)`
  - multi-line range: `[src/a.ts:42-50](/abs/path/src/a.ts#L42-L50)`

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
- Spawn subagents with `model: "opus"` instead of inheriting a Fable model,
  unless Fable is explicitly requested.

## No Hacks or Shortcuts

- Never propose a type cast (`as any`, `as unknown as X`), a version pin, or a
  workaround shim as the fix. Find the supported path first — a config option,
  an official SDK method, a provider bump. If only a hack exists, write it and
  say so; review decides.
- Use existing typesafe clients for every API: e.g. Octokit for GitHub (or
  alchemy/distilled github client), the provider SDK in Pulumi. Never hand-roll
  `fetch` + pagination.
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

## Directories and Repos

- `~/dev/*`: where all git repositories live
- `~/dev/pattobrien/<repo-name>`: place to clone my personal repos
- `~/dev/pattobrien/dotfiles`: personal dotfiles (symlinked to their respective
  applications' directories); use this repo to declare any global/userland tools
- `~/dev/pattobrien/shed`: reusable, importable, but private TS tools and
  packages (e.g. personal lint rules, vite plugins, turbo base configs, etc)
- `~/dev/<org-name>/<repo-name>`: non-personal repos, e.g. work orgs
- `~/dev/exploring/<repo-name>`: place to clone any external repo that needs to
  be explored
- Upstream PRs from my forks: push commits only; never post PR comments or
  review replies there. Draft the reply in chat and I post it.

## Tools

- Monitor tool: use `timeout_ms: 480000` unless a shorter watch fits; never
  above `600000`.
- Use `gh` for anything GitHub-related, not WebSearch.
- Use `pnpx`, never `npx`.
- Poll command output with ~5s timeouts and repeat; no long blocking waits.
- Fetch API keys yourself with `op`
  (`op item list --categories "API Credential"`, then `op read`); pipe into
  `.env` or env vars, never chat.

## General Coding Rules

- write repo scripts in Typescript (Node or Bun), not bash/zsh; ad-hoc terminal
  commands and throwaway measurements may use bash/zsh
- DO NOT USE EXCESSIVE DOC COMMENTS; well-written code is self-documenting
- No explanatory or meta comments in any file (code, configs, docs)
- Prefer dark mode for visual artifacts (HTML pages, mockups, charts).
