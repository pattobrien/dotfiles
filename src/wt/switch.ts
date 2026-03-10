import { z } from "zod";

import { GitClient } from "../services/git/sdk";
import { TmuxClient } from "../services/tmux/sdk";

import { deriveSessionName, fzfSelect, worktreeName } from "./lib";
import { t } from "./trpc";

const switchOutput = z.void();

export const switchWorktree = t.procedure
  .meta({
    description: "Switch to another worktree session",
    aliases: { command: ["sw"] },
  })
  .output(switchOutput)
  .mutation(async () => {
    if (!process.env.TMUX) {
      console.error("Error: not inside a tmux session (use wt attach instead)");
      process.exit(1);
    }

    const repo = await GitClient.create();
    const tmux = new TmuxClient();
    const worktrees = await repo.listWorktrees();

    const withSessions: Array<{ label: string; value: string }> = [];
    const withoutSessions: Array<{ label: string; value: string }> = [];

    for (const wt of worktrees) {
      const name = worktreeName(wt);
      const sessionName = deriveSessionName(repo.repoName, name);
      const item = { label: name, value: sessionName };

      if (tmux.hasSession({ name: sessionName })) {
        withSessions.push(item);
      } else {
        withoutSessions.push(item);
      }
    }

    const items = [
      ...withSessions,
      ...withoutSessions.map((item) => ({
        label: `${item.label} (no session)`,
        value: item.value,
      })),
    ];

    if (items.length === 0) {
      console.error("No worktrees found");
      process.exit(1);
    }

    const selected = await fzfSelect(items, "Switch to: ");
    if (!selected) process.exit(0);

    const sessionName = selected;

    if (!tmux.hasSession({ name: sessionName })) {
      const worktree = worktrees.find(
        (wt) =>
          deriveSessionName(repo.repoName, worktreeName(wt)) === sessionName,
      );
      if (!worktree) {
        console.error("Error: could not resolve worktree path");
        process.exit(1);
      }
      tmux.newSession({ name: sessionName, cwd: worktree.path });
    }

    tmux.switchClient({ name: sessionName });
  });
