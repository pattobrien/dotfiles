import { spawn as ptySpawn } from "node-pty";

import {
  KittyGraphicsHandler,
  KittyImageStorage,
  type IKittyImageData,
} from "../../vendor/xterm-master/kitty-headless.mjs";
import { Terminal } from "../../vendor/xterm-master/xterm-headless.mjs";
import { pollFor, type TermBackend, type TermLaunchOptions, type TermSession } from "./backend.ts";

/** Minimal named-key → escape-sequence map (extend as tests need keys). */
const KEYS: Record<string, string> = {
  Enter: "\r",
  Escape: "\x1b",
  Tab: "\t",
  Backspace: "\x7f",
  ArrowUp: "\x1b[A",
  ArrowDown: "\x1b[B",
  ArrowRight: "\x1b[C",
  ArrowLeft: "\x1b[D",
};

/**
 * Synthetic cell pixel size: a headless emulator has no real pixels, so
 * XTWINOPS 14t/16t queries are answered with these, and pixel↔cell mouse
 * conversions use them. 8x16 deliberately matches herdr's own fallback so
 * geometry stays consistent even if a query reply races the handshake.
 */
const CELL_W = 8;
const CELL_H = 16;

const MOUSE_TRACKING_MODES = [1000, 1002, 1003];
const SGR_MOUSE_MODE = 1006;
const SGR_PIXELS_MODE = 1016;

/** xterm.js session with mouse/graphics extras beyond the TermSession seam. */
export interface XtermSession extends TermSession {
  /** Left-click at a pixel position (1-indexed, synthetic cell geometry). */
  clickPixel(px: number, py: number): void;
  /** DEC private modes currently set by the app (1000/1002/1003/1006/1016...). */
  mouseModes(): ReadonlySet<number>;
  /** Kitty images transmitted to the emulator (addon-image kitty storage). */
  graphics(): IKittyImageData[];
}

/**
 * xterm.js backend: node-pty PTY piped into a vendored xterm.js master
 * headless build (vendor/xterm-master) with the kitty graphics MVP handler
 * registered on the parser. Beyond launch/output/input/resize it tracks DEC
 * mouse modes, answers XTWINOPS 14t/16t with synthetic cell pixel sizes,
 * and encodes SGR (1006) and SGR-pixels (1016) mouse clicks.
 */
export function createXtermBackend(): TermBackend {
  return {
    name: "xterm",

    async launch(command, options: TermLaunchOptions = {}) {
      let cols = options.cols ?? 200;
      // Mutable: resize() updates it so screen reads cover newly exposed rows.
      let rows = options.rows ?? 50;
      const [file, ...args] = command;
      if (!file) throw new Error("launch: empty command");

      const term = new Terminal({ cols, rows, allowProposedApi: true });
      let rawOutput = "";
      let exited = false;

      const pty = ptySpawn(file, args, {
        name: "xterm-256color",
        cols,
        rows,
        // Match Termless's env semantics (overrides merged over process.env).
        env: { ...(process.env as Record<string, string>), ...options.env },
        cwd: options.cwd ?? process.cwd(),
      });
      pty.onExit(() => {
        exited = true;
      });

      // Kitty graphics: register the addon's handler directly on the parser.
      // The shared ImageStorage / ImageRenderer are DOM-bound display
      // machinery; transmits only touch KittyImageStorage, so stubs suffice
      // (placements no-op under Node before ever reaching the stubs).
      let nextStorageId = 1;
      const kittyStorage = new KittyImageStorage({
        onImageDeleted: undefined as ((id: number) => void) | undefined,
        deleteImage: (_id: number) => {},
        addImage: (_img: unknown, _opts: unknown) => nextStorageId++,
      });
      const core = (
        term as unknown as {
          _core: {
            _inputHandler: {
              _parser: {
                registerApcHandler(
                  id: { final: string },
                  handler: KittyGraphicsHandler,
                ): { dispose(): void };
              };
            };
          };
        }
      )._core;
      const kittyHandler = new KittyGraphicsHandler(
        { kittySizeLimit: 33554432, pixelLimit: 16777216 },
        { dimensions: undefined },
        kittyStorage,
        { _core: core, cols },
      );
      const apcRegistration = core._inputHandler._parser.registerApcHandler(
        { final: "G" },
        kittyHandler,
      );
      // Query responses the emulator itself generates (DA, DSR, kitty ACKs).
      term.onData((data: string) => pty.write(data));

      // DEC private mode tracking + XTWINOPS query answering, scanned off the
      // raw output stream. `carry` holds a trailing partial escape sequence
      // split across PTY chunks.
      const modes = new Set<number>();
      let carry = "";
      const scanOutput = (chunk: string) => {
        const s = carry + chunk;
        for (const m of s.matchAll(/\x1b\[(?:\?([0-9;]+)([hl])|(1[46])t)/g)) {
          if (m[3] === "16") {
            pty.write(`\x1b[6;${CELL_H};${CELL_W}t`);
          } else if (m[3] === "14") {
            pty.write(`\x1b[4;${rows * CELL_H};${cols * CELL_W}t`);
          } else if (m[1]) {
            for (const param of m[1].split(";")) {
              const mode = Number(param);
              if (m[2] === "h") modes.add(mode);
              else modes.delete(mode);
            }
          }
        }
        const escIndex = s.lastIndexOf("\x1b");
        const tail = escIndex === -1 ? "" : s.slice(escIndex);
        carry = /^\x1b(\[[0-9;?]*)?$/.test(tail) ? tail : "";
      };
      const outputEncoder = new TextEncoder();
      pty.onData((data) => {
        rawOutput += data;
        scanOutput(data);
        term.write(data);
        options.onOutput?.(outputEncoder.encode(data));
      });

      const screenText = () => {
        const buf = term.buffer.active;
        const lines: string[] = [];
        for (let y = 0; y < rows; y++) {
          const line = buf.getLine(buf.baseY + y);
          lines.push(line ? line.translateToString(true) : "");
        }
        return lines.join("\n");
      };

      const sgrClick = (x: number, y: number) => {
        pty.write(`\x1b[<0;${x};${y}M\x1b[<0;${x};${y}m`);
      };
      const requireMouseTracking = () => {
        if (!MOUSE_TRACKING_MODES.some((mode) => modes.has(mode))) {
          throw new Error("xterm backend: no mouse tracking mode active (1000/1002/1003)");
        }
        if (!modes.has(SGR_MOUSE_MODE) && !modes.has(SGR_PIXELS_MODE)) {
          throw new Error("xterm backend: no SGR mouse encoding active (1006/1016)");
        }
      };

      const session: XtermSession = {
        text: screenText,
        raw: () => rawOutput,
        type: (text) => pty.write(text),
        press: (key) => {
          const seq = KEYS[key];
          if (!seq) throw new Error(`xterm backend: unmapped key "${key}"`);
          pty.write(seq);
        },
        click: (col, row) => {
          requireMouseTracking();
          if (modes.has(SGR_PIXELS_MODE)) {
            sgrClick(Math.round((col + 0.5) * CELL_W), Math.round((row + 0.5) * CELL_H));
          } else {
            sgrClick(col + 1, row + 1);
          }
        },
        clickPixel: (px, py) => {
          requireMouseTracking();
          if (modes.has(SGR_PIXELS_MODE)) {
            sgrClick(px, py);
          } else {
            sgrClick(Math.floor((px - 1) / CELL_W) + 1, Math.floor((py - 1) / CELL_H) + 1);
          }
        },
        mouseModes: () => modes,
        graphics: () => [...kittyStorage.images.values()],
        async waitFor(pattern, timeoutMs = 5_000) {
          const re =
            typeof pattern === "string"
              ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              : pattern;
          await pollFor(() => re.test(screenText()), `screen to match ${re}`, timeoutMs);
        },
        resize: (newCols, newRows) => {
          pty.resize(newCols, newRows);
          term.resize(newCols, newRows);
          cols = newCols;
          rows = newRows;
        },
        get alive() {
          return !exited;
        },
        async dispose() {
          pty.kill();
          apcRegistration.dispose();
          kittyHandler.dispose();
          kittyStorage.dispose();
          term.dispose();
        },
      };
      return session;
    },
  };
}
