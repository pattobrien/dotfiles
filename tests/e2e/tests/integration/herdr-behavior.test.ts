import { expect } from "vite-plus/test";

import { test } from "../fixtures.ts";

/**
 * Config-anchored herdr behavior tests: each test spins up an isolated
 * herdr server/session loading the real ~/.config/herdr/config.toml
 * (herdr fixture), controls it through the SDK, and asserts rendering
 * through the emulator.
 */

/**
 * Attach the final screen as an inline SVG (visible in Vitest UI / HTML
 * report). The body must be base64: the report viewer builds a
 * `data:...;base64,` URI from it verbatim.
 */
async function attachScreen(
  annotate: (
    message: string,
    type?: string,
    attachment?: { contentType?: string; body?: string },
  ) => Promise<unknown>,
  svg: string,
) {
  await annotate("final screen", "screenshot", {
    contentType: "image/svg+xml",
    body: Buffer.from(svg).toString("base64"),
  });
}

test("tab bar renders at the bottom (tab_bar_position)", async ({ herdr, annotate }) => {
  const { term } = herdr;
  // The tab strip shows the tab number and the new-tab button ("1", "+").
  await term.waitFor(/\+/, 5_000);

  const t = term.term;
  expect(t.lastRow().getText()).toMatch(/1\s+\+/);
  expect(t.firstRow().getText()).not.toMatch(/1\s+\+/);
  await attachScreen(annotate, t.screenshotSvg());
});

test("pane split renders a divider between panes", async ({ herdr, annotate }) => {
  const { client, term } = herdr;
  await term.waitFor(/\+/, 5_000);

  const before = await client.panes.layout();
  expect(before.panes).toHaveLength(1);

  const pane = await client.panes.current();
  await client.panes.split(pane.id, { direction: "right" });

  const after = await client.panes.layout();
  expect(after.panes).toHaveLength(2);

  // The divider column sits between the two pane rects — a run of "│"
  // cells spanning the panes' height.
  const [left, right] = [...after.panes].sort((a, b) => a.rect.x - b.rect.x);
  if (!left || !right) throw new Error("expected two panes after split");
  const dividerCol = right.rect.x - 1;

  const t = term.term;
  // Interior rows only — the divider column's first/last rows are border
  // corners (┐/┘) where pane borders meet.
  const sampleRows = [
    left.rect.y + 1,
    left.rect.y + Math.floor(left.rect.height / 2),
    left.rect.y + left.rect.height - 2,
  ];
  // The SDK reports the new layout before the redraw reaches the emulator —
  // poll the screen until the divider is actually drawn.
  const drawDeadline = Date.now() + 3_000;
  while (Date.now() < drawDeadline) {
    if (sampleRows.every((row) => t.row(row).getText()[dividerCol] === "│")) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  for (const row of sampleRows) {
    const line = t.row(row).getText();
    expect(line[dividerCol], `divider at row ${row}, col ${dividerCol}`).toBe("│");
  }
  await attachScreen(annotate, t.screenshotSvg());
});

test("mouse click moves pane focus", async ({ herdr, annotate }) => {
  const { client, term } = herdr;
  await term.waitFor(/\+/, 5_000);

  const pane = await client.panes.current();
  await client.panes.split(pane.id, { direction: "right" });

  const layout = await client.panes.layout();
  const focused = layout.panes.find((p) => p.focused);
  const unfocused = layout.panes.find((p) => !p.focused);
  if (!focused || !unfocused) throw new Error("expected one focused and one unfocused pane");

  const clickCol = unfocused.rect.x + Math.floor(unfocused.rect.width / 2);
  const clickRow = unfocused.rect.y + Math.floor(unfocused.rect.height / 2);
  term.click(clickCol, clickRow);

  // Focus change is async — poll the SDK until it lands.
  const deadline = Date.now() + 3_000;
  let nowFocused: string | undefined;
  while (Date.now() < deadline) {
    nowFocused = (await client.panes.layout()).focusedPaneId;
    if (nowFocused === unfocused.paneId) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  expect(nowFocused).toBe(unfocused.paneId);
  await attachScreen(annotate, herdr.term.term.screenshotSvg());
});
