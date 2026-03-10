import pc from "picocolors";
import { z } from "zod";

import { GitClient } from "../services/git/sdk";
import { SessionStatus } from "../services/tmux/models";
import { TmuxClient } from "../services/tmux/sdk";

import { deriveSessionName, worktreeName } from "./lib";
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
    const sessionMap = new Map(
      sessions.map((s) => [
        s.name,
        s.attached ? SessionStatus.Active : SessionStatus.Detached,
      ]),
    );

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
      const sessionName = deriveSessionName(repo.repoName, name);
      const status = sessionMap.get(sessionName) ?? SessionStatus.None;
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
