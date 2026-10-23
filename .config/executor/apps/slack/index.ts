import { accountRouter, bearer, defineApp, defineProvider, oauth2, toolAnnotations, withApprovals } from "apps";
import { mcpHealth, mcpRouter } from "apps/mcp";
import { always } from "apps/operations/approval";

const url = "https://mcp.slack.com/mcp";

const scopes = [
  "search:read.public",
  "search:read.private",
  "search:read.mpim",
  "search:read.im",
  "search:read.files",
  "search:read.users",
  "channels:history",
  "groups:history",
  "im:history",
  "mpim:history",
  "channels:read",
  "groups:read",
  "im:read",
  "mpim:read",
  "users:read",
  "users:read.email",
  "files:read",
  "reactions:read",
  "reactions:write",
  "canvases:read",
  "chat:write",
];

const slack = defineProvider({
  name: "Slack",
  hosts: ["mcp.slack.com"],
  auth: { oauth: oauth2({ discover: url, scopes, request: ({ access_token }) => bearer(access_token) }) },
  health: (check) => mcpHealth(check, { url, headers: check.account.headers() }),
});

const requirements = { user: { accounts: { identities: slack.many() } } };

export default defineApp(requirements, async (ctx) => ({
  tools: await accountRouter(
    ctx.user?.accounts.identities ?? [],
    async (account) =>
      withApprovals(
        await mcpRouter({ url, account, headers: account.headers(), cache: ctx.cache, signal: ctx.signal }),
        (tool) => (toolAnnotations(tool)?.readOnlyHint === true ? undefined : always()),
      ),
    { signal: ctx.signal },
  ),
}));
