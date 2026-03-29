import { execFileSync } from "node:child_process";
import { basename, dirname } from "node:path";

import { type Worktree, getProjects } from "git";
import pc from "picocolors";
import { SessionStatus, TmuxClient } from "tmux";
import { z } from "zod";

import {
  deriveSessionName,
  fzfSelect,
  runWorktreeSetup,
  worktreeName,
} from "./lib";
import { t } from "./trpc";

const listOutput = z.void();

function getGitRepoRoot(sessionPath: string): string | null {
  try {
    const commonDir = execFileSync(
      "git",
      ["-C", sessionPath, "rev-parse", "--git-common-dir"],
      { encoding: "utf-8", timeout: 5_000 },
    ).trim();

    if (commonDir.endsWith("/.bare")) {
      return dirname(commonDir);
    }

    return execFileSync(
      "git",
      ["-C", sessionPath, "rev-parse", "--show-toplevel"],
      { encoding: "utf-8", timeout: 5_000 },
    ).trim();
  } catch {
    return null;
  }
}

const projectsList = t.procedure
  .meta({
    description: "List projects from active tmux sessions",
    aliases: { command: ["ls"] },
  })
  .output(listOutput)
  .query(() => {
    const tmux = new TmuxClient();
    const sessions = tmux.listSessions();

    if (sessions.length === 0) {
      console.log("No tmux sessions found.");
      return;
    }

    const rows = sessions.map((s) => {
      const repoRoot = getGitRepoRoot(s.path);
      return {
        session: s.name,
        repo: repoRoot ? basename(repoRoot) : "-",
        status: s.attached ? "active" : "detached",
        path: s.path,
      };
    });

    const sessionWidth = Math.max(...rows.map((r) => r.session.length), 7);
    const repoWidth = Math.max(...rows.map((r) => r.repo.length), 4);
    const statusWidth = 8;

    console.log(
      `${"SESSION".padEnd(sessionWidth)}  ${"REPO".padEnd(repoWidth)}  ${"STATUS".padEnd(statusWidth)}  PATH`,
    );
    console.log(
      `${"─".repeat(sessionWidth)}  ${"─".repeat(repoWidth)}  ${"─".repeat(statusWidth)}  ${"─".repeat(30)}`,
    );

    for (const r of rows) {
      const statusColored =
        r.status === "active"
          ? pc.green(r.status.padEnd(statusWidth))
          : pc.yellow(r.status.padEnd(statusWidth));
      const repoColored =
        r.repo === "-"
          ? pc.dim(r.repo.padEnd(repoWidth))
          : r.repo.padEnd(repoWidth);

      console.log(
        `${r.session.padEnd(sessionWidth)}  ${repoColored}  ${statusColored}  ${pc.dim(r.path)}`,
      );
    }
  });

/** List worktrees for a repo directory using git directly (no process.exit). */
function listWorktreesRaw(repoDir: string): Worktree[] {
  try {
    const output = execFileSync(
      "git",
      ["-C", repoDir, "worktree", "list", "--porcelain"],
      {
        encoding: "utf-8",
        timeout: 5_000,
      },
    );

    const worktrees: Worktree[] = [];
    let current: Record<string, string | boolean> = {};

    for (const line of output.split("\n")) {
      if (line.startsWith("worktree ")) {
        current = { path: line.slice("worktree ".length) };
      } else if (line.startsWith("HEAD ")) {
        current.head = line.slice("HEAD ".length);
      } else if (line.startsWith("branch ")) {
        current.branch = line.slice("branch ".length);
      } else if (line === "bare") {
        current.bare = true;
      } else if (line === "" && current.path) {
        worktrees.push({
          path: current.path as string,
          head: (current.head as string) ?? "",
          branch: current.branch as string | undefined,
          bare: (current.bare as boolean) ?? false,
        });
        current = {};
      }
    }

    return worktrees;
  } catch {
    return [];
  }
}

/** Derive repo name from a project directory (strip -bare suffix). */
function repoNameFromDir(repoDir: string): string {
  return basename(repoDir).replace(/-bare$/, "");
}

const projectsSwitch = t.procedure
  .meta({
    description: "Switch to a worktree session across all projects",
    aliases: { command: ["sw"] },
  })
  .output(z.void())
  .mutation(async () => {
    if (!process.env.TMUX) {
      console.error("Error: not inside a tmux session (use wt attach instead)");
      process.exit(1);
    }

    const tmux = new TmuxClient();
    const allProjects = getProjects({ refresh: true });
    const sessions = tmux.listSessions();
    const sessionByPath = new Map(sessions.map((s) => [s.path, s]));

    const withSessions: Array<{
      label: string;
      value: string;
      lastActivity: number;
    }> = [];
    const withoutSessions: Array<{ label: string; value: string }> = [];

    for (const project of allProjects) {
      const worktrees = listWorktreesRaw(project.repoDir);

      for (const wt of worktrees) {
        const wtName = worktreeName(wt);
        const session = sessionByPath.get(wt.path);
        const label = `${project.repoName}/${wtName}`;

        if (session) {
          const status = session.attached
            ? SessionStatus.Active
            : SessionStatus.Detached;
          const statusColored =
            status === SessionStatus.Active
              ? pc.green(status)
              : pc.yellow(status);
          withSessions.push({
            label: `${label}  ${statusColored}`,
            value: `${project.repoDir}\t${wt.path}`,
            lastActivity: session.lastActivity,
          });
        } else {
          withoutSessions.push({
            label: `${label}  ${pc.dim("none")}`,
            value: `${project.repoDir}\t${wt.path}`,
          });
        }
      }
    }

    withSessions.sort((a, b) => b.lastActivity - a.lastActivity);

    const items = [...withSessions, ...withoutSessions];

    if (items.length === 0) {
      console.error("No worktrees found across any projects");
      process.exit(1);
    }

    const header = `${pc.bold("PROJECT/WORKTREE")}  ${pc.bold("STATUS")}`;
    const selected = await fzfSelect(items, "Switch to: ", header);
    if (!selected) process.exit(0);

    const [repoDir, wtPath] = selected.split("\t");

    const existingSession = sessions.find((s) => s.path === wtPath);
    if (existingSession) {
      tmux.switchClient({ name: existingSession.name });
    } else {
      const repoName = repoNameFromDir(repoDir);
      const worktrees = listWorktreesRaw(repoDir);
      const worktree = worktrees.find((wt) => wt.path === wtPath);
      if (!worktree) {
        console.error("Error: could not resolve worktree path");
        process.exit(1);
      }
      const wtName = worktreeName(worktree);
      const sessionName = deriveSessionName(repoName, wtName);
      tmux.newSession({ name: sessionName, cwd: worktree.path });
      await runWorktreeSetup(tmux, sessionName, worktree.path);
      tmux.switchClient({ name: sessionName });
    }
  });

export const projects = t.router({
  list: projectsList,
  switch: projectsSwitch,
});
