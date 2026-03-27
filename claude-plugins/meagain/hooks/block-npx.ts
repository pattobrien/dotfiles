const input = await Bun.stdin.json();
const command: string = input.tool_input?.command ?? "";

if (/(?:^|[;&|]\s*)npx\b/.test(command)) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "\x1b[33muse `pnpx` instead of `npx`\x1b[0m",
      },
    })
  );
}
