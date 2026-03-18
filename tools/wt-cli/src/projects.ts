import { execFileSync } from "node:child_process";
import { basename, dirname } from "node:path";

import pc from "picocolors";
import { TmuxClient } from "tmux";
import { z } from "zod";

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

export const projects = t.router({
  list: projectsList,
});
