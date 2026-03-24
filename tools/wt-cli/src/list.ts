import { GitClient } from "git";
import pc from "picocolors";
import { SessionStatus } from "tmux";
import { TmuxClient } from "tmux";
import { z } from "zod";

import { deriveSessionName, fetchPrsByBranch, fzfSelect, runWorktreeSetup, worktreeName, type PrInfo } from "./lib";
import { t } from "./trpc";

function branchShortName(wt: { branch?: string }): string | undefined {
  return wt.branch?.replace(/^refs\/heads\//, "");
}

function formatPr(pr: PrInfo | undefined): string {
  if (!pr) return pc.dim("–".padEnd(12));
  const num = `#${pr.number}`;
  switch (pr.state) {
    case "OPEN":
      return pc.green(`${num} open`.padEnd(12));
    case "MERGED":
      return pc.magenta(`${num} merged`.padEnd(12));
    case "CLOSED":
      return pc.red(`${num} closed`.padEnd(12));
  }
}

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
    const [worktrees, prsByBranch] = await Promise.all([
      repo.listWorktrees(),
      fetchPrsByBranch(repo.repoRoot),
    ]);
    const sessions = tmux.listSessions();

    const sessionByPath = new Map(sessions.map((s) => [s.path, s]));

    const names = worktrees.map(worktreeName);
    const nameWidth = Math.max(...names.map((n) => n.length), 4);
    const statusWidth = 10;
    const prWidth = 12;
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

        const branch = branchShortName(wt);
        const pr = branch ? prsByBranch.get(branch) : undefined;
        const prCell = formatPr(pr);

        const label = `${repo.repoName.padEnd(repoWidth)}  ${name.padEnd(nameWidth)}  ${statusColored}  ${prCell}  ${wt.path}`;
        items.push({ label, value: wt.path });
      }

      const header = `${pc.bold("REPO".padEnd(repoWidth))}  ${pc.bold("WORKTREE".padEnd(nameWidth))}  ${pc.bold("SESSION".padEnd(statusWidth))}  ${pc.bold("PR".padEnd(prWidth))}  ${pc.bold("PATH")}`;
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
      `${"REPO".padEnd(repoWidth)}  ${"WORKTREE".padEnd(nameWidth)}  ${"SESSION".padEnd(statusWidth)}  ${"PR".padEnd(prWidth)}  PATH`,
    );
    console.log(
      `${"─".repeat(repoWidth)}  ${"─".repeat(nameWidth)}  ${"─".repeat(statusWidth)}  ${"─".repeat(prWidth)}  ${"─".repeat(30)}`,
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

      const branch = branchShortName(wt);
      const pr = branch ? prsByBranch.get(branch) : undefined;
      const prCell = formatPr(pr);

      console.log(`${repo.repoName.padEnd(repoWidth)}  ${name.padEnd(nameWidth)}  ${colored}  ${prCell}  ${wt.path}`);
    }
  });
