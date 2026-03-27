import { checkCommand, BLOCKED } from "./bash-block-lib.ts";

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
        permissionDecisionReason: `\x1b[33m${match}\x1b[0m`,
      },
    })
  );
}
