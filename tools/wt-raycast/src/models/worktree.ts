import { z } from "zod/v4";

import { SessionStatus } from "./session";

export type { Worktree } from "git";

export const WorktreeItemSchema = z.object({
  name: z.string(),
  path: z.string(),
  branch: z.string().optional(),
  displayBranch: z.string().optional(),
  head: z.string(),
  sessionName: z.string(),
  sessionStatus: z.enum(SessionStatus),
});

export type WorktreeItem = z.infer<typeof WorktreeItemSchema>;
