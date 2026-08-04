import type { TermBackend, TermLaunchOptions, TermSession } from "./backend.ts";

/**
 * Protocol-level seam over a session's raw escape-sequence traffic.
 *
 * Instead of rendering graphics or synthesizing pixel input in an emulator,
 * this taps the output stream (via `TermLaunchOptions.onOutput`) and:
 *
 * - parses kitty graphics APC commands (`ESC _ G k=v,..;payload ESC \`)
 *   into structured records,
 * - tracks DECSET/DECRST private modes (mouse modes 1000/1002/1003/1005/
 *   1006/1015/1016 among them) and OSC 22 pointer-shape changes,
 * - answers the one host query herdr's graphics path actually issues:
 *   XTWINOPS `CSI 16 t` (cell size in pixels). Herdr sends it only when the
 *   PTY ioctl reports no pixel size — always the case under node-pty — and
 *   reads the `CSI 6 ; height ; width t` reply to map pixels to cells.
 *   Everything else herdr emits is fire-and-forget: its graphics commands
 *   all carry `q=2`, so no APC query round-trip exists, and it never probes
 *   DA, XTGETTCAP, or DECRQM on the host.
 */

/** Synthetic host cell size reported to `CSI 16 t` (pixels). */
export const SYNTH_CELL_WIDTH_PX = 10;
export const SYNTH_CELL_HEIGHT_PX = 20;

export interface GraphicsCommand {
  /** Kitty graphics action: "t"/"T" transmit, "p" put, "d" delete, "q" query. */
  action: string;
  /** Control keys as written (`i`, `f`, `s`, `v`, `p`, ...). */
  keys: Record<string, string>;
  /** Decoded payload chunk. */
  payload: Buffer;
  /** Decoded byte length of the base64 payload chunk. */
  payloadBytes: number;
}

export interface ProtocolSeam {
  /** Feed a chunk of session output (wire into `TermLaunchOptions.onOutput`). */
  onOutput(data: Uint8Array): void;
  /** Connect the input side; queued auto-responses flush immediately. */
  bindInput(write: (data: string) => void): void;
  /** Kitty graphics commands seen on the host stream, in order. */
  readonly graphics: GraphicsCommand[];
  /** Last DECSET (true) / DECRST (false) state per private mode number. */
  readonly mouseModes: Map<number, boolean>;
  /** OSC 22 pointer shapes, in emission order. */
  readonly pointerShapes: string[];
  /** Number of `CSI 16 t` cell-size queries answered. */
  readonly cellSizeQueries: number;
  /**
   * Left click at a pixel position: raw SGR-pixels (1016) when the host
   * stream enabled it, otherwise SGR (1006) with the cell containing the
   * pixel under the synthetic cell size.
   */
  clickPixels(px: number, py: number): void;
}

/** Center of a cell in surface pixels under the synthetic cell size. */
export function pixelCenterOfCell(col: number, row: number): [number, number] {
  return [
    Math.floor((col + 0.5) * SYNTH_CELL_WIDTH_PX),
    Math.floor((row + 0.5) * SYNTH_CELL_HEIGHT_PX),
  ];
}

// APC G (control;payload) | DECSET/DECRST | XTWINOPS 16t | OSC 22 (ST or BEL).
const TOKEN =
  // eslint-disable-next-line no-control-regex
  /\x1b_G([^;\x1b]*)(?:;([^\x1b]*))?\x1b\\|\x1b\[\?([\d;]+)([hl])|\x1b\[16t|\x1b\]22;([^\x07\x1b]*)(?:\x07|\x1b\\)/g;

export function createProtocolSeam(): ProtocolSeam {
  const decoder = new TextDecoder();
  let buffer = "";
  const graphics: GraphicsCommand[] = [];
  const mouseModes = new Map<number, boolean>();
  const pointerShapes: string[] = [];
  let cellSizeQueries = 0;
  let write: ((data: string) => void) | undefined;
  const queued: string[] = [];

  function send(data: string) {
    if (write) write(data);
    else queued.push(data);
  }

  function handleGraphics(control: string, payload: string | undefined) {
    const keys: Record<string, string> = {};
    for (const part of control.split(",")) {
      const eq = part.indexOf("=");
      if (eq > 0) keys[part.slice(0, eq)] = part.slice(eq + 1);
    }
    const decoded = payload ? Buffer.from(payload, "base64") : Buffer.alloc(0);
    graphics.push({
      action: keys["a"] ?? "t",
      keys,
      payload: decoded,
      payloadBytes: decoded.length,
    });
  }

  function handleToken(match: RegExpExecArray) {
    const [, gControl, gPayload, modes, setReset, pointerShape] = match;
    if (gControl !== undefined) {
      handleGraphics(gControl, gPayload);
    } else if (modes !== undefined) {
      for (const mode of modes.split(";")) {
        mouseModes.set(Number(mode), setReset === "h");
      }
    } else if (pointerShape !== undefined) {
      pointerShapes.push(pointerShape);
    } else {
      // CSI 16 t — reply with the synthetic cell size (height;width).
      cellSizeQueries += 1;
      send(`\x1b[6;${SYNTH_CELL_HEIGHT_PX};${SYNTH_CELL_WIDTH_PX}t`);
    }
  }

  function onOutput(data: Uint8Array) {
    buffer += decoder.decode(data, { stream: true });
    TOKEN.lastIndex = 0;
    let lastEnd = 0;
    for (let match; (match = TOKEN.exec(buffer)) !== null; ) {
      handleToken(match);
      lastEnd = TOKEN.lastIndex;
    }
    // Keep only what could still be a partial token: an unterminated APC
    // (whose payload may contain the terminator's lone ESC), else the tail
    // from the last ESC (no tracked non-APC token contains an inner ESC).
    const rest = buffer.slice(lastEnd);
    const apcStart = rest.indexOf("\x1b_G");
    const keepFrom = apcStart >= 0 ? apcStart : rest.lastIndexOf("\x1b");
    buffer = keepFrom >= 0 ? rest.slice(keepFrom) : "";
  }

  return {
    onOutput,
    bindInput(fn) {
      write = fn;
      for (const data of queued.splice(0)) write(data);
    },
    graphics,
    mouseModes,
    pointerShapes,
    get cellSizeQueries() {
      return cellSizeQueries;
    },
    clickPixels(px, py) {
      if (mouseModes.get(1016)) {
        send(`\x1b[<0;${px};${py}M\x1b[<0;${px};${py}m`);
        return;
      }
      if (!mouseModes.get(1006)) {
        throw new Error("clickPixels: no SGR mouse mode (1006/1016) active on the host");
      }
      const col = Math.floor(px / SYNTH_CELL_WIDTH_PX) + 1;
      const row = Math.floor(py / SYNTH_CELL_HEIGHT_PX) + 1;
      send(`\x1b[<0;${col};${row}M\x1b[<0;${col};${row}m`);
    },
  };
}

/**
 * Wrap a backend so every launched session feeds the seam and the seam's
 * auto-responses are typed straight back into the session's PTY.
 */
export function withProtocolSeam(backend: TermBackend, seam: ProtocolSeam): TermBackend {
  return {
    name: `${backend.name}+protocol-seam`,

    async launch(command: string[], options: TermLaunchOptions = {}): Promise<TermSession> {
      const session = await backend.launch(command, {
        ...options,
        onOutput: (data) => {
          options.onOutput?.(data);
          seam.onOutput(data);
        },
      });
      seam.bindInput((data) => session.type(data));
      return session;
    },
  };
}
