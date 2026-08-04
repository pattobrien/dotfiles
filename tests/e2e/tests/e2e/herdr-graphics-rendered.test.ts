/**
 * @module-tag e2e-kitty
 */
import { randomUUID } from "node:crypto";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

import { execa } from "execa";
import Herdr, { HerdrError } from "herdr-ts-sdk";
import { PNG } from "pngjs";
import { expect } from "vite-plus/test";

import { launchKittyPanel } from "../../src/kitty-panel.ts";
import { pollFor } from "../../src/term/backend.ts";
import { test } from "../fixtures.ts";

/**
 * Rendered-pixel verification: herdr running inside a REAL kitty OS window
 * must produce actual red pixels on screen for a pane-emitted kitty-graphics
 * image — the protocol-level tests in herdr-graphics.test.ts cannot see
 * whether the re-emitted escapes rasterize.
 *
 * The window is a top-layer, focus-policy=not-allowed os-panel and is never
 * focused or raised (occluded kitty windows freeze their screencapture
 * frames, and stealing focus from the live session is off-limits). All
 * control goes through kitty remote control and the herdr SDK socket.
 */

interface RedStats {
  count: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  inBox: number;
}

/** Count red-dominant pixels (channel dominance, tolerant of color management). */
function redStats(png: PNG): RedStats {
  let count = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const r = png.data[i] ?? 0;
      const g = png.data[i + 1] ?? 0;
      const b = png.data[i + 2] ?? 0;
      if (r > 150 && r > 2 * g && r > 2 * b) {
        count++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const inBox = count > 0 ? (maxX - minX + 1) * (maxY - minY + 1) : 0;
  return { count, minX, minY, maxX, maxY, inBox };
}

function solidRedPngBase64(size: number): string {
  const img = new PNG({ width: size, height: size });
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = 255;
    img.data[i + 1] = 0;
    img.data[i + 2] = 0;
    img.data[i + 3] = 255;
  }
  return PNG.sync.write(img).toString("base64");
}

test(
  "a pane kitty-graphics image renders as red pixels in a real kitty window",
  { timeout: 120_000 },
  async ({ annotate }) => {
    const name = `e2e-${randomUUID().slice(0, 8)}`;
    const socketPath = path.join(homedir(), ".config", "herdr", "sessions", name, "herdr.sock");
    // kitty spawns the panel with its own PATH (no mise shims) — resolve here.
    const { stdout: herdrBin } = await execa("which", ["herdr"]);

    const panel = await launchKittyPanel([herdrBin, "--session", name]);
    let client: Herdr | undefined;
    try {
      await pollFor(
        () =>
          access(socketPath).then(
            () => true,
            () => false,
          ),
        `herdr socket at ${socketPath}`,
        10_000,
        100,
      );
      client = new Herdr({ socketPath });
      await client.ping();
      await pollFor(async () => (await panel.text()).includes("+"), "herdr tab bar", 10_000, 200);

      const dir = await mkdtemp(path.join(tmpdir(), "herdr-rendered-"));

      // Control: before the image is emitted, the panel has no red-dominant
      // pixels (herdr chrome + empty pane background).
      const beforePath = path.join(dir, "before.png");
      await panel.capture(beforePath);
      const before = redStats(PNG.sync.read(await readFile(beforePath)));
      expect(before.count).toBeLessThan(50);

      // 64x64 solid red PNG, transmit+display at cursor (a=T, f=100, t=d).
      const apcFile = path.join(dir, "image.bin");
      await writeFile(
        apcFile,
        Buffer.from(`\x1b_Ga=T,f=100,t=d;${solidRedPngBase64(64)}\x1b\\`, "latin1"),
      );
      const pane = await client.panes.current();
      await client.panes.run(pane.id, `cat ${apcFile} && printf 'GFX_SENT\\n'`);
      await client.panes.waitForOutput(pane.id, {
        match: { type: "substring", value: "GFX_SENT" },
        timeoutMs: 10_000,
      });

      // Poll captures until the rendered image shows up as a solid red block.
      const afterPath = path.join(dir, "after.png");
      let after: RedStats | undefined;
      await pollFor(
        async () => {
          await panel.capture(afterPath);
          after = redStats(PNG.sync.read(await readFile(afterPath)));
          return after.count > 2000;
        },
        "red pixels in the captured kitty window",
        15_000,
        500,
      );
      if (!after) throw new Error("unreachable: pollFor guaranteed capture stats");

      // A contiguous block roughly the image's size (kitty scales the
      // placement to herdr's re-emitted cell rect, so allow a wide range),
      // dense within its bounding box, with nothing red elsewhere.
      const bboxW = after.maxX - after.minX + 1;
      const bboxH = after.maxY - after.minY + 1;
      expect(bboxW).toBeGreaterThanOrEqual(40);
      expect(bboxW).toBeLessThanOrEqual(300);
      expect(bboxH).toBeGreaterThanOrEqual(40);
      expect(bboxH).toBeLessThanOrEqual(300);
      expect(after.count / after.inBox).toBeGreaterThan(0.9);

      await annotate("rendered capture", "screenshot", {
        contentType: "image/png",
        body: (await readFile(afterPath)).toString("base64"),
      });
    } finally {
      await panel.close();
      if (client) {
        await client.server.stop().catch((error: unknown) => {
          // Transport drops are expected while the server exits (same race
          // herdr's own CLI tolerates); real error replies propagate.
          if (error instanceof HerdrError) throw error;
        });
      }
      const stopDeadline = Date.now() + 5_000;
      while (Date.now() < stopDeadline) {
        const gone = await access(socketPath).then(
          () => false,
          () => true,
        );
        if (gone) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      await execa("herdr", ["session", "delete", name]).catch(() => undefined);
    }
  },
);
