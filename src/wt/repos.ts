import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { homedir } from "node:os";

import { z } from "zod";

import { t } from "./trpc";

const DEV_DIR = join(homedir(), "dev");

const RepoSchema = z.object({
  rootDir: z.string(),
  repoName: z.string(),
});

type Repo = z.infer<typeof RepoSchema>;

async function findBareRepos(baseDir: string, maxDepth = 2): Promise<Repo[]> {
  const repos: Repo[] = [];

  function scan(dir: string, depth: number) {
    if (depth > maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    if (entries.includes(".bare")) {
      const repoName = basename(dir).replace(/-bare$/, "");
      // Find a worktree checkout to use as a valid git cwd.
      // Worktrees can be siblings to .bare or inside .worktrees/
      const searchDirs = [dir];
      if (entries.includes(".worktrees")) {
        searchDirs.push(join(dir, ".worktrees"));
      }
      for (const searchDir of searchDirs) {
        try {
          const candidates = readdirSync(searchDir);
          const found = candidates.find(
            (e) =>
              !e.startsWith(".") &&
              statSync(join(searchDir, e)).isDirectory() &&
              existsSync(join(searchDir, e, ".git")),
          );
          if (found) {
            repos.push({ rootDir: join(searchDir, found), repoName });
            break;
          }
        } catch {
          // skip
        }
      }
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith(".")) continue;
      const fullPath = join(dir, entry);
      try {
        if (statSync(fullPath).isDirectory()) {
          scan(fullPath, depth + 1);
        }
      } catch {
        // skip inaccessible dirs
      }
    }
  }

  scan(baseDir, 0);

  // Prefer the -bare variant when duplicate repo names exist (e.g. meagain vs meagain-bare)
  const byName = new Map<string, Repo[]>();
  for (const repo of repos) {
    const list = byName.get(repo.repoName) ?? [];
    list.push(repo);
    byName.set(repo.repoName, list);
  }
  const deduped: Repo[] = [];
  for (const [, list] of byName) {
    if (list.length === 1) {
      deduped.push(list[0]);
    } else {
      const bare = list.find((r) => r.rootDir.includes("-bare"));
      deduped.push(bare ?? list[0]);
    }
  }
  return deduped;
}

const reposList = t.procedure
  .meta({ description: "List all repos in ~/dev" })
  .output(z.void())
  .query(async () => {
    const repos = await findBareRepos(DEV_DIR);
    console.log(JSON.stringify(repos));
  });

export const repos = t.router({
  list: reposList,
});
