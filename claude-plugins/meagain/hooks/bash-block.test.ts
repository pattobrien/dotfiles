import { describe, expect, it } from "bun:test";

import { parse } from "shell-quote";

import { checkCommand, extractCommands, BLOCKED } from "./bash-block-lib.ts";

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
  it("blocks npx", () => {
    expect(checkCommand("npx foo", BLOCKED)).toBe(BLOCKED.npx);
  });

  it("blocks tsc", () => {
    expect(checkCommand("tsc --noEmit", BLOCKED)).toBe(BLOCKED.tsc);
  });

  it("blocks tsc after &&", () => {
    expect(checkCommand("echo hello && tsc --noEmit", BLOCKED)).toBe(
      BLOCKED.tsc,
    );
  });

  it("blocks npx after pipe", () => {
    expect(checkCommand("cat file | npx prettier", BLOCKED)).toBe(BLOCKED.npx);
  });

  it("allows npx/tsc inside quoted args", () => {
    expect(checkCommand('git commit -m "use npx and tsc"', BLOCKED)).toBeNull();
  });

  it("allows unrelated commands", () => {
    expect(checkCommand("pnpm lint", BLOCKED)).toBeNull();
  });

  it("allows pnpx", () => {
    expect(checkCommand("pnpx foo", BLOCKED)).toBeNull();
  });

  it("allows empty command", () => {
    expect(checkCommand("", BLOCKED)).toBeNull();
  });

  it("blocks first matching command in chain", () => {
    expect(checkCommand("npx foo && tsc --noEmit", BLOCKED)).toBe(BLOCKED.npx);
  });
});
