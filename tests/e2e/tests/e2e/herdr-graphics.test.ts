import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect } from "vite-plus/test";

import { kittyTransmitRgba, loadTestImage } from "../../src/graphics.ts";
import { pollFor } from "../../src/term/backend.ts";
import { createTermlessBackend } from "../../src/term/termless.ts";
import { test as base } from "../fixtures.ts";

/**
 * Kitty-graphics and SGR-pixels (mode 1016) mouse behavior, asserted through
 * Termless's kitty backend — kitty's own VT parser run headless via
 * `kitty +runpy` batch replay. No OS windows are involved, so this file is
 * not tagged `e2e-kitty`, but every screen/raw query replays the whole
 * session in a fresh kitty subprocess, so queries here are kept sparse and
 * timeouts generous.
 *
 * The headless kitty Screen answers CSI 16t with its fixed 10x20px cell
 * size. That reply is what unlocks both features in herdr: the client only
 * ships pane graphics to the host once a cell size is known, and the pane
 * mouse encoder only emits real pixel coordinates (fork fix 21511f34) once
 * the pane terminal has pixel dimensions.
 */

// Cell metrics bridge.py bakes into its Screen(…, cell_width=10, cell_height=20, …).
const CELL_W = 10;
const CELL_H = 20;

const IMAGE = loadTestImage();

const test = base.override("herdrBackend", () => createTermlessBackend("kitty"));

/** Control keys of every APC G command in a raw stream, in order. */
function apcControls(raw: string): Array<Record<string, string>> {
  return [...raw.matchAll(/\x1b_G([^;\x1b]*)/g)].map((m) => {
    const keys: Record<string, string> = {};
    for (const part of (m[1] ?? "").split(",")) {
      const eq = part.indexOf("=");
      if (eq > 0) keys[part.slice(0, eq)] = part.slice(eq + 1);
    }
    return keys;
  });
}

test(
  "herdr re-emits a pane kitty-graphics image to the host terminal",
  { timeout: 120_000 },
  async ({ herdr, annotate }) => {
    const { client, term } = herdr;
    await term.waitFor(/\+/, 15_000);

    // The real-image transmit+display (a=T, f=32, t=d), emitted from a file
    // (the chunked payload is far too long to type).
    const dir = await mkdtemp(path.join(tmpdir(), "herdr-gfx-"));
    const apcFile = path.join(dir, "image.bin");
    await writeFile(apcFile, Buffer.from(kittyTransmitRgba(IMAGE), "latin1"));

    const pane = await client.panes.current();
    await client.panes.run(pane.id, `cat ${apcFile} && printf 'GFX_SENT\\n'`);
    await client.panes.waitForOutput(pane.id, {
      match: { type: "substring", value: "GFX_SENT" },
      timeoutMs: 10_000,
    });

    // herdr re-uploads the image to the host under its own rewritten id
    // with responses suppressed (q=2) — assert the format and dimensions,
    // not ids or payload bytes. The predicate touches text() because the
    // batch-replay bridge only flushes pending host replies (the CSI 16t
    // cell-size report that unlocks graphics emission) on a snapshot query.
    const isHostTransmit = (keys: Record<string, string>) =>
      keys["a"] === "t" &&
      keys["t"] === "d" &&
      keys["f"] === "32" &&
      keys["s"] === String(IMAGE.width) &&
      keys["v"] === String(IMAGE.height) &&
      keys["q"] === "2";
    await pollFor(
      () => {
        term.text();
        return apcControls(term.raw()).some(isHostTransmit);
      },
      "host-bound kitty graphics transmit",
      30_000,
      500,
    );

    // ...and places it as a placement spanning ceil(px / kitty-cell-px)
    // cells on each axis, under the transmit's rewritten host id.
    const controls = apcControls(term.raw());
    const transmit = controls.find(isHostTransmit);
    if (!transmit) throw new Error("transmit disappeared after pollFor saw it");
    const placement = controls.find((keys) => keys["a"] === "p" && keys["i"] === transmit["i"]);
    if (!placement) throw new Error("expected a placement for the re-emitted image");
    expect(placement["c"]).toBe(String(Math.ceil(IMAGE.width / CELL_W)));
    expect(placement["r"]).toBe(String(Math.ceil(IMAGE.height / CELL_H)));

    await annotate("final screen", "screenshot", {
      contentType: "image/svg+xml",
      body: Buffer.from(term.term.screenshotSvg()).toString("base64"),
    });
  },
);

test(
  "pixel-coordinate mouse: click focuses an unfocused pane and 1016 panes receive SGR-pixels events",
  { timeout: 120_000 },
  async ({ herdr, annotate }) => {
    const { client, term } = herdr;
    await term.waitFor(/\+/, 15_000);

    // Host-side mouse contract: herdr consumes host mouse in cell
    // coordinates — it enables SGR (1006) and explicitly resets
    // SGR-pixels (1016) on the host, never enabling it. Pixel coordinates
    // exist only on the pane side, re-encoded per pane below.
    expect(term.raw()).toContain("\x1b[?1006h");
    expect(term.raw()).toContain("\x1b[?1016l");
    expect(term.raw()).not.toContain("\x1b[?1016h");

    const pane = await client.panes.current();
    await client.panes.split(pane.id, { direction: "right" });

    const layout = await client.panes.layout();
    const unfocused = layout.panes.find((p) => !p.focused);
    if (!unfocused) throw new Error("expected an unfocused pane after split");

    // Listener in the unfocused pane: enable all-motion + SGR + SGR-pixels
    // mouse reporting, then append every byte the pane receives to a log.
    // `stty raw` is required — in canonical mode the pane tty would hold
    // mouse sequences (no newline) in the line buffer and cat would never
    // see them.
    const dir = await mkdtemp(path.join(tmpdir(), "herdr-mouse-"));
    const script = path.join(dir, "listen.sh");
    const log = path.join(dir, "mouse.log");
    await writeFile(
      script,
      `printf '\\033[?1003h\\033[?1006h\\033[?1016h'\nprintf 'MOUSEREADY\\n'\nstty raw -echo\nexec cat > "$1"\n`,
    );
    await client.panes.run(unfocused.paneId, `sh ${script} ${log}`);
    await client.panes.waitForOutput(unfocused.paneId, {
      match: { type: "substring", value: "MOUSEREADY" },
      timeoutMs: 5_000,
    });

    const clickCol = unfocused.rect.x + Math.floor(unfocused.rect.width / 2);
    const clickRow = unfocused.rect.y + Math.floor(unfocused.rect.height / 2);
    term.click(clickCol, clickRow);

    // Click moves focus to the unfocused pane (herdr consumes/uses the
    // press for focus; poll the SDK until it lands).
    await pollFor(
      async () => (await client.panes.layout()).focusedPaneId === unfocused.paneId,
      "focus to move to the clicked pane",
      5_000,
    );

    // Keep clicking until a pixel-encoded press lands in the log: the
    // pixel path only activates once herdr learns the host cell size (its
    // CSI 16t reply is flushed by the text() snapshot below), so earlier
    // clicks may be forwarded in cell coordinates or consumed by focus.
    let press: RegExpMatchArray | undefined;
    await pollFor(
      async () => {
        term.text();
        term.click(clickCol, clickRow);
        await new Promise((r) => setTimeout(r, 200));
        const bytes = await readFile(log, "latin1").catch(() => "");
        const events = [...bytes.matchAll(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/g)];
        press = events.find(
          (e) => e[1] === "0" && e[4] === "M" && Number(e[2]) % CELL_W === CELL_W / 2,
        );
        return press !== undefined;
      },
      "SGR-pixels press event in the pane log",
      15_000,
      500,
    );
    if (!press) throw new Error("unreachable: pollFor guaranteed a press event");
    const x = Number(press[2]);
    const y = Number(press[3]);

    // Pixel coordinates, not cells: herdr encodes the pane-local cell
    // center in surface pixels, so both axes carry the half-cell offset.
    expect(x % CELL_W).toBe(CELL_W / 2);
    expect(y % CELL_H).toBe(CELL_H / 2);
    // The recovered cell must sit inside the pane, near where we clicked
    // (pane-local coordinates are offset from the pane rect only by its
    // border, so allow a small tolerance).
    const cellX = Math.floor(x / CELL_W);
    const cellY = Math.floor(y / CELL_H);
    expect(Math.abs(cellX - (clickCol - unfocused.rect.x))).toBeLessThanOrEqual(2);
    expect(Math.abs(cellY - (clickRow - unfocused.rect.y))).toBeLessThanOrEqual(2);
    await annotate("final screen", "screenshot", {
      contentType: "image/svg+xml",
      body: Buffer.from(term.term.screenshotSvg()).toString("base64"),
    });
  },
);
