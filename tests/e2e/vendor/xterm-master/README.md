# Vendored xterm.js master builds

Built from [xtermjs/xterm.js](https://github.com/xtermjs/xterm.js) master at
commit `904ae935269eef5ec6a1415b64463c3d02eff1eb` (2026-08), which carries
two features unreleased on npm:

- kitty keyboard protocol + APC parser hooks in core (needed to register the
  kitty graphics handler on a headless terminal)
- kitty graphics MVP in `addons/addon-image` (`src/kitty/*`, PRs #5619/#5722):
  direct transmits (`a=t`/`a=T`, `t=d`), placements (`a=p`), delete, query

Bundles:

- `xterm-headless.mjs` — the `@xterm/headless` bundle
  (`src/headless/public/Terminal.ts`), used by `src/term/xterm.ts`
- `kitty-headless.mjs` — kitty graphics handler + storage without the
  DOM-bound `ImageAddon` wiring (`entries/KittyHeadless.ts`). Transmit/storage
  is DOM-free; the display path needs `createImageBitmap` and silently no-ops
  under Node, which is fine for storage assertions.
- `xterm-browser.js` / `xterm-image-addon.js` — IIFE globals (`XtermBrowser`,
  `XtermImageAddon`) of the full browser Terminal and the complete ImageAddon
  (DOM renderer + kitty handler, `entries/BrowserKitty.ts`), injected into
  headless Chromium by the rendered-pixel graphics test.
- `xterm.css` — upstream stylesheet for the browser terminal page.

Rebuild everything with `./build.sh` (pins the commit, copies the `entries/`
files into the clone at `~/dev/exploring/xterm.js` — override with
`XTERM_CLONE` — and reruns all esbuild bundles).

The `.d.mts` files are hand-written: headless re-exports the released
`@xterm/headless` typings (public API unchanged at 6.0.0); the kitty bundle's
types are loose since the harness stubs the addon-internal dependencies.
