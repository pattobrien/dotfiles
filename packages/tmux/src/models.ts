import { z } from "zod/v4";

export const SessionStatus = {
  Active: "active",
  Detached: "detached",
  None: "none",
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const SessionSchema = z.object({
  name: z.string(),
  path: z.string(),
  attached: z.boolean(),
  lastActivity: z.number(),
});

export type TmuxSession = z.infer<typeof SessionSchema>;

export const WindowSchema = z.object({
  sessionName: z.string(),
  windowIndex: z.string(),
  windowName: z.string(),
  paneCurrentCommand: z.string(),
  panePid: z.number(),
});

export type TmuxWindow = z.infer<typeof WindowSchema>;
