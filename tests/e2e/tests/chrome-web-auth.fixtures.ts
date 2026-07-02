import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { chromium, type BrowserContext, type Page } from "playwright";
import { expect, test as base } from "vitest";

const CHROME_APP = "/Applications/Google Chrome.app";
// Always an isolated, setup-managed profile — preventSessionRestore() deletes
// session state in this directory, so it must never point at the real
// ~/Library/Application Support/Google/Chrome.
const CHROME_USER_DATA_DIR = path.join(
  os.homedir(),
  "Library/Application Support/dotfiles/e2e/chrome-web-auth",
);
const CHROME_PROFILE_DIRECTORY = process.env.E2E_CHROME_PROFILE_DIRECTORY;
const CHROME_CLOSE_DELAY_MS = Math.max(
  Number.parseInt(process.env.E2E_CHROME_CLOSE_DELAY_MS ?? "0", 10) || 0,
  0,
);
const FAILURE_SCREENSHOT_DIR =
  process.env.E2E_CHROME_FAILURE_SCREENSHOT_DIR ??
  path.resolve(import.meta.dirname, "../test-results/chrome-web-auth");

export { expect };

export const CLIENT_REDIRECT_SETTLE_MS = 5_000;

async function pathExists(file: string) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function launchChromeContext() {
  await fs.mkdir(CHROME_USER_DATA_DIR, { recursive: true });
  await preventSessionRestore();

  try {
    return await chromium.launchPersistentContext(CHROME_USER_DATA_DIR, {
      args: [
        "--no-default-browser-check",
        "--no-first-run",
        ...(CHROME_PROFILE_DIRECTORY ? [`--profile-directory=${CHROME_PROFILE_DIRECTORY}`] : []),
      ],
      channel: "chrome",
      chromiumSandbox: true,
      headless: false,
      ignoreDefaultArgs: ["--disable-sync", "--password-store=basic", "--use-mock-keychain"],
      viewport: { height: 900, width: 1440 },
    });
  } catch (error) {
    throw new Error(
      [
        "Failed to launch Google Chrome through Playwright.",
        `Profile directory: ${CHROME_USER_DATA_DIR}`,
        "Close any Chrome process using that profile.",
        error instanceof Error ? error.message : String(error),
      ].join("\n"),
    );
  }
}

function profileDirectoryPath() {
  return path.join(CHROME_USER_DATA_DIR, CHROME_PROFILE_DIRECTORY ?? "Default");
}

async function preventSessionRestore() {
  const profileDir = profileDirectoryPath();
  const preferencesPath = path.join(profileDir, "Preferences");

  await fs.rm(path.join(profileDir, "Sessions"), { recursive: true, force: true });
  await fs.rm(path.join(profileDir, "Current Session"), { force: true });
  await fs.rm(path.join(profileDir, "Current Tabs"), { force: true });
  await fs.rm(path.join(profileDir, "Last Session"), { force: true });
  await fs.rm(path.join(profileDir, "Last Tabs"), { force: true });

  const preferencesJson = await fs.readFile(preferencesPath, "utf8").catch(() => undefined);
  if (!preferencesJson) return;

  const preferences = JSON.parse(preferencesJson) as {
    profile?: { exited_cleanly?: boolean; exit_type?: string };
    session?: { restore_on_startup?: number; startup_urls?: string[] };
  };

  preferences.profile ??= {};
  preferences.profile.exited_cleanly = true;
  preferences.profile.exit_type = "Normal";
  preferences.session ??= {};
  preferences.session.restore_on_startup = 5;
  preferences.session.startup_urls = [];

  await fs.writeFile(preferencesPath, JSON.stringify(preferences));
}

async function delayBeforeClosingChrome() {
  if (CHROME_CLOSE_DELAY_MS === 0) return;
  await new Promise((resolve) => setTimeout(resolve, CHROME_CLOSE_DELAY_MS));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function captureFailureScreenshot(page: Page, testName: string) {
  await fs.mkdir(FAILURE_SCREENSHOT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const screenshotPath = path.join(FAILURE_SCREENSHOT_DIR, `${timestamp}-${slugify(testName)}.png`);

  await page.screenshot({ fullPage: true, path: screenshotPath });
  return screenshotPath;
}

export const test = base.extend("chromePage", async ({ task }, { onCleanup }) => {
  expect(
    await pathExists(CHROME_APP),
    "Google Chrome should be installed at /Applications/Google Chrome.app",
  ).toBe(true);

  let context: BrowserContext | undefined;
  let page: Page | undefined;

  context = await launchChromeContext();
  const startupPages = context.pages();
  page = await context.newPage();
  await Promise.all(startupPages.map((startupPage) => startupPage.close().catch(() => {})));

  onCleanup(async () => {
    if (task.result?.state === "fail" && page) {
      try {
        const screenshotPath = await captureFailureScreenshot(page, task.name);
        console.error(`\n  Failure screenshot: ${screenshotPath}`);
      } catch (error) {
        console.error(
          `\n  Failed to capture failure screenshot: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    await delayBeforeClosingChrome();
    await context?.close();
  });

  return page;
});

export async function goto(page: Page, url: string) {
  await page.goto(url, { timeout: 60_000, waitUntil: "domcontentloaded" });
}

export async function waitForBodyText(page: Page, timeoutMs = 30_000) {
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

export async function readBodyText(page: Page, timeoutMs = 5_000) {
  return page
    .locator("body")
    .innerText({ timeout: timeoutMs })
    .catch(() => "");
}

export async function waitForUrlMatchOrContinue(page: Page, url: RegExp, timeoutMs = 30_000) {
  await page.waitForURL(url, { timeout: timeoutMs }).catch(() => {});
}

export async function assertClaudeSecurityVerificationIsNotBlocking(page: Page) {
  const bodyText = await readBodyText(page);

  expect(bodyText, "Claude should not be blocked by Cloudflare security verification").not.toMatch(
    /Performing security verification|Verify you are human|Cloudflare/,
  );
}
