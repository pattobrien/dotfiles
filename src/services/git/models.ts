import { z } from "zod";

export const WorktreeSchema = z.object({
  path: z.string(),
  head: z.string(),
  branch: z.string().optional(),
  bare: z.boolean(),
});

export type Worktree = z.infer<typeof WorktreeSchema>;

export const RepoInfoSchema = z.object({
  repoRoot: z.string(),
  repoName: z.string(),
  isBare: z.boolean(),
});

export type RepoInfo = z.infer<typeof RepoInfoSchema>;
