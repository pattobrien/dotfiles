import type {
  PreToolUseHookInput,
  SyncHookJSONOutput,
  PreToolUseHookSpecificOutput,
} from "@anthropic-ai/claude-agent-sdk";
import { createColors } from "picocolors";

import { checkCommand, BLOCKED, BLOCKED_ANYWHERE } from "./bash-block-lib.ts";
const pc = createColors(true);

const input: PreToolUseHookInput = await Bun.stdin.json();
const command = (input.tool_input as { command?: string })?.command ?? "";
if (!command) process.exit(0);

const match = checkCommand(command, BLOCKED, BLOCKED_ANYWHERE);

if (match) {
  const output: SyncHookJSONOutput = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: pc.yellow(match),
    } satisfies PreToolUseHookSpecificOutput,
  };
  process.stdout.write(JSON.stringify(output));
}
