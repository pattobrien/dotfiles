#!/usr/bin/env bun

import { $ } from "bun";

type License = {
  app: string;
  process: string;
  domain: string;
  keys: Record<string, string>;
};

const licenses: License[] = [
  {
    app: "Shottr",
    process: "Shottr",
    domain: "cc.ffitch.shottr",
    keys: {
      "kc-license": "op://Private/Shottr License/defaults/kc-license",
      "kc-vault": "op://Private/Shottr License/defaults/kc-vault",
    },
  },
];

const op = { ...process.env };
delete op.OP_SERVICE_ACCOUNT_TOKEN;

for (const license of licenses) {
  await $`osascript -e ${`tell application "${license.process}" to quit`}`
    .nothrow()
    .quiet();
  for (const [key, ref] of Object.entries(license.keys)) {
    const value = (
      await $`/opt/homebrew/bin/op read ${ref}`.env(op).text()
    ).trim();
    await $`defaults write ${license.domain} ${key} -string ${value}`.quiet();
  }
  await $`open -g -a ${license.app}`;
  console.log(`${license.app}: ${Object.keys(license.keys).join(", ")}`);
}
