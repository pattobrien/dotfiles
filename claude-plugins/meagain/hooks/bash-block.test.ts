import { describe, expect, it } from "bun:test";

import { parse } from "shell-quote";

import {
  checkCommand,
  extractCommands,
  BLOCKED,
  BLOCKED_ANYWHERE,
} from "./bash-block-lib.ts";

describe("extractCommands", () => {
  it("extracts a single command", () => {
    expect(extractCommands(parse("npx foo"))).toEqual(["npx"]);
  });

  it("extracts commands after operators", () => {
    expect(extractCommands(parse("echo hello && tsc --noEmit"))).toEqual([
      "echo",
      "tsc",
    ]);
  });

  it("extracts command after pipe", () => {
    expect(extractCommands(parse("cat file | npx prettier"))).toEqual([
      "cat",
      "npx",
    ]);
  });

  it("does not extract args as commands", () => {
    expect(extractCommands(parse("git commit -m foo"))).toEqual(["git"]);
  });

  it("does not extract quoted content as commands", () => {
    expect(extractCommands(parse('git commit -m "use npx and tsc"'))).toEqual([
      "git",
    ]);
  });
});

describe("checkCommand", () => {
  const check = (cmd: string) => checkCommand(cmd, BLOCKED, BLOCKED_ANYWHERE);

  it("blocks npx", () => {
    expect(check("npx foo")).toBe(BLOCKED.npx);
  });

  it("blocks tsc as command", () => {
    expect(check("tsc --noEmit")).toBe(BLOCKED_ANYWHERE.tsc);
  });

  it("blocks tsc after &&", () => {
    expect(check("echo hello && tsc --noEmit")).toBe(BLOCKED_ANYWHERE.tsc);
  });

  it("blocks npx after pipe", () => {
    expect(check("cat file | npx prettier")).toBe(BLOCKED.npx);
  });

  it("allows npx/tsc inside quoted args", () => {
    expect(check('git commit -m "use npx and tsc"')).toBeNull();
  });

  it("allows unrelated commands", () => {
    expect(check("pnpm lint")).toBeNull();
  });

  it("allows pnpx", () => {
    expect(check("pnpx foo")).toBeNull();
  });

  it("allows empty command", () => {
    expect(check("")).toBeNull();
  });

  it("blocks first matching command in chain", () => {
    expect(check("npx foo && tsc --noEmit")).toBe(BLOCKED.npx);
  });

  // BLOCKED_ANYWHERE tests
  it("blocks prettier as argument to pnpx", () => {
    expect(check("pnpx prettier --write .")).toBe(BLOCKED_ANYWHERE.prettier);
  });

  it("blocks tsc as argument to pnpx", () => {
    expect(check("pnpx tsc --noEmit")).toBe(BLOCKED_ANYWHERE.tsc);
  });

  it("blocks prettier as standalone command", () => {
    expect(check("prettier --write src/")).toBe(BLOCKED_ANYWHERE.prettier);
  });

  it("blocks prettier via pnpm exec with --filter", () => {
    expect(check("pnpm --filter foo/bar exec prettier")).toBe(
      BLOCKED_ANYWHERE.prettier,
    );
  });

  it("blocks prettier after cd &&", () => {
    expect(check("cd foo/bar && pnpx prettier")).toBe(
      BLOCKED_ANYWHERE.prettier,
    );
  });

  it("blocks tsc via pnpm exec with --filter", () => {
    expect(check("pnpm --filter foo/bar exec tsc --noEmit")).toBe(
      BLOCKED_ANYWHERE.tsc,
    );
  });

  it("blocks tsc after cd &&", () => {
    expect(check("cd foo/bar && pnpx tsc")).toBe(BLOCKED_ANYWHERE.tsc);
  });
});
