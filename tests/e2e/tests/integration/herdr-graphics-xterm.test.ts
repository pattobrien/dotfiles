import { expect, test } from "vite-plus/test";

import { createHerdrSession } from "../../src/herdr.ts";
import { pollFor } from "../../src/term/backend.ts";
import { createXtermBackend, type XtermSession } from "../../src/term/xterm.ts";

/**
 * Kitty graphics + pixel mouse against the xterm.js master backend: an
 * isolated herdr server/session per test, driven through the SDK, with
 * graphics and mouse-protocol assertions on the vendored emulator
 * (vendor/xterm-master — kitty graphics MVP + APC parser hooks).
 */

test("SGR-pixels click reports raw pixel coordinates when 1016 is active", async () => {
  const backend = createXtermBackend();
  const session = (await backend.launch(
    ["/bin/sh", "-c", 'printf "\\033[?1003h\\033[?1006h\\033[?1016h"; exec cat -v'],
    { cols: 60, rows: 10, label: "xterm-sgr-pixels" },
  )) as XtermSession;
  try {
    await pollFor(() => session.mouseModes().has(1016), "mode 1016 to be tracked");
    session.clickPixel(101, 202);
    // cat -v renders the press/release reports with ESC as ^[.
    await session.waitFor(/\^\[\[<0;101;202M\^\[\[<0;101;202m/);
  } finally {
    await session.dispose();
  }
});

test(
  "pane kitty transmit lands in the emulator's kitty image storage",
  { timeout: 15_000 },
  async () => {
    const session = await createHerdrSession<XtermSession>({
      backend: createXtermBackend(),
      label: "herdr-graphics-xterm",
    });
    try {
      const { term } = session;
      await term.waitFor(/\+/, 5_000);

      // 1x1 opaque white RGBA transmit+display, printed by the pane's shell.
      // herdr decodes it pane-side (embedded ghostty) and re-encodes a host
      // transmit (a=t,t=d) + placement (a=p) for the attached client.
      term.type("printf '\\033_Ga=T,t=d,f=32,s=1,v=1,i=777;/////w==\\033\\\\'\n");

      await pollFor(() => term.graphics().length > 0, "kitty image in emulator storage", 10_000);
      const [image] = term.graphics();
      if (!image) throw new Error("expected a kitty image");
      expect(image.width).toBe(1);
      expect(image.height).toBe(1);
      expect(image.data.size).toBeGreaterThan(0);
    } finally {
      await session.dispose();
    }
  },
);

test("pixel-coordinate click on an unfocused pane moves focus", { timeout: 15_000 }, async () => {
  const session = await createHerdrSession<XtermSession>({
    backend: createXtermBackend(),
    label: "herdr-pixel-click-xterm",
  });
  try {
    const { client, term } = session;
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
  } finally {
    await session.dispose();
  }
});
