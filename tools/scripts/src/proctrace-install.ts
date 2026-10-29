#!/usr/bin/env bun

import {
  chmodSync,
  chownSync,
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { $ } from "bun";

const LABELS = ["dev.pattobrien.eslogger"];
const RETIRED_LABELS = ["dev.pattobrien.eslogger-rotate"];
const SOURCE_DIR = new URL("../../../launchd/", import.meta.url).pathname;
const DAEMON_DIR = "/Library/LaunchDaemons";
const LOG_DIR = "/var/log/proctrace";

if (process.getuid?.() !== 0) {
  console.error("run with sudo: it installs root LaunchDaemons");
  process.exit(2);
}

const owner = Number(process.env.SUDO_UID);
const ownerGroup = Number(process.env.SUDO_GID);
if (!Number.isInteger(owner) || owner === 0) {
  console.error("SUDO_UID is missing: run via sudo from your own account");
  process.exit(2);
}

mkdirSync(LOG_DIR, { recursive: true });
chownSync(LOG_DIR, 0, 0);
chmodSync(LOG_DIR, 0o755);
const eventsPath = join(LOG_DIR, "events.ndjson");
closeSync(openSync(eventsPath, "a"));
chownSync(eventsPath, owner, ownerGroup);
chmodSync(eventsPath, 0o644);

for (const label of RETIRED_LABELS) {
  const target = join(DAEMON_DIR, `${label}.plist`);
  if (
    (await $`launchctl print system/${label}`.quiet().nothrow()).exitCode === 0
  ) {
    await $`launchctl bootout system/${label}`.quiet();
  }
  if (existsSync(target)) {
    rmSync(target);
    console.log(`removed ${label}`);
  }
}

for (const label of LABELS) {
  const source = join(SOURCE_DIR, `${label}.plist`);
  const target = join(DAEMON_DIR, `${label}.plist`);
  const loaded =
    (await $`launchctl print system/${label}`.quiet().nothrow()).exitCode === 0;
  const changed =
    !existsSync(target) ||
    readFileSync(source, "utf8") !== readFileSync(target, "utf8");
  if (loaded && changed) await $`launchctl bootout system/${label}`.quiet();
  copyFileSync(source, target);
  chownSync(target, 0, 0);
  chmodSync(target, 0o644);
  if (!loaded || changed) await $`launchctl bootstrap system ${target}`.quiet();
  console.log(`${changed ? "installed" : "unchanged"} ${label}`);
}

await sleep(3000);
const running = (
  await $`launchctl print system/dev.pattobrien.eslogger`.quiet().nothrow()
).stdout
  .toString()
  .match(/pid = (\d+)/);
const size = statSync(eventsPath).size;
const errPath = join(LOG_DIR, "eslogger.err");
const err = existsSync(errPath)
  ? readFileSync(errPath, "utf8").trim().split("\n").slice(-3).join("\n")
  : "";

if (running && size > 0) {
  console.log(
    `eslogger running as pid ${running[1]}, ${size} bytes written to ${eventsPath}`,
  );
} else {
  console.log("eslogger is not producing events yet.");
  if (err) console.log(`last stderr lines:\n${err}`);
  console.log(
    "Grant Full Disk Access to /usr/bin/eslogger: System Settings > Privacy & Security > Full Disk Access > +, press Cmd+Shift+G, enter /usr/bin/eslogger. launchd restarts it every 10 s until the grant takes.",
  );
}
