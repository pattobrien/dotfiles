import { z } from "zod";

export const SessionStatusEnum = z.enum(["active", "detached", "none"]);
export type SessionStatus = z.infer<typeof SessionStatusEnum>;

export const WorktreeSchema = z.object({
  path: z.string(),
  head: z.string(),
  branch: z.string().optional(),
  bare: z.boolean(),
});
export type Worktree = z.infer<typeof WorktreeSchema>;

export const TmuxSessionSchema = z.object({
  name: z.string(),
  attached: z.boolean(),
});
export type TmuxSession = z.infer<typeof TmuxSessionSchema>;

export const WorktreeItemSchema = z.object({
  name: z.string(),
  path: z.string(),
  branch: z.string().optional(),
  head: z.string(),
  sessionStatus: SessionStatusEnum,
});
export type WorktreeItem = z.infer<typeof WorktreeItemSchema>;

export const CommandArgsSchema = z.object({
  cwd: z.string().optional(),
});
export type CommandArgs = z.infer<typeof CommandArgsSchema>;
