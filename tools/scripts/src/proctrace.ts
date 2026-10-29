#!/usr/bin/env bun

import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";

import { parseLine } from "./proctrace/eslogger.ts";
import { buildResource, otlpSink, type SpanSink } from "./proctrace/export.ts";
import { tailLines, type Cursor } from "./proctrace/tail.ts";
import { ProcessTree, type TreeSnapshot } from "./proctrace/tree.ts";

const EVENTS_PATH = "/var/log/proctrace/events.ndjson";
const STATE_DIR = join(process.env.HOME ?? "", ".local/state/proctrace");
const STATE_PATH = join(STATE_DIR, "state.json");
const HEADERS_HELPER = new URL("./claude-otel-headers.ts", import.meta.url)
  .pathname;

interface State {
  cursor?: Cursor;
  tree?: TreeSnapshot;
  lastSeq?: number;
}

const newIds = () => ({
  traceId: randomBytes(16).toString("hex"),
  spanId: randomBytes(8).toString("hex"),
});

function log(message: string): void {
  console.error(`${new Date().toISOString()} ${message}`);
}

function loadState(): State {
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveState(state: State): void {
  mkdirSync(STATE_DIR, { recursive: true });
  const tmp = `${STATE_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(state));
  renameSync(tmp, STATE_PATH);
}

async function fetchHeaders(): Promise<Record<string, string>> {
  const proc = Bun.spawn([process.execPath, HEADERS_HELPER], {
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0)
    throw new Error(`claude-otel-headers failed (${code}): ${stderr.trim()}`);
  return JSON.parse(stdout);
}

function requireEndpoint(): string {
  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) throw new Error("OTEL_EXPORTER_OTLP_ENDPOINT is not set");
  return endpoint;
}

interface Counters {
  lines: number;
  invalid: number;
  spans: number;
  oversize: number;
  dropped: number;
}

async function pump(
  path: string,
  sink: SpanSink,
  state: State,
  follow: boolean,
  stop: AbortSignal,
): Promise<void> {
  const tree = new ProcessTree(process.getuid!(), newIds);
  if (state.tree) tree.restore(state.tree);
  const counters: Counters = {
    lines: 0,
    invalid: 0,
    spans: 0,
    oversize: 0,
    dropped: 0,
  };
  let lastSeq = state.lastSeq;
  let dirty = false;

  const checkpoint = () => {
    if (!follow || !dirty) return;
    saveState({ cursor: state.cursor, tree: tree.snapshot(), lastSeq });
    dirty = false;
  };
  const report = () =>
    log(
      `lines=${counters.lines} spans=${counters.spans} invalid=${counters.invalid} oversize=${counters.oversize} dropped=${counters.dropped} tracked=${tree.size}`,
    );
  const checkpointTimer = setInterval(checkpoint, 5_000);
  const reportTimer = setInterval(report, 60_000);

  try {
    for await (const { line, cursor } of tailLines(
      path,
      state.cursor,
      stop,
      follow,
      (bytes) => {
        counters.oversize++;
        log(`dropped oversize line (${bytes} bytes)`);
      },
      (bytes) => log(`truncated ${path} after draining ${bytes} bytes`),
    )) {
      counters.lines++;
      state.cursor = cursor;
      dirty = true;
      const parsed = parseLine(line);
      if (parsed.kind === "invalid") {
        counters.invalid++;
        if (counters.invalid <= 20)
          log(`invalid line: ${parsed.reason.slice(0, 300)}`);
        continue;
      }
      if (parsed.kind !== "message") continue;
      const seq = parsed.message.global_seq_num;
      if (seq !== undefined) {
        if (lastSeq !== undefined && seq > lastSeq + 1)
          counters.dropped += seq - lastSeq - 1;
        if (lastSeq === undefined || seq > lastSeq) lastSeq = seq;
      }
      for (const span of tree.handle(parsed.message)) {
        counters.spans++;
        sink.emit(span);
      }
    }
  } finally {
    clearInterval(checkpointTimer);
    clearInterval(reportTimer);
    report();
    checkpoint();
  }
}

function stdoutSink(): SpanSink {
  return {
    emit: (span) => console.log(JSON.stringify(span)),
    flush: async () => {},
    shutdown: async () => {},
  };
}

async function main(): Promise<void> {
  const [command = "run", argument] = process.argv.slice(2);
  const controller = new AbortController();
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      log(`${signal} received, draining`);
      controller.abort();
    });
  }

  if (command === "replay") {
    if (!argument) throw new Error("usage: proctrace replay <events.ndjson>");
    await pump(argument, stdoutSink(), {}, false, controller.signal);
    return;
  }
  if (command !== "run")
    throw new Error("usage: proctrace [run [file]|replay <file>]");

  const endpoint = requireEndpoint();
  const headers = await fetchHeaders();
  const sink = otlpSink(headers, buildResource(hostname()));
  const path = argument ?? EVENTS_PATH;
  log(`exporting to ${endpoint} from ${path}`);
  try {
    await pump(path, sink, loadState(), true, controller.signal);
  } finally {
    await sink.shutdown();
  }
}

await main();
