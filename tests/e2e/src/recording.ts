import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Session recording: every Termless-backed session is captured as an
 * asciicast v2 (.cast) file under test-results/recordings/, and a
 * self-contained dark-mode viewer page (test-results/viewer/index.html)
 * replays them via @termless/web-player. The page inlines the cast data —
 * no fetch — so it works over file:// in terminal-browser.
 */

const TEST_RESULTS_DIR = path.resolve(import.meta.dirname, "../test-results");
export const RECORDINGS_DIR = path.join(TEST_RESULTS_DIR, "recordings");
const VIEWER_DIR = path.join(TEST_RESULTS_DIR, "viewer");

interface CastEvent {
  /** Seconds since session start. */
  t: number;
  code: "o" | "m" | "r";
  data: string;
}

export class SessionRecorder {
  label: string;
  #cols: number;
  #rows: number;
  readonly #start = Date.now();
  readonly #events: CastEvent[] = [];
  readonly #decoder = new TextDecoder("utf-8");

  constructor(label: string, cols: number, rows: number) {
    this.label = label;
    this.#cols = cols;
    this.#rows = rows;
  }

  #now(): number {
    return (Date.now() - this.#start) / 1000;
  }

  onOutput(data: Uint8Array): void {
    this.#events.push({
      t: this.#now(),
      code: "o",
      data: this.#decoder.decode(data, { stream: true }),
    });
  }

  /** Drop an asciicast marker (rendered as a chapter in the viewer). */
  mark(label: string): void {
    this.#events.push({ t: this.#now(), code: "m", data: label });
  }

  onResize(cols: number, rows: number): void {
    this.#events.push({ t: this.#now(), code: "r", data: `${cols}x${rows}` });
  }

  /** Write the .cast file and refresh the viewer page. */
  save(): string {
    mkdirSync(RECORDINGS_DIR, { recursive: true });
    const header = JSON.stringify({
      version: 2,
      width: this.#cols,
      height: this.#rows,
      timestamp: Math.floor(this.#start / 1000),
      title: this.label,
    });
    const lines = this.#events.map((e) => JSON.stringify([e.t, e.code, e.data]));
    const file = path.join(RECORDINGS_DIR, `${sanitize(this.label)}.cast`);
    writeFileSync(file, `${header}\n${lines.join("\n")}\n`);
    buildViewer();
    return file;
  }
}

function sanitize(label: string): string {
  return label.replace(/[^a-zA-Z0-9-_.]/g, "_");
}

/** Deep link into the viewer page for a recording label (for test annotations). */
export function viewerLink(label: string): string {
  return `file://${path.join(VIEWER_DIR, "index.html")}#${encodeURIComponent(sanitize(label))}`;
}

/** Copy the player's browser assets next to the viewer page (once per run). */
function copyPlayerAssets(): void {
  const playerDir = path.join(VIEWER_DIR, "web-player");
  mkdirSync(playerDir, { recursive: true });

  // Both packages ship strict exports maps (import-only conditions) that
  // neither require.resolve nor vitest's import.meta.resolve can traverse —
  // both are direct deps, so use their node_modules symlinks directly.
  const nodeModules = path.resolve(import.meta.dirname, "../node_modules");
  const distDir = path.join(nodeModules, "@termless/web-player/dist");
  for (const entry of readdirSync(distDir)) {
    if (entry.endsWith(".mjs"))
      copyFileSync(path.join(distDir, entry), path.join(playerDir, entry));
  }

  const xtermDir = path.join(nodeModules, "@xterm/xterm/lib");
  copyFileSync(path.join(xtermDir, "xterm.mjs"), path.join(VIEWER_DIR, "xterm-esm.mjs"));
  copyFileSync(path.join(xtermDir, "../css/xterm.css"), path.join(VIEWER_DIR, "xterm.css"));
  // The player default-imports @xterm/xterm (CJS-shaped); the ESM build has
  // named exports only, so shim the namespace in as the default export.
  writeFileSync(
    path.join(VIEWER_DIR, "xterm-shim.mjs"),
    'import * as xterm from "./xterm-esm.mjs";\nexport default xterm;\nexport * from "./xterm-esm.mjs";\n',
  );
}

/** Regenerate the viewer page from all recordings on disk. */
export function buildViewer(): string {
  mkdirSync(VIEWER_DIR, { recursive: true });
  copyPlayerAssets();

  const recordings: Record<string, string> = {};
  for (const entry of readdirSync(RECORDINGS_DIR)) {
    if (!entry.endsWith(".cast")) continue;
    recordings[entry.replace(/\.cast$/, "")] = readFileSync(
      path.join(RECORDINGS_DIR, entry),
      "utf-8",
    );
  }

  const html = viewerHtml(recordings);
  const file = path.join(VIEWER_DIR, "index.html");
  writeFileSync(file, html);
  return file;
}

function viewerHtml(recordings: Record<string, string>): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>e2e terminal recordings</title>
<link rel="stylesheet" href="./xterm.css" />
<script type="importmap">{"imports":{"@xterm/xterm":"./xterm-shim.mjs"}}</script>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; display: flex; height: 100vh; background: #11111b; color: #cdd6f4;
         font: 13px/1.5 ui-monospace, "SF Mono", Menlo, monospace; }
  #sidebar { width: 300px; overflow-y: auto; border-right: 1px solid #313244; padding: 10px; flex-shrink: 0; }
  #sidebar h1 { font-size: 13px; margin: 4px 0 10px; color: #a6adc8; }
  #sidebar button { display: block; width: 100%; text-align: left; margin: 2px 0; padding: 6px 8px;
                    background: none; border: none; border-radius: 6px; color: #cdd6f4;
                    font: inherit; cursor: pointer; overflow-wrap: anywhere; }
  #sidebar button:hover { background: #1e1e2e; }
  #sidebar button.active { background: #313244; }
  #main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  #controls { display: flex; gap: 8px; align-items: center; padding: 8px 12px;
              border-bottom: 1px solid #313244; }
  #controls button, #controls select { background: #1e1e2e; color: #cdd6f4; border: 1px solid #313244;
                                       border-radius: 6px; padding: 4px 10px; font: inherit; cursor: pointer; }
  #seek { flex: 1; accent-color: #89b4fa; }
  #time { color: #a6adc8; min-width: 90px; text-align: right; }
  #markers { display: flex; gap: 6px; padding: 6px 12px; flex-wrap: wrap; border-bottom: 1px solid #313244; }
  #markers button { background: none; border: 1px solid #45475a; border-radius: 10px; padding: 1px 8px;
                    color: #a6adc8; font-size: 11px; cursor: pointer; }
  #markers button:hover { border-color: #89b4fa; color: #89b4fa; }
  #term-wrap { flex: 1; overflow: auto; padding: 12px; }
</style>
</head>
<body>
<nav id="sidebar"><h1>recordings</h1></nav>
<div id="main">
  <div id="controls">
    <button id="playpause">play</button>
    <input id="seek" type="range" min="0" max="1000" value="0" />
    <span id="time"></span>
    <select id="speed">
      <option value="0.5">0.5x</option>
      <option value="1" selected>1x</option>
      <option value="2">2x</option>
      <option value="4">4x</option>
    </select>
  </div>
  <div id="markers"></div>
  <div id="term-wrap"><div id="term"></div></div>
</div>
<script type="module">
import { createTermlessPlayer } from "./web-player/browser.mjs";

const RECORDINGS = ${JSON.stringify(recordings)};

const sidebar = document.getElementById("sidebar");
const termEl = document.getElementById("term");
const playpause = document.getElementById("playpause");
const seek = document.getElementById("seek");
const timeEl = document.getElementById("time");
const speed = document.getElementById("speed");
const markersEl = document.getElementById("markers");

let player = null;
let durationMs = 0;
let ticker = null;

function fmt(ms) {
  const s = Math.round(ms / 1000);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

function markers(cast) {
  const out = [];
  for (const line of cast.split("\\n").slice(1)) {
    if (!line) continue;
    const [t, code, data] = JSON.parse(line);
    if (code === "m") out.push({ t: t * 1000, label: data });
  }
  return out;
}

function castDuration(cast) {
  let last = 0;
  for (const line of cast.split("\\n").slice(1)) {
    if (!line) continue;
    last = JSON.parse(line)[0];
  }
  return last * 1000;
}

function load(name) {
  if (player) { player.dispose(); termEl.replaceChildren(); }
  for (const b of sidebar.querySelectorAll("button")) b.classList.toggle("active", b.dataset.name === name);
  const cast = RECORDINGS[name];
  durationMs = castDuration(cast);
  player = createTermlessPlayer(termEl, cast, { speed: Number(speed.value) });
  markersEl.replaceChildren(...markers(cast).map((m) => {
    const b = document.createElement("button");
    b.textContent = m.label;
    b.onclick = () => { player.seek(m.t); };
    return b;
  }));
  playpause.textContent = "play";
  seek.value = 0;
  timeEl.textContent = "0:00 / " + fmt(durationMs);
  clearInterval(ticker);
  ticker = setInterval(() => {
    const st = player.state();
    seek.value = durationMs ? Math.round((st.currentTimeMs / durationMs) * 1000) : 0;
    timeEl.textContent = fmt(st.currentTimeMs) + " / " + fmt(durationMs);
    playpause.textContent = st.status === "playing" ? "pause" : "play";
  }, 200);
}

playpause.onclick = () => {
  const st = player.state();
  if (st.status === "playing") player.pause();
  else if (st.status === "paused") player.resume();
  else player.play();
};
seek.oninput = () => { player.seek((Number(seek.value) / 1000) * durationMs); };
speed.onchange = () => {
  const at = player.state().currentTimeMs;
  const name = sidebar.querySelector("button.active").dataset.name;
  load(name);
  player.seek(at);
};

for (const name of Object.keys(RECORDINGS).sort()) {
  const b = document.createElement("button");
  b.textContent = name;
  b.dataset.name = name;
  b.onclick = () => load(name);
  sidebar.append(b);
}
function loadFromHash() {
  const wanted = decodeURIComponent(location.hash.slice(1));
  if (wanted && RECORDINGS[wanted]) { load(wanted); return true; }
  return false;
}
window.addEventListener("hashchange", loadFromHash);
if (!loadFromHash()) {
  const first = Object.keys(RECORDINGS).sort()[0];
  if (first) load(first);
}
</script>
</body>
</html>
`;
}
