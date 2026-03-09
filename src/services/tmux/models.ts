import { z } from "zod/v4";

export const SessionStatus = {
  Active: "active",
  Detached: "detached",
  None: "none",
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const SessionSchema = z.object({
  name: z.string(),
  attached: z.boolean(),
});

export type TmuxSession = z.infer<typeof SessionSchema>;
