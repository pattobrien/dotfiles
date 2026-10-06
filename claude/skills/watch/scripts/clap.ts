import { dlopen, ptr } from "bun:ffi";
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    log: { type: "string" },
    clapper: { type: "boolean", default: false },
    hold: { type: "string", default: "50" },
  },
});
const [cmd, ...args] = positionals;
if (!values.log || !cmd) {
  console.error("usage: bun clap.ts --log <file.json> [--clapper] [--hold <ms>] -- <command> [args...]");
  process.exit(2);
}

const { symbols: libc } = dlopen("libSystem.B.dylib", {
  mach_absolute_time: { args: [], returns: "u64" },
  mach_timebase_info: { args: ["ptr"], returns: "i32" },
});
const timebase = new Uint32Array(2);
libc.mach_timebase_info(ptr(timebase));
const hostSeconds = () => (Number(libc.mach_absolute_time()) * timebase[0]) / timebase[1] / 1e9;

let markerAt: number | undefined;
if (values.clapper) {
  process.stdout.write("\x1b[2J\x1b[?25l");
  process.stdout.write([1, 2, 3].map((row) => `\x1b[${row};1H\x1b[48;5;15m${" ".repeat(24)}\x1b[0m`).join(""));
  markerAt = hostSeconds();
  await Bun.sleep(Number(values.hold));
  process.stdout.write("\x1b[2J\x1b[H\x1b[?25h");
}

const triggerAt = hostSeconds();
const child = Bun.spawn([cmd, ...args], { stdio: ["inherit", "inherit", "inherit"] });
writeFileSync(values.log, JSON.stringify({ cmd: [cmd, ...args], clock: "mach_absolute_time", triggerAt, markerAt }) + "\n");
process.exit(await child.exited);
