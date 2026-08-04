/// <reference lib="dom" />
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium, type Page } from "playwright-core";
import { PNG } from "pngjs";
import { expect, test as base } from "vite-plus/test";

import {
  colorStats,
  kittyTransmitRgba,
  loadTestImage,
  writeGraphicsArtifact,
} from "../../src/graphics.ts";
import { createHerdrSession, type HerdrTestSession } from "../../src/herdr.ts";
import { pollFor } from "../../src/term/backend.ts";
import { createXtermBackend, type XtermSession } from "../../src/term/xterm.ts";

/**
 * Rendered-pixel verification of the kitty graphics pipeline: the herdr
 * client's byte stream (from the Node emulator's PTY) is mirrored into a real
 * browser Terminal + full ImageAddon inside headless Chromium, and the test
 * asserts the pane's image rasterizes on the addon's compositing canvas —
 * multi-hue pixels where the image must land, and blend-through (canvas
 * alpha ~0, themed background in the composite) at its transparent regions.
 * The browser terminal is a passive replay sink — input and query answering
 * stay on the Node side (CSI 16t is answered by the xterm backend before
 * herdr's handshake needs it).
 */

const VENDOR = path.resolve(import.meta.dirname, "../../vendor/xterm-master");
const COLS = 160;
const ROWS = 45;
/** Synthetic host cell size the Node backend advertises (see xterm.ts). */
const HOST_CELL_W = 8;
const HOST_CELL_H = 16;

const IMAGE = loadTestImage();

/** Terminal background from the dotfiles kitty theme (kitty.conf `background`). */
const KITTY_CONF = path.resolve(import.meta.dirname, "../../../../.config/kitty/kitty.conf");
const THEME_BG = /^background\s+(#[0-9a-fA-F]{6})/m.exec(readFileSync(KITTY_CONF, "utf8"))?.[1];
if (!THEME_BG) throw new Error(`no background color found in ${KITTY_CONF}`);

const test = base
  // Isolated herdr server/session attached through the xterm.js backend.
  .extend("gfxSession", async ({}, { onCleanup }): Promise<HerdrTestSession<XtermSession>> => {
    const session = await createHerdrSession<XtermSession>({
      backend: createXtermBackend(),
      cols: COLS,
      rows: ROWS,
      label: "herdr-graphics-chromium",
    });
    onCleanup(() => session.dispose());
    return session;
  })

  // Headless Chromium page with a browser Terminal + ImageAddon mounted,
  // themed like the real terminal so artifacts match Patt's kitty.
  .extend("browserTerm", async ({}, { onCleanup }): Promise<Page> => {
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    onCleanup(() => browser.close());
    const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
    await page.setContent(
      `<!doctype html><html><head><style>${readFileSync(path.join(VENDOR, "xterm.css"), "utf8")}</style></head><body><div id="term"></div></body></html>`,
    );
    await page.addScriptTag({ path: path.join(VENDOR, "xterm-browser.js") });
    await page.addScriptTag({ path: path.join(VENDOR, "xterm-image-addon.js") });
    await page.evaluate(
      ({ cols, rows, background }) => {
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
        const browserTerm = new win.XtermBrowser.Terminal({
          cols,
          rows,
          allowProposedApi: true,
          theme: { background },
        });
        const addon = new win.XtermImageAddon.ImageAddon();
        browserTerm.loadAddon(addon);
        browserTerm.open(document.querySelector("#term")!);
        win.__term = browserTerm;
        win.__addon = addon;
      },
      { cols: COLS, rows: ROWS, background: THEME_BG },
    );
    return page;
  });

interface RegionSample {
  /** RGBA of the image region (row-major). */
  image: number[];
  /** RGBA of the same-size control region right of the image. */
  control: number[];
  /** Alpha at each requested point. */
  pointAlpha: number[];
}

/** Sample the addon's top compositing canvas. */
async function sampleCanvas(
  page: Page,
  region: { x: number; y: number; w: number; h: number; controlX: number },
  points: Array<[number, number]>,
): Promise<RegionSample> {
  return page.evaluate(
    ({ r, pts }) => {
      const win = window as unknown as {
        __addon: { _renderer: { _layers: Map<string, CanvasRenderingContext2D> } };
      };
      const ctx = win.__addon._renderer._layers.get("top");
      if (!ctx) return { image: [], control: [], pointAlpha: pts.map(() => 255) };
      const grab = (x: number) => Array.from(ctx.getImageData(x, r.y, r.w, r.h).data);
      return {
        image: grab(r.x),
        control: grab(r.controlX),
        pointAlpha: pts.map(([px, py]) => ctx.getImageData(px, py, 1, 1).data[3] ?? 0),
      };
    },
    { r: region, pts: points },
  );
}

test(
  "pane kitty image renders with alpha blend-through on the chromium canvas",
  { timeout: 60_000 },
  async ({ gfxSession, browserTerm, annotate, task }) => {
    const { client, term } = gfxSession;
    const page = browserTerm;

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

    // The real-image transmit, emitted by the pane's shell from a file (the
    // chunked payload is too long to type). The leading clear+home pins the
    // image to the pane's content origin.
    const file = path.join(tmpdir(), `e2e-kitty-icon-${gfxSession.name}.bin`);
    await writeFile(file, Buffer.from(`\x1b[2J\x1b[H${kittyTransmitRgba(IMAGE)}\n`, "latin1"));
    term.type(`cat ${file}\n`);

    // Expected host-cell block: pane content origin (border-inset rect),
    // spanning ceil(px / host-cell-px) host cells per herdr's re-encode.
    const layout = await client.panes.layout();
    const pane = layout.panes[0];
    if (!pane) throw new Error("expected a pane");
    const originCol = pane.rect.x + 1;
    const originRow = pane.rect.y + 1;
    const blockCols = Math.ceil(IMAGE.width / HOST_CELL_W);
    const blockRows = Math.ceil(IMAGE.height / HOST_CELL_H);

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
    // The placement scales the image into exactly blockCols x blockRows
    // browser cells at the pane content origin.
    const rect = {
      x: Math.floor((originCol - 1) * cell.width),
      y: Math.floor((originRow - 1) * cell.height),
      w: Math.ceil(blockCols * cell.width),
      h: Math.ceil(blockRows * cell.height),
      controlX: Math.floor((originCol + 2 * blockCols) * cell.width),
    };
    // Fully transparent asset points, mapped into the placed rect.
    const transparentPoints: Array<[number, number]> = IMAGE.transparentPoints.map(([ax, ay]) => [
      Math.round(rect.x + ((ax + 0.5) / IMAGE.width) * rect.w),
      Math.round(rect.y + ((ay + 0.5) / IMAGE.height) * rect.h),
    ]);

    let sample: RegionSample = { image: [], control: [], pointAlpha: [] };
    await pollFor(
      async () => {
        await pump();
        sample = await sampleCanvas(page, rect, transparentPoints);
        return colorStats(sample.image).colored > rect.w * rect.h * 0.15;
      },
      "the image's colored pixels on the addon canvas",
      15_000,
      100,
    );

    // A real multi-color image, not a stray fill: dense colored coverage
    // with at least two distinct hue clusters.
    const imageStats = colorStats(sample.image);
    expect(imageStats.colored).toBeGreaterThan(rect.w * rect.h * 0.15);
    expect(imageStats.hueClusters).toBeGreaterThanOrEqual(2);
    // Control region: no image pixels.
    expect(colorStats(sample.control).colored).toBe(0);

    // Blend-through: the asset's transparent regions stay transparent on
    // the compositing canvas...
    for (const alpha of sample.pointAlpha) {
      expect(alpha).toBeLessThan(30);
    }

    // ...so the themed terminal background shows through in the composite.
    const screenshot = await page.locator("#term").screenshot();
    const shot = PNG.sync.read(screenshot);
    const bg = [
      parseInt(THEME_BG.slice(1, 3), 16),
      parseInt(THEME_BG.slice(3, 5), 16),
      parseInt(THEME_BG.slice(5, 7), 16),
    ];
    for (const [px, py] of transparentPoints) {
      const i = (py * shot.width + px) * 4;
      for (const c of [0, 1, 2]) {
        expect(Math.abs((shot.data[i + c] ?? 0) - (bg[c] ?? 0))).toBeLessThanOrEqual(16);
      }
    }

    // Artifact: the full terminal element (herdr chrome included).
    const safeName = task.name.replace(/[^a-zA-Z0-9-_]/g, "_");
    await writeGraphicsArtifact(`${safeName}-terminal.png`, screenshot);
    await annotate("rendered terminal", "screenshot", {
      contentType: "image/png",
      body: screenshot.toString("base64"),
    });
  },
);
