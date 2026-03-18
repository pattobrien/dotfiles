import { GitClient } from "git";
import pc from "picocolors";
import { SessionStatus } from "tmux";
import { TmuxClient } from "tmux";
import { z } from "zod";

import { deriveSessionName, fzfSelect, runWorktreeSetup, worktreeName } from "./lib";
import { t } from "./trpc";

const listInput = z.object({
  pick: z
    .boolean()
    .optional()
    .default(false)
    .describe("Interactive fzf picker — select a worktree to attach"),
});

const listOutput = z.void();

export const list = t.procedure
  .meta({
    description: "List worktrees and their sessions",
    aliases: { command: ["ls"] },
  })
  .input(listInput)
  .output(listOutput)
  .query(async ({ input }) => {
    const repo = await GitClient.create();
    const tmux = new TmuxClient();
    const worktrees = await repo.listWorktrees();
    const sessions = tmux.listSessions();

    const sessionByPath = new Map(sessions.map((s) => [s.path, s]));

    const names = worktrees.map(worktreeName);
    const nameWidth = Math.max(...names.map((n) => n.length), 4);
    const statusWidth = 10;
    const repoWidth = Math.max(repo.repoName.length, 4);

    if (input.pick) {
      const items: Array<{ label: string; value: string }> = [];

      for (const wt of worktrees) {
        const name = worktreeName(wt);
        const session = sessionByPath.get(wt.path);
        const status = session
          ? session.attached
            ? SessionStatus.Active
            : SessionStatus.Detached
          : SessionStatus.None;
        const statusPadded = status.padEnd(statusWidth);
        const statusColored =
          status === SessionStatus.Active
            ? pc.green(statusPadded)
            : status === SessionStatus.Detached
              ? pc.yellow(statusPadded)
              : pc.dim(statusPadded);

        const label = `${repo.repoName.padEnd(repoWidth)}  ${name.padEnd(nameWidth)}  ${statusColored}  ${wt.path}`;
        items.push({ label, value: wt.path });
      }

      const header = `${pc.bold("REPO".padEnd(repoWidth))}  ${pc.bold("WORKTREE".padEnd(nameWidth))}  ${pc.bold("SESSION".padEnd(statusWidth))}  ${pc.bold("PATH")}`;
      const selected = await fzfSelect(items, "Select worktree: ", header);

      if (!selected) process.exit(0);

      const worktree = worktrees.find((wt) => wt.path === selected);
      if (!worktree) {
        console.error("Error: could not resolve worktree");
        process.exit(1);
      }

      const existing = tmux.getSessionByPath(worktree.path);
      if (existing) {
        tmux.switchOrAttach({ name: existing.name });
      } else {
        const wtName = worktreeName(worktree);
        const sessionName = deriveSessionName(repo.repoName, wtName);
        tmux.newSession({ name: sessionName, cwd: worktree.path });
        await runWorktreeSetup(tmux, sessionName, worktree.path);
        tmux.switchOrAttach({ name: sessionName });
      }
      return;
    }

    // Default: plain table output
    console.log(
      `${"REPO".padEnd(repoWidth)}  ${"WORKTREE".padEnd(nameWidth)}  ${"SESSION".padEnd(statusWidth)}  PATH`,
    );
    console.log(
      `${"─".repeat(repoWidth)}  ${"─".repeat(nameWidth)}  ${"─".repeat(statusWidth)}  ${"─".repeat(30)}`,
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

      console.log(`${repo.repoName.padEnd(repoWidth)}  ${name.padEnd(nameWidth)}  ${colored}  ${wt.path}`);
    }
  });
