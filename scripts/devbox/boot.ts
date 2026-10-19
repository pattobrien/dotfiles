import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
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
import { parseArgs } from "node:util";

import { query, type Target } from "../permissions/check.ts";

type Step = { name: string; run: () => void };
type Phase = "prepare" | "install";
type Link = { target: string; path: string };

const {
  positionals: [phase],
  values: { cache, display },
} = parseArgs({
  allowPositionals: true,
  options: {
    cache: { type: "string" },
    display: { type: "boolean", default: false },
  },
});

const repo = join(import.meta.dirname, "../..");
const home = homedir();
const volume = "/Volumes/devbox";
const state = join(volume, "state");
const tinycastDev = "com.tinycast.app.dev";
const vmguest = "/opt/namespace/vmguest";
const xcode = "/Applications/Xcode_26.6.app";
const compilationCache =
  "Library/Developer/Xcode/DerivedData/CompilationCache.noindex";

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
  ...(cache ? { COMPILATION_CACHE_ENABLE_CACHING_DEFAULT: "YES" } : {}),
};

const checks: Target[] = display ? ["devbox", "devbox-display"] : ["devbox"];

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

const shellEnvStep: Step = {
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
};

const displaySteps: Step[] = [
  {
    name: "screen-capture approval",
    run: () => {
      run(
        `defaults write "$HOME/Library/Group Containers/group.com.apple.replayd/ScreenCaptureApprovals.plist" ${vmguest} -date "3024-01-01 00:00:00 +0000"`,
      );
      run("killall cfprefsd");
    },
  },
  {
    name: "wake display and probe screen capture",
    // An ssh session has no WindowServer connection; hop into the console
    // user's launchd session so screencapture reaches the display.
    run: () =>
      run(
        `sudo -n launchctl asuser "$(id -u)" sudo -n -u "$(id -un)" bash -c "caffeinate -u -t 2; screencapture -x /tmp/boot-probe.png"`,
      ),
  },
];

const cacheStep = (mount: string): Step => {
  const cacheLink: Link = {
    target: join(mount, home, compilationCache),
    path: join(home, compilationCache),
  };
  return {
    name: "compilation cache",
    run: () => {
      mkdirSync(cacheLink.target, { recursive: true });
      link(cacheLink);
      run(`du -sh ${cacheLink.target}`);
    },
  };
};

const phases: Record<Phase, Step[]> = {
  prepare: [
    {
      name: "volume layout",
      run: () => {
        for (const dir of volumeDirs) mkdirSync(dir, { recursive: true });
        for (const entry of links) link(entry);
      },
    },
    shellEnvStep,
    { name: "install base", run: () => run("./install") },
    { name: "oh-my-zsh", run: () => run("./scripts/setup_omz.zsh") },
    {
      name: "brew bundle",
      run: () => run("./scripts/brew_bundle.zsh brew/devbox/Brewfile"),
    },
    { name: "xcode", run: () => run(`sudo -n xcode-select -s ${xcode}`) },
    {
      name: "never sleep",
      run: () => {
        run("sudo -n pmset -a sleep 0 displaysleep 0 disksleep 0");
        run("defaults -currentHost write com.apple.screensaver idleTime 0");
        run("defaults write com.apple.screensaver idleTime 0");
      },
    },
    ...(cache ? [cacheStep(cache)] : []),
  ],
  install: [
    shellEnvStep,
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
          checks
            .flatMap(query)
            .filter(({ service }) => service.startsWith("kTCCService"))
            .map(
              ({ service, client }) =>
                `INSERT OR REPLACE INTO access (service,client,client_type,auth_value,auth_reason,auth_version,indirect_object_identifier_type,indirect_object_identifier,flags,last_modified) VALUES ('${service}','${client}',${client.startsWith("/") ? 1 : 0},2,4,1,0,'UNUSED',0,strftime('%s','now'));`,
            )
            .join("\n"),
        );
        run("sudo -n killall tccd");
      },
    },
    ...(display ? displaySteps : []),
    {
      name: "permission checks",
      run: () =>
        execFileSync(
          process.execPath,
          [join(repo, "scripts/permissions/check.ts"), ...checks],
          { stdio: "inherit" },
        ),
    },
  ],
};

if (phase !== "prepare" && phase !== "install") {
  console.error(
    "usage: node scripts/devbox/boot.ts prepare|install [--display] [--cache <mount>]",
  );
  process.exit(1);
}

const bootFile = join(state, "last-boot.json");
const timings: Record<string, number> =
  phase === "install" && existsSync(bootFile)
    ? JSON.parse(readFileSync(bootFile, "utf8")).timings
    : {};
for (const step of phases[phase]) {
  const started = performance.now();
  step.run();
  timings[step.name] = Math.round(performance.now() - started);
  console.log(`${step.name}: ${timings[step.name]}ms`);
}
writeFileSync(
  bootFile,
  `${JSON.stringify({ at: new Date().toISOString(), timings }, null, 2)}\n`,
);
