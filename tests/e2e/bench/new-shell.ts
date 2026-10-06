import { dlopen, ptr } from "bun:ffi";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { createKittyRc, findKittySocket, type KittyRc } from "./kitty-rc.ts";

const TITLE = "prompt-bench";
const MATCH = `title:${TITLE}`;
const POSITION = "1540x60";
const CLAP = path.join(
  process.env.HOME ?? "",
  ".claude/skills/watch/scripts/clap.ts",
);
const W = 200;
const H = 110;
const FRAME_BYTES = W * H;
const PIX_DELTA = 16;
const MIN_PIXELS = 30;
const MERGE_MS = 50;
const INK_DELTA = 24;
const MARGIN_X = 6;
const BAND_ROWS = 12;
const MIN_INK = 12;
const FIRST_INK_RATIO = 0.25;
const SETTLE_S = 1;
const PRE_S = 1.5;
const POST_S = 3;

const { values } = parseArgs({
  options: {
    runs: { type: "string", default: "10" },
    out: {
      type: "string",
      default: path.resolve(import.meta.dirname, "../test-results/new-shell"),
    },
    fixture: {
      type: "string",
      default: path.resolve(
        import.meta.dirname,
        "../test-results/new-shell-fixture",
      ),
    },
    shell: { type: "string", default: "/bin/zsh" },
    cwd: { type: "string" },
    type: { type: "string" },
    "type-at": { type: "string", default: "200" },
    "type-every": { type: "string", default: "150" },
    reanalyze: { type: "string" },
  },
});

type RunResult = Analysis &
  Trigger & {
    run: number;
    idleAfter: boolean;
    video: string;
  };

interface SavedResults {
  config?: {
    cwd: string;
    chunks: string[];
    typeAtMs: number;
    typeEveryMs: number;
  };
  results: RunResult[];
}

const runs = Number(values.runs);
const shell = values.shell;
const reanalyzeDir = values.reanalyze ? path.resolve(values.reanalyze) : null;
const saved = reanalyzeDir
  ? (JSON.parse(
      readFileSync(path.join(reanalyzeDir, "results.json"), "utf8"),
    ) as SavedResults)
  : null;
const outDir = reanalyzeDir ?? path.resolve(values.out);
const fixture = path.resolve(values.fixture);
const cwd =
  saved?.config?.cwd ?? (values.cwd ? path.resolve(values.cwd) : fixture);
const cwdName = path.basename(cwd);
const chunks =
  saved?.config?.chunks ?? (values.type ? values.type.split("|") : []);
const typed = chunks.join("");
const typeAtMs = saved?.config?.typeAtMs ?? Number(values["type-at"]);
const typeEveryMs = saved?.config?.typeEveryMs ?? Number(values["type-every"]);
mkdirSync(outDir, { recursive: true });

const { symbols: libc } = dlopen("libSystem.B.dylib", {
  mach_absolute_time: { args: [], returns: "u64" },
  mach_timebase_info: { args: ["ptr"], returns: "i32" },
});
const timebase = new Uint32Array(2);
libc.mach_timebase_info(ptr(timebase));
const hostSeconds = () =>
  (Number(libc.mach_absolute_time()) * timebase[0]) / timebase[1] / 1e9;

async function sh(cmd: string[], cwd?: string): Promise<string> {
  const proc = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`${cmd.join(" ")} exited ${code}: ${err}`);
  return out;
}

async function ensureFixture(): Promise<void> {
  if (existsSync(path.join(fixture, ".git"))) return;
  mkdirSync(fixture, { recursive: true });
  await sh(["git", "init", "-q", "-b", "main"], fixture);
  writeFileSync(path.join(fixture, "tracked.txt"), "one\n");
  await sh(["git", "add", "tracked.txt"], fixture);
  await sh(
    [
      "git",
      "-c",
      "user.name=bench",
      "-c",
      "user.email=bench@localhost",
      "commit",
      "-qm",
      "init",
    ],
    fixture,
  );
  writeFileSync(path.join(fixture, "tracked.txt"), "one\ntwo\n");
  writeFileSync(path.join(fixture, "untracked.txt"), "x\n");
}

let rc!: KittyRc;
if (!saved) {
  await ensureFixture();
  rc = createKittyRc(await findKittySocket());
  if (!(await rc.windowExists(MATCH))) {
    await rc.launchOsWindow({ title: TITLE, cwd: fixture, position: POSITION });
    await Bun.sleep(1000);
  }
}

const nonEmpty = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trimEnd())
    .filter(Boolean);
const isIdle = (line: string, buffer = "") =>
  line.includes(cwdName) &&
  (cwd !== fixture || (line.includes("!1") && line.includes("?1"))) &&
  (buffer ? line.includes(`❯ ${buffer}`) : line.endsWith("❯"));

async function waitFor(
  pred: (rows: string[]) => boolean,
  timeoutMs: number,
): Promise<string[] | undefined> {
  const end = Date.now() + timeoutMs;
  let rows: string[] = [];
  while (Date.now() < end) {
    rows = nonEmpty((await rc.getText(MATCH)) ?? "");
    if (pred(rows)) return rows;
    await Bun.sleep(50);
  }
  return undefined;
}

const idleAtBottom = (rows: string[]) => isIdle(rows.at(-1) ?? "");
const idleWithTypedAtBottom = (rows: string[]) =>
  isIdle(rows.at(-1) ?? "", typed);

async function prepare(): Promise<void> {
  await rc.sendText(MATCH, "\x15");
  if (!(await waitFor(idleAtBottom, 5000))) {
    await rc.sendText(MATCH, `\x15cd ${cwd}\r`);
    if (!(await waitFor(idleAtBottom, 10000)))
      throw new Error(`${TITLE} shell is not idle at ${cwd}`);
  }
  await rc.sendText(MATCH, "\x0c");
  if (!(await waitFor((rows) => rows.length === 1 && isIdle(rows[0]), 5000)))
    throw new Error("screen did not clear to a single idle prompt");
  await rc.sendText(MATCH, `exec ${shell}`);
  if (
    !(await waitFor(
      (rows) => rows.length === 1 && rows[0].endsWith(`❯ exec ${shell}`),
      5000,
    ))
  )
    throw new Error("typed command did not appear");
  await Bun.sleep(300);
}

interface Bounds {
  X: number;
  Y: number;
  Width: number;
  Height: number;
}

async function windowBounds(): Promise<Bounds> {
  const jxa = `ObjC.import("CoreGraphics");
const list = ObjC.castRefToObject($.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly, 0));
JSON.stringify(ObjC.deepUnwrap(list).filter(w => w.kCGWindowName === "${TITLE}").map(w => w.kCGWindowBounds))`;
  const list = JSON.parse(
    await sh(["osascript", "-l", "JavaScript", "-e", jxa]),
  ) as Bounds[];
  if (list.length !== 1)
    throw new Error(
      `expected one on-screen ${TITLE} window, found ${list.length}`,
    );
  return list[0];
}

async function screenDevice(): Promise<string> {
  const proc = Bun.spawn(
    [
      "ffmpeg",
      "-hide_banner",
      "-f",
      "avfoundation",
      "-list_devices",
      "true",
      "-i",
      "",
    ],
    {
      stdout: "ignore",
      stderr: "pipe",
    },
  );
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  const m = err.match(/\[(\d+)\] Capture screen 0/);
  if (!m) throw new Error("no avfoundation 'Capture screen 0' device");
  return m[1];
}

interface Trigger {
  triggerAt: number;
  typedAt: number[];
}

async function record(
  video: string,
  clapLog: string,
  device: string,
  b: Bounds,
): Promise<Trigger> {
  const even = (n: number) => Math.round(n / 2) * 2;
  const ff = Bun.spawn(
    [
      "ffmpeg",
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "avfoundation",
      "-capture_cursor",
      "0",
      "-framerate",
      "60",
      "-pixel_format",
      "nv12",
      "-i",
      `${device}:none`,
      "-copyts",
      "-vf",
      `crop=${even(b.Width)}:${even(b.Height)}:${b.X}:${b.Y}`,
      "-fps_mode",
      "passthrough",
      "-c:v",
      "h264_videotoolbox",
      "-b:v",
      "20M",
      video,
    ],
    { stdout: "ignore", stderr: "pipe" },
  );
  const ffErr = new Response(ff.stderr).text();
  await Bun.sleep(PRE_S * 1000);
  const clap = Bun.spawn(
    [
      "bun",
      CLAP,
      "--log",
      clapLog,
      "--",
      "kitty",
      "@",
      "--to",
      `unix:${rc.socketPath}`,
      "send-text",
      "--match",
      MATCH,
      "\\r",
    ],
    { stdout: "inherit", stderr: "inherit" },
  );
  if ((await clap.exited) !== 0) throw new Error("clap failed");
  const { triggerAt } = JSON.parse(readFileSync(clapLog, "utf8")) as {
    triggerAt: number;
  };
  const typedAt: number[] = [];
  for (const [i, chunk] of chunks.entries()) {
    const due = triggerAt + (typeAtMs + i * typeEveryMs) / 1000;
    const wait = (due - hostSeconds()) * 1000;
    if (wait > 0) await Bun.sleep(wait);
    typedAt.push(hostSeconds());
    await rc.sendText(MATCH, chunk);
  }
  await Bun.sleep(POST_S * 1000);
  ff.kill("SIGINT");
  await ff.exited;
  const err = (await ffErr)
    .split("\n")
    .filter((l) => l && !l.includes("NSKVONotifying"));
  if (err.length) console.error(err.join("\n"));
  return { triggerAt, typedAt };
}

interface Milestone {
  frame: number;
  ms: number;
}

interface TypedChunk {
  text: string;
  sent: Milestone;
  visible: Milestone | null;
  latencyMs: number | null;
}

interface Analysis {
  frames: number;
  baseFrame: number;
  firstPrompt: Milestone | null;
  fullPrompt: Milestone | null;
  typing: TypedChunk[];
  settled: boolean;
  bandInk: { base: number; first: number | null; final: number };
  changes: {
    frames: string;
    startMs: number;
    endMs: number;
    maxPixels: number;
  }[];
}

async function analyze(
  video: string,
  { triggerAt, typedAt }: Trigger,
): Promise<Analysis> {
  const ptsProc = Bun.spawn(
    [
      "ffmpeg",
      "-hide_banner",
      "-copyts",
      "-i",
      video,
      "-fps_mode",
      "passthrough",
      "-vf",
      "signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-",
      "-f",
      "null",
      "-",
    ],
    { stdout: "pipe", stderr: "ignore" },
  );
  const pts = [
    ...(await new Response(ptsProc.stdout).text()).matchAll(
      /pts_time:([\d.]+)/g,
    ),
  ].map((m) => Number(m[1]));
  const rawProc = Bun.spawn(
    [
      "ffmpeg",
      "-hide_banner",
      "-loglevel",
      "error",
      "-copyts",
      "-i",
      video,
      "-fps_mode",
      "passthrough",
      "-vf",
      `scale=${W}:${H},format=gray`,
      "-f",
      "rawvideo",
      "-",
    ],
    { stdout: "pipe", stderr: "ignore" },
  );
  const raw = new Uint8Array(await new Response(rawProc.stdout).arrayBuffer());
  const frames = Math.floor(raw.length / FRAME_BYTES);
  if (frames !== pts.length)
    throw new Error(`frame count mismatch: raw=${frames} pts=${pts.length}`);
  const frame = (n: number) =>
    raw.subarray(n * FRAME_BYTES, (n + 1) * FRAME_BYTES);
  const rel = (n: number) => Math.round((pts[n] - triggerAt) * 1000);

  const baseFrame = pts.findLastIndex((t) => t < triggerAt);
  if (baseFrame < 0) throw new Error("no frame before trigger");
  const base = frame(baseFrame);
  const bg = [...base].sort((a, b) => a - b)[FRAME_BYTES >> 1];
  const inkRow = (f: Uint8Array, y: number) => {
    let count = 0;
    for (let x = MARGIN_X; x < W - MARGIN_X; x++)
      if (Math.abs(f[y * W + x] - bg) > INK_DELTA) count++;
    return count;
  };
  let baseBottom = -1;
  for (let y = H - 1; y >= 0 && baseBottom < 0; y--)
    if (inkRow(base, y) >= 3) baseBottom = y;
  const bandInk = (f: Uint8Array) => {
    let sum = 0;
    for (
      let y = baseBottom + 1;
      y < Math.min(H, baseBottom + 1 + BAND_ROWS);
      y++
    )
      sum += inkRow(f, y);
    return sum;
  };

  const changed: { n: number; pixels: number }[] = [];
  for (let n = baseFrame + 1; n < frames; n++) {
    const a = frame(n - 1);
    const b = frame(n);
    let pixels = 0;
    for (let i = 0; i < FRAME_BYTES; i++)
      if (Math.abs(a[i] - b[i]) > PIX_DELTA) pixels++;
    if (pixels >= MIN_PIXELS) changed.push({ n, pixels });
  }

  const finalInk = bandInk(frame(frames - 1));
  const threshold = Math.max(MIN_INK, finalInk * FIRST_INK_RATIO);
  let firstPrompt: Milestone | null = null;
  let firstInk: number | null = null;
  for (let n = baseFrame + 1; n < frames && !firstPrompt; n++) {
    const ink = bandInk(frame(n));
    if (ink >= threshold) {
      firstPrompt = { frame: n, ms: rel(n) };
      firstInk = ink;
    }
  }
  const last = changed.at(-1);
  const fullPrompt = last ? { frame: last.n, ms: rel(last.n) } : null;
  const settled = last ? pts[frames - 1] - pts[last.n] >= SETTLE_S : false;

  const typing = typedAt.map((at, i): TypedChunk => {
    const sentN = pts.findIndex((t) => t >= at);
    if (sentN < 0) throw new Error("no frame after typing");
    const vis = changed.find((c) => c.n >= sentN);
    return {
      text: chunks[i],
      sent: { frame: sentN, ms: rel(sentN) },
      visible: vis ? { frame: vis.n, ms: rel(vis.n) } : null,
      latencyMs: vis ? Math.round((pts[vis.n] - at) * 1000) : null,
    };
  });

  const merged: { startN: number; endN: number; maxPixels: number }[] = [];
  for (const c of changed) {
    const m = merged.at(-1);
    if (m && (pts[c.n] - pts[m.endN]) * 1000 <= MERGE_MS) {
      m.endN = c.n;
      m.maxPixels = Math.max(m.maxPixels, c.pixels);
    } else merged.push({ startN: c.n, endN: c.n, maxPixels: c.pixels });
  }
  const changes = merged.map((m) => ({
    frames: m.startN === m.endN ? `${m.startN}` : `${m.startN}-${m.endN}`,
    startMs: rel(m.startN),
    endMs: rel(m.endN),
    maxPixels: m.maxPixels,
  }));

  return {
    frames,
    baseFrame,
    firstPrompt,
    fullPrompt,
    typing,
    settled,
    bandInk: { base: bandInk(base), first: firstInk, final: finalInk },
    changes,
  };
}

async function sheet(
  video: string,
  triggerAt: number,
  picks: number[],
  out: string,
): Promise<void> {
  const ns = [...new Set(picks)].sort((a, b) => a - b);
  const sel = ns.map((n) => `eq(n\\,${n})`).join("+");
  const vf = `drawtext=fontfile=/System/Library/Fonts/Menlo.ttc:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.8:x=w-tw-8:y=6:text='frame %{n}   +%{eif\\:(t-${triggerAt})*1000+0.5\\:d}ms',select='${sel}',tile=1x${ns.length}:padding=4`;
  await sh([
    "ffmpeg",
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-copyts",
    "-i",
    video,
    "-fps_mode",
    "passthrough",
    "-vf",
    vf,
    "-frames:v",
    "1",
    out,
  ]);
}

const results: RunResult[] = [];
const report = (run: number, analysis: Analysis) =>
  console.error(
    `run ${run}: firstPrompt ${analysis.firstPrompt?.ms ?? "-"} ms, fullPrompt ${analysis.fullPrompt?.ms ?? "-"} ms` +
      analysis.typing
        .map(
          (c) =>
            `, typed at ${c.sent.ms} ms visible after ${c.latencyMs ?? "-"} ms`,
        )
        .join(""),
  );
if (saved) {
  for (const r of saved.results) {
    const analysis = await analyze(r.video, {
      triggerAt: r.triggerAt,
      typedAt: r.typedAt,
    });
    results.push({ ...r, ...analysis });
    report(r.run, analysis);
  }
} else {
  const device = await screenDevice();
  for (let run = 1; run <= runs; run++) {
    await prepare();
    const bounds = await windowBounds();
    const video = path.join(outDir, `run-${run}.mp4`);
    const trigger = await record(
      video,
      path.join(outDir, `run-${run}.clap.json`),
      device,
      bounds,
    );
    const idleAfter = Boolean(await waitFor(idleWithTypedAtBottom, 5000));
    const analysis = await analyze(video, trigger);
    results.push({ run, ...trigger, idleAfter, video, ...analysis });
    report(run, analysis);
  }
}

function stats(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return {
    min: s[0],
    median: s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2,
    max: s.at(-1),
  };
}

const valid = results.filter(
  (r) =>
    r.firstPrompt &&
    r.fullPrompt &&
    r.settled &&
    r.idleAfter &&
    r.typing.every((c) => c.visible),
);
const summary = {
  runs: results.length,
  valid: valid.length,
  firstPrompt: stats(valid.map((r) => r.firstPrompt!.ms)),
  fullPrompt: stats(valid.map((r) => r.fullPrompt!.ms)),
  typedLatency: chunks.map((text, i) => ({
    text,
    ...stats(valid.map((r) => r.typing[i].latencyMs!)),
  })),
};
const rank = (r: (typeof valid)[number]) =>
  chunks.length
    ? Math.max(...r.typing.map((c) => c.latencyMs!))
    : r.fullPrompt!.ms;
const medianRun = [...valid].sort((a, b) => rank(a) - rank(b))[
  (valid.length - 1) >> 1
];
const sheetPath = path.join(outDir, `median-run-${medianRun.run}.sheet.png`);
const picks: Record<string, number> = {
  beforeFirstPrompt: medianRun.firstPrompt!.frame - 1,
  firstPrompt: medianRun.firstPrompt!.frame,
  ...Object.fromEntries(
    medianRun.typing.flatMap((c, i) => [
      [`typed${i + 1}Sent`, c.sent.frame],
      [`typed${i + 1}Visible`, c.visible!.frame],
    ]),
  ),
  beforeFullPrompt: medianRun.fullPrompt!.frame - 1,
  fullPrompt: medianRun.fullPrompt!.frame,
};
await sheet(
  medianRun.video,
  medianRun.triggerAt,
  Object.values(picks),
  sheetPath,
);

writeFileSync(
  path.join(outDir, "results.json"),
  JSON.stringify(
    {
      config: { cwd, chunks, typeAtMs, typeEveryMs },
      summary,
      medianRun: { run: medianRun.run, sheet: sheetPath, frames: picks },
      results,
    },
    null,
    1,
  ) + "\n",
);

const cell = (m: Milestone | null) => (m ? `${m.ms} (f${m.frame})` : "-");
const typingTable = chunks.length
  ? [
      "",
      "| run | chunk | text | sent ms (frame) | visible ms (frame) | latency ms |",
      "| --- | --- | --- | --- | --- | --- |",
      ...results.flatMap((r) =>
        r.typing.map(
          (c, i) =>
            `| ${r.run} | ${i + 1} | \`${c.text}\` | ${cell(c.sent)} | ${cell(c.visible)} | ${c.latencyMs ?? "-"} |`,
        ),
      ),
    ]
  : [];
const md = [
  `cwd: ${cwd}${chunks.length ? `  typed ${chunks.map((c) => `"${c}"`).join(", ")} from +${typeAtMs} ms every ${typeEveryMs} ms` : ""}`,
  "",
  "| run | firstPrompt ms (frame) | fullPrompt ms (frame) | settled | idle after |",
  "| --- | --- | --- | --- | --- |",
  ...results.map(
    (r) =>
      `| ${r.run} | ${cell(r.firstPrompt)} | ${cell(r.fullPrompt)} | ${r.settled ? "yes" : "no"} | ${r.idleAfter ? "yes" : "no"} |`,
  ),
  ...typingTable,
  "",
  "| milestone | min | median | max |",
  "| --- | --- | --- | --- |",
  `| firstPrompt | ${summary.firstPrompt.min} | ${summary.firstPrompt.median} | ${summary.firstPrompt.max} |`,
  `| fullPrompt | ${summary.fullPrompt.min} | ${summary.fullPrompt.median} | ${summary.fullPrompt.max} |`,
  ...summary.typedLatency.map(
    (t, i) =>
      `| typed chunk ${i + 1} latency | ${t.min} | ${t.median} | ${t.max} |`,
  ),
  "",
  `Median run ${medianRun.run} sheet, top to bottom: frames ${[...new Set(Object.values(picks))].sort((a, b) => a - b).join(", ")} (${Object.entries(
    picks,
  )
    .map(([k, v]) => `${k}=${v}`)
    .join(", ")}): ${sheetPath}`,
].join("\n");
writeFileSync(path.join(outDir, "results.md"), md + "\n");
console.log(md);
