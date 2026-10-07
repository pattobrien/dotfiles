import { dlopen, ptr } from "bun:ffi";
import { readdirSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    screen: { type: "string", default: "watch-stage" },
    socket: { type: "string" },
    title: { type: "string", default: "watch-stage" },
    cwd: { type: "string", default: process.cwd() },
    cols: { type: "string", default: "100" },
    rows: { type: "string", default: "24" },
    offset: { type: "string", default: "100x100" },
    down: { type: "boolean", default: false },
  },
});

const run = (cmd: string[]) => {
  const p = Bun.spawnSync(cmd, { stdout: "pipe", stderr: "pipe" });
  if (p.exitCode !== 0) throw new Error(`${cmd.join(" ")}\n${p.stderr.toString()}`);
  return p.stdout.toString().trim();
};
const jxa = <T>(src: string): T => JSON.parse(run(["osascript", "-l", "JavaScript", "-e", src]));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const { symbols: cg } = dlopen("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics", {
  CGGetActiveDisplayList: { args: ["u32", "ptr", "ptr"], returns: "i32" },
});
const activeDisplayIds = () => {
  const ids = new Uint32Array(16);
  const count = new Uint32Array(1);
  cg.CGGetActiveDisplayList(16, ptr(ids), ptr(count));
  return [...ids.subarray(0, count[0])];
};

type Screen = { id: number; name: string; x: number; y: number; w: number; h: number; scale: number; fps: number };
const screens = (): Screen[] =>
  jxa(`ObjC.import("AppKit");
    const all = $.NSScreen.screens, main = all.objectAtIndex(0).frame;
    const out = [];
    for (let i = 0; i < all.count; i++) {
      const s = all.objectAtIndex(i), f = s.frame;
      out.push({ id: ObjC.unwrap(s.deviceDescription.objectForKey("NSScreenNumber")), name: ObjC.unwrap(s.localizedName),
        x: f.origin.x, y: main.size.height - (f.origin.y + f.size.height), w: f.size.width, h: f.size.height,
        scale: s.backingScaleFactor, fps: Number(s.maximumFramesPerSecond) });
    }
    JSON.stringify(out)`);

type Bounds = { X: number; Y: number; Width: number; Height: number };
const windowBounds = (title: string): Bounds[] =>
  jxa(`ObjC.import("CoreGraphics");
    const list = ObjC.castRefToObject($.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly, 0));
    JSON.stringify(ObjC.deepUnwrap(list).filter(w => w.kCGWindowName === ${JSON.stringify(title)}).map(w => w.kCGWindowBounds))`);

const socket =
  values.socket ??
  (() => {
    const found = readdirSync("/tmp").filter((f) => /^kitty-\d+$/.test(f)).map((f) => `unix:/tmp/${f}`);
    if (found.length !== 1) throw new Error(`pass --socket; found ${found.join(", ") || "none"}`);
    return found[0];
  })();
const kitty = (...args: string[]) => run(["kitty", "@", "--to", socket, ...args]);
const bd = (...args: string[]) => run(["betterdisplaycli", ...args]);

if (values.down) {
  if (windowBounds(values.title).length) kitty("close-window", "--match", `title:${values.title}`);
  bd("set", `-name=${values.screen}`, "-connected=off");
  console.log(`closed ${values.title}, disconnected ${values.screen}`);
  process.exit(0);
}

if (windowBounds(values.title).length) throw new Error(`a window titled ${values.title} is already open`);

if (!bd("get", "-identifiers").includes(`"name" : "${values.screen}"`)) {
  bd("create", "-type=VirtualScreen", `-virtualScreenName=${values.screen}`, "-aspectWidth=16", "-aspectHeight=10", "-virtualScreenHiDPI=off");
  bd("set", `-name=${values.screen}`, "-connected=on");
  bd("set", `-name=${values.screen}`, "-resolution=1600x1000", "-hiDPI=off");
}
bd("set", `-name=${values.screen}`, "-connected=on");
let stage: Screen | undefined;
for (let i = 0; i < 40 && !stage; i++) {
  stage = screens().find((s) => s.name === values.screen);
  if (!stage) await sleep(250);
}
if (!stage) throw new Error(`screen ${values.screen} did not appear`);

const [dx, dy] = values.offset.split("x").map(Number);
kitty(
  "launch", "--type=os-window", "--keep-focus", "--title", values.title, "--os-window-title", values.title,
  "--os-window-position", `${stage.x + dx}x${stage.y + dy}`, "--cwd", values.cwd,
);
await sleep(300);
kitty("resize-os-window", "--match", `title:${values.title}`, "--unit", "cells", "--width", values.cols, "--height", values.rows);
await sleep(300);

const [win] = windowBounds(values.title);
if (!win) throw new Error(`window ${values.title} is not on screen`);
const inside = win.X >= stage.x && win.Y >= stage.y && win.X + win.Width <= stage.x + stage.w && win.Y + win.Height <= stage.y + stage.h;
if (!inside) throw new Error(`window ${JSON.stringify(win)} is not inside ${values.screen} ${JSON.stringify(stage)}`);

const device = `Capture screen ${activeDisplayIds().indexOf(stage.id)}`;
const listed = Bun.spawnSync(["ffmpeg", "-f", "avfoundation", "-list_devices", "true", "-i", ""], { stderr: "pipe" }).stderr.toString();
if (!listed.includes(`] ${device}`)) throw new Error(`ffmpeg does not list "${device}":\n${listed}`);

const crop = [win.Width, win.Height, win.X - stage.x, win.Y - stage.y].map((v) => v * stage.scale).join(":");
console.log(
  JSON.stringify({
    socket, title: values.title, screen: stage, window: win, fps: stage.fps, device, crop,
    record: `ffmpeg -f avfoundation -capture_cursor 0 -framerate ${stage.fps} -i "${device}:none" -copyts -vf crop=${crop} -fps_mode passthrough -c:v h264_videotoolbox -b:v 20M take.mp4`,
  }, null, 2),
);
