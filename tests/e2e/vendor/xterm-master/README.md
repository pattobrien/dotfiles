# Vendored xterm.js master builds

Built from [xtermjs/xterm.js](https://github.com/xtermjs/xterm.js) master at
commit `904ae93` (2026-08), which carries two features unreleased on npm:

- kitty keyboard protocol + APC parser hooks in core (needed to register the
  kitty graphics handler on a headless terminal)
- kitty graphics MVP in `addons/addon-image` (`src/kitty/*`, PRs #5619/#5722):
  direct transmits (`a=t`/`a=T`, `t=d`), placements (`a=p`), delete, query

Files:

- `xterm-headless.mjs` — the `@xterm/headless` bundle
  (`src/headless/public/Terminal.ts`)
- `kitty-headless.mjs` — kitty graphics handler + storage without the
  DOM-bound `ImageAddon` wiring, from a custom entry
  (`addons/addon-image/src/KittyHeadless.ts`, kept in the local clone).
  Transmit/storage is DOM-free; the display path needs `createImageBitmap`
  and silently no-ops under Node, which is fine for storage assertions.

Rebuild (clone at `~/dev/exploring/xterm.js`):

```sh
npm install
./node_modules/.bin/tsgo -b ./tsconfig.all.json
./node_modules/.bin/esbuild src/headless/public/Terminal.ts \
  --bundle --format=esm --target=es2021 --tree-shaking=true \
  --outfile=<here>/xterm-headless.mjs
./node_modules/.bin/esbuild addons/addon-image/src/KittyHeadless.ts \
  --bundle --format=esm --target=es2021 --platform=neutral \
  --main-fields=module,main --tsconfig=addons/addon-image/src/tsconfig.json \
  --tree-shaking=true --outfile=<here>/kitty-headless.mjs
```

`KittyHeadless.ts` (not upstream) is:

```ts
export { KittyGraphicsHandler } from './kitty/KittyGraphicsHandler';
export { KittyImageStorage } from './kitty/KittyImageStorage';
export { parseKittyCommand } from './kitty/KittyGraphicsTypes';
export type { IKittyCommand, IKittyImageData } from './kitty/KittyGraphicsTypes';
export type { IImageAddonOptions } from './Types';
```

The `.d.mts` files are hand-written: headless re-exports the released
`@xterm/headless` typings (public API unchanged at 6.0.0); the kitty bundle's
types are loose since the harness stubs the addon-internal dependencies.
