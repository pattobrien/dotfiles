import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { parse, type PlistValue } from "plist";

import {
  manifest,
  targetsFor,
  type BtmScope,
  type Entry,
  type Probe,
  type Remedy,
  type Target,
  type TccClient,
} from "./manifest.ts";

export type Outcome = {
  status: "ok" | "missing" | "unchecked" | "error";
  detail: string;
};
export type Result = { entry: Entry; remedy: Remedy; outcome: Outcome };
export type HostFile =
  | "systemTcc"
  | "userTcc"
  | "replayd"
  | "notifications"
  | "networkExtension"
  | "backgroundItems";
export type Host = {
  privilege: "user" | "root" | "rootUnavailable";
  path: (file: HostFile) => string;
  generatedUid: (scope: BtmScope) => string;
};
export type CommandOutput = { status: number; stdout: string; stderr: string };

type OutputProbe = Extract<
  Probe,
  { kind: "sysext" | "pmset" | "defaults" | "command" }
>;

const ok = (detail: string): Outcome => ({ status: "ok", detail });
const missing = (detail: string): Outcome => ({ status: "missing", detail });

class Unchecked extends Error {}

const run = (argv: string[]): CommandOutput => {
  const [command, ...args] = argv;
  const child = spawnSync(command, args, { encoding: "utf8" });
  if (child.error) throw child.error;
  return {
    status: child.status ?? 1,
    stdout: child.stdout,
    stderr: child.stderr,
  };
};

const read = (host: Host, argv: string[]) => {
  if (host.privilege === "rootUnavailable") {
    throw new Unchecked("needs root and sudo -n is refused, not checked");
  }
  const output = run(
    host.privilege === "root" ? ["sudo", "-n", ...argv] : argv,
  );
  if (output.status !== 0) {
    throw new Error(`${argv[0]}: ${output.stderr.trim()}`);
  }
  return output.stdout;
};

type Dict = { [key: string]: PlistValue };

const isDict = (value: PlistValue | undefined): value is Dict =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(value instanceof Uint8Array);

const readPlist = (host: Host, file: HostFile) =>
  parse(read(host, ["plutil", "-convert", "xml1", "-o", "-", host.path(file)]));

const readAppData = (host: Host, file: HostFile) => {
  try {
    read(host, [
      "sqlite3",
      "-readonly",
      host.path("systemTcc"),
      "select count(*) from access;",
    ]);
  } catch (error) {
    if (error instanceof Unchecked) throw error;
    throw new Unchecked(
      `reading ${file} without Full Disk Access could prompt, not checked`,
    );
  }
  return readPlist(host, file);
};

const archiveObjects = (plist: PlistValue, what: string) => {
  const objects = isDict(plist) ? plist.$objects : undefined;
  if (!Array.isArray(objects))
    throw new Error(`${what} is not a keyed archive`);
  return objects;
};

const deref = (objects: PlistValue[], value: PlistValue | undefined) => {
  const uid = isDict(value) ? value["CF$UID"] : undefined;
  return typeof uid === "number" ? objects[uid] : value;
};

const archivedList = (objects: PlistValue[], value: PlistValue | undefined) => {
  const list = deref(objects, value);
  const items = isDict(list) ? list["NS.objects"] : undefined;
  if (!Array.isArray(items)) throw new Error("expected an archived collection");
  return items.map((item) => deref(objects, item));
};

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;

const authValues: Record<number, string> = {
  0: "denied",
  1: "unknown",
  3: "limited",
  5: "stuck pending",
};

const tcc = (
  host: Host,
  file: HostFile,
  service: string,
  client: TccClient,
  target = "UNUSED",
): Outcome => {
  const [id, type] = "path" in client ? [client.path, 1] : [client.bundleId, 0];
  const values = read(host, [
    "sqlite3",
    "-readonly",
    host.path(file),
    `select auth_value from access where service = ${quote(`kTCCService${service}`)} and client = ${quote(id)} and client_type = ${type} and indirect_object_identifier = ${quote(target)};`,
  ])
    .split("\n")
    .filter(Boolean)
    .map(Number);
  if (values.length === 0) return missing("no row");
  if (values.includes(2)) return ok("allowed");
  return missing(
    values.map((v) => `auth_value ${v} (${authValues[v]})`).join(", "),
  );
};

const localNetwork = (signingId: string, plist: PlistValue): Outcome => {
  const objects = archiveObjects(plist, "networkextension plist");
  const rules = objects
    .filter(isDict)
    .filter((rule) => deref(objects, rule.SigningIdentifier) === signingId);
  if (rules.length === 0) return missing("never asked");
  return rules.some(
    (rule) =>
      rule.DenyMulticast === false && rule.MulticastPreferenceSet === true,
  )
    ? ok("allowed")
    : missing("denied or never answered");
};

const allowNotifications = 2 ** 25;

const notifications = (bundleId: string, plist: PlistValue): Outcome => {
  const apps = isDict(plist) ? plist.apps : undefined;
  if (!Array.isArray(apps)) throw new Error("usernoted plist has no apps");
  const app = apps.filter(isDict).find((a) => a["bundle-id"] === bundleId);
  if (!app) return missing("not registered with Notification Center");
  if (typeof app.flags !== "number") {
    throw new Error(`${bundleId} has no numeric flags`);
  }
  return Math.floor(app.flags / allowNotifications) % 2 === 1
    ? ok("allowed")
    : missing("Allow notifications is off");
};

const replaydApproval = (client: string, plist: PlistValue): Outcome => {
  if (!isDict(plist)) throw new Error("replayd plist is not a dictionary");
  const entry = plist[client];
  const until = isDict(entry) ? entry.kScreenCapturePrivacyHintDate : entry;
  if (!(until instanceof Date)) return missing("no approval");
  return until > new Date()
    ? ok(`approved until ${until.toISOString()}`)
    : missing(`approval lapsed ${until.toISOString()}`);
};

const dispositionFlags: [number, string, string][] = [
  [0x1, "enabled", "disabled"],
  [0x2, "allowed", "not allowed"],
  [0x8, "notified", "not notified"],
];

const backgroundItem = (
  identifier: string,
  user: string,
  plist: PlistValue,
): Outcome => {
  const objects = archiveObjects(plist, "background items store");
  const top = isDict(plist) ? plist.$top : undefined;
  const store = deref(objects, isDict(top) ? top.store : undefined);
  const byUser = deref(
    objects,
    isDict(store) ? store.itemsByUserIdentifier : undefined,
  );
  const users = archivedList(objects, byUser);
  const keys = isDict(byUser) ? byUser["NS.keys"] : undefined;
  if (!Array.isArray(keys))
    throw new Error("itemsByUserIdentifier has no keys");
  const at = keys.findIndex((key) => deref(objects, key) === user);
  if (at === -1) return missing(`no background items for ${user}`);
  const dispositions = archivedList(objects, users[at])
    .filter(isDict)
    .filter((item) => deref(objects, item.identifier) === identifier)
    .map(({ disposition }) => disposition);
  if (dispositions.length === 0) return missing("not registered");
  const described = dispositions.map((disposition) => {
    if (typeof disposition !== "number") {
      throw new Error(`${identifier} has no numeric disposition`);
    }
    const flags = dispositionFlags.map(([bit, on, off]) =>
      disposition & bit ? on : off,
    );
    return {
      disposition,
      detail: `${flags.join(", ")} (0x${disposition.toString(16)})`,
    };
  });
  const allowed = described.find(
    ({ disposition }) => (disposition & 0x3) === 0x3,
  );
  return allowed
    ? ok(allowed.detail)
    : missing(described.map(({ detail }) => detail).join("; "));
};

const firstLine = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) ?? "";

export const commandFor = (probe: OutputProbe): string[] => {
  switch (probe.kind) {
    case "sysext":
      return ["systemextensionsctl", "list"];
    case "pmset":
      return ["pmset", "-g"];
    case "defaults":
      return [
        "defaults",
        ...(probe.currentHost ? ["-currentHost"] : []),
        "read",
        probe.domain,
        probe.key,
      ];
    case "command":
      return probe.argv;
  }
};

export const judgeOutput = (
  probe: OutputProbe,
  output: CommandOutput,
): Outcome => {
  switch (probe.kind) {
    case "sysext": {
      const states = output.stdout
        .split("\n")
        .map((line) => line.split("\t"))
        .filter(
          (cols) =>
            cols[2] === probe.teamId &&
            cols[3]?.startsWith(`${probe.bundleId} (`),
        )
        .map((cols) => cols.at(-1) ?? "");
      if (states.length === 0) return missing("not installed");
      return states.includes("[activated enabled]")
        ? ok("[activated enabled]")
        : missing(states.join("; "));
    }
    case "pmset": {
      const line = output.stdout
        .split("\n")
        .map((l) => l.trim().split(/\s+/))
        .find(([name]) => name === probe.setting);
      if (!line) return missing(`pmset reports no ${probe.setting}`);
      const detail = line.join(" ");
      return line[1] === String(probe.value) ? ok(detail) : missing(detail);
    }
    case "defaults": {
      if (output.status !== 0) return missing(`${probe.key} is not set`);
      const detail = `${probe.key} = ${output.stdout.trim()}`;
      return output.stdout.trim() === probe.equals
        ? ok(detail)
        : missing(detail);
    }
    case "command": {
      const detail =
        firstLine(output.stdout) ||
        firstLine(output.stderr) ||
        `exit ${output.status}`;
      return output.status === 0 && probe.expect.test(output.stdout)
        ? ok(detail)
        : missing(detail);
    }
  }
};

const evaluate = (
  probe: Probe,
  host: Host,
  capture: (argv: string[]) => CommandOutput,
): Outcome => {
  switch (probe.kind) {
    case "tcc":
      return tcc(host, "systemTcc", probe.service, probe.client);
    case "appleEvents":
      return tcc(host, "userTcc", "AppleEvents", probe.client, probe.target);
    case "localNetwork":
      return localNetwork(probe.signingId, readPlist(host, "networkExtension"));
    case "notifications":
      return notifications(probe.bundleId, readAppData(host, "notifications"));
    case "replaydApproval":
      return replaydApproval(probe.client, readAppData(host, "replayd"));
    case "backgroundItem":
      return backgroundItem(
        probe.identifier,
        host.generatedUid(probe.scope),
        readPlist(host, "backgroundItems"),
      );
    case "xcodeFirstLaunch": {
      const selected = capture(["xcode-select", "-p"]);
      const developer = selected.stdout.trim();
      if (selected.status !== 0) {
        return missing(firstLine(selected.stderr) || "no developer directory");
      }
      const xcodebuild = join(developer, "usr/bin/xcodebuild");
      if (!existsSync(xcodebuild)) return missing(`no Xcode in ${developer}`);
      const status = capture([xcodebuild, "-checkFirstLaunchStatus"]).status;
      return status === 0
        ? ok(`done for ${developer}`)
        : missing(`${xcodebuild} -checkFirstLaunchStatus exit ${status}`);
    }
    case "sysext":
    case "pmset":
    case "defaults":
    case "command":
      return judgeOutput(probe, capture(commandFor(probe)));
  }
};

export const check = (
  entries: Entry[],
  targets: Target[],
  host: Host,
): Result[] => {
  const outputs = new Map<string, CommandOutput>();
  const capture = (argv: string[]) => {
    const key = argv.join("\0");
    const output = outputs.get(key) ?? run(argv);
    outputs.set(key, output);
    return output;
  };
  return entries.flatMap((entry) => {
    const remedy = targets
      .map((target) => entry.remedy[target])
      .find((r) => r !== undefined);
    if (!remedy) return [];
    try {
      return [{ entry, remedy, outcome: evaluate(entry.probe, host, capture) }];
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const status = error instanceof Unchecked ? "unchecked" : "error";
      return [{ entry, remedy, outcome: { status, detail } }];
    }
  });
};

const describe = (remedy: Remedy) =>
  remedy.by === "boot"
    ? `boot step "${remedy.step}"`
    : remedy.by === "manual"
      ? `manual, ${remedy.where}`
      : `run ${remedy.run}`;

export const format = (results: Result[]) =>
  results
    .map(({ entry, remedy, outcome }) =>
      [
        outcome.status.toUpperCase().padEnd(11),
        `${entry.name}: ${outcome.detail}`,
        outcome.status === "ok" ? "" : ` (fix: ${describe(remedy)})`,
      ].join(""),
    )
    .join("\n");

export const userTccFromLsof = (output: string) => {
  const paths = new Set(
    output
      .split("\n")
      .filter(
        (line) =>
          line.startsWith("n") && line.endsWith("/com.apple.TCC/TCC.db"),
      )
      .map((line) => line.slice(1)),
  );
  if (paths.size !== 1) {
    throw new Error(
      `expected one user TCC.db open by tccd, found ${paths.size}: ${[...paths].join(", ")}`,
    );
  }
  return [...paths][0];
};

const btmDirectory = "/private/var/db/com.apple.backgroundtaskmanagement";

export const btmStore = (names: string[]) => {
  const stores = names.filter((name) =>
    /^BackgroundItems-v\d+\.btm$/.test(name),
  );
  if (stores.length !== 1) {
    throw new Error(
      `expected one BackgroundItems-v*.btm, found ${stores.length}: ${stores.join(", ")}`,
    );
  }
  return join(btmDirectory, stores[0]);
};

export const liveHost = (machine: "local" | "devbox"): Host => {
  const home = homedir();
  const fixed: Record<
    Exclude<HostFile, "userTcc" | "backgroundItems">,
    string
  > = {
    systemTcc: "/Library/Application Support/com.apple.TCC/TCC.db",
    replayd: join(
      home,
      "Library/Group Containers/group.com.apple.replayd/ScreenCaptureApprovals.plist",
    ),
    notifications: join(
      home,
      "Library/Group Containers/group.com.apple.usernoted/Library/Preferences/group.com.apple.usernoted.plist",
    ),
    networkExtension: "/Library/Preferences/com.apple.networkextension.plist",
  };
  const host: Host = {
    privilege:
      machine === "local"
        ? "user"
        : run(["sudo", "-n", "true"]).status === 0
          ? "root"
          : "rootUnavailable",
    generatedUid: (scope) => {
      const uid = scope === "user" ? userInfo().uid : -2;
      const output = run(["dsmemberutil", "getuuid", "-u", String(uid)]);
      if (output.status !== 0) {
        throw new Error(`dsmemberutil: ${output.stderr.trim()}`);
      }
      return output.stdout.trim();
    },
    path: (file) =>
      file === "backgroundItems"
        ? btmStore(readdirSync(btmDirectory))
        : file === "userTcc"
          ? userTccFromLsof(
              read(host, [
                "lsof",
                "-a",
                "-u",
                String(userInfo().uid),
                "-c",
                "tccd",
                "-Fn",
              ]),
            )
          : fixed[file],
  };
  return host;
};

if (import.meta.main) {
  const {
    positionals: [machine],
    values: { display },
  } = parseArgs({
    allowPositionals: true,
    options: { display: { type: "boolean", default: false } },
  });
  if (machine !== "local" && machine !== "devbox") {
    console.error(
      "usage: node scripts/permissions/check.ts local|devbox [--display]",
    );
    process.exit(1);
  }
  const results = check(
    manifest,
    targetsFor(machine, display),
    liveHost(machine),
  );
  console.log(format(results));
  process.exitCode = results.every(({ outcome }) => outcome.status === "ok")
    ? 0
    : 1;
}
