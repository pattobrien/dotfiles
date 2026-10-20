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

type Step = { name: string; run: () => void };
type Phase = "prepare" | "install";
type Link = { target: string; path: string };
type TccGrant = { service: string; client: string; clientType: 0 | 1 };

const repo = join(import.meta.dirname, "../..");
const home = homedir();
const volume = "/Volumes/devbox";
const state = join(volume, "state");
const tinycastDev = "com.tinycast.app.dev";
const vmguest = "/opt/namespace/vmguest";
const xcode = "/Applications/Xcode_26.6.app";
const derivedData = join(volume, "DerivedData");
const signingIdentity = "Tinycast Self-Signed";
const signingBundle = join(state, "signing/tinycast-self-signed.p12");
const signingKeychain = join(home, "Library/Keychains/signing.keychain-db");
const signingPassword = "tinycast";

const volumeDirs = [
  "dev",
  "mise",
  "cache/homebrew",
  "state/gh",
  "state/tinycast-dev",
  "state/tinycast-dev-config",
  "state/signing",
  "DerivedData",
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
      name: "derived data",
      run: () =>
        run(
          `defaults write com.apple.dt.Xcode IDECustomDerivedDataLocation ${derivedData}`,
        ),
    },
    {
      name: "signing identity",
      run: () => {
        if (!existsSync(signingBundle)) {
          run(
            `openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -keyout /tmp/signing-key.pem -out /tmp/signing-cert.pem -subj "/CN=${signingIdentity}" -addext "basicConstraints=critical,CA:false" -addext "keyUsage=critical,digitalSignature" -addext "extendedKeyUsage=critical,codeSigning"`,
          );
          run(
            `openssl pkcs12 -export -inkey /tmp/signing-key.pem -in /tmp/signing-cert.pem -name "${signingIdentity}" -out "${signingBundle}" -passout pass:${signingPassword}`,
          );
          run("rm -f /tmp/signing-key.pem /tmp/signing-cert.pem");
        }
        if (existsSync(signingKeychain)) {
          run(`security delete-keychain ${signingKeychain}`);
        }
        run(`security create-keychain -p ${signingPassword} ${signingKeychain}`);
        run(`security set-keychain-settings ${signingKeychain}`);
        run(`security unlock-keychain -p ${signingPassword} ${signingKeychain}`);
        run(
          `security import "${signingBundle}" -k ${signingKeychain} -P ${signingPassword} -A -T /usr/bin/codesign`,
        );
        run(
          `security set-key-partition-list -S apple-tool:,apple: -s -k ${signingPassword} ${signingKeychain} >/dev/null`,
        );
        run(
          `security list-keychains -d user -s ${signingKeychain} $(security list-keychains -d user | sed 's/"//g')`,
        );
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
      name: "screen-capture approval",
      run: () => {
        run(
          `defaults write "$HOME/Library/Group Containers/group.com.apple.replayd/ScreenCaptureApprovals.plist" ${vmguest} -date "3024-01-01 00:00:00 +0000"`,
        );
        run("killall cfprefsd");
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
      name: "wake display and probe screen capture",
      run: () =>
        run("caffeinate -u -t 2; screencapture -x /tmp/boot-probe.png"),
    },
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
  ],
};

const phase = process.argv[2];
if (phase !== "prepare" && phase !== "install") {
  console.error("usage: node scripts/devbox/boot.ts prepare|install");
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
