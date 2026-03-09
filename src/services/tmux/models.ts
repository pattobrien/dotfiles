import { z } from "zod/v4";

export const SessionSchema = z.object({
  name: z.string(),
  attached: z.boolean(),
});

export type TmuxSession = z.infer<typeof SessionSchema>;
