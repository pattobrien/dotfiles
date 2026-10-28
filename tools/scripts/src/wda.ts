#!/usr/bin/env bun

import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { $, Glob } from "bun";
import { z } from "zod";

const config = {
  udid: "00008110-000E59E83CFB801E",
  team: "U6ZQTV753Q",
  bundleId: "com.finedesigns.WebDriverAgentRunner",
  developerDir: "/Applications/Xcode-27.2.0-Release.Candidate.app/Contents/Developer",
  derivedData: join(homedir(), ".appium", "wda-derived-data"),
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { udid: { type: "string", default: config.udid } },
});

const env = { ...process.env, DEVELOPER_DIR: config.developerDir };
const destination = `id=${values.udid}`;
const products = join(config.derivedData, "Build", "Products");
const runLog = join(config.derivedData, "wda-run.log");

const drivers = z.object({ xcuitest: z.object({ installPath: z.string() }) });

async function wdaProject() {
  const installed = drivers.parse(
    await $`appium driver list --installed --json`.quiet().json(),
  );
  const project = join(
    installed.xcuitest.installPath,
    "node_modules",
    "appium-webdriveragent",
    "WebDriverAgent.xcodeproj",
  );
  if (!existsSync(project))
    throw new Error(`WebDriverAgent project not found at ${project}`);
  return project;
}

function xctestrun() {
  const found = [
    ...new Glob("WebDriverAgentRunner_iphoneos*.xctestrun").scanSync(products),
  ]
    .map((name) => join(products, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (found.length === 0)
    throw new Error(`no xctestrun in ${products}; run \`wda build\` first`);
  return found[0];
}

async function build() {
  const proc = Bun.spawn(
    [
      "xcodebuild",
      "build-for-testing",
      "-quiet",
      "-project",
      await wdaProject(),
      "-scheme",
      "WebDriverAgentRunner",
      "-destination",
      destination,
      "-derivedDataPath",
      config.derivedData,
      "-allowProvisioningUpdates",
      "-allowProvisioningDeviceRegistration",
      `DEVELOPMENT_TEAM=${config.team}`,
      "CODE_SIGN_STYLE=Automatic",
      `PRODUCT_BUNDLE_IDENTIFIER=${config.bundleId}`,
    ],
    { env, stdio: ["inherit", "inherit", "inherit"] },
  );
  const code = await proc.exited;
  if (code !== 0) process.exit(code);
  console.log(`built ${xctestrun()}`);
}

const serverUrl = /ServerURLHere->(\S+)<-ServerURLHere/;
const xcodebuildError = /error|failed|^\*\* /i;
const deviceLog = /WebDriverAgentRunner-Runner\[\d+:\d+\]/;

async function run() {
  const testrun = xctestrun();
  const log = Bun.file(runLog).writer();
  const proc = Bun.spawn(
    [
      "xcodebuild",
      "test-without-building",
      "-xctestrun",
      testrun,
      "-destination",
      destination,
    ],
    { env, stdout: "pipe", stderr: "pipe" },
  );
  let stopping = false;
  const forward = (signal: NodeJS.Signals) => {
    stopping = true;
    proc.kill(signal);
  };
  process.on("SIGINT", forward);
  process.on("SIGTERM", forward);
  console.log(`launching WDA from ${testrun}; full log at ${runLog}`);

  const tail: string[] = [];
  const handle = (line: string) => {
    log.write(line + "\n");
    tail.push(line);
    if (tail.length > 40) tail.shift();
    const url = serverUrl.exec(line)?.[1];
    if (url) console.log(`WDA ready at ${url}`);
    else if (xcodebuildError.test(line) && !deviceLog.test(line))
      console.error(line);
  };

  const pump = async (stream: ReadableStream<Uint8Array>) => {
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of stream) {
      const lines = (buffer + decoder.decode(chunk, { stream: true })).split(
        "\n",
      );
      buffer = lines.pop() ?? "";
      lines.forEach(handle);
    }
    if (buffer) handle(buffer);
  };

  await Promise.all([pump(proc.stdout), pump(proc.stderr)]);
  const code = await proc.exited;
  await log.end();
  if (code !== 0 && !stopping) console.error(tail.join("\n"));
  process.exit(code);
}

const commands: Record<string, () => Promise<void>> = { build, run };
const command = commands[positionals[0] ?? ""];
if (!command) {
  console.error("usage: wda <build|run> [--udid <udid>]");
  process.exit(1);
}
await command();
