import { expect, test as base } from "vite-plus/test";

import { createHerdrSession, type HerdrTestSession } from "../../src/herdr.ts";
import { viewerLink } from "../../src/recording.ts";
import { pollFor } from "../../src/term/backend.ts";
import {
  createProtocolSeam,
  pixelCenterOfCell,
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

/** 1x1 RGBA transmit+display, the smallest valid kitty graphics command. */
const PANE_IMAGE_PRINTF = String.raw`printf '\033_Ga=T,f=32,s=1,v=1,t=d,i=31,p=1,q=2;/wAA/w==\033\\'`;

function isPaneImageTransmit(g: GraphicsCommand): boolean {
  return (
    (g.action === "t" || g.action === "T") &&
    g.keys["f"] === "32" &&
    g.keys["s"] === "1" &&
    g.keys["v"] === "1" &&
    g.payloadBytes === 4
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
  "pane kitty graphics transmit is re-emitted to the host",
  { timeout: 15_000 },
  async ({ gfx }) => {
    const { herdr, seam } = gfx;
    const { client } = herdr;
    await herdr.term.waitFor(/\+/, 5_000);

    const pane = await client.panes.current();
    await client.panes.run(pane.id, PANE_IMAGE_PRINTF);

    // Herdr rewrites image/placement ids on the way to the host — match the
    // transmission semantically (format, geometry, payload size), not by id.
    await pollFor(
      () => seam.graphics.some(isPaneImageTransmit),
      "herdr to re-emit the pane's 1x1 RGBA transmit to the host",
      10_000,
      100,
    );

    const transmit = seam.graphics.find(isPaneImageTransmit);
    if (!transmit) throw new Error("transmit disappeared after pollFor saw it");
    const hostImageId = transmit.keys["i"];
    expect(hostImageId).toBeDefined();

    // The display placement follows the upload and references the host id.
    await pollFor(
      () => seam.graphics.some((g) => g.action === "p" && g.keys["i"] === hostImageId),
      "a display placement for the re-emitted image",
      5_000,
      100,
    );
    const placement = seam.graphics.find((g) => g.action === "p" && g.keys["i"] === hostImageId);
    if (!placement) throw new Error("placement disappeared after pollFor saw it");
    // 1x1 px image occupies a single cell at any cell size.
    expect(placement.keys["c"]).toBe("1");
    expect(placement.keys["r"]).toBe("1");
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
