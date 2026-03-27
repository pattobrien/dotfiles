const input = await Bun.stdin.json();
const command: string = input.tool_input?.command ?? "";

if (/(?:^|[;&|]\s*)tsc\b/.test(command)) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          "\x1b[33muse oxlint's built-in tsgo type-check via `pnpm lint` instead of `tsc`\x1b[0m",
      },
    })
  );
}
