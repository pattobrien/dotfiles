#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { $ } from "bun";

const issueId = process.argv[2];
const args = issueId
  ? ["issue", "view", issueId, "--json"]
  : ["issue", "view", "--json"];

// Fetch current issue
const result = await $`linear ${args}`.quiet().nothrow();
if (result.exitCode !== 0) {
  console.error(result.stderr.toString() || result.stdout.toString());
  process.exit(1);
}

const issue = JSON.parse(result.stdout.toString());
const id = issue.identifier;
const description = issue.description ?? "";

// Write description to temp file
const dir = await mkdtemp(join(tmpdir(), "linear-desc-"));
const tmpfile = join(dir, `${id}.md`);
await writeFile(tmpfile, description);

const md5 = (buf: Buffer) => createHash("md5").update(buf).digest("hex");
const before = md5(await readFile(tmpfile));

// Open in editor
const editor = process.env.EDITOR ?? "vim";
const proc = Bun.spawn([editor, tmpfile], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});
await proc.exited;

const after = md5(await readFile(tmpfile));

if (before === after) {
  console.log("No changes, skipping update.");
} else {
  await $`linear issue update ${id} --description-file ${tmpfile}`;
}

// Cleanup
await rm(dir, { recursive: true });
