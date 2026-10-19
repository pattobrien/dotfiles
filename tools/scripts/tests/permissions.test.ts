import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test as base } from "vite-plus/test";

type Row = {
  name: string;
  status: string;
  detail: string;
  service: string;
  client: string;
};
type Grant = { service: string; client: string; auth: number; target: string };
type TccDatabases = { system?: Grant[]; user?: Grant[]; container?: Grant[] };
type Atc = { auto_table_construction: Record<string, { path: string }> };

const permissions = join(import.meta.dirname, "../../../scripts/permissions");
const sources = ["check.ts", "local.sql", "devbox.sql", "devbox-display.sql"];

const schema = `CREATE TABLE access (service TEXT NOT NULL, client TEXT NOT NULL, client_type INTEGER NOT NULL, auth_value INTEGER NOT NULL, auth_reason INTEGER NOT NULL, auth_version INTEGER NOT NULL, csreq BLOB, policy_id INTEGER, indirect_object_identifier_type INTEGER, indirect_object_identifier TEXT NOT NULL DEFAULT 'UNUSED', indirect_object_code_identity BLOB, flags INTEGER, last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)), pid INTEGER, pid_version INTEGER, boot_uuid TEXT NOT NULL DEFAULT 'UNUSED', last_reminded INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)), PRIMARY KEY (service, client, client_type, indirect_object_identifier));`;

const databaseTables: [string, keyof TccDatabases][] = [
  ["tcc_system", "system"],
  ["tcc_user", "user"],
  ["tcc_user_container", "container"],
];

const kitty = "net.kovidgoyal.kitty";
const vmguest = "/opt/namespace/vmguest";
const allowed = (service: string, client: string, target = "UNUSED") => ({
  service: `kTCCService${service}`,
  client,
  auth: 2,
  target,
});
const denied = (service: string, client: string, target = "UNUSED") => ({
  ...allowed(service, client, target),
  auth: 0,
});

const tccDb = (path: string, grants: Grant[]) =>
  execFileSync("sqlite3", [
    path,
    [
      schema,
      ...grants.map(
        ({ service, client, auth, target }) =>
          `INSERT INTO access (service,client,client_type,auth_value,auth_reason,auth_version,indirect_object_identifier) VALUES ('${service}','${client}',${client.startsWith("/") ? 1 : 0},${auth},4,1,'${target}');`,
      ),
    ].join("\n"),
  ]);

const aMacIn = (dir: string, databases: TccDatabases) => {
  const atc: Atc = JSON.parse(
    readFileSync(join(permissions, "atc.json"), "utf8"),
  );
  const tables = atc.auto_table_construction;
  for (const [table, name] of databaseTables) {
    tables[table].path = join(dir, `${name}.db`);
    const grants = databases[name];
    if (grants) tccDb(tables[table].path, grants);
  }
  writeFileSync(join(dir, "atc.json"), JSON.stringify(atc));
  for (const file of sources) {
    copyFileSync(join(permissions, file), join(dir, file));
  }
  return {
    checks: (target: string, names: string[]) => {
      const rows: Row[] = JSON.parse(
        execFileSync(
          "osqueryd",
          ["-S", "--config_path", join(dir, "atc.json"), "--json"],
          { input: readFileSync(join(dir, `${target}.sql`)), encoding: "utf8" },
        ),
      );
      return names.map((name) => rows.find((row) => row.name === name));
    },
    runsChecker: (target: string) => {
      const { status, stdout } = spawnSync(
        process.execPath,
        [join(dir, "check.ts"), target],
        { encoding: "utf8" },
      );
      return { status, lines: stdout.split("\n") };
    },
  };
};

const test = base.extend("aMac", ({ task }, { onCleanup }) => {
  const root = realpathSync(
    mkdtempSync(join(tmpdir(), `permissions-${task.id}-`)),
  );
  onCleanup(() => rmSync(root, { recursive: true, force: true }));
  return (databases: TccDatabases) =>
    aMacIn(mkdtempSync(join(root, "mac-")), databases);
});

test("an allowed grant is OK, and a denied or absent one is MISSING", ({
  aMac,
}) => {
  const mac = aMac({
    system: [allowed("Accessibility", kitty), denied("ScreenCapture", kitty)],
  });

  expect(
    mac.checks("local", [
      "kitty Accessibility",
      "kitty Screen Recording",
      "kitty Full Disk Access",
    ]),
  ).toEqual([
    {
      name: "kitty Accessibility",
      status: "OK",
      detail: "auth_value 2",
      service: "kTCCServiceAccessibility",
      client: kitty,
    },
    {
      name: "kitty Screen Recording",
      status: "MISSING",
      detail: "auth_value 0",
      service: "kTCCServiceScreenCapture",
      client: kitty,
    },
    {
      name: "kitty Full Disk Access",
      status: "MISSING",
      detail: "no row",
      service: "kTCCServiceSystemPolicyAllFiles",
      client: kitty,
    },
  ]);
});

test("kitty Automation counts only a grant that targets System Events", ({
  aMac,
}) => {
  const chromeOnly = aMac({
    user: [allowed("AppleEvents", kitty, "com.google.Chrome")],
  });
  const systemEvents = aMac({
    user: [
      allowed("AppleEvents", kitty, "com.google.Chrome"),
      allowed("AppleEvents", kitty, "com.apple.systemevents"),
    ],
  });
  const name = "kitty Automation of System Events";
  const row = {
    name,
    service: "kTCCServiceAppleEvents",
    client: kitty,
  };

  expect([
    ...chromeOnly.checks("local", [name]),
    ...systemEvents.checks("local", [name]),
  ]).toEqual([
    { ...row, status: "MISSING", detail: "no row" },
    { ...row, status: "OK", detail: "auth_value 2" },
  ]);
});

test("the macOS 27 container user database wins over the legacy one", ({
  aMac,
}) => {
  const mac = aMac({
    user: [allowed("AppleEvents", kitty, "com.apple.systemevents")],
    container: [denied("AppleEvents", kitty, "com.apple.systemevents")],
  });

  expect(mac.checks("local", ["kitty Automation of System Events"])).toEqual([
    {
      name: "kitty Automation of System Events",
      status: "MISSING",
      detail: "auth_value 0",
      service: "kTCCServiceAppleEvents",
      client: kitty,
    },
  ]);
});

test("the display devbox checks each vmguest grant by its path", ({ aMac }) => {
  const mac = aMac({ system: [allowed("Accessibility", vmguest)] });

  expect(
    mac.checks("devbox-display", [
      "vmguest Screen Recording",
      "vmguest Accessibility",
      "vmguest Post Event",
    ]),
  ).toEqual([
    {
      name: "vmguest Screen Recording",
      status: "MISSING",
      detail: "no row",
      service: "kTCCServiceScreenCapture",
      client: vmguest,
    },
    {
      name: "vmguest Accessibility",
      status: "OK",
      detail: "auth_value 2",
      service: "kTCCServiceAccessibility",
      client: vmguest,
    },
    {
      name: "vmguest Post Event",
      status: "MISSING",
      detail: "no row",
      service: "kTCCServicePostEvent",
      client: vmguest,
    },
  ]);
});

test("the checker prints one line per entry and fails on a missing grant", ({
  aMac,
}) => {
  const mac = aMac({
    system: [allowed("Accessibility", kitty), denied("ScreenCapture", kitty)],
  });

  const { status, lines } = mac.runsChecker("local");

  expect(status).toBe(1);
  expect(lines).toEqual(
    expect.arrayContaining([
      "OK        kitty Accessibility: auth_value 2",
      "MISSING   kitty Screen Recording: auth_value 0",
    ]),
  );
});
