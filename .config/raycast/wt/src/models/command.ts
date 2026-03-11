import { z } from "zod/v4";

export const CommandArgsSchema = z.object({
  cwd: z.string().optional(),
});
export type CommandArgs = z.infer<typeof CommandArgsSchema>;
