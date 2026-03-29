# meagain

Observability, billing, and analytics MCP servers for Claude Code.

## Servers

| Server         | Endpoint                        | Auth             | Scope Pinning                 |
| -------------- | ------------------------------- | ---------------- | ----------------------------- |
| **NeonDB**     | `https://mcp.neon.tech/mcp`     | OAuth            | `X-Neon-Project-Id` header    |
| **PostHog**    | `https://mcp.posthog.com/sse`   | API key (Bearer) | `x-posthog-project-id` header |
| **Sentry**     | `https://mcp.sentry.dev/mcp`    | OAuth            | Org membership during OAuth   |
| **RevenueCat** | `https://mcp.revenuecat.ai/mcp` | OAuth (testing)  | —                             |
| **Stripe**     | `https://mcp.stripe.com`        | OAuth            | Dashboard MCP settings        |
| **Vercel**     | `https://mcp.vercel.com`        | OAuth            | Team/project via URL path     |

## Environment Variables

| Variable             | Required | Description                                               |
| -------------------- | -------- | --------------------------------------------------------- |
| `NEON_PROJECT_ID`    | Yes      | Neon project ID to pin scope                              |
| `POSTHOG_API_KEY`    | Yes      | Personal API key with "MCP Server" preset (`phx_` prefix) |
| `POSTHOG_PROJECT_ID` | Yes      | PostHog project ID to pin scope                           |

## Setup

### NeonDB (OAuth + headers)

OAuth handles auth. Headers enforce read-only mode and pin to a project:

- `x-read-only: true` — enforces read-only regardless of OAuth scope selection
- `X-Neon-Project-Id` — pins to a specific project

Branch selection is done per-tool-call (not via header). For PII protection,
create a masked branch using the PostgreSQL Anonymizer (`anon`) extension and
instruct the agent to target that branch.

### PostHog (API key)

PostHog MCP does not support OAuth yet (in progress, see PostHog/mcp#39). Uses
Personal API Keys with Bearer auth.

1. Create a Personal API Key in PostHog > Settings > Personal API Keys
2. Select the **"MCP Server"** preset (read-only + feature flag write)
3. Set `POSTHOG_API_KEY` and `POSTHOG_PROJECT_ID` in your shell

Project pinning via header excludes `switch-organization` and `switch-project`
tools.

### Sentry (OAuth)

OAuth handles everything. During the OAuth flow, select only the tool groups you
need. Org/project access is determined by your Sentry membership — no explicit
pinning available.

### RevenueCat (OAuth — testing)

Trying OAuth first. If it doesn't work with Claude Code, switch to Bearer token:

```json
"revenuecat": {
  "type": "http",
  "url": "https://mcp.revenuecat.ai/mcp",
  "headers": {
    "Authorization": "Bearer ${REVENUECAT_API_KEY}"
  }
}
```

### Stripe (OAuth)

OAuth handles auth. Configure permissions in Stripe Dashboard > Settings > MCP.
For restricted access, use Restricted API Keys (`rk_*`) with per-resource
Read/None. Sandbox vs live access is controlled separately in Dashboard
settings.

### Vercel (OAuth)

OAuth-only, read-only by default (Vercel's initial MCP launch). To pin to a
specific team and project, change the URL to
`https://mcp.vercel.com/<teamSlug>/<projectSlug>`. Find your slugs via Vercel
Dashboard > Settings > General, or `vercel projects ls`.

**Team:** Dots Future Technologies Inc (`getdots`)

| Project           | ID                                 | MCP URL                                            |
| ----------------- | ---------------------------------- | -------------------------------------------------- |
| meagain-marketing | `prj_df0s2cdm4wfx6ecJljPYiEY7UJks` | `https://mcp.vercel.com/getdots/meagain-marketing` |
| meagain-app       | `prj_0j4YcOcibpIpyCpANSGSZ6kBzzl3` | `https://mcp.vercel.com/getdots/meagain-app`       |
| meagain-admin     | `prj_Su7UWO9nJrPLrk0F77fQAGpgZFdR` | `https://mcp.vercel.com/getdots/meagain-admin`     |

## TODO

- [ ] Langfuse — requires base64 Basic auth (no OAuth), deferred
- [ ] PostHog OAuth — in progress upstream (PostHog/mcp#39), switch when
      available
- [ ] Multi-environment support (dev/staging/prod server entries)
- [ ] Neon PII masking guide — document `anon` extension + masked branch setup
