import pc from "picocolors";
import { TmuxClient } from "tmux";
import { z } from "zod";

import { fzfMultiSelect } from "./lib";
import { t } from "./trpc";

const DEV_WINDOW_NAME = "pnpm:dev";
const SHELL_COMMANDS = new Set(["zsh", "bash", "fish", "sh"]);

function getDevWindows(tmux: TmuxClient) {
  const windows = tmux.listWindows();
  const sessions = tmux.listSessions();
  const sessionByName = new Map(sessions.map((s) => [s.name, s]));

  return windows
    .filter((w) => w.windowName === DEV_WINDOW_NAME)
    .map((w) => {
      const session = sessionByName.get(w.sessionName);
      const isRunning = !SHELL_COMMANDS.has(w.paneCurrentCommand);
      return { ...w, session, isRunning };
    });
}

const devList = t.procedure
  .meta({
    description: "List sessions with dev processes",
    aliases: { command: ["ls"] },
  })
  .output(z.void())
  .query(() => {
    const tmux = new TmuxClient();
    const devWindows = getDevWindows(tmux);

    if (devWindows.length === 0) {
      console.log("No sessions with dev windows found.");
      return;
    }

    const nameWidth = Math.max(...devWindows.map((w) => w.sessionName.length), 7);
    const cmdWidth = Math.max(...devWindows.map((w) => w.paneCurrentCommand.length), 7);
    const statusWidth = 10;

    console.log(
      `${"SESSION".padEnd(nameWidth)}  ${"STATUS".padEnd(statusWidth)}  ${"PROCESS".padEnd(cmdWidth)}  PATH`,
    );
    console.log(
      `${"─".repeat(nameWidth)}  ${"─".repeat(statusWidth)}  ${"─".repeat(cmdWidth)}  ${"─".repeat(30)}`,
    );

    for (const w of devWindows) {
      const status = w.isRunning ? "running" : "idle";
      const statusColored = w.isRunning
        ? pc.green(status.padEnd(statusWidth))
        : pc.dim(status.padEnd(statusWidth));
      const pathStr = w.session?.path ?? "-";

      console.log(
        `${w.sessionName.padEnd(nameWidth)}  ${statusColored}  ${w.paneCurrentCommand.padEnd(cmdWidth)}  ${pc.dim(pathStr)}`,
      );
    }
  });

const devKill = t.procedure
  .meta({
    description: "Kill dev processes in selected sessions",
  })
  .output(z.void())
  .mutation(async () => {
    const tmux = new TmuxClient();
    const devWindows = getDevWindows(tmux).filter((w) => w.isRunning);

    if (devWindows.length === 0) {
      console.log("No running dev processes found.");
      return;
    }

    const nameWidth = Math.max(...devWindows.map((w) => w.sessionName.length), 7);

    const items = devWindows.map((w) => ({
      label: `${w.sessionName.padEnd(nameWidth)}  ${pc.green(w.paneCurrentCommand)}  ${pc.dim(w.session?.path ?? "-")}`,
      value: `${w.sessionName}:${w.windowIndex}`,
    }));

    const header = `${pc.bold("SESSION".padEnd(nameWidth))}  ${pc.bold("PROCESS")}  ${pc.bold("PATH")}`;
    const selected = await fzfMultiSelect(items, "Kill dev in: ", header);

    if (selected.length === 0) return;

    for (const target of selected) {
      // Send Ctrl-C to stop the process
      tmux.sendKeys({ target, keys: ["C-c", ""] });
      const sessionName = target.split(":")[0];
      console.log(`Sent kill signal to ${sessionName}:${DEV_WINDOW_NAME}`);
    }
  });

const devStart = t.procedure
  .meta({
    description: "Start pnpm dev in the current session",
  })
  .output(z.void())
  .mutation(() => {
    if (!process.env.TMUX) {
      console.error("Error: not inside a tmux session");
      process.exit(1);
    }

    const tmux = new TmuxClient();
    const currentSession = tmux.getActiveSession();
    if (!currentSession) {
      console.error("Error: could not determine current session");
      process.exit(1);
    }

    // Check if pnpm:dev window exists
    const windows = tmux.listWindows({ target: currentSession });
    const devWindow = windows.find((w) => w.windowName === DEV_WINDOW_NAME);

    if (devWindow) {
      // Check if already running
      if (!SHELL_COMMANDS.has(devWindow.paneCurrentCommand)) {
        console.log(`Dev process already running in ${currentSession}:${DEV_WINDOW_NAME}`);
        return;
      }
      // Send pnpm dev to existing window
      tmux.sendKeys({
        target: `${currentSession}:${DEV_WINDOW_NAME}`,
        keys: ["pnpm dev", "Enter"],
      });
    } else {
      // Create the window and start dev
      const sessions = tmux.listSessions();
      const session = sessions.find((s) => s.name === currentSession);
      tmux.newWindow({ target: currentSession, name: DEV_WINDOW_NAME, cwd: session?.path });
      tmux.sendKeys({
        target: `${currentSession}:${DEV_WINDOW_NAME}`,
        keys: ["pnpm dev", "Enter"],
      });
    }

    console.log(`Started pnpm dev in ${currentSession}:${DEV_WINDOW_NAME}`);
  });

export const dev = t.router({
  list: devList,
  kill: devKill,
  start: devStart,
});
