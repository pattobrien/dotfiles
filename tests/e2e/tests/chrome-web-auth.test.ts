import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { chromium, type BrowserContext, type Page } from "playwright";
import { expect, test } from "vitest";

const CHROME_APP = "/Applications/Google Chrome.app";
const CHROME_USER_DATA_DIR =
  process.env.E2E_CHROME_USER_DATA_DIR ??
  path.join(os.homedir(), "Library/Application Support/dotfiles/e2e/chrome-web-auth");
const CHROME_CLOSE_DELAY_MS = Math.max(
  Number.parseInt(process.env.E2E_CHROME_CLOSE_DELAY_MS ?? "0", 10) || 0,
  0,
);
const CLIENT_REDIRECT_SETTLE_MS = 5_000;

async function pathExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function launchChromeContext() {
  await fs.mkdir(CHROME_USER_DATA_DIR, { recursive: true });

  try {
    return await chromium.launchPersistentContext(CHROME_USER_DATA_DIR, {
      args: ["--no-default-browser-check", "--no-first-run"],
      channel: "chrome",
      chromiumSandbox: true,
      headless: false,
      viewport: { height: 900, width: 1440 },
    });
  } catch (error) {
    throw new Error(
      [
        "Failed to launch Google Chrome through Playwright.",
        `Profile directory: ${CHROME_USER_DATA_DIR}`,
        "Close any Chrome process using that profile, or set E2E_CHROME_USER_DATA_DIR to a setup-managed profile.",
        error instanceof Error ? error.message : String(error),
      ].join("\n"),
    );
  }
}

async function delayBeforeClosingChrome() {
  if (CHROME_CLOSE_DELAY_MS === 0) return;
  await new Promise((resolve) => setTimeout(resolve, CHROME_CLOSE_DELAY_MS));
}

async function runInChrome(fn: (page: Page) => Promise<void>) {
  expect(
    await pathExists(CHROME_APP),
    "Google Chrome should be installed at /Applications/Google Chrome.app",
  ).toBe(true);

  let context: BrowserContext | undefined;

  try {
    context = await launchChromeContext();
    const page = context.pages()[0] ?? (await context.newPage());
    await fn(page);
  } finally {
    await delayBeforeClosingChrome();
    await context?.close();
  }
}

async function goto(page: Page, url: string) {
  await page.goto(url, { timeout: 60_000, waitUntil: "domcontentloaded" });
}

async function waitForBodyText(page: Page, timeoutMs = 30_000) {
  const body = page.locator("body");
  await body.waitFor({ state: "visible", timeout: timeoutMs });

  const deadline = Date.now() + timeoutMs;
  let bodyText = "";

  while (Date.now() < deadline) {
    bodyText = await body.innerText({ timeout: 5_000 });
    if (bodyText.trim().length > 0) return bodyText;
    await page.waitForTimeout(500);
  }

  throw new Error("Timed out waiting for rendered body text");
}

async function waitForUrlMatchOrContinue(page: Page, url: RegExp, timeoutMs = 30_000) {
  await page.waitForURL(url, { timeout: timeoutMs }).catch(() => {});
}

async function assertClaudeSecurityVerificationIsNotBlocking(page: Page) {
  const bodyText = await page
    .locator("body")
    .innerText({ timeout: 5_000 })
    .catch(() => "");

  expect(bodyText, "Claude should not be blocked by Cloudflare security verification").not.toMatch(
    /Performing security verification|Verify you are human|Cloudflare/,
  );
}

test(
  "Chrome GitHub session is already signed in",
  { tags: ["apps", "macos-gui", "setup-validation"], timeout: 90_000 + CHROME_CLOSE_DELAY_MS },
  async () => {
    await runInChrome(async (page) => {
      await goto(page, "https://github.com/");
      const header = page.locator("header").first();
      await header.waitFor({ state: "visible", timeout: 30_000 });

      const headerText = await header.innerText();
      expect(headerText, "GitHub header should not show a logged-out Sign in link").not.toMatch(
        /\bSign in\b/,
      );
    });
  },
);

test(
  "Chrome Spotify web session is already signed in",
  { tags: ["apps", "macos-gui", "setup-validation"], timeout: 90_000 + CHROME_CLOSE_DELAY_MS },
  async () => {
    await runInChrome(async (page) => {
      await goto(page, "https://open.spotify.com/");

      const bodyText = await waitForBodyText(page);
      expect(bodyText, "Spotify should not show a logged-out Log in action").not.toMatch(
        /\bLog in\b/,
      );
    });
  },
);

test(
  "Chrome Claude web session opens a new chat",
  { tags: ["apps", "macos-gui", "setup-validation"], timeout: 90_000 + CHROME_CLOSE_DELAY_MS },
  async () => {
    await runInChrome(async (page) => {
      await goto(page, "https://claude.ai/");
      await page.waitForTimeout(2_000);
      await assertClaudeSecurityVerificationIsNotBlocking(page);
      await waitForUrlMatchOrContinue(page, /claude\.ai\/(?:new|login)(?:[/?#]|$)/, 10_000);
      await assertClaudeSecurityVerificationIsNotBlocking(page);

      expect(page.url(), "Claude should not redirect to the login route").not.toMatch(
        /^https:\/\/claude\.ai\/login(?:[/?#]|$)/,
      );
      expect(page.url(), "Claude should open the signed-in new-chat route").toMatch(
        /^https:\/\/claude\.ai\/new(?:[/?#]|$)/,
      );
    });
  },
);

test(
  "Chrome Cursor dashboard session is already signed in",
  { tags: ["apps", "macos-gui", "setup-validation"], timeout: 90_000 + CHROME_CLOSE_DELAY_MS },
  async () => {
    await runInChrome(async (page) => {
      await goto(page, "https://cursor.com/dashboard");
      await page.waitForLoadState("domcontentloaded", { timeout: 30_000 });
      await page.waitForTimeout(CLIENT_REDIRECT_SETTLE_MS);

      expect(
        page.url(),
        "Cursor dashboard should not redirect to authenticator.cursor.sh",
      ).not.toMatch(/^https:\/\/authenticator\.cursor\.sh(?:[/?#]|$)/);
    });
  },
);
