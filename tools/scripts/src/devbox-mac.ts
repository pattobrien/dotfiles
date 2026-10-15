#!/usr/bin/env bun

import { homedir } from "node:os";
import { join, resolve } from "node:path";

import DopplerSDK from "@dopplerhq/node-sdk";
import { createDevboxClient, type Devbox } from "@namespacelabs/sdk/devbox";
import { $ } from "bun";

type Phase = { name: string; run: () => Promise<unknown> };

const devboxCli = join(homedir(), ".local/bin/devbox");
const dotfiles = "/Volumes/devbox/dev/pattobrien/dotfiles";
const dopplerServiceAccount = "sa-agent-builder";
const dopplerTokenTtlMs = 7 * 24 * 60 * 60 * 1000;
// mise renders the global [env] templates, which call doppler, before any exec
// or shim runs, so the token must be set through the binary's own path.
const guestDoppler = "/Volumes/devbox/mise/installs/doppler/latest/doppler";

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

type Guest = { exec(script: string, stdin?: string): Promise<void> };

type Machine = {
  guest: Guest;
  bootFlags: string[];
  github: () => Promise<unknown>;
  after: Phase[];
};

const devboxGuest = (devbox: Devbox): Guest => ({
  exec: async (script, stdin) => {
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
  },
});

const screenshot = async (devbox: Devbox, out: string) => {
  const shot = await devbox.display.screenshot({ timeoutMs: 60_000 });
  await Bun.write(out, shot.png);
  return out;
};

const mintDopplerToken = async (name: string) => {
  const accessToken = (
    await $`doppler configure get token --plain`.text()
  ).trim();
  const doppler = new DopplerSDK({ accessToken });
  const { service_accounts = [] } = await doppler.serviceAccounts.list({
    perPage: 100,
  });
  const account = service_accounts.find(
    (candidate) => candidate.name === dopplerServiceAccount,
  );
  if (!account?.slug) {
    throw new Error(
      `Doppler service account ${dopplerServiceAccount} not found`,
    );
  }
  const tokenName = `devbox-${name}`;
  const { api_tokens = [] } = await doppler.serviceAccountTokens.list(
    account.slug,
    { perPage: 100 },
  );
  for (const stale of api_tokens) {
    if (stale.name === tokenName && stale.slug) {
      await doppler.serviceAccountTokens.delete(account.slug, stale.slug);
    }
  }
  const created = await doppler.serviceAccountTokens.create(
    {
      name: tokenName,
      expires_at: new Date(Date.now() + dopplerTokenTtlMs).toISOString(),
    },
    account.slug,
  );
  if (!created.api_key) {
    throw new Error(`Doppler returned no api_key for ${tokenName}`);
  }
  return created.api_key;
};

const seedDopplerToken = async (guest: Guest, name: string) => {
  const token = await mintDopplerToken(name);
  await guest.exec(
    `mise trust ~/.config/mise/config.toml && mise install -y doppler && ${guestDoppler} configure set token --scope / --silent`,
    `${token}\n`,
  );
};

const runPhases = async (phases: Phase[]) => {
  const timings: Record<string, number> = {};
  const failures: string[] = [];
  for (const phase of phases) {
    const started = performance.now();
    try {
      await phase.run();
    } catch (error) {
      failures.push(
        `${phase.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    timings[phase.name] = Math.round(performance.now() - started);
    console.log(`${phase.name}: ${timings[phase.name]}ms`);
  }
  return { timings, failures };
};

const up = async (
  name: string,
  { guest, bootFlags, github, after }: Machine,
) => {
  const boot = (phase: string) =>
    `cd ${dotfiles} && node scripts/devbox/boot.ts ${[phase, ...bootFlags].join(" ")}`;
  const { timings, failures } = await runPhases([
    {
      name: "dotfiles",
      run: () =>
        guest.exec(
          `if [ -d ${dotfiles}/.git ]; then git -C ${dotfiles} pull --ff-only; else git clone https://github.com/pattobrien/dotfiles.git ${dotfiles}; fi`,
        ),
    },
    { name: "prepare", run: () => guest.exec(boot("prepare")) },
    { name: "github", run: github },
    { name: "doppler token", run: () => seedDopplerToken(guest, name) },
    { name: "install", run: () => guest.exec(boot("install")) },
    ...after,
  ]);
  const total = Object.values(timings).reduce((sum, ms) => sum + ms, 0);
  console.log(`up: ${total}ms`);
  if (failures.length > 0) {
    console.error(`failed phases:\n${failures.join("\n")}`);
    process.exitCode = 1;
  }
};

const devboxUp = (name: string) =>
  withDevbox(name, (devbox) =>
    up(name, {
      guest: devboxGuest(devbox),
      bootFlags: [],
      github: () => $`${devboxCli} setup-github ${name}`,
      after: [
        {
          name: "screenshot",
          run: async () =>
            console.log(
              `screenshot ${await screenshot(devbox, resolve(`${name}-up.png`))}`,
            ),
        },
      ],
    }),
  );

const usage =
  "usage: devbox-mac create|up|down <name> | shot <name> [out.png] | click <name> <x> <y>";

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
    await devboxUp(box);
  },
  up: ([name]) => devboxUp(arg(name, "name")),
  shot: ([name, out]) =>
    withDevbox(arg(name, "name"), async (devbox) =>
      console.log(await screenshot(devbox, resolve(out ?? `${name}.png`))),
    ),
  click: ([name, x, y]) =>
    withDevbox(arg(name, "name"), (devbox) =>
      devbox.display.click(coordinate(x, "x"), coordinate(y, "y")),
    ),
  down: ([name]) => $`${devboxCli} shutdown ${arg(name, "name")} --force`,
};

const [command = "", ...args] = process.argv.slice(2);
if (!Object.hasOwn(commands, command)) {
  console.error(usage);
  process.exit(1);
}
await commands[command](args);
