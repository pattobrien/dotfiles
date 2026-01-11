# Claude Instructions

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

### Searching for Files

`fd` is a faster alternative to `find`.

`rg` is a faster alternative to `grep`.
