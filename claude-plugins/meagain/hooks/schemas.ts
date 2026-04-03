import { z } from "zod";

// ─── Base ───────────────────────────────────────────────────────
export const BaseHookInputSchema = z.object({
  session_id: z.string(),
  transcript_path: z.string(),
  cwd: z.string(),
  permission_mode: z.string().optional(),
  agent_id: z.string().optional(),
  agent_type: z.string().optional(),
});

// ─── PreToolUse ─────────────────────────────────────────────────
export const PreToolUseHookInputSchema = BaseHookInputSchema.extend({
  hook_event_name: z.literal("PreToolUse"),
  tool_name: z.string(),
  tool_input: z.unknown(),
  tool_use_id: z.string(),
});

export const BashToolInputSchema = z.object({
  command: z.string().default(""),
});

// ─── Stop ───────────────────────────────────────────────────────
export const StopHookInputSchema = BaseHookInputSchema.extend({
  hook_event_name: z.literal("Stop"),
  stop_hook_active: z.boolean(),
  last_assistant_message: z.string().optional(),
});
