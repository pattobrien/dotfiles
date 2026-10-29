import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { SpanStatusCode } from "@opentelemetry/api";
import { expect, test } from "vite-plus/test";

import {
  decodeWaitStatus,
  parseLine,
  parseTime,
} from "../src/proctrace/eslogger.ts";
import {
  parseTraceparent,
  ProcessTree,
  spanName,
  type FinishedSpan,
} from "../src/proctrace/tree.ts";

const fixture = fileURLToPath(
  new URL("./fixtures/eslogger-sample.ndjson", import.meta.url),
);

const ids = () => {
  let n = 0;
  return () => {
    n++;
    return {
      traceId: n.toString(16).padStart(32, "0"),
      spanId: n.toString(16).padStart(16, "0"),
    };
  };
};

const replay = (uid = 501) => {
  const tree = new ProcessTree(uid, ids());
  const spans: FinishedSpan[] = [];
  for (const line of readFileSync(fixture, "utf8").split("\n")) {
    const parsed = parseLine(line);
    if (parsed.kind === "message") spans.push(...tree.handle(parsed.message));
  }
  return { tree, spans, byName: new Map(spans.map((s) => [s.name, s])) };
};

test("parses eslogger timestamps to nanosecond HrTime", () => {
  expect(parseTime("2026-10-29T10:00:01.000772617Z")).toEqual([
    1793268001, 772617,
  ]);
  expect(parseTime("2026-10-29T10:00:01Z")).toEqual([1793268001, 0]);
  expect(parseTime("2026-10-29T10:00:01.5+02:00")).toEqual([
    1793260801, 500000000,
  ]);
});

test("decodes wait statuses", () => {
  expect(decodeWaitStatus(0)).toEqual({ kind: "exited", code: 0 });
  expect(decodeWaitStatus(256)).toEqual({ kind: "exited", code: 1 });
  expect(decodeWaitStatus(15)).toEqual({
    kind: "signaled",
    signal: 15,
    coreDumped: false,
  });
  expect(decodeWaitStatus(0x8b)).toEqual({
    kind: "signaled",
    signal: 11,
    coreDumped: true,
  });
});

test("parses W3C traceparent and rejects zero ids", () => {
  expect(
    parseTraceparent("00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01"),
  ).toMatchObject({
    traceId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    spanId: "bbbbbbbbbbbbbbbb",
    isRemote: true,
  });
  expect(
    parseTraceparent("00-00000000000000000000000000000000-bbbbbbbbbbbbbbbb-01"),
  ).toBeUndefined();
  expect(parseTraceparent("garbage")).toBeUndefined();
});

test("names shells with -c and interpreters with their script", () => {
  expect(spanName("/bin/zsh", ["/bin/zsh", "-c", "ls"])).toBe("zsh -c");
  expect(spanName("/bin/zsh", ["/bin/zsh", "-l"])).toBe("zsh");
  expect(spanName("/usr/local/bin/node", ["node", "/a/b/cli.js", "x"])).toBe(
    "node cli.js",
  );
  expect(spanName("/usr/bin/git", ["git", "status"])).toBe("git");
});

test("skips lines that are not eslogger messages", () => {
  expect(parseLine("").kind).toBe("other");
  expect(parseLine("not json").kind).toBe("invalid");
  expect(parseLine('{"event_type":9}').kind).toBe("invalid");
});

test("a shell exec'd with an injected TRACEPARENT joins that trace", () => {
  const { byName } = replay();
  const zsh = byName.get("zsh -c")!;
  expect(zsh.traceId).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  expect(zsh.parent?.spanId).toBe("bbbbbbbbbbbbbbbb");
  expect(zsh.parent?.isRemote).toBe(true);
  expect(zsh.attributes["process.command_args"]).toEqual([
    "/bin/zsh",
    "-c",
    "git status && ls",
  ]);
  expect(zsh.attributes["process.working_directory"]).toBe("/Users/patt/dev");
  expect(zsh.attributes["process.exit.code"]).toBe(0);
  expect(zsh.status.code).toBe(SpanStatusCode.UNSET);
});

test("children inherit the parent span, not the inherited TRACEPARENT", () => {
  const { byName } = replay();
  const zsh = byName.get("zsh -c")!;
  for (const name of ["git", "ls", "zsh (fork)"]) {
    const child = byName.get(name)!;
    expect(child.traceId).toBe(zsh.traceId);
    expect(child.parent?.spanId).toBe(zsh.spanId);
    expect(child.links).toEqual([]);
  }
});

test("exit codes and signals set span status", () => {
  const { byName } = replay();
  expect(byName.get("git")!.status).toEqual({ code: SpanStatusCode.UNSET });
  expect(byName.get("ls")!.status).toEqual({
    code: SpanStatusCode.ERROR,
    message: "signal 15",
  });
  expect(byName.get("ls")!.attributes["proctrace.exit_signal"]).toBe(15);
  const fork = byName.get("zsh (fork)")!;
  expect(fork.attributes["proctrace.fork_only"]).toBe(true);
  expect(fork.attributes["process.exit.code"]).toBe(1);
  expect(fork.status.code).toBe(SpanStatusCode.ERROR);
});

test("only allowlisted env vars are kept", () => {
  const { byName } = replay();
  const keys = Object.keys(byName.get("zsh -c")!.attributes).filter((k) =>
    k.startsWith("env."),
  );
  expect(keys.toSorted()).toEqual([
    "env.CLAUDECODE",
    "env.CLAUDE_CODE_SESSION_ID",
    "env.HERDR_PANE_ID",
    "env.TRACEPARENT",
  ]);
});

test("processes of other users are tracked but not exported", () => {
  const { spans, tree } = replay();
  expect(spans.map((s) => s.name)).not.toContain("mdworker");
  expect(tree.size).toBe(0);
  expect(replay(0).spans.map((s) => s.name)).toEqual(["mdworker"]);
});

test("the tree survives a snapshot and restore", () => {
  const tree = new ProcessTree(501, ids());
  const lines = readFileSync(fixture, "utf8").split("\n");
  const first = parseLine(lines[1]!);
  if (first.kind === "message") tree.handle(first.message);
  const restored = new ProcessTree(501, ids());
  restored.restore(JSON.parse(JSON.stringify(tree.snapshot())));
  expect(restored.size).toBe(1);
  const exit = parseLine(lines[10]!);
  if (exit.kind !== "message") throw new Error("fixture changed");
  const [span] = restored.handle(exit.message);
  expect(span?.name).toBe("zsh -c");
});
