import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test as base } from "vite-plus/test";

import {
  kittyTransmitRgba,
  loadTestImage,
  reconstructTransmission,
  writeGraphicsArtifact,
} from "../../src/graphics.ts";
import { createHerdrSession, type HerdrTestSession } from "../../src/herdr.ts";
import { viewerLink } from "../../src/recording.ts";
import { pollFor } from "../../src/term/backend.ts";
import {
  createProtocolSeam,
  pixelCenterOfCell,
  SYNTH_CELL_HEIGHT_PX,
  SYNTH_CELL_WIDTH_PX,
  withProtocolSeam,
  type GraphicsCommand,
  type ProtocolSeam,
} from "../../src/term/protocol-seam.ts";
import { createTermlessBackend } from "../../src/term/termless.ts";

/**
 * Kitty-graphics and pixel-mouse assertions at the escape-sequence level:
 * the protocol seam parses the host-bound traffic of an isolated herdr
 * session and synthesizes the host replies herdr needs (XTWINOPS 16t cell
 * size), so no graphics-capable emulator is involved.
 *
 * Herdr's host contract (from its source, v0.8.0-graphics.3):
 * - graphics passthrough is gated only on `experimental.kitty_graphics`
 *   (set in the dotfiles config) plus a known host cell size — no DA,
 *   XTGETTCAP, or `a=q` probe; all emitted APC commands carry `q=2`.
 * - host mouse capture is crossterm's 1000/1002/1003/1015/1006; herdr
 *   consumes host mouse in cells and never host-enables 1016 — SGR-pixels
 *   is a pane-facing feature fed from the host cell size it learns via the
 *   `CSI 16 t` -> `CSI 6;h;w t` round-trip the seam answers.
 */

interface GfxFixture {
  herdr: HerdrTestSession;
  seam: ProtocolSeam;
}

const test = base.extend("gfx", async ({ task, annotate }, { onCleanup }): Promise<GfxFixture> => {
  const seam = createProtocolSeam();
  const backend = withProtocolSeam(createTermlessBackend(), seam);
  const herdr = await createHerdrSession({ backend, label: `herdr-gfx ${task.name}` });
  await annotate(`terminal recording: ${viewerLink(herdr.term.label)}`);
  onCleanup(() => herdr.dispose());
  return { herdr, seam };
});

const IMAGE = loadTestImage();

function isPaneImageTransmit(g: GraphicsCommand): boolean {
  return (
    (g.action === "t" || g.action === "T") &&
    g.keys["f"] === "32" &&
    g.keys["s"] === String(IMAGE.width) &&
    g.keys["v"] === String(IMAGE.height)
  );
}

test("host capability contract: cell-size query answered, SGR mouse in cells", async ({ gfx }) => {
  const { herdr, seam } = gfx;
  await herdr.term.waitFor(/\+/, 5_000);

  // Graphics are on in the config and node-pty reports no pixel size, so
  // the client must ask the host for its cell size.
  await pollFor(() => seam.cellSizeQueries >= 1, "herdr to query the host cell size (CSI 16t)");

  for (const mode of [1000, 1002, 1003, 1015, 1006]) {
    expect(seam.mouseModes.get(mode), `host mouse mode ${mode}`).toBe(true);
  }
  // Herdr clears 1016 at startup and never re-enables it: host mouse stays
  // in cell coordinates, pixel coords are derived from the 16t reply.
  expect(seam.mouseModes.get(1016)).toBe(false);
});

test(
  "pane kitty graphics transmit is re-emitted to the host and round-trips losslessly",
  { timeout: 15_000 },
  async ({ gfx, task, annotate }) => {
    const { herdr, seam } = gfx;
    const { client } = herdr;
    await herdr.term.waitFor(/\+/, 5_000);

    // The chunked payload is far too long to type — emit it from a file.
    const dir = await mkdtemp(path.join(tmpdir(), "herdr-gfx-"));
    const apcFile = path.join(dir, "image.bin");
    await writeFile(apcFile, Buffer.from(kittyTransmitRgba(IMAGE), "latin1"));

    const pane = await client.panes.current();
    await client.panes.run(pane.id, `cat ${apcFile}`);

    // Herdr rewrites image/placement ids on the way to the host — match the
    // transmission semantically (format and geometry), not by id.
    await pollFor(
      () => seam.graphics.some(isPaneImageTransmit),
      "herdr to re-emit the pane's image transmit to the host",
      10_000,
      100,
    );

    const transmitIndex = seam.graphics.findIndex(isPaneImageTransmit);
    const transmit = seam.graphics[transmitIndex];
    if (!transmit) throw new Error("transmit disappeared after pollFor saw it");
    const hostImageId = transmit.keys["i"];
    expect(hostImageId).toBeDefined();
    // The 16KB RGBA payload crosses herdr's compression threshold, so this
    // transmission exercises the o=z zlib re-encode path — if this ever
    // fails, that path has lost its coverage, not just changed shape.
    expect(transmit.keys["o"]).toBe("z");

    // The display placement follows the upload and references the host id.
    // The image spans ceil(px / synthetic-cell-px) host cells on each axis.
    await pollFor(
      () => seam.graphics.some((g) => g.action === "p" && g.keys["i"] === hostImageId),
      "a display placement for the re-emitted image",
      5_000,
      100,
    );
    const placement = seam.graphics.find((g) => g.action === "p" && g.keys["i"] === hostImageId);
    if (!placement) throw new Error("placement disappeared after pollFor saw it");
    expect(placement.keys["c"]).toBe(String(Math.ceil(IMAGE.width / SYNTH_CELL_WIDTH_PX)));
    expect(placement.keys["r"]).toBe(String(Math.ceil(IMAGE.height / SYNTH_CELL_HEIGHT_PX)));

    // Reconstruct the image from the captured records (concatenate chunks,
    // inflate o=z, interpret per f=): herdr's re-encode must round-trip the
    // pane's pixels losslessly.
    const reconstructed = reconstructTransmission(seam.graphics, transmitIndex);
    expect(reconstructed.width).toBe(IMAGE.width);
    expect(reconstructed.height).toBe(IMAGE.height);
    expect(reconstructed.rgba.equals(IMAGE.rgba)).toBe(true);

    // Visual artifacts for this tier: the reconstructed image plus the
    // screen state (the WASM backend can't rasterize the graphic itself).
    const safeName = task.name.replace(/[^a-zA-Z0-9-_]/g, "_");
    await writeGraphicsArtifact(`${safeName}-reconstructed.png`, reconstructed.png);
    await writeGraphicsArtifact(`${safeName}-screen.svg`, herdr.term.term.screenshotSvg());
    await annotate("reconstructed from herdr transmission", "screenshot", {
      contentType: "image/png",
      body: reconstructed.png.toString("base64"),
    });
    await annotate("final screen", "screenshot", {
      contentType: "image/svg+xml",
      body: Buffer.from(herdr.term.term.screenshotSvg()).toString("base64"),
    });
  },
);

test("pixel click at an unfocused pane's center moves focus", async ({ gfx }) => {
  const { herdr, seam } = gfx;
  const { client } = herdr;
  await herdr.term.waitFor(/\+/, 5_000);

  const pane = await client.panes.current();
  await client.panes.split(pane.id, { direction: "right" });

  const layout = await client.panes.layout();
  const unfocused = layout.panes.find((p) => !p.focused);
  if (!unfocused) throw new Error("expected an unfocused pane after split");

  const clickCol = unfocused.rect.x + Math.floor(unfocused.rect.width / 2);
  const clickRow = unfocused.rect.y + Math.floor(unfocused.rect.height / 2);
  const [px, py] = pixelCenterOfCell(clickCol, clickRow);
  seam.clickPixels(px, py);

  await pollFor(
    async () => (await client.panes.layout()).focusedPaneId === unfocused.paneId,
    "focus to move to the clicked pane",
    3_000,
    100,
  );
});
