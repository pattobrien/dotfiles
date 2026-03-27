import type {
  PreToolUseHookInput,
  SyncHookJSONOutput,
  PreToolUseHookSpecificOutput,
} from "@anthropic-ai/claude-agent-sdk";
import { checkCommand, BLOCKED } from "./bash-block-lib.ts";
import { createColors } from "picocolors";
const pc = createColors(true);

const input: PreToolUseHookInput = await Bun.stdin.json();
const command = (input.tool_input as { command?: string })?.command ?? "";
if (!command) process.exit(0);

const match = checkCommand(command, BLOCKED);

if (match) {
  const output: SyncHookJSONOutput = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: pc.yellow(match),
    } satisfies PreToolUseHookSpecificOutput,
  };
  console.log(JSON.stringify(output));
}
