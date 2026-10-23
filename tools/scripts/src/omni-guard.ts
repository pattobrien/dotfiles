#!/usr/bin/env bun

import { appendFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    log: { type: "string" },
    pid: { type: "string", multiple: true, default: [] },
    "exit-on-alert": { type: "boolean", default: false },
    stdin: { type: "boolean", default: false },
  },
});

const omniwmctl = "/Applications/OmniWM.app/Contents/MacOS/omniwmctl";
const channels = ["active-workspace", "focus", "windows-changed"];

type Workspace = { number: number; displayName: string };
type App = { bundleId: string; name: string };
type Win = {
  id: string;
  pid: number;
  title: string;
  app: App;
  workspace: Workspace;
};
type Event = {
  channel: string;
  result: {
    payload: {
      workspace?: Workspace;
      focusedApp?: App;
      window?: Win;
      windows?: Win[];
    };
  };
};

const watchedPids = new Set(values.pid.map(Number));
let home: number | undefined;
let knownPids: Set<number> | undefined;
let alerts = 0;

const foreign = (pid: number) =>
  watchedPids.size > 0 ? watchedPids.has(pid) : !knownPids?.has(pid);

async function emit(record: Record<string, unknown>) {
  const line = JSON.stringify({ at: new Date().toISOString(), ...record });
  console.log(line);
  if (values.log) await appendFile(values.log, line + "\n");
}

async function alert(reason: string, w: Win) {
  alerts += 1;
  await emit({
    level: "ALERT",
    reason,
    app: w.app.name,
    pid: w.pid,
    title: w.title,
    workspace: w.workspace.number,
  });
  if (values["exit-on-alert"]) process.exit(3);
}

async function handle(event: Event) {
  const p = event.result.payload;
  if (event.channel === "active-workspace" && p.workspace) {
    if (home === undefined) {
      home = p.workspace.number;
      await emit({ level: "info", home });
    }
    return;
  }
  if (event.channel === "windows-changed" && p.windows) {
    if (knownPids === undefined) {
      knownPids = new Set(p.windows.map((w) => w.pid));
      await emit({
        level: "info",
        knownPids: knownPids.size,
        watchedPids: [...watchedPids],
      });
      return;
    }
    for (const w of p.windows) {
      if (!foreign(w.pid)) continue;
      if (w.workspace.number === home) {
        await alert("foreign window on home workspace", w);
      }
    }
    return;
  }
  if (event.channel === "focus" && p.window && knownPids) {
    if (foreign(p.window.pid))
      await alert("foreign window took focus", p.window);
  }
}

async function run(stream: ReadableStream<Uint8Array>) {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line);
      if (parsed.kind !== "event") continue;
      await handle(parsed as Event);
    }
  }
}

if (values.stdin) {
  await run(Bun.stdin.stream());
} else {
  const proc = Bun.spawn(
    [omniwmctl, "subscribe", channels.join(","), "--format", "ndjson"],
    { stdout: "pipe", stderr: "inherit" },
  );
  await emit({ level: "info", watching: channels });
  await run(proc.stdout);
}
await emit({ level: "info", done: true, alerts });
process.exit(alerts > 0 ? 3 : 0);
