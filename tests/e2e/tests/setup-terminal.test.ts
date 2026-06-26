import { execa } from "execa";
import { expect, test } from "vitest";

test("login shell starts without dotfiles setup errors", async () => {
  const result = await execa("zsh", ["-lic", "echo shell-ok"], {
    reject: false,
  });

  expect(result.exitCode, result.stderr).toBe(0);
  expect(result.stdout).toContain("shell-ok");
  expect(result.stderr).not.toMatch(
    /(no such file or directory|command not found|permission denied|compinit:|plugin .* not found)/i,
  );
});

test("Vite+ CLI is installed and prints a version", async () => {
  const result = await execa("zsh", ["-lic", "vp --version"], {
    reject: false,
  });

  expect(result.exitCode, result.stderr).toBe(0);
  expect(result.stdout.trim()).toMatch(/\d+\.\d+\.\d+/);
});
