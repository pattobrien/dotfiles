import {
  closeSync,
  existsSync,
  fstatSync,
  ftruncateSync,
  openSync,
  readSync,
  statSync,
} from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

export interface Cursor {
  ino: number;
  offset: number;
}

export interface TailedLine {
  line: string;
  cursor: Cursor;
}

const CHUNK = 1 << 20;
const MAX_LINE = 8 << 20;
const POLL_MS = 250;
const ROTATE_GRACE_MS = 2000;
const TRUNCATE_AT = 64 << 20;

async function waitForFile(path: string, stop: AbortSignal): Promise<void> {
  while (!stop.aborted && !existsSync(path)) {
    await sleep(POLL_MS * 4, undefined, { signal: stop }).catch(() => {});
  }
}

function openAt(path: string, start?: Cursor) {
  const fd = openSync(path, "r");
  const stat = fstatSync(fd);
  const offset =
    start && start.ino === stat.ino ? Math.min(start.offset, stat.size) : 0;
  return { fd, ino: stat.ino, offset, owned: stat.uid === process.getuid?.() };
}

function truncateDrained(path: string, ino: number, offset: number): boolean {
  const writer = openSync(path, "r+");
  try {
    const stat = fstatSync(writer);
    if (stat.ino !== ino || stat.size !== offset) return false;
    ftruncateSync(writer, 0);
    return true;
  } finally {
    closeSync(writer);
  }
}

function currentIno(path: string): number | undefined {
  try {
    return statSync(path).ino;
  } catch {
    return undefined;
  }
}

export async function* tailLines(
  path: string,
  start: Cursor | undefined,
  stop: AbortSignal,
  follow: boolean,
  onOversize: (bytes: number) => void,
  onTruncate: (bytes: number) => void,
): AsyncGenerator<TailedLine> {
  if (follow) await waitForFile(path, stop);
  if (stop.aborted) return;
  let file = openAt(path, start);
  const buffer = Buffer.alloc(CHUNK);
  let pending = Buffer.alloc(0);
  let dropping = false;
  let rotatedAt: number | undefined;

  try {
    while (!stop.aborted) {
      const read = readSync(file.fd, buffer, 0, CHUNK, file.offset);
      if (read > 0) {
        file.offset += read;
        pending = pending.length
          ? Buffer.concat([pending, buffer.subarray(0, read)])
          : Buffer.from(buffer.subarray(0, read));
        let from = 0;
        for (;;) {
          const nl = pending.indexOf(10, from);
          if (nl === -1) break;
          if (dropping) {
            dropping = false;
          } else {
            yield {
              line: pending.toString("utf8", from, nl),
              cursor: {
                ino: file.ino,
                offset: file.offset - (pending.length - nl - 1),
              },
            };
          }
          from = nl + 1;
        }
        pending = from > 0 ? Buffer.from(pending.subarray(from)) : pending;
        if (pending.length > MAX_LINE) {
          onOversize(pending.length);
          pending = Buffer.alloc(0);
          dropping = true;
        }
        continue;
      }

      if (!follow) return;
      if (pending.length === 0 && file.offset >= TRUNCATE_AT && file.owned) {
        if (truncateDrained(path, file.ino, file.offset)) {
          onTruncate(file.offset);
          file.offset = 0;
          continue;
        }
      }
      const size = fstatSync(file.fd).size;
      if (size < file.offset) {
        file.offset = 0;
        pending = Buffer.alloc(0);
        dropping = false;
        continue;
      }
      const ino = currentIno(path);
      if (ino !== undefined && ino !== file.ino) {
        rotatedAt ??= Date.now();
        if (Date.now() - rotatedAt >= ROTATE_GRACE_MS) {
          closeSync(file.fd);
          file = openAt(path);
          pending = Buffer.alloc(0);
          dropping = false;
          rotatedAt = undefined;
          continue;
        }
      }
      await sleep(POLL_MS, undefined, { signal: stop }).catch(() => {});
    }
  } finally {
    closeSync(file.fd);
  }
}
