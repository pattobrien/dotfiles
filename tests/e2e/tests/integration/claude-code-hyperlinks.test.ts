import { expect } from "vite-plus/test";

import { test } from "../fixtures.ts";

/**
 * What Claude Code turns into a clickable terminal link: an OSC 8 hyperlink
 * in the bytes it writes to the PTY, which any terminal can act on.
 */

const SCREENSHOT = "/private/tmp/claude-501/scratchpad/t2.png";

test("markdown link is a hyperlink with the link text", async ({
  claudeCode,
}) => {
  const session = await claudeCode.render(
    "The test chat is [Executor connector test](https://claude.ai/chat/abc123)",
    { waitFor: "Executor connector test" },
  );

  expect(session.links()).toContainEqual({
    url: "https://claude.ai/chat/abc123",
    text: "Executor connector test",
  });
});

test("bare https URL is a hyperlink to itself", async ({ claudeCode }) => {
  const session = await claudeCode.render(
    "Docs: https://code.claude.com/docs/en/security",
    { waitFor: "https://code.claude.com/docs/en/security" },
  );

  expect(session.links()).toContainEqual({
    url: "https://code.claude.com/docs/en/security",
    text: "https://code.claude.com/docs/en/security",
  });
});

test("bare absolute file path is a file:// hyperlink", async ({
  claudeCode,
}) => {
  const session = await claudeCode.render(`Screenshot: ${SCREENSHOT}`, {
    waitFor: SCREENSHOT,
  });

  expect(session.links()).toContainEqual({
    url: `file://${SCREENSHOT}`,
    text: SCREENSHOT,
  });
});

test("markdown link to a file:// URL is a file:// hyperlink", async ({
  claudeCode,
}) => {
  const session = await claudeCode.render(
    `Screenshot: [t2.png](file://${SCREENSHOT})`,
    { waitFor: "t2.png" },
  );

  expect(session.links()).toContainEqual({
    url: `file://${SCREENSHOT}`,
    text: "t2.png",
  });
});
