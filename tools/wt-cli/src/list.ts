import { GitClient } from "git";
import pc from "picocolors";
import { SessionStatus } from "tmux";
import { TmuxClient } from "tmux";
import { z } from "zod";

import { worktreeName } from "./lib";
import { t } from "./trpc";

const listOutput = z.void();

export const list = t.procedure
  .meta({
    description: "List worktrees and their sessions",
    aliases: { command: ["ls"] },
  })
  .output(listOutput)
  .query(async () => {
    const repo = await GitClient.create();
    const tmux = new TmuxClient();
    const worktrees = await repo.listWorktrees();
    const sessions = tmux.listSessions();

    const sessionByPath = new Map(sessions.map((s) => [s.path, s]));

    const names = worktrees.map(worktreeName);
    const nameWidth = Math.max(...names.map((n) => n.length), 4);
    const statusWidth = 10;

    console.log(
      `${"WORKTREE".padEnd(nameWidth)}  ${"SESSION".padEnd(statusWidth)}  PATH`,
    );
    console.log(
      `${"─".repeat(nameWidth)}  ${"─".repeat(statusWidth)}  ${"─".repeat(30)}`,
    );

    for (const wt of worktrees) {
      const name = worktreeName(wt);
      const session = sessionByPath.get(wt.path);
      const status = session
        ? session.attached
          ? SessionStatus.Active
          : SessionStatus.Detached
        : SessionStatus.None;
      const padded = status.padEnd(statusWidth);
      const colored =
        status === SessionStatus.Active
          ? pc.green(padded)
          : status === SessionStatus.Detached
            ? pc.yellow(padded)
            : pc.dim(padded);

      console.log(`${name.padEnd(nameWidth)}  ${colored}  ${wt.path}`);
    }
  });
