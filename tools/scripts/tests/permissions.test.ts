import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "vite-plus/test";

import {
  btmStore,
  check,
  format,
  judgeOutput,
  userTccFromLsof,
  type Host,
  type HostFile,
} from "../../../scripts/permissions/check.ts";
import type {
  BtmScope,
  Entry,
  Probe,
} from "../../../scripts/permissions/manifest.ts";
import { parsePlist, Uid } from "../../../scripts/permissions/plist.ts";

const dir = mkdtempSync(join(tmpdir(), "permissions-"));

const plist = (name: string, body: string) => {
  const path = join(dir, name);
  writeFileSync(
    path,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">${body}</plist>`,
  );
  return path;
};

const uid = (n: number) =>
  `<dict><key>CF$UID</key><integer>${n}</integer></dict>`;

const schema = `CREATE TABLE access (service TEXT NOT NULL, client TEXT NOT NULL, client_type INTEGER NOT NULL, auth_value INTEGER NOT NULL, auth_reason INTEGER NOT NULL, auth_version INTEGER NOT NULL, csreq BLOB, policy_id INTEGER, indirect_object_identifier_type INTEGER, indirect_object_identifier TEXT NOT NULL DEFAULT 'UNUSED', indirect_object_code_identity BLOB, flags INTEGER, last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)), pid INTEGER, pid_version INTEGER, boot_uuid TEXT NOT NULL DEFAULT 'UNUSED', last_reminded INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)), PRIMARY KEY (service, client, client_type, indirect_object_identifier));`;

const tccDb = (
  name: string,
  rows: [string, string, number, number, string][],
) => {
  const path = join(dir, name);
  execFileSync("sqlite3", [
    path,
    [
      schema,
      ...rows.map(
        ([service, client, type, auth, target]) =>
          `INSERT INTO access (service,client,client_type,auth_value,auth_reason,auth_version,indirect_object_identifier) VALUES ('${service}','${client}',${type},${auth},4,1,'${target}');`,
      ),
    ].join("\n"),
  ]);
  return path;
};

const systemTcc = tccDb("system.db", [
  ["kTCCServiceAccessibility", "net.kovidgoyal.kitty", 0, 2, "UNUSED"],
  ["kTCCServiceScreenCapture", "net.kovidgoyal.kitty", 0, 0, "UNUSED"],
  ["kTCCServicePostEvent", "/opt/namespace/vmguest", 1, 2, "UNUSED"],
  ["kTCCServiceScreenCapture", "/opt/namespace/vmguest", 0, 2, "UNUSED"],
  ["kTCCServiceSystemPolicyAllFiles", "com.example.limbo", 0, 5, "UNUSED"],
]);

const userTcc = tccDb("user.db", [
  [
    "kTCCServiceAppleEvents",
    "net.kovidgoyal.kitty",
    0,
    2,
    "com.apple.systemevents",
  ],
]);

const networkExtension = plist(
  "networkextension.plist",
  `<dict><key>$objects</key><array>
<string>$null</string>
<dict><key>SigningIdentifier</key>${uid(2)}<key>DenyMulticast</key><false/><key>MulticastPreferenceSet</key><true/></dict>
<string>net.kovidgoyal.kitty</string>
<dict><key>SigningIdentifier</key>${uid(4)}<key>DenyMulticast</key><true/><key>MulticastPreferenceSet</key><false/></dict>
<string>com.tinycast.app</string>
</array></dict>`,
);

const notifications = plist(
  "usernoted.plist",
  `<dict><key>apps</key><array>
<dict><key>bundle-id</key><string>net.kovidgoyal.kitty</string><key>flags</key><integer>33562638</integer></dict>
<dict><key>bundle-id</key><string>com.777genius.agent-notifications</string><key>flags</key><integer>8206</integer></dict>
</array></dict>`,
);

const systemUser = "FFFFEEEE-DDDD-CCCC-BBBB-AAAAFFFFFFFE";
const user = "26DF2E38-9AF5-405F-BEDC-66BE04F5B196";

const backgroundItems = plist(
  "BackgroundItems-v16.btm",
  `<dict><key>$top</key><dict><key>store</key>${uid(1)}</dict><key>$objects</key><array>
<string>$null</string>
<dict><key>itemsByUserIdentifier</key>${uid(2)}</dict>
<dict><key>NS.keys</key><array>${uid(3)}${uid(4)}${uid(5)}</array><key>NS.objects</key><array>${uid(6)}${uid(7)}${uid(8)}</array></dict>
<string>${systemUser}</string>
<string>${user}</string>
<string>0A0A0A0A-0000-4000-8000-000000000001</string>
<dict><key>NS.objects</key><array>${uid(9)}${uid(11)}</array></dict>
<dict><key>NS.objects</key><array>${uid(13)}</array></dict>
<dict><key>NS.objects</key><array>${uid(14)}</array></dict>
<dict><key>identifier</key>${uid(10)}<key>disposition</key><integer>11</integer></dict>
<string>16.org.pqrs.service.daemon.Karabiner-Core-Service</string>
<dict><key>identifier</key>${uid(12)}<key>disposition</key><integer>10</integer></dict>
<string>16.org.pqrs.service.daemon.Karabiner-VirtualHIDDevice-Daemon</string>
<dict><key>identifier</key>${uid(15)}<key>disposition</key><integer>10</integer></dict>
<dict><key>identifier</key>${uid(15)}<key>disposition</key><integer>11</integer></dict>
<string>2.org.hammerspoon.Hammerspoon</string>
</array></dict>`,
);
execFileSync("plutil", ["-convert", "binary1", backgroundItems]);

const replayd = (name: string, value: string) =>
  plist(name, `<dict><key>/opt/namespace/vmguest</key>${value}</dict>`);

const files: Record<HostFile, string> = {
  systemTcc,
  userTcc,
  networkExtension,
  notifications,
  backgroundItems,
  replayd: replayd("replayd.plist", "<date>3024-01-01T00:00:00Z</date>"),
};

const generatedUid = (scope: BtmScope) =>
  scope === "system" ? systemUser : user;

const host = (overrides: Partial<Record<HostFile, string>> = {}): Host => ({
  privilege: "user",
  path: (file) => overrides[file] ?? files[file],
  generatedUid,
});

const entry = (name: string, probe: Probe): Entry => ({
  name,
  probe,
  remedy: { local: { by: "manual", where: "System Settings" } },
});

const kitty = { bundleId: "net.kovidgoyal.kitty" };
const vmguest = { path: "/opt/namespace/vmguest" };

const statuses = (entries: Entry[], on: Host) =>
  Object.fromEntries(
    check(entries, ["local"], on).map(({ entry: { name }, outcome }) => [
      name,
      `${outcome.status}: ${outcome.detail}`,
    ]),
  );

test("judges each file-backed probe against literal fixtures", () => {
  expect(
    statuses(
      [
        entry("tcc allowed", {
          kind: "tcc",
          service: "Accessibility",
          client: kitty,
        }),
        entry("tcc denied", {
          kind: "tcc",
          service: "ScreenCapture",
          client: kitty,
        }),
        entry("tcc absent", {
          kind: "tcc",
          service: "Accessibility",
          client: { bundleId: "org.hammerspoon.Hammerspoon" },
        }),
        entry("tcc path client", {
          kind: "tcc",
          service: "PostEvent",
          client: vmguest,
        }),
        entry("tcc path client with a bundle row", {
          kind: "tcc",
          service: "ScreenCapture",
          client: vmguest,
        }),
        entry("tcc stuck pending", {
          kind: "tcc",
          service: "SystemPolicyAllFiles",
          client: { bundleId: "com.example.limbo" },
        }),
        entry("automation allowed", {
          kind: "appleEvents",
          client: kitty,
          target: "com.apple.systemevents",
        }),
        entry("automation other target", {
          kind: "appleEvents",
          client: kitty,
          target: "com.apple.finder",
        }),
        entry("local network allowed", {
          kind: "localNetwork",
          signingId: "net.kovidgoyal.kitty",
        }),
        entry("local network refused", {
          kind: "localNetwork",
          signingId: "com.tinycast.app",
        }),
        entry("local network never asked", {
          kind: "localNetwork",
          signingId: "com.example.quiet",
        }),
        entry("notifications allowed", {
          kind: "notifications",
          bundleId: "net.kovidgoyal.kitty",
        }),
        entry("notifications off", {
          kind: "notifications",
          bundleId: "com.777genius.agent-notifications",
        }),
        entry("notifications unregistered", {
          kind: "notifications",
          bundleId: "com.example.quiet",
        }),
        entry("background item allowed", {
          kind: "backgroundItem",
          identifier: "16.org.pqrs.service.daemon.Karabiner-Core-Service",
          scope: "system",
        }),
        entry("background item disabled", {
          kind: "backgroundItem",
          identifier:
            "16.org.pqrs.service.daemon.Karabiner-VirtualHIDDevice-Daemon",
          scope: "system",
        }),
        entry("background item allowed only for another user", {
          kind: "backgroundItem",
          identifier: "2.org.hammerspoon.Hammerspoon",
          scope: "user",
        }),
        entry("background item in another scope", {
          kind: "backgroundItem",
          identifier: "2.org.hammerspoon.Hammerspoon",
          scope: "system",
        }),
        {
          name: "devbox only",
          probe: { kind: "tcc", service: "Accessibility", client: kitty },
          remedy: { devbox: { by: "boot", step: "tcc grants" } },
        },
      ],
      host(),
    ),
  ).toEqual({
    "tcc allowed": "ok: allowed",
    "tcc denied": "missing: auth_value 0 (denied)",
    "tcc absent": "missing: no row",
    "tcc path client": "ok: allowed",
    "tcc path client with a bundle row": "missing: no row",
    "tcc stuck pending": "missing: auth_value 5 (stuck pending)",
    "automation allowed": "ok: allowed",
    "automation other target": "missing: no row",
    "local network allowed": "ok: allowed",
    "local network refused": "missing: denied or never answered",
    "local network never asked": "missing: never asked",
    "notifications allowed": "ok: allowed",
    "notifications off": "missing: Allow notifications is off",
    "notifications unregistered":
      "missing: not registered with Notification Center",
    "background item allowed": "ok: enabled, allowed, notified (0xb)",
    "background item disabled": "missing: disabled, allowed, notified (0xa)",
    "background item allowed only for another user":
      "missing: disabled, allowed, notified (0xa)",
    "background item in another scope": "missing: not registered",
  });
});

test.each([
  [
    "<date>3024-01-01T00:00:00Z</date>",
    "ok: approved until 3024-01-01T00:00:00.000Z",
  ],
  [
    "<dict><key>kScreenCapturePrivacyHintDate</key><date>3024-01-01T00:00:00Z</date><key>kScreenCapturePrivacyHintPolicy</key><integer>1</integer></dict>",
    "ok: approved until 3024-01-01T00:00:00.000Z",
  ],
  [
    "<date>2020-01-01T00:00:00Z</date>",
    "missing: approval lapsed 2020-01-01T00:00:00.000Z",
  ],
  ["<string>yes</string>", "missing: no approval"],
])("replayd approval %s", (value, expected) => {
  const approval = entry("approval", {
    kind: "replaydApproval",
    client: "/opt/namespace/vmguest",
  });
  const path = replayd(
    `replayd-${expected.length}-${value.length}.plist`,
    value,
  );
  expect(statuses([approval], host({ replayd: path }))).toEqual({
    approval: expected,
  });
});

test("reports root-only reads as unchecked when sudo -n is refused", () => {
  expect(
    statuses(
      [entry("tcc", { kind: "tcc", service: "Accessibility", client: kitty })],
      {
        privilege: "rootUnavailable",
        path: (file) => files[file],
        generatedUid,
      },
    ),
  ).toEqual({
    tcc: "unchecked: needs root and sudo -n is refused, not checked",
  });
});

test("skips App Data reads that could prompt without Full Disk Access", () => {
  expect(
    statuses(
      [
        entry("notifications", {
          kind: "notifications",
          bundleId: "net.kovidgoyal.kitty",
        }),
        entry("local network", {
          kind: "localNetwork",
          signingId: "net.kovidgoyal.kitty",
        }),
      ],
      host({ systemTcc: join(dir, "missing", "TCC.db") }),
    ),
  ).toEqual({
    notifications:
      "unchecked: reading notifications without Full Disk Access could prompt, not checked",
    "local network": "ok: allowed",
  });
});

test("reports unreadable state as an error, not a pass", () => {
  expect(
    statuses(
      [entry("local network", { kind: "localNetwork", signingId: "x" })],
      host({ networkExtension: notifications }),
    ),
  ).toEqual({
    "local network": "error: networkextension plist is not a keyed archive",
  });
});

test("runs command probes and matches their output", () => {
  expect(
    statuses(
      [
        entry("sip off", {
          kind: "command",
          argv: ["/bin/echo", "System Integrity Protection status: disabled."],
          expect: /status: disabled\./,
        }),
        entry("sip on", {
          kind: "command",
          argv: ["/bin/echo", "System Integrity Protection status: enabled."],
          expect: /status: disabled\./,
        }),
        entry("failing", {
          kind: "command",
          argv: ["/usr/bin/false"],
          expect: /^$/,
        }),
      ],
      host(),
    ),
  ).toEqual({
    "sip off": "ok: System Integrity Protection status: disabled.",
    "sip on": "missing: System Integrity Protection status: enabled.",
    failing: "missing: exit 1",
  });
});

const systemextensionsctl = `2 extension(s)
--- com.apple.system_extension.driver_extension (Go to 'System Settings > General > Login Items & Extensions > Driver Extensions' to modify these system extension(s))
enabled\tactive\tteamID\tbundleID (version)\tname\t[state]
*\t*\tG43BCU2T37\torg.pqrs.Karabiner-DriverKit-VirtualHIDDevice (1.8.0/1.8.0)\torg.pqrs.Karabiner-DriverKit-VirtualHIDDevice\t[activated enabled]
--- com.apple.system_extension.network_extension (Go to 'System Settings > General > Login Items & Extensions > Network Extensions' to modify these system extension(s))
enabled\tactive\tteamID\tbundleID (version)\tname\t[state]
\t\tW5364U7YZB\tio.tailscale.ipn.macsys.network-extension (1.98.9/101.98.9)\tTailscale Network Extension\t[activated waiting for user]
\t\tH7V7XYVQ7D\tco.daily.vcam.extension (1.0/1)\tDaily Virtual Camera\t[terminated waiting to uninstall on reboot]
*\t*\tH7V7XYVQ7D\tco.daily.vcam.extension (1.1/2)\tDaily Virtual Camera\t[activated enabled]
`;

test.each([
  [
    "G43BCU2T37",
    "org.pqrs.Karabiner-DriverKit-VirtualHIDDevice",
    "ok",
    "[activated enabled]",
  ],
  [
    "W5364U7YZB",
    "io.tailscale.ipn.macsys.network-extension",
    "missing",
    "[activated waiting for user]",
  ],
  ["W5364U7YZB", "io.tailscale.ipn.macsys", "missing", "not installed"],
  ["H7V7XYVQ7D", "co.daily.vcam.extension", "ok", "[activated enabled]"],
])("system extension %s %s", (teamId, bundleId, status, detail) => {
  expect(
    judgeOutput(
      { kind: "sysext", teamId, bundleId },
      { status: 0, stdout: systemextensionsctl, stderr: "" },
    ),
  ).toEqual({ status, detail });
});

const pmset = `System-wide power settings:
Currently in use:
 standby              0
 sleep                1 (sleep prevented by coreaudiod, powerd)
 displaysleep         0
`;

test.each([
  ["sleep", "missing", "sleep 1 (sleep prevented by coreaudiod, powerd)"],
  ["displaysleep", "ok", "displaysleep 0"],
  ["disksleep", "missing", "pmset reports no disksleep"],
])("pmset %s", (setting, status, detail) => {
  expect(
    judgeOutput(
      { kind: "pmset", setting, value: 0 },
      { status: 0, stdout: pmset, stderr: "" },
    ),
  ).toEqual({ status, detail });
});

test.each([
  [0, "0\n", "ok", "idleTime = 0"],
  [0, "300\n", "missing", "idleTime = 300"],
  [1, "", "missing", "idleTime is not set"],
])("defaults exit %i stdout %j", (status, stdout, outcome, detail) => {
  expect(
    judgeOutput(
      {
        kind: "defaults",
        domain: "com.apple.screensaver",
        key: "idleTime",
        currentHost: true,
        equals: "0",
      },
      {
        status,
        stdout,
        stderr: status
          ? "The domain/default pair of (com.apple.screensaver, idleTime) does not exist\n"
          : "",
      },
    ),
  ).toEqual({ status: outcome, detail });
});

test("finds the user TCC.db that tccd holds open on 26 and 27", () => {
  expect(
    userTccFromLsof(
      "p523\nf3\nn/Users/patt/Library/Application Support/com.apple.TCC/TCC.db\nf4\nn/Users/patt/Library/Application Support/com.apple.TCC/TCC.db-wal\nf5\nn/Users/patt/Library/Application Support/com.apple.TCC/TCC.db\n",
    ),
  ).toBe("/Users/patt/Library/Application Support/com.apple.TCC/TCC.db");
  expect(
    userTccFromLsof(
      "p611\nf3\nn/private/var/containers/Data/ProtectedSystem/5D1C2E2A-0F1B-4C1E-9A57-3E0E2B9C7A10/Data/Library/Application Support/com.apple.TCC/TCC.db\n",
    ),
  ).toBe(
    "/private/var/containers/Data/ProtectedSystem/5D1C2E2A-0F1B-4C1E-9A57-3E0E2B9C7A10/Data/Library/Application Support/com.apple.TCC/TCC.db",
  );
  expect(() => userTccFromLsof("p523\nf3\nn/dev/null\n")).toThrow(
    "expected one user TCC.db open by tccd, found 0: ",
  );
  expect(() =>
    userTccFromLsof(
      "p1\nn/a/com.apple.TCC/TCC.db\np2\nn/b/com.apple.TCC/TCC.db\n",
    ),
  ).toThrow(
    "expected one user TCC.db open by tccd, found 2: /a/com.apple.TCC/TCC.db, /b/com.apple.TCC/TCC.db",
  );
});

test("finds exactly one Background Items store whatever its version", () => {
  expect(
    btmStore(["BackgroundItems-v16.btm", "BackgroundItems-v16.btm.lock"]),
  ).toBe(
    "/private/var/db/com.apple.backgroundtaskmanagement/BackgroundItems-v16.btm",
  );
  expect(() => btmStore([])).toThrow(
    "expected one BackgroundItems-v*.btm, found 0: ",
  );
  expect(() =>
    btmStore(["BackgroundItems-v13.btm", "BackgroundItems-v16.btm"]),
  ).toThrow(
    "expected one BackgroundItems-v*.btm, found 2: BackgroundItems-v13.btm, BackgroundItems-v16.btm",
  );
});

test("formats one line per entry with the fix for unmet entries", () => {
  const tcc: Probe = { kind: "tcc", service: "Accessibility", client: kitty };
  expect(
    format([
      {
        entry: entry("kitty Accessibility", tcc),
        remedy: {
          by: "manual",
          where: "System Settings > Privacy & Security > Accessibility",
        },
        outcome: { status: "ok", detail: "allowed" },
      },
      {
        entry: entry("vmguest Accessibility", tcc),
        remedy: { by: "boot", step: "tcc grants" },
        outcome: {
          status: "unchecked",
          detail: "needs root and sudo -n is refused, not checked",
        },
      },
      {
        entry: entry("Xcode first launch", tcc),
        remedy: { by: "command", run: "sudo xcodebuild -runFirstLaunch" },
        outcome: { status: "missing", detail: "exit 69" },
      },
    ]),
  ).toBe(
    [
      "OK         kitty Accessibility: allowed",
      'UNCHECKED  vmguest Accessibility: needs root and sudo -n is refused, not checked (fix: boot step "tcc grants")',
      "MISSING    Xcode first launch: exit 69 (fix: run sudo xcodebuild -runFirstLaunch)",
    ].join("\n"),
  );
});

const xml = (body: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0">${body}</plist>`;

test.each([
  ["<dict><key/><string>v</string></dict>", { "": "v" }],
  ["<string>&#65;&#x42;&lt;&amp;</string>", "AB<&"],
  [
    "<array><real>+infinity</real><real>-infinity</real><real>1.5</real></array>",
    [Infinity, -Infinity, 1.5],
  ],
  [
    "<dict><key>a</key><dict/><key>b</key><array/><key>c</key><true/><key>d</key><date>2020-01-01T00:00:00Z</date></dict>",
    { a: {}, b: [], c: true, d: new Date("2020-01-01T00:00:00Z") },
  ],
  [
    "<array><dict><key>CF$UID</key><integer>7</integer></dict></array>",
    [new Uid(7)],
  ],
])("parses plist %s", (body, expected) => {
  expect(parsePlist(xml(body))).toEqual(expected);
});

test.each([
  [
    "<string><![CDATA[a < b]]></string>",
    "plist: CDATA and comments are not supported",
  ],
  ["<string>&nbsp;</string>", "plist: unknown entity &nbsp;"],
  ["<uid>1</uid>", "plist: unexpected <uid>"],
])("rejects plist %s", (body, message) => {
  expect(() => parsePlist(xml(body))).toThrow(message);
});
