#!/bin/sh
# Regenerates every vendored xterm.js bundle from the pinned upstream commit.
set -eu

XTERM_COMMIT=904ae935269eef5ec6a1415b64463c3d02eff1eb
CLONE="${XTERM_CLONE:-$HOME/dev/exploring/xterm.js}"
HERE="$(cd "$(dirname "$0")" && pwd)"

[ -d "$CLONE" ] || git clone https://github.com/xtermjs/xterm.js "$CLONE"
git -C "$CLONE" fetch origin
git -C "$CLONE" checkout "$XTERM_COMMIT"

cp "$HERE/entries/KittyHeadless.ts" "$CLONE/addons/addon-image/src/KittyHeadless.ts"
cp "$HERE/entries/BrowserKitty.ts" "$CLONE/addons/addon-image/src/BrowserKitty.ts"

cd "$CLONE"
npm install

# Node bundles (ESM)
./node_modules/.bin/esbuild src/headless/public/Terminal.ts \
  --bundle --format=esm --target=es2021 --tree-shaking=true \
  --outfile="$HERE/xterm-headless.mjs"
./node_modules/.bin/esbuild addons/addon-image/src/KittyHeadless.ts \
  --bundle --format=esm --target=es2021 --platform=neutral \
  --main-fields=module,main --tsconfig=addons/addon-image/src/tsconfig.json \
  --tree-shaking=true --outfile="$HERE/kitty-headless.mjs"

# Browser bundles (IIFE globals for Playwright page injection). The Terminal
# bundle must not use the addon tsconfig: src/browser needs its own
# experimentalDecorators setting, which esbuild picks up per-directory.
./node_modules/.bin/esbuild src/browser/public/Terminal.ts \
  --bundle --format=iife --global-name=XtermBrowser --platform=browser \
  --target=es2021 --tree-shaking=true --outfile="$HERE/xterm-browser.js"
./node_modules/.bin/esbuild addons/addon-image/src/BrowserKitty.ts \
  --bundle --format=iife --global-name=XtermImageAddon --platform=browser \
  --target=es2021 --main-fields=module,main \
  --tsconfig=addons/addon-image/src/tsconfig.json --tree-shaking=true \
  --outfile="$HERE/xterm-image-addon.js"

cp css/xterm.css "$HERE/xterm.css"
