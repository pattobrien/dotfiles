import { z } from "zod/v4";

export const SessionStatus = {
  Active: "active",
  Detached: "detached",
  None: "none",
} as const;

export const SessionStatusEnum = z.enum(SessionStatus);

export type SessionStatus = z.infer<typeof SessionStatusEnum>;

export const TmuxSessionSchema = z.object({
  name: z.string(),
  attached: z.boolean(),
});
