import { basename, dirname, join } from "node:path";

import simpleGit, { type SimpleGit } from "simple-git";

import {
  RepoInfoSchema,
  WorktreeSchema,
  type RepoInfo,
  type Worktree,
} from "./models";

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

  get worktreeDir(): string {
    return join(this.repoRoot, ".worktrees");
  }

  static async create(opts: { cwd?: string; binary?: string } = {}): Promise<GitClient> {
    const git = simpleGit(undefined, {
      baseDir: opts.cwd,
      binary: opts.binary,
    });

    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      console.error("Error: not in a git repository");
      process.exit(1);
    }

    const commonDir = (await git.revparse(["--git-common-dir"])).trim();
    const isBare = commonDir.endsWith("/.bare");

    let repoRoot: string;
    if (isBare) {
      // bare repo layout: commonDir = /path/to/repo/.bare
      repoRoot = dirname(commonDir);
    } else {
      // standard layout: commonDir = /path/to/repo/.git (even from worktrees)
      repoRoot = dirname(commonDir);
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

  async addWorktree(opts: { path: string; branch: string }): Promise<void> {
    await this.git.raw(["worktree", "add", opts.path, opts.branch]);
  }

  async removeWorktree(opts: { path: string }): Promise<void> {
    await this.git.raw(["worktree", "remove", opts.path]);
  }

  async createBranch(opts: { name: string; baseRef: string }): Promise<void> {
    await this.git.branch([opts.name, opts.baseRef]);
  }

  async deleteBranch(opts: { name: string; force?: boolean }): Promise<void> {
    await this.git.deleteLocalBranch(opts.name, opts.force ?? false);
  }

  async hasLocalBranch(opts: { name: string }): Promise<boolean> {
    const branches = await this.git.branchLocal();
    return branches.all.includes(opts.name);
  }
}
