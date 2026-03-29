# Plan: "meagain" Claude Code Marketplace Plugin

## Context

Create a standalone Claude Code marketplace called "meagain" that bundles MCP
server configurations for observability, billing, and analytics services. Prefer
OAuth where supported for seamless auth without managing API keys. Langfuse is
deferred for now.

## File Structure

```
~/.claude/plugins/marketplaces/meagain/
├── .claude-plugin/
│   └── marketplace.json
├── meagain-plugin/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   └── .mcp.json
└── README.md
```

## MCP Server Configurations

All 6 active servers use **remote HTTP transport** with OAuth or token auth. No
local stdio/pnpx needed.

| Server         | URL                             | Auth             | Read-Only                                  | Notes                                               |
| -------------- | ------------------------------- | ---------------- | ------------------------------------------ | --------------------------------------------------- |
| **neondb**     | `https://mcp.neon.tech/mcp`     | OAuth            | Uncheck "Full access" during OAuth         | Official remote endpoint                            |
| **posthog**    | `https://mcp.posthog.com/sse`   | API key (Bearer) | Use "MCP Server" API key preset            | No OAuth yet (PostHog/mcp#39)                       |
| **sentry**     | `https://mcp.sentry.dev/mcp`    | OAuth            | Omit write scopes during auth              | Official remote endpoint                            |
| **revenuecat** | `https://mcp.revenuecat.ai/mcp` | OAuth (try)      | Read-only v2 key as fallback               | Test if OAuth works with Claude Code HTTP transport |
| **stripe**     | `https://mcp.stripe.com`        | OAuth            | Configure in Stripe Dashboard MCP settings | Official remote endpoint                            |
| **vercel**     | `https://mcp.vercel.com`        | OAuth            | Read-only by default (initial launch)      | Supports team/project pinning via URL path          |

**Langfuse** — deferred (TODO). Requires base64 Basic auth, no OAuth support.

## Files to Create

### 1. `.claude-plugin/marketplace.json`

Marketplace manifest pointing to single `meagain-plugin`.

### 2. `meagain-plugin/.claude-plugin/plugin.json`

Plugin metadata: name, description, version, keywords.

### 3. `meagain-plugin/.mcp.json`

```json
{
  "neondb": {
    "type": "http",
    "url": "https://mcp.neon.tech/mcp"
  },
  "posthog": {
    "type": "http",
    "url": "https://mcp.posthog.com/sse"
  },
  "sentry": {
    "type": "http",
    "url": "https://mcp.sentry.dev/mcp"
  },
  "revenuecat": {
    "type": "http",
    "url": "https://mcp.revenuecat.ai/mcp"
  },
  "stripe": {
    "type": "http",
    "url": "https://mcp.stripe.com"
  },
  "vercel": {
    "type": "http",
    "url": "https://mcp.vercel.com"
  }
}
```

All servers rely on OAuth — no API keys or headers in the config. Claude Code
handles the OAuth flow interactively when each server is first used.

**RevenueCat fallback** — if OAuth doesn't work with Claude Code, switch to:

```json
"revenuecat": {
  "type": "http",
  "url": "https://mcp.revenuecat.ai/mcp",
  "headers": {
    "Authorization": "Bearer ${REVENUECAT_API_KEY}"
  }
}
```

### 4. `README.md`

Document:

- What each server provides
- OAuth setup instructions (first-use flow)
- RevenueCat fallback if OAuth doesn't work
- Langfuse as a TODO

## Registration

After creating files, register the marketplace:

```sh
claude mcp add-marketplace meagain --directory ~/.claude/plugins/marketplaces/meagain
```

Or add entry to `~/.claude/plugins/known_marketplaces.json` manually.

## Verification

1. Confirm files exist at `~/.claude/plugins/marketplaces/meagain/`
2. Install the plugin via Claude Code
3. Run `/mcp` in Claude Code to see all 6 servers
4. Test OAuth flow on one server (e.g. Stripe) to confirm connectivity
5. Test RevenueCat OAuth specifically — fall back to API key if needed
