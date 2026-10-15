import { execFileSync, spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

type Step = { name: string; run: () => void };
type Link = { target: string; path: string };
type TccGrant = { service: string; client: string; clientType: 0 | 1 };

const repo = join(import.meta.dirname, "../..");
const home = homedir();
const volume = "/Volumes/devbox";
const state = join(volume, "state");
const tinycastDev = "com.tinycast.app.dev";
const vmguest = "/opt/namespace/vmguest";
const xcode = "/Applications/Xcode_26.6.app";

const volumeDirs = [
  "dev",
  "mise",
  "cache/homebrew",
  "state/gh",
  "state/tinycast-dev",
  "state/tinycast-dev-config",
].map((dir) => join(volume, dir));

const links: Link[] = [
  { target: join(volume, "dev"), path: join(home, "dev") },
  { target: join(volume, "mise"), path: join(home, ".local/share/mise") },
  {
    target: join(state, "tinycast-dev"),
    path: join(home, "Library/Application Support", tinycastDev),
  },
  {
    target: join(state, "tinycast-dev-config"),
    path: join(home, ".config/tinycast-dev"),
  },
];

const shellEnv: Record<string, string> = {
  // The image's xcrun keeps resolving the CLT SDK after xcode-select -s, and its 27.0 .tbd stubs break native gem and pip builds.
  DEVELOPER_DIR: join(xcode, "Contents/Developer"),
  SDKROOT: join(
    xcode,
    "Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk",
  ),
  GH_CONFIG_DIR: join(state, "gh"),
  HOMEBREW_CACHE: join(volume, "cache/homebrew"),
  HOMEBREW_NO_AUTO_UPDATE: "1",
  HOMEBREW_NO_ENV_HINTS: "1",
  PATH: "$HOME/.local/bin:/opt/homebrew/bin:$HOME/.local/share/mise/shims:$PATH",
};

const tccGrants: TccGrant[] = [
  { service: "kTCCServiceAccessibility", client: tinycastDev, clientType: 0 },
  { service: "kTCCServiceScreenCapture", client: vmguest, clientType: 1 },
  { service: "kTCCServiceAccessibility", client: vmguest, clientType: 1 },
  { service: "kTCCServicePostEvent", client: vmguest, clientType: 1 },
];

const run = (command: string, input?: string) => {
  execFileSync("/bin/bash", ["-lc", command], {
    cwd: repo,
    input,
    stdio: [input === undefined ? "ignore" : "pipe", "inherit", "inherit"],
  });
};

const link = ({ target, path }: Link) => {
  const existing = lstatSync(path, { throwIfNoEntry: false });
  if (existing?.isSymbolicLink() && readlinkSync(path) === target) return;
  rmSync(path, { recursive: true, force: true });
  mkdirSync(dirname(path), { recursive: true });
  symlinkSync(target, path);
};

const tccRow = ({ service, client, clientType }: TccGrant) =>
  `INSERT OR REPLACE INTO access (service,client,client_type,auth_value,auth_reason,auth_version,indirect_object_identifier_type,indirect_object_identifier,flags,last_modified) VALUES ('${service}','${client}',${clientType},2,4,1,0,'UNUSED',0,strftime('%s','now'));`;

const steps: Step[] = [
  {
    name: "volume layout",
    run: () => {
      for (const dir of volumeDirs) mkdirSync(dir, { recursive: true });
      for (const entry of links) link(entry);
    },
  },
  {
    name: "shell env",
    run: () => {
      const exports = `${Object.entries(shellEnv)
        .map(([key, value]) => `export ${key}="${value}"`)
        .join("\n")}\n`;
      run("sudo -n tee /etc/zshenv >/dev/null", exports);
      if (!readFileSync("/etc/profile", "utf8").includes(exports)) {
        run("sudo -n tee -a /etc/profile >/dev/null", `\n${exports}`);
      }
      for (const [key, value] of Object.entries(shellEnv)) {
        process.env[key] = value
          .replaceAll("$HOME", home)
          .replaceAll("$PATH", `${process.env.PATH}`);
      }
    },
  },
  { name: "install base", run: () => run("./install") },
  { name: "xcode", run: () => run(`sudo -n xcode-select -s ${xcode}`) },
  {
    name: "install devbox",
    run: () => {
      const gh = spawnSync("/bin/bash", ["-lc", "gh auth token"], {
        encoding: "utf8",
      });
      if (gh.status === 0) {
        process.env.GITHUB_TOKEN = gh.stdout.trim();
      } else {
        console.log("gh has no token yet; mise calls GitHub unauthenticated");
      }
      run("./install devbox");
    },
  },
  {
    name: "tcc grants",
    run: () => {
      run(
        "sudo -n sqlite3 '/Library/Application Support/com.apple.TCC/TCC.db'",
        tccGrants.map(tccRow).join("\n"),
      );
      run("sudo -n killall tccd");
    },
  },
  {
    name: "never sleep",
    run: () => {
      run("sudo -n pmset -a sleep 0 displaysleep 0 disksleep 0");
      run("defaults -currentHost write com.apple.screensaver idleTime 0");
      run("defaults write com.apple.screensaver idleTime 0");
    },
  },
  {
    name: "wake display and surface the screen-capture prompt",
    run: () => run("caffeinate -u -t 2; screencapture -x /tmp/boot-probe.png"),
  },
];

const at = new Date().toISOString();
const timings: Record<string, number> = {};
for (const step of steps) {
  const started = performance.now();
  step.run();
  timings[step.name] = Math.round(performance.now() - started);
  console.log(`${step.name}: ${timings[step.name]}ms`);
}
writeFileSync(
  join(state, "last-boot.json"),
  `${JSON.stringify({ at, timings }, null, 2)}\n`,
);
