import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium, type Page } from "playwright-core";
import { expect, test } from "vite-plus/test";

import { createHerdrSession } from "../../src/herdr.ts";
import { pollFor } from "../../src/term/backend.ts";
import { createXtermBackend, type XtermSession } from "../../src/term/xterm.ts";

/**
 * Rendered-pixel verification of the kitty graphics pipeline: the herdr
 * client's byte stream (from the Node emulator's PTY) is mirrored into a real
 * browser Terminal + full ImageAddon inside headless Chromium, and the test
 * asserts red pixels on the addon's compositing canvas where the pane's image
 * must land. The browser terminal is a passive replay sink — input and query
 * answering stay on the Node side (CSI 16t is answered by the xterm backend
 * before herdr's handshake needs it).
 */

const VENDOR = path.resolve(import.meta.dirname, "../../vendor/xterm-master");
const COLS = 160;
const ROWS = 45;
/** Synthetic host cell size the Node backend advertises (see xterm.ts). */
const HOST_CELL_W = 8;
const HOST_CELL_H = 16;
const IMAGE_PX = 32;

/** Kitty spec caps payload chunks at 4096 base64 chars. */
function kittyTransmitDisplay(rgba: Buffer): string {
  const b64 = rgba.toString("base64");
  const control = `a=T,t=d,f=32,s=${IMAGE_PX},v=${IMAGE_PX},i=888,q=2`;
  if (b64.length <= 4096) return `\x1b_G${control};${b64}\x1b\\`;
  let out = `\x1b_G${control},m=1;${b64.slice(0, 4096)}\x1b\\`;
  let offset = 4096;
  while (offset < b64.length) {
    const chunk = b64.slice(offset, offset + 4096);
    offset += 4096;
    out += `\x1b_Gm=${offset < b64.length ? 1 : 0},q=2;${chunk}\x1b\\`;
  }
  return out;
}

interface RegionCounts {
  imageRed: number;
  imageTotal: number;
  controlRed: number;
}

/** Count saturated-red pixels on the addon's top compositing canvas. */
async function sampleRegions(
  page: Page,
  region: { x: number; y: number; w: number; h: number; controlX: number },
): Promise<RegionCounts> {
  return page.evaluate((r) => {
    const win = window as unknown as {
      __addon: { _renderer: { _layers: Map<string, CanvasRenderingContext2D> } };
    };
    const ctx = win.__addon._renderer._layers.get("top");
    if (!ctx) return { imageRed: 0, imageTotal: r.w * r.h, controlRed: 0 };
    const isRed = (d: Uint8ClampedArray, i: number) =>
      d[i]! > 150 && d[i + 1]! < 80 && d[i + 2]! < 80 && d[i + 3]! > 200;
    const count = (x: number) => {
      const data = ctx.getImageData(x, r.y, r.w, r.h).data;
      let red = 0;
      for (let i = 0; i < data.length; i += 4) if (isRed(data, i)) red++;
      return red;
    };
    return { imageRed: count(r.x), imageTotal: r.w * r.h, controlRed: count(r.controlX) };
  }, region);
}

test(
  "pane kitty image renders as red pixels on the chromium canvas",
  { timeout: 60_000 },
  async ({ annotate }) => {
    const session = await createHerdrSession<XtermSession>({
      backend: createXtermBackend(),
      cols: COLS,
      rows: ROWS,
      label: "herdr-graphics-chromium",
    });
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    try {
      const { client, term } = session;
      const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
      await page.setContent(
        `<!doctype html><html><head><style>${readFileSync(path.join(VENDOR, "xterm.css"), "utf8")}</style></head><body><div id="term"></div></body></html>`,
      );
      await page.addScriptTag({ path: path.join(VENDOR, "xterm-browser.js") });
      await page.addScriptTag({ path: path.join(VENDOR, "xterm-image-addon.js") });
      await page.evaluate(
        ({ cols, rows }) => {
          const win = window as unknown as {
            XtermBrowser: {
              Terminal: new (opts: object) => {
                loadAddon(a: object): void;
                open(el: Element): void;
              };
            };
            XtermImageAddon: { ImageAddon: new () => object };
            __term: unknown;
            __addon: unknown;
          };
          const browserTerm = new win.XtermBrowser.Terminal({ cols, rows, allowProposedApi: true });
          const addon = new win.XtermImageAddon.ImageAddon();
          browserTerm.loadAddon(addon);
          browserTerm.open(document.querySelector("#term")!);
          win.__term = browserTerm;
          win.__addon = addon;
        },
        { cols: COLS, rows: ROWS },
      );

      // Mirror pump: replay new PTY bytes into the browser terminal, in order.
      let fed = 0;
      const pump = async () => {
        const raw = term.raw();
        if (raw.length === fed) return;
        const chunk = raw.slice(fed);
        fed = raw.length;
        await page.evaluate(
          (data) =>
            new Promise<void>((resolve) => {
              (
                window as unknown as { __term: { write(d: string, cb: () => void): void } }
              ).__term.write(data, resolve);
            }),
          chunk,
        );
      };

      await term.waitFor(/\+/, 5_000);

      // Solid red 32x32 RGBA, emitted by the pane's shell from a file (the
      // payload is too long to type). The leading clear+home pins the image
      // to the pane's content origin.
      const rgba = Buffer.alloc(IMAGE_PX * IMAGE_PX * 4);
      for (let i = 0; i < rgba.length; i += 4) {
        rgba[i] = 255;
        rgba[i + 3] = 255;
      }
      const file = path.join(tmpdir(), `e2e-kitty-red-${session.name}.bin`);
      await writeFile(file, Buffer.from(`\x1b[2J\x1b[H${kittyTransmitDisplay(rgba)}\n`, "latin1"));
      term.type(`cat ${file}\n`);

      // Expected host-cell block: pane content origin (border-inset rect),
      // spanning ceil(32/8) x ceil(32/16) host cells per herdr's re-encode.
      const layout = await client.panes.layout();
      const pane = layout.panes[0];
      if (!pane) throw new Error("expected a pane");
      const originCol = pane.rect.x + 1;
      const originRow = pane.rect.y + 1;
      const blockCols = Math.ceil(IMAGE_PX / HOST_CELL_W);
      const blockRows = Math.ceil(IMAGE_PX / HOST_CELL_H);

      const cell = await page.evaluate(() => {
        const win = window as unknown as {
          __term: {
            _core: {
              _renderService: { dimensions: { css: { cell: { width: number; height: number } } } };
            };
          };
        };
        return win.__term._core._renderService.dimensions.css.cell;
      });
      // Sample one extra cell on each side to tolerate border-width drift.
      const region = {
        x: Math.floor((originCol - 1) * cell.width),
        y: Math.floor((originRow - 1) * cell.height),
        w: Math.ceil((blockCols + 2) * cell.width),
        h: Math.ceil((blockRows + 2) * cell.height),
        controlX: Math.floor((originCol + 20) * cell.width),
      };

      let counts: RegionCounts = { imageRed: 0, imageTotal: 0, controlRed: 0 };
      await pollFor(
        async () => {
          await pump();
          counts = await sampleRegions(page, region);
          return counts.imageRed > 100;
        },
        "red pixels on the image canvas",
        15_000,
        100,
      );

      // The 32x32 source scales to blockCols x blockRows browser cells.
      const expectedRed = Math.round(blockCols * cell.width) * Math.round(blockRows * cell.height);
      expect(counts.imageRed).toBeGreaterThan(expectedRed * 0.5);
      expect(counts.controlRed).toBe(0);

      const screenshot = await page.screenshot({
        clip: { x: 0, y: 0, width: 800, height: 400 },
      });
      await annotate("rendered terminal", "screenshot", {
        contentType: "image/png",
        body: screenshot.toString("base64"),
      });
    } finally {
      await browser.close();
      await session.dispose();
    }
  },
);
