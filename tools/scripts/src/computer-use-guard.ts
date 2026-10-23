#!/usr/bin/env bun

type Hook = { tool_name: string; tool_input?: { command?: string } };

const RULE =
  "Computer use on Patt's desktop is off: no activating apps, no creating or focusing windows, no clicks, keystrokes, or workspace switches. Use a CLI, config file, defaults, AppleScript without activate, CDP, or `open -g -a` plus `omniwmctl window move-to-workspace <id> 5` after starting omni-guard. If only a native click works, stop and hand the step back to Patt. See memory no-computer-use-on-patts-desktop.";

const deniedTools = /^mcp__(computer-use|remote-devices|claude-in-chrome)__/;

const peekabooReadOnly = new Set([
  "list",
  "permissions",
  "learn",
  "tools",
  "screen",
  "verify",
  "capture",
  "clipboard",
  "config",
  "help",
  "completions",
  "clean",
  "bridge",
  "daemon",
  "--version",
  "-V",
  "--help",
  "-h",
]);
const peekabooReadOnlyPairs = new Set([
  "window list",
  "app list",
  "menubar list",
  "space list",
]);

const omniwmReadOnly = new Set([
  "query",
  "subscribe",
  "watch",
  "ping",
  "version",
  "help",
  "completion",
]);
const omniwmSafePairs = new Set([
  "window move-to-workspace",
  "workspace rename",
]);

type Segment = { raw: string; tokens: string[] };

function stripDataHeredocs(command: string): string {
  return command.replace(
    /^(.*)<<-?\s*['"]?(\w+)['"]?[^\n]*\n([\s\S]*?)\n\2\s*$/gm,
    (whole, head: string, _tag: string, body: string) => {
      if (/\bosascript\b/.test(head))
        return `${head} ${body.replace(/\n/g, " ")}`;
      return /\b(sh|bash|zsh)\b/.test(head) ? whole : head;
    },
  );
}

function segments(command: string): Segment[] {
  return stripDataHeredocs(command)
    .split(/\n|;|&&|\|\||\||\$\(|`/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => ({
      raw,
      tokens: raw
        .split(/\s+/)
        .filter((t) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(t)),
    }));
}

function check({ raw, tokens }: Segment): string | undefined {
  if (
    /^["']?(\/[^"']*\/)?(Google Chrome|Chromium)["']?(\s|$)/.test(raw) &&
    !/--headless/.test(raw)
  ) {
    return "Chrome launched without --headless opens a window";
  }
  const [cmd = "", ...args] = tokens;
  const bin = cmd.replace(/^.*\//, "").replace(/^['"]|['"]$/g, "");
  const joined = args.join(" ");

  if (bin === "open") {
    const background = args.some(
      (a) => /^-[a-zA-Z]*g[a-zA-Z]*$/.test(a) || a === "--background",
    );
    const help =
      args.length === 0 || args.some((a) => a === "-h" || a === "--help");
    if (!background && !help) return "`open` without -g activates the target";
  }
  if (
    bin === "osascript" &&
    /\b(activate|keystroke|key code|click|System Events|reopen)\b/i.test(joined)
  ) {
    return "osascript UI scripting activates or drives a window";
  }
  if (bin === "peekaboo") {
    const sub = args[0] ?? "";
    const pair = `${sub} ${args[1] ?? ""}`;
    if (sub === "see") {
      if (!args.includes("--window-id"))
        return "peekaboo see without --window-id focuses the target";
      return undefined;
    }
    if (!peekabooReadOnly.has(sub) && !peekabooReadOnlyPairs.has(pair))
      return `peekaboo ${sub} drives the desktop`;
  }
  if (bin === "omniwmctl") {
    const sub = args[0] ?? "";
    const pair = `${sub} ${args[1] ?? ""}`;
    if (!omniwmReadOnly.has(sub) && !omniwmSafePairs.has(pair))
      return `omniwmctl ${pair.trim()} changes focus or layout`;
  }
  if (bin === "cliclick") return "cliclick sends real input";
  if (bin === "agent-browser" && args.includes("--headed"))
    return "agent-browser --headed opens a window";
  return undefined;
}

const input = (await Bun.stdin.json()) as Hook;
let reason: string | undefined;

if (deniedTools.test(input.tool_name)) {
  reason = `${input.tool_name} is a computer-use tool`;
} else if (input.tool_name === "Bash" && input.tool_input?.command) {
  for (const segment of segments(input.tool_input.command)) {
    reason = check(segment);
    if (reason) break;
  }
}

if (reason) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `${reason}. ${RULE}`,
      },
    }),
  );
}
