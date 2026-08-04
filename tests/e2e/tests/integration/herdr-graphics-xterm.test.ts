import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test as base } from "vite-plus/test";

import { kittyTransmitRgba, loadTestImage } from "../../src/graphics.ts";
import { createHerdrSession, type HerdrTestSession } from "../../src/herdr.ts";
import { pollFor } from "../../src/term/backend.ts";
import { createXtermBackend, type XtermSession } from "../../src/term/xterm.ts";

/**
 * Kitty graphics + pixel mouse against the xterm.js master backend: an
 * isolated herdr server/session per test, driven through the SDK, with
 * graphics and mouse-protocol assertions on the vendored emulator
 * (vendor/xterm-master — kitty graphics MVP + APC parser hooks).
 */

const IMAGE = loadTestImage();

const test = base
  // SGR-pixels echo probe: a raw backend session (no herdr) that enables
  // all-motion + SGR + SGR-pixels and echoes its input via cat -v.
  .extend("sgrEchoTerm", async ({}, { onCleanup }): Promise<XtermSession> => {
    const session = (await createXtermBackend().launch(
      ["/bin/sh", "-c", 'printf "\\033[?1003h\\033[?1006h\\033[?1016h"; exec cat -v'],
      { cols: 60, rows: 10, label: "xterm-sgr-pixels" },
    )) as XtermSession;
    onCleanup(() => session.dispose());
    return session;
  })

  // Isolated herdr server/session attached through the xterm.js backend.
  .extend(
    "xtermHerdr",
    async ({ task }, { onCleanup }): Promise<HerdrTestSession<XtermSession>> => {
      const session = await createHerdrSession<XtermSession>({
        backend: createXtermBackend(),
        label: `herdr-xterm ${task.name}`,
      });
      onCleanup(() => session.dispose());
      return session;
    },
  );

test("SGR-pixels click reports raw pixel coordinates when 1016 is active", async ({
  sgrEchoTerm,
}) => {
  await pollFor(() => sgrEchoTerm.mouseModes().has(1016), "mode 1016 to be tracked");
  sgrEchoTerm.clickPixel(101, 202);
  // cat -v renders the press/release reports with ESC as ^[.
  await sgrEchoTerm.waitFor(/\^\[\[<0;101;202M\^\[\[<0;101;202m/);
});

test(
  "pane kitty transmit lands in the emulator's kitty image storage",
  { timeout: 15_000 },
  async ({ xtermHerdr }) => {
    const { term } = xtermHerdr;
    await term.waitFor(/\+/, 5_000);

    // The real-image transmit, emitted by the pane's shell from a file (the
    // chunked payload is far too long to type). herdr decodes it pane-side
    // (embedded ghostty) and re-encodes a host transmit (a=t,t=d) +
    // placement (a=p) for the attached client.
    const dir = await mkdtemp(path.join(tmpdir(), "herdr-gfx-"));
    const apcFile = path.join(dir, "image.bin");
    await writeFile(apcFile, Buffer.from(kittyTransmitRgba(IMAGE), "latin1"));
    term.type(`cat ${apcFile}\n`);

    await pollFor(() => term.graphics().length > 0, "kitty image in emulator storage", 10_000);
    const [image] = term.graphics();
    if (!image) throw new Error("expected a kitty image");
    expect(image.width).toBe(IMAGE.width);
    expect(image.height).toBe(IMAGE.height);
    expect(image.data.size).toBeGreaterThan(0);
  },
);

test(
  "pixel-coordinate click on an unfocused pane moves focus",
  { timeout: 15_000 },
  async ({ xtermHerdr }) => {
    const { client, term } = xtermHerdr;
    await term.waitFor(/\+/, 5_000);

    // herdr's client captures host mouse as any-event SGR (1006) — SGR-pixels
    // (1016) is pane-side only, so the pixel-click API downgrades through the
    // synthetic cell geometry it advertised via XTWINOPS 16t.
    await pollFor(() => term.mouseModes().has(1006), "SGR mouse capture from herdr");
    expect(term.mouseModes().has(1016)).toBe(false);

    const pane = await client.panes.current();
    await client.panes.split(pane.id, { direction: "right" });

    const layout = await client.panes.layout();
    const unfocused = layout.panes.find((p) => !p.focused);
    if (!unfocused) throw new Error("expected an unfocused pane");

    const px = Math.round((unfocused.rect.x + unfocused.rect.width / 2) * 8);
    const py = Math.round((unfocused.rect.y + unfocused.rect.height / 2) * 16);
    term.clickPixel(px, py);

    await pollFor(
      async () => (await client.panes.layout()).focusedPaneId === unfocused.paneId,
      "focus to move to the clicked pane",
      3_000,
    );
  },
);
