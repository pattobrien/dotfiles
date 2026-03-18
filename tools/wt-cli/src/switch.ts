import { GitClient } from "git";
import { TmuxClient } from "tmux";
import { z } from "zod";

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
    const sessions = tmux.listSessions();
    const sessionByPath = new Map(sessions.map((s) => [s.path, s]));

    const withSessions: Array<{ label: string; value: string }> = [];
    const withoutSessions: Array<{ label: string; value: string }> = [];

    for (const wt of worktrees) {
      const name = worktreeName(wt);
      const session = sessionByPath.get(wt.path);

      if (session) {
        withSessions.push({ label: name, value: session.name });
      } else {
        withoutSessions.push({ label: name, value: wt.path });
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

    // If selected matches an existing session name, switch to it
    const existingSession = sessions.find((s) => s.name === selected);

    if (existingSession) {
      tmux.switchClient({ name: existingSession.name });
    } else {
      // selected is a worktree path — create new session and switch
      const worktree = worktrees.find((wt) => wt.path === selected);
      if (!worktree) {
        console.error("Error: could not resolve worktree path");
        process.exit(1);
      }
      const wtName = worktreeName(worktree);
      const sessionName = deriveSessionName(repo.repoName, wtName);
      tmux.newSession({ name: sessionName, cwd: worktree.path });
      tmux.switchClient({ name: sessionName });
    }
  });
