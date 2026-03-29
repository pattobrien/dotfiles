# Plan: PreToolUse Bash Hooks for Meagain Plugin

## Context

The user wants to add PreToolUse hooks to the meagain plugin that block common
mistakes:

1. Using `npx` instead of `pnpx`
2. Using `tsc` instead of the project's lint toolchain (`pnpm lint`)

These hooks live inside the meagain plugin at `claude-plugins/meagain/hooks/`
and use the structured JSON output format to deny tool calls with helpful
reasons.

## Implementation

### 1. Create hook scripts directory

Create `claude-plugins/meagain/hooks/` with two Bun scripts:

**`hooks/block-npx.ts`**

- Read stdin JSON, extract `tool_input.command`
- Check if command starts with or contains `npx `
- If matched: output JSON with `permissionDecision: "deny"` and reason "use
  `pnpx` instead"
- Otherwise: exit 0

**`hooks/block-tsc.ts`**

- Read stdin JSON, extract `tool_input.command`
- Check if command starts with or contains `tsc`
- If matched: output JSON with `permissionDecision: "deny"` and reason "use
  oxlint's built-in tsgo type-check via `pnpm lint` instead"
- Otherwise: exit 0

### 2. Create hooks config

**`hooks/hooks.json`**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/block-npx.ts\""
          },
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/block-tsc.ts\""
          }
        ]
      }
    ]
  }
}
```

### Files to create

- `claude-plugins/meagain/hooks/hooks.json`
- `claude-plugins/meagain/hooks/block-npx.ts`
- `claude-plugins/meagain/hooks/block-tsc.ts`

### Verification

- Run
  `echo '{"tool_input":{"command":"npx foo"}}' | bun claude-plugins/meagain/hooks/block-npx.ts`
  — should output deny JSON
- Run
  `echo '{"tool_input":{"command":"pnpx foo"}}' | bun claude-plugins/meagain/hooks/block-npx.ts`
  — should exit 0 silently
- Run
  `echo '{"tool_input":{"command":"tsc --noEmit"}}' | bun claude-plugins/meagain/hooks/block-tsc.ts`
  — should output deny JSON
- Run
  `echo '{"tool_input":{"command":"pnpm lint"}}' | bun claude-plugins/meagain/hooks/block-tsc.ts`
  — should exit 0 silently
