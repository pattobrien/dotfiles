#!/usr/bin/env bun

import { homedir } from "node:os";
import { join, resolve } from "node:path";

import { createDevboxClient, type Devbox } from "@namespacelabs/sdk/devbox";
import { $ } from "bun";

type Phase = { name: string; run: () => Promise<unknown> };

const devboxCli = join(homedir(), ".local/bin/devbox");
const dotfiles = "/Volumes/devbox/dev/pattobrien/dotfiles";
// The doppler shim fails while no token is configured, because mise's [env] templates call doppler.
const guestDoppler = "/Volumes/devbox/mise/installs/doppler/latest/doppler";
const capturePromptAllow = { x: 1280, y: 813 };

const spec = (name: string) => ({
  name,
  image: "goldengate",
  size: "M",
  volume_size_gb: 150,
  auto_stop_idle_timeout: "1h",
  access_mode: "private",
  repository: { disabled: true },
  integrations: { github: { share_auth: true } },
});

const withDevbox = async <T>(
  name: string,
  use: (devbox: Devbox) => Promise<T>,
) => {
  const client = createDevboxClient();
  try {
    return await use(await client.devboxes.get(name));
  } finally {
    client.close();
  }
};

const guest = async (devbox: Devbox, script: string, stdin?: string) => {
  const result = await devbox.exec(["/bin/bash", "-lc", script], {
    stdin,
    onStdout: (data) => process.stdout.write(data),
    onStderr: (data) => process.stderr.write(data),
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `guest exited ${result.exitCode ?? result.signal}: ${script}${result.error ? ` (${result.error})` : ""}`,
    );
  }
};

const screenshot = async (devbox: Devbox, out: string) => {
  const shot = await devbox.display.screenshot({ timeoutMs: 60_000 });
  await Bun.write(out, shot.png);
  return out;
};

const seedOpToken = async (devbox: Devbox) => {
  const token = (
    await $`op item get ${"Local AI Agents Service Account Token"} --vault FineDesigns --fields credential --reveal`.text()
  ).trim();
  await guest(
    devbox,
    "security add-generic-password -U -s op-sa.finedesigns.io -a local-ai-agents -w",
    `${token}\n${token}\n`,
  );
};

const runPhases = async (phases: Phase[]) => {
  const timings: Record<string, number> = {};
  for (const phase of phases) {
    const started = performance.now();
    await phase.run();
    timings[phase.name] = Math.round(performance.now() - started);
    console.log(`${phase.name}: ${timings[phase.name]}ms`);
  }
  return timings;
};

const up = (name: string) =>
  withDevbox(name, async (devbox) => {
    const out = resolve(`${name}-up.png`);
    const timings = await runPhases([
      {
        name: "dotfiles",
        run: () =>
          guest(
            devbox,
            `if [ -d ${dotfiles}/.git ]; then git -C ${dotfiles} pull --ff-only; else git clone https://github.com/pattobrien/dotfiles.git ${dotfiles}; fi`,
          ),
      },
      {
        name: "boot",
        run: () =>
          guest(devbox, `cd ${dotfiles} && node scripts/devbox/boot.ts`),
      },
      { name: "github", run: () => $`${devboxCli} setup-github ${name}` },
      { name: "1password token", run: () => seedOpToken(devbox) },
      {
        name: "dismiss capture prompt",
        run: async () => {
          await devbox.display.click(
            capturePromptAllow.x,
            capturePromptAllow.y,
          );
          await Bun.sleep(1500);
        },
      },
      { name: "screenshot", run: () => screenshot(devbox, out) },
    ]);
    const total = Object.values(timings).reduce((sum, ms) => sum + ms, 0);
    console.log(`up: ${total}ms, screenshot ${out}`);
  });

const usage =
  "usage: devbox-mac create|up|down <name> | shot <name> [out.png] | click <name> <x> <y> | seed-doppler <name> <op-reference>";

const arg = (value: string | undefined, label: string) => {
  if (!value) throw new Error(`missing <${label}>\n${usage}`);
  return value;
};

const coordinate = (value: string | undefined, label: string) => {
  const parsed = Number(arg(value, label));
  if (!Number.isFinite(parsed)) throw new Error(`<${label}> must be a number`);
  return parsed;
};

const commands: Record<string, (args: string[]) => Promise<unknown>> = {
  create: async ([name]) => {
    const box = arg(name, "name");
    await $`${devboxCli} create --from - --from_format json --name ${box} < ${new Response(JSON.stringify(spec(box)))}`;
    await up(box);
  },
  up: ([name]) => up(arg(name, "name")),
  shot: ([name, out]) =>
    withDevbox(arg(name, "name"), async (devbox) =>
      console.log(await screenshot(devbox, resolve(out ?? `${name}.png`))),
    ),
  click: ([name, x, y]) =>
    withDevbox(arg(name, "name"), (devbox) =>
      devbox.display.click(coordinate(x, "x"), coordinate(y, "y")),
    ),
  down: ([name]) => $`${devboxCli} shutdown ${arg(name, "name")} --force`,
  "seed-doppler": ([name, reference]) =>
    withDevbox(arg(name, "name"), async (devbox) => {
      const token = (
        await $`op read ${arg(reference, "op-reference")}`.text()
      ).trim();
      await guest(
        devbox,
        `${guestDoppler} configure set token --scope / --silent`,
        `${token}\n`,
      );
    }),
};

const [command = "", ...args] = process.argv.slice(2);
if (!Object.hasOwn(commands, command)) {
  console.error(usage);
  process.exit(1);
}
await commands[command](args);
