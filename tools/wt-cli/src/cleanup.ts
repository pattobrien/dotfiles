import { GitClient } from "git";
import pc from "picocolors";
import { SessionStatus, TmuxClient } from "tmux";
import { z } from "zod";

import { fzfMultiSelect, worktreeName } from "./lib";
import { t } from "./trpc";

export const cleanup = t.procedure
  .meta({
    description: "Remove multiple worktrees and their sessions",
  })
  .output(z.void())
  .mutation(async () => {
    const repo = await GitClient.create();
    const tmux = new TmuxClient();
    const worktrees = await repo.listWorktrees();
    const sessions = tmux.listSessions();
    const sessionByPath = new Map(sessions.map((s) => [s.path, s]));

    const nameWidth = Math.max(
      ...worktrees.map((wt) => worktreeName(wt).length),
      4,
    );
    const statusWidth = 10;

    const items = worktrees
      .filter((wt) => !wt.bare) // skip the bare root
      .map((wt) => {
        const name = worktreeName(wt);
        const session = sessionByPath.get(wt.path);
        const status = session
          ? session.attached
            ? SessionStatus.Active
            : SessionStatus.Detached
          : SessionStatus.None;
        const statusColored =
          status === SessionStatus.Active
            ? pc.green(status.padEnd(statusWidth))
            : status === SessionStatus.Detached
              ? pc.yellow(status.padEnd(statusWidth))
              : pc.dim(status.padEnd(statusWidth));

        const label = `${name.padEnd(nameWidth)}  ${statusColored}  ${pc.dim(wt.path)}`;
        return { label, value: wt.path };
      });

    if (items.length === 0) {
      console.log("No worktrees to clean up.");
      return;
    }

    const header = `${pc.bold("WORKTREE".padEnd(nameWidth))}  ${pc.bold("SESSION".padEnd(statusWidth))}  ${pc.bold("PATH")}`;
    const selected = await fzfMultiSelect(
      items,
      "Select worktrees to remove: ",
      header,
    );

    if (selected.length === 0) return;

    for (const wtPath of selected) {
      const worktree = worktrees.find((wt) => wt.path === wtPath);
      if (!worktree) continue;

      const wtName = worktreeName(worktree);

      const session = sessionByPath.get(worktree.path);
      if (session) {
        tmux.killSession({ name: session.name });
        console.log(`Killed session: ${session.name}`);
      }

      await repo.removeWorktree({ path: worktree.path });
      console.log(`Removed worktree: ${wtName}`);

      if (worktree.branch) {
        const branchName = worktree.branch.replace(/^refs\/heads\//, "");
        await repo.deleteBranch({ name: branchName, force: true });
        console.log(`Deleted branch: ${branchName}`);
      }
    }
  });
