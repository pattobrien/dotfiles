import fs from "node:fs/promises";
import path from "node:path";

import { execaCommand } from "execa";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

import { type TmuxSession } from "./tmux.ts";

const SNAPSHOTS_DIR = path.resolve(import.meta.dirname, "../__snapshots__");
const RESULTS_DIR = path.resolve(import.meta.dirname, "../test-results");

/**
 * Capture a tmux pane as a PNG image using `freeze`.
 * Returns the path to the screenshot.
 */
export async function capturePane(
  tmux: TmuxSession,
  name: string,
): Promise<string> {
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  const outPath = path.join(RESULTS_DIR, `${name}.png`);

  await execaCommand(
    `tmux -L ${tmux.socket} capture-pane -t ${tmux.session} -pe | freeze -o ${outPath}`,
    { shell: true },
  );

  return outPath;
}

/**
 * Compare a screenshot against a baseline snapshot.
 *
 * - If no baseline exists, saves the current screenshot as the baseline
 *   and returns `{ match: true, newBaseline: true }`.
 * - If baseline exists, compares pixels and returns the result.
 * - On mismatch, writes a diff image to `test-results/`.
 */
export async function compareScreenshot(
  actualPath: string,
  snapshotName: string,
  opts: { threshold?: number } = {},
): Promise<{ match: boolean; newBaseline: boolean; diffPixels?: number }> {
  const threshold = opts.threshold ?? 0.1;
  const baselinePath = path.join(SNAPSHOTS_DIR, `${snapshotName}.png`);

  // No baseline yet — save current as baseline
  if (!(await fileExists(baselinePath))) {
    await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });
    await fs.copyFile(actualPath, baselinePath);
    return { match: true, newBaseline: true };
  }

  const baseline = await readPng(baselinePath);
  const actual = await readPng(actualPath);

  // Size mismatch
  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    return { match: false, newBaseline: false, diffPixels: -1 };
  }

  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const diffPixels = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold },
  );

  if (diffPixels > 0) {
    await fs.mkdir(RESULTS_DIR, { recursive: true });
    const diffPath = path.join(RESULTS_DIR, `${snapshotName}-diff.png`);
    await writePng(diffPath, diff);
  }

  return { match: diffPixels === 0, newBaseline: false, diffPixels };
}

/**
 * Save a freeze screenshot on test failure for debugging.
 * Call this in an `afterEach` or in a catch block.
 */
export async function saveFailureScreenshot(
  tmux: TmuxSession,
  testName: string,
): Promise<string> {
  const safeName = testName.replace(/[^a-zA-Z0-9-_]/g, "_");
  return capturePane(tmux, `failure-${safeName}-${Date.now()}`);
}

async function readPng(filePath: string): Promise<PNG> {
  const buffer = await fs.readFile(filePath);
  return PNG.sync.read(buffer);
}

async function writePng(filePath: string, png: PNG): Promise<void> {
  const buffer = PNG.sync.write(png);
  await fs.writeFile(filePath, buffer);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
