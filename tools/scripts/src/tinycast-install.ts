#!/usr/bin/env bun

import { homedir } from "node:os";
import { join } from "node:path";

import { $ } from "bun";

const repo = join(homedir(), "dev/pattobrien/tinycast");
const identity = "Tinycast Self-Signed";
const identityHash = "13B9D8CD6BF08689A783F554961A7B09FD8ADFD9";
const bundleId = "com.tinycast.app";
const installed = "/Applications/Tinycast.app";
const derived = join(repo, "build/DerivedData");
const built = join(derived, "Build/Products/Release/Tinycast.app");

const identities = await $`security find-identity -p codesigning`.text();
if (!identities.includes(`"${identity}"`)) {
  throw new Error(
    `'${identity}' is not in the login keychain; create it per ${repo}/docs/signing.md`,
  );
}
if (!identities.includes(`${identityHash} "${identity}"`)) {
  throw new Error(
    `'${identity}' in the keychain is no longer ${identityHash}; installing would void Tinycast's Accessibility grant`,
  );
}

const tag = (await $`git -C ${repo} describe --tags --abbrev=0`.text()).trim();
const version = tag.replace(/^v/, "").replace(/-.*$/, "");
const build = (await $`git -C ${repo} rev-list --count HEAD`.text()).trim();
const commit = (await $`git -C ${repo} rev-parse --short HEAD`.text()).trim();
console.log(`building ${commit} as ${version} (${build})`);

await $`xcodebuild -project Tinycast.xcodeproj -scheme Tinycast -configuration Release -derivedDataPath ${derived} CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY=${identity} OTHER_CODE_SIGN_FLAGS=--timestamp=none MARKETING_VERSION=${version} CURRENT_PROJECT_VERSION=${build} build -quiet`
  .cwd(repo)
  .env({
    ...process.env,
    PATH: `/usr/bin:${process.env.PATH}`,
    DEVELOPER_DIR: "/Applications/Xcode.app/Contents/Developer",
  });

await $`codesign --verify --deep --strict ${built}`;

const running = async () =>
  (await $`pgrep -f ${installed}/Contents/MacOS/Tinycast`.nothrow().quiet())
    .exitCode === 0;
if (await running()) {
  await $`osascript -e ${`quit app id "${bundleId}"`}`;
  for (let tries = 0; await running(); tries++) {
    if (tries === 50) throw new Error("Tinycast did not quit within 10s");
    await Bun.sleep(200);
  }
}

await $`rm -rf ${installed}`;
await $`ditto ${built} ${installed}`;
await $`open -g -a ${installed}`;
console.log(`installed ${commit} at ${installed}`);
