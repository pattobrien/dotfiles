import { checkCommand, BLOCKED } from "./bash-block-lib.ts";
import { createColors } from "picocolors";
const pc = createColors(true);

const input = await Bun.stdin.json();
const command: string = input.tool_input?.command ?? "";
if (!command) process.exit(0);

const match = checkCommand(command, BLOCKED);

if (match) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: pc.yellow(match),
      },
    })
  );
}
