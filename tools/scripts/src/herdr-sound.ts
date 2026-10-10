#!/usr/bin/env bun

import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { parse, patch } from "@decimalturn/toml-patch";
import { $ } from "bun";

const modes = ["toggle", "on", "off"] as const;
type Mode = (typeof modes)[number];

const mode = (process.argv[2] ?? "toggle") as Mode;
if (!modes.includes(mode)) {
  console.error(`usage: herdr-sound [${modes.join("|")}]`);
  process.exit(2);
}

const herdr = process.env.HERDR_BIN_PATH ?? "herdr";
const configPath = process.env.HERDR_CONFIG_PATH ?? join(homedir(), ".config/herdr/config.toml");
const source = await readFile(configPath, "utf8");
const config = parse(source);

const current: boolean = config.ui?.sound?.enabled ?? true;
const enabled = mode === "toggle" ? !current : mode === "on";

config.ui ??= {};
config.ui.sound ??= {};
config.ui.sound.enabled = enabled;
await writeFile(configPath, patch(source, config));

await $`${herdr} server reload-config`.quiet();

const label = `Notification sounds ${enabled ? "on" : "off"}`;
await $`${herdr} notification show ${label} --sound none`.quiet();
console.log(label);
