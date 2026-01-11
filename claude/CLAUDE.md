# Claude Instructions

## Tools

- ALWAYS USE `Bash(fd*)`, DO NOT USE `Bash(find*)`
- ALWAYS USE `Bash(rg*)`, DO NOT USE `Bash(grep*)`
- ALWAYS USE`pnpm`

### Typical Commands in a Monorepo

- `pnpm i`
- `pnpm dev`
- `pnpm build`
- `pnpm test` | `pnpm test:watch`
- `pnpm lint` | `pnpm lint:fix`
- `pnpm typecheck` | `pnpm typecheck:watch`
- `pnpm validate` (combines `lint`, `typecheck`, and `test`)

### Searching for Files

`fd` is a faster alternative to `find`.

`rg` is a faster alternative to `grep`.
