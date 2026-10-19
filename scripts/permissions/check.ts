import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Row = {
  name: string;
  status: string;
  detail: string;
  service: string;
  client: string;
};
type LocalNetworkRules = {
  entries: { identifier: string; permission: string }[];
};

export const targets = ["local", "devbox", "devbox-display"] as const;
export type Target = (typeof targets)[number];

const dir = import.meta.dirname;
const isTarget = (value: string): value is Target =>
  targets.some((target) => target === value);
const capture = (command: string, args: string[], input?: Buffer) =>
  execFileSync(command, args, {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "inherit"],
  });

const osqueryd = (target: Target): [string, string[]] =>
  target === "local"
    ? ["osqueryd", []]
    : // A mise shim under sudo resolves against root's mise config.
      ["sudo", ["-n", capture("mise", ["which", "osqueryd"]).trim()]];

export const query = (target: Target): Row[] => {
  const [command, prefix] = osqueryd(target);
  const rows: Row[] = JSON.parse(
    capture(
      command,
      [...prefix, "-S", "--config_path", join(dir, "atc.json"), "--json"],
      readFileSync(join(dir, `${target}.sql`)),
    ),
  );
  if (!rows.some((row) => row.service === "LocalNetwork")) return rows;
  const { entries }: LocalNetworkRules = JSON.parse(
    capture("lnpctl", ["list", "--json"]),
  );
  return rows.map((row) => {
    if (row.service !== "LocalNetwork") return row;
    const seen = entries
      .filter((entry) => entry.identifier === row.client)
      .map((entry) => entry.permission);
    return {
      ...row,
      status: seen.includes("Allowed") ? "OK" : "MISSING",
      detail: seen.join(", ") || "no rule",
    };
  });
};

if (import.meta.main) {
  const requested = process.argv.slice(2);
  if (requested.length === 0 || !requested.every(isTarget)) {
    console.error(
      `usage: node scripts/permissions/check.ts <${targets.join("|")}>...`,
    );
    process.exit(1);
  }
  const results = requested.flatMap(
    (target): Pick<Row, "name" | "status" | "detail">[] =>
      target !== "local" &&
      spawnSync("sudo", ["-n", "true"], { stdio: "ignore" }).status !== 0
        ? [
            {
              name: target,
              status: "UNCHECKED",
              detail: "needs root and sudo -n is refused",
            },
          ]
        : query(target),
  );
  for (const { status, name, detail } of results) {
    console.log(`${status.padEnd(9)} ${name}: ${detail}`);
  }
  process.exit(results.every(({ status }) => status === "OK") ? 0 : 1);
}
