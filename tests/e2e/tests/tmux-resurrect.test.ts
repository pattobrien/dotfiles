import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { execa } from "execa";
import { expect, test } from "vitest";

const DOTFILES_TMUX_CONF = path.resolve(import.meta.dirname, "../../../.config/tmux/.tmux.conf");
const RESURRECT_SAVE_SCRIPT = path.join(
  os.homedir(),
  ".tmux/plugins/tmux-resurrect/scripts/save.sh",
);
const RESURRECT_RESTORE_SCRIPT = path.join(
  os.homedir(),
  ".tmux/plugins/tmux-resurrect/scripts/restore.sh",
);

async function tmux(socket: string, args: string[]) {
  return execa("tmux", ["-L", socket, ...args]);
}

async function waitForFile(file: string, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fs.access(file);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Timed out waiting for ${file}`);
}

async function writeTmuxConfigWrapper(file: string, resurrectDir: string) {
  await fs.writeFile(
    file,
    [
      `set-option -g @resurrect-dir "${resurrectDir}"`,
      `source-file "${DOTFILES_TMUX_CONF}"`,
      "",
    ].join("\n"),
  );
}

test(
  "tmux-resurrect restores a scoped session and window",
  { tags: ["setup-validation"] },
  async () => {
    const socket = `e2e-resurrect-${process.pid}`;
    const session = "e2e-resurrect";
    const restoredWindow = "restored-window";
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tmux-resurrect-e2e-"));
    const tmuxConf = path.join(tempDir, "tmux.conf");
    const resurrectDir = path.join(tempDir, "resurrect");

    try {
      await fs.access(DOTFILES_TMUX_CONF);
      await fs.access(RESURRECT_SAVE_SCRIPT);
      await fs.access(RESURRECT_RESTORE_SCRIPT);
      await writeTmuxConfigWrapper(tmuxConf, resurrectDir);

      await tmux(socket, ["-f", tmuxConf, "new-session", "-d", "-s", session, "-n", "initial"]);
      await tmux(socket, ["new-window", "-t", session, "-n", restoredWindow]);

      await tmux(socket, ["run-shell", `${RESURRECT_SAVE_SCRIPT} quiet`]);
      const lastSave = path.join(resurrectDir, "last");
      await waitForFile(lastSave);

      const savedLayout = await fs.readFile(lastSave, "utf8");
      expect(savedLayout).toContain(`window\t${session}\t2\t:${restoredWindow}`);

      await tmux(socket, ["kill-server"]);
      await tmux(socket, ["-f", tmuxConf, "new-session", "-d", "-s", "blank", "-n", "blank"]);
      await tmux(socket, ["run-shell", `${RESURRECT_RESTORE_SCRIPT}`]);

      const { stdout: sessions } = await tmux(socket, ["list-sessions", "-F", "#{session_name}"]);
      expect(sessions.split("\n")).toContain(session);

      const { stdout: windows } = await tmux(socket, [
        "list-windows",
        "-t",
        session,
        "-F",
        "#{window_name}",
      ]);
      expect(windows.split("\n")).toContain(restoredWindow);
    } finally {
      await tmux(socket, ["kill-server"]).catch(() => {});
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  },
);
