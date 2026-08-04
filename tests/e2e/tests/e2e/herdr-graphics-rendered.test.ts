/**
 * @module-tag e2e-kitty
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { execa } from "execa";
import Herdr from "herdr-ts-sdk";
import { PNG } from "pngjs";
import { expect } from "vite-plus/test";

import {
  colorStats,
  isChromatic,
  kittyTransmitPng,
  loadTestImage,
  mapPoint,
  writeGraphicsArtifact,
  type Bounds,
} from "../../src/graphics.ts";
import {
  herdrSocketPath,
  newHerdrSessionName,
  stopHerdrSession,
  waitForHerdrSocket,
} from "../../src/herdr.ts";
import { launchKittyPanel, type KittyPanel } from "../../src/kitty-panel.ts";
import { pollFor } from "../../src/term/backend.ts";
import { test as base } from "../fixtures.ts";

/**
 * Rendered-pixel verification: herdr running inside a REAL kitty OS window
 * must rasterize a pane-emitted kitty-graphics image on screen — the
 * protocol-level tests in herdr-graphics.test.ts cannot see whether the
 * re-emitted escapes actually render, or whether alpha survives compositing.
 *
 * The window is a top-layer, focus-policy=not-allowed os-panel and is never
 * focused or raised (occluded kitty windows freeze their screencapture
 * frames, and stealing focus from the live session is off-limits). All
 * control goes through kitty remote control and the herdr SDK socket.
 */

const IMAGE = loadTestImage();

interface PanelHerdr {
  name: string;
  panel: KittyPanel;
  client: Herdr;
}

const test = base.extend("panelHerdr", async ({}, { onCleanup }): Promise<PanelHerdr> => {
  // Single composite cleanup (one onCleanup per fixture), also invoked on
  // setup failure — cleanups registered mid-setup don't run if setup throws.
  const acquired: Array<() => Promise<unknown>> = [];
  let released = false;
  const releaseAll = async () => {
    if (released) return;
    released = true;
    for (const release of acquired.reverse()) await release();
  };
  onCleanup(releaseAll);

  try {
    const name = newHerdrSessionName();
    const socketPath = herdrSocketPath(name);
    // kitty spawns the panel with its own PATH (no mise shims) — resolve here.
    const { stdout: herdrBin } = await execa("which", ["herdr"]);

    const panel = await launchKittyPanel([herdrBin, "--session", name]);
    acquired.push(() => panel.close());
    if (!(await waitForHerdrSocket(socketPath, 10_000))) {
      throw new Error(`herdr session ${name}: socket never appeared at ${socketPath}`);
    }
    const client = new Herdr({ socketPath });
    acquired.push(() => stopHerdrSession(client, socketPath, name));
    await client.ping();
    return { name, panel, client };
  } catch (error) {
    await releaseAll();
    throw error;
  }
});

interface CaptureDiff {
  /** Pixels chromatic in `after` but not in `before`. */
  newlyColored: number;
  bounds: Bounds;
}

/** Diff two same-size captures for newly chromatic (image) pixels. */
function diffCaptures(before: PNG, after: PNG): CaptureDiff {
  const bounds = { minX: after.width, minY: after.height, maxX: -1, maxY: -1 };
  let newlyColored = 0;
  for (let y = 0; y < after.height; y++) {
    for (let x = 0; x < after.width; x++) {
      const i = (y * after.width + x) * 4;
      const chromaticAt = (png: PNG) =>
        isChromatic(png.data[i] ?? 0, png.data[i + 1] ?? 0, png.data[i + 2] ?? 0);
      if (!chromaticAt(after) || chromaticAt(before)) continue;
      newlyColored++;
      if (x < bounds.minX) bounds.minX = x;
      if (y < bounds.minY) bounds.minY = y;
      if (x > bounds.maxX) bounds.maxX = x;
      if (y > bounds.maxY) bounds.maxY = y;
    }
  }
  return { newlyColored, bounds };
}

/** Most common quantized color — the pane background in a mostly-empty capture. */
function modeColor(png: PNG): [number, number, number] {
  const counts = new Map<number, number>();
  for (let i = 0; i < png.data.length; i += 4) {
    const key =
      (((png.data[i] ?? 0) >> 2) << 12) |
      (((png.data[i + 1] ?? 0) >> 2) << 6) |
      ((png.data[i + 2] ?? 0) >> 2);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = 0;
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return [((best >> 12) & 0x3f) << 2, ((best >> 6) & 0x3f) << 2, (best & 0x3f) << 2];
}

/** RGBA sub-region of a capture. */
function region(png: PNG, bounds: Bounds): Uint8Array {
  const w = bounds.maxX - bounds.minX + 1;
  const h = bounds.maxY - bounds.minY + 1;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const src = ((bounds.minY + y) * png.width + bounds.minX) * 4;
    out.set(png.data.subarray(src, src + w * 4), y * w * 4);
  }
  return out;
}

test(
  "a pane kitty-graphics image renders with alpha blend-through in a real kitty window",
  { timeout: 120_000 },
  async ({ panelHerdr, task, annotate }) => {
    const { panel, client } = panelHerdr;
    await pollFor(async () => (await panel.text()).includes("+"), "herdr tab bar", 10_000, 200);

    const dir = await mkdtemp(path.join(tmpdir(), "herdr-rendered-"));

    // Background reference: capture before the image is emitted.
    const beforePath = path.join(dir, "before.png");
    await panel.capture(beforePath);
    const before = PNG.sync.read(await readFile(beforePath));

    // The real-image transmit+display (a=T, f=100, PNG bytes). The leading
    // clear+home pins the image to the pane origin and removes the prompt
    // and echoed command, the cursor is hidden (its themed block is
    // chromatic and would pollute the diff), and the trailing sleep keeps a
    // fresh prompt from redrawing under the polling captures.
    const apcFile = path.join(dir, "image.bin");
    await writeFile(
      apcFile,
      Buffer.from(`\x1b[2J\x1b[H\x1b[?25l${kittyTransmitPng(IMAGE)}`, "latin1"),
    );
    const pane = await client.panes.current();
    await client.panes.run(pane.id, `cat ${apcFile} && sleep 600`);

    // Poll captures until the rendered image shows up as newly colored
    // pixels that were not present before.
    const afterPath = path.join(dir, "after.png");
    let after = before;
    let diff: CaptureDiff = { newlyColored: 0, bounds: { minX: 0, minY: 0, maxX: -1, maxY: -1 } };
    await pollFor(
      async () => {
        await panel.capture(afterPath);
        after = PNG.sync.read(await readFile(afterPath));
        diff = diffCaptures(before, after);
        // ~36% of the asset is chromatic; at the ~48x50px rendered block
        // that's ~900 pixels — 500 clears noise without assuming a scale.
        return diff.newlyColored > 500;
      },
      "the image's colored pixels in the captured kitty window",
      15_000,
      500,
    );

    // A contiguous block roughly the image's size (kitty scales the
    // placement to herdr's re-emitted cell rect; captures are Retina 2x —
    // allow a wide range), dense within its bounding box.
    const bboxW = diff.bounds.maxX - diff.bounds.minX + 1;
    const bboxH = diff.bounds.maxY - diff.bounds.minY + 1;
    expect(bboxW).toBeGreaterThanOrEqual(40);
    expect(bboxW).toBeLessThanOrEqual(400);
    expect(bboxH).toBeGreaterThanOrEqual(40);
    expect(bboxH).toBeLessThanOrEqual(400);
    expect(diff.newlyColored / (bboxW * bboxH)).toBeGreaterThan(0.2);

    // A real multi-color image, not a stray fill: at least two distinct hue
    // clusters inside the rendered block.
    expect(colorStats(region(after, diff.bounds)).hueClusters).toBeGreaterThanOrEqual(2);

    // Blend-through: at the asset's fully transparent points the pane
    // background must show — the asset stores black under its transparency,
    // so a dropped alpha channel would rasterize black, not the themed
    // background. The rendered block corresponds to the asset's chromatic
    // bounds; map through that correspondence.
    const bg = modeColor(before);
    for (const point of IMAGE.transparentPoints) {
      const [px, py] = mapPoint(IMAGE.coloredBounds, diff.bounds, point);
      const i = (py * after.width + px) * 4;
      for (const c of [0, 1, 2]) {
        expect(
          Math.abs((after.data[i + c] ?? 0) - (bg[c] ?? 0)),
          `channel ${c} at (${px},${py}) vs pane background`,
        ).toBeLessThanOrEqual(15);
      }
    }

    const capture = await readFile(afterPath);
    const safeName = task.name.replace(/[^a-zA-Z0-9-_]/g, "_");
    await writeGraphicsArtifact(`${safeName}-capture.png`, capture);
    await annotate("rendered capture", "screenshot", {
      contentType: "image/png",
      body: capture.toString("base64"),
    });
  },
);
