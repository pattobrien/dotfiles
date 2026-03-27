import { existsSync, readFileSync } from "fs";
import { join } from "path";

const input = await Bun.stdin.json();
const cwd: string = input.cwd ?? process.cwd();
const pkgPath = join(cwd, "package.json");

if (!existsSync(pkgPath)) process.exit(0);

const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const scripts: Record<string, string> = pkg.scripts ?? {};

const cmd = scripts["lint:fix"] ? "lint:fix" : scripts["lint"] ? "lint" : null;
if (!cmd) process.exit(0);

const result = Bun.spawnSync(["pnpm", "run", cmd], { cwd, stderr: "pipe", stdout: "pipe" });
const output = result.stdout.toString() + result.stderr.toString();

if (result.exitCode !== 0) {
  process.stderr.write(output);
  process.exit(2);
}
