import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const HALF_LIFE = 259200;

const env = (name: string): string => {
  const value = process.env[name];
  if (value === undefined) throw new Error(`${name} is not set`);
  return value;
};

const herdr = (...args: string[]) =>
  JSON.parse(execFileSync(env("HERDR_BIN_PATH"), args, { encoding: "utf8" }));

const record = (store: string, item: string) => {
  const dir = join(env("HERDR_PLUGIN_STATE_DIR"), store);
  const file = join(dir, `${encodeURIComponent(item)}.json`);
  const x = Date.now() / 1000 / HALF_LIFE;
  let frecency = x;
  if (existsSync(file)) {
    const f: number = JSON.parse(readFileSync(file, "utf8")).frecency;
    const m = Math.max(f, x);
    frecency = m + Math.log2(2 ** (f - m) + 2 ** (x - m));
  }
  mkdirSync(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(
    tmp,
    JSON.stringify({ item, frecency, lastFocused: Date.now() }),
  );
  renameSync(tmp, file);
};

const id: string = JSON.parse(env("HERDR_PLUGIN_EVENT_JSON")).data.workspace_id;
record("workspaces", herdr("workspace", "get", id).result.workspace.label);

const worktrees: {
  open_workspace_id?: string;
  is_linked_worktree: boolean;
  branch?: string;
}[] = herdr("worktree", "list", "--workspace", id).result.worktrees;
const branch = worktrees.find(
  (w) => w.open_workspace_id === id && w.is_linked_worktree && w.branch,
)?.branch;
if (branch) record("worktrees", branch);
