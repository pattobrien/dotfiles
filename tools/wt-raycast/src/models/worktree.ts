import { z } from "zod/v4";

import { SessionStatusEnum } from "./session";

export const WorktreeSchema = z.object({
  path: z.string(),
  head: z.string(),
  branch: z.string().optional(),
  bare: z.boolean(),
});

export type Worktree = z.infer<typeof WorktreeSchema>;

export const WorktreeItemSchema = z.object({
  name: z.string(),
  path: z.string(),
  branch: z.string().optional(),
  displayBranch: z.string().optional(),
  head: z.string(),
  sessionName: z.string(),
  sessionStatus: SessionStatusEnum,
});

export type WorktreeItem = z.infer<typeof WorktreeItemSchema>;
