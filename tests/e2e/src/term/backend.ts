/**
 * Backend seam for emulator-driven terminal tests.
 *
 * Tests and harness code launch processes through this interface so the
 * emulator underneath (Termless by default, xterm.js as fallback) can be
 * swapped without touching call sites. Termless-specific extras (matchers,
 * region selectors) are reachable via `TermlessSession.term` — tests that
 * use them are knowingly coupled to the Termless backend.
 */

export interface TermLaunchOptions {
  cols?: number;
  rows?: number;
  /** Recording label (filename of the session's .cast). Defaults to the command name. */
  label?: string;
  /**
   * Env var overrides, merged on top of process.env (Termless enforces
   * this merge internally, so a var can never be removed here — vars that
   * must not reach spawned processes are deleted from process.env itself
   * in tests/setup.ts).
   */
  env?: Record<string, string>;
  cwd?: string;
}

export interface TermSession {
  /** Visible screen contents as plain text. */
  text(): string;
  /** Raw output stream including escape sequences (SGR, OSC, APC). */
  raw(): string;
  /** Write literal text to the process PTY. */
  type(text: string): void;
  /** Press a named key ("Enter", "Escape", "ArrowDown", ...). */
  press(key: string): void;
  /** Left-click at cell position (0-indexed column, row). */
  click(col: number, row: number): void;
  /** Wait for text (or pattern) to appear on the visible screen. */
  waitFor(pattern: string | RegExp, timeoutMs?: number): Promise<void>;
  resize(cols: number, rows: number): void;
  /** Whether the spawned process is still running. */
  readonly alive: boolean;
  dispose(): Promise<void>;
}

export interface TermBackend {
  readonly name: string;
  launch(command: string[], options?: TermLaunchOptions): Promise<TermSession>;
}

export async function pollFor(
  predicate: () => boolean,
  what: string,
  timeoutMs = 5_000,
  intervalMs = 50,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${what}`);
}
