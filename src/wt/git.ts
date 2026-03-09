import { basename, dirname } from "path";
import simpleGit, { type SimpleGit } from "simple-git";
import { z } from "zod/v4";

const WorktreeSchema = z.object({
  path: z.string(),
  head: z.string(),
  branch: z.string().optional(),
  bare: z.boolean(),
});

export type Worktree = z.infer<typeof WorktreeSchema>;

const RepoInfoSchema = z.object({
  repoRoot: z.string(),
  repoName: z.string(),
  isBare: z.boolean(),
});

export type RepoInfo = z.infer<typeof RepoInfoSchema>;

export class GitClient {
  private git: SimpleGit;
  readonly repoRoot: string;
  readonly repoName: string;
  readonly isBare: boolean;

  private constructor(info: RepoInfo) {
    const validated = RepoInfoSchema.parse(info);
    this.repoRoot = validated.repoRoot;
    this.repoName = validated.repoName;
    this.isBare = validated.isBare;
    this.git = simpleGit(this.repoRoot);
  }

  static async create(): Promise<GitClient> {
    const git = simpleGit();

    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      console.error("Error: not in a git repository");
      process.exit(1);
    }

    const commonDir = (await git.revparse(["--git-common-dir"])).trim();
    const isBare = commonDir.endsWith("/.bare");

    let repoRoot: string;
    if (isBare) {
      repoRoot = dirname(commonDir);
    } else {
      repoRoot = (await git.revparse(["--show-toplevel"])).trim();
    }

    const repoName = basename(repoRoot).replace(/-bare$/, "");

    return new GitClient({ repoRoot, repoName, isBare });
  }

  async listWorktrees(): Promise<Worktree[]> {
    const output = await this.git.raw(["worktree", "list", "--porcelain"]);

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
        worktrees.push(
          WorktreeSchema.parse({
            ...current,
            head: current.head ?? "",
            bare: current.bare ?? false,
          }),
        );
        current = {};
      }
    }

    return worktrees;
  }

  async addWorktree(path: string, branch: string): Promise<void> {
    await this.git.raw(["worktree", "add", path, branch]);
  }

  async removeWorktree(name: string): Promise<void> {
    await this.git.raw(["worktree", "remove", name]);
  }

  async createBranch(name: string, baseRef: string): Promise<void> {
    await this.git.branch([name, baseRef]);
  }

  async deleteBranch(name: string, force = false): Promise<void> {
    await this.git.deleteLocalBranch(name, force);
  }

  async hasLocalBranch(name: string): Promise<boolean> {
    const branches = await this.git.branchLocal();
    return branches.all.includes(name);
  }
}
