import { expect } from "vite-plus/test";
import { test } from "vite-plus/test";

import type { TermBackend } from "../../src/term/backend.ts";
import { createTermlessBackend } from "../../src/term/termless.ts";
import { createXtermBackend } from "../../src/term/xterm.ts";

/**
 * Conformance smoke for the TermBackend seam: the xterm.js backend is the
 * swap-path insurance against Termless's bus factor — this file keeps it
 * honest (launch/output/input/resize) without running the full suite on it.
 */

const backends: TermBackend[] = [createTermlessBackend(), createXtermBackend()];

for (const backend of backends) {
  test(`${backend.name}: renders process output`, async () => {
    const session = await backend.launch(["/bin/echo", "conformance-marker"], {
      cols: 40,
      rows: 5,
      label: `conformance ${backend.name} output`,
    });
    try {
      await session.waitFor("conformance-marker", 5_000);
      expect(session.text()).toContain("conformance-marker");
    } finally {
      await session.dispose();
    }
  });

  test(`${backend.name}: raw stream preserves SGR sequences`, async () => {
    const session = await backend.launch(["/usr/bin/printf", "\\033[1mbold-marker\\033[0m\\n"], {
      cols: 40,
      rows: 5,
      label: `conformance ${backend.name} sgr`,
    });
    try {
      await session.waitFor("bold-marker", 5_000);
      expect(session.raw()).toContain("\x1b[1m");
    } finally {
      await session.dispose();
    }
  });

  test(`${backend.name}: forwards typed input and resize`, async () => {
    const session = await backend.launch(["/bin/sh"], {
      cols: 40,
      rows: 5,
      label: `conformance ${backend.name} input`,
    });
    try {
      session.type("echo input-marker\n");
      await session.waitFor("input-marker", 5_000);

      session.resize(60, 10);
      session.type("echo cols-$COLUMNS\n");
      await session.waitFor("cols-60", 5_000);
    } finally {
      await session.dispose();
    }
  });
}
