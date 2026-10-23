import { accountRouter, bearer, defineApp, defineProvider, object, secrets, string, withApprovals } from "apps";
import { mcpHealth, mcpRouter } from "apps/mcp";
import { always } from "apps/operations/approval";

const url = "https://mcp.browserless.io/mcp";

const gated = new Set(["browserless_link_connect", "browserless_link_checkout"]);

const browserless = defineProvider({
  name: "Browserless",
  hosts: ["mcp.browserless.io"],
  auth: {
    token: secrets({
      label: "API token",
      fields: object({ token: string({ minLength: 1 }) }),
      request: ({ token }) => bearer(token),
    }),
  },
  health: (check) => mcpHealth(check, { url, headers: check.account.headers() }),
});

const requirements = { user: { accounts: { identities: browserless.many() } } };

export default defineApp(requirements, async (ctx) => ({
  tools: await accountRouter(
    ctx.user?.accounts.identities ?? [],
    async (account) =>
      withApprovals(
        await mcpRouter({ url, account, headers: account.headers(), cache: ctx.cache, signal: ctx.signal }),
        (_, name) => (gated.has(name) ? always() : undefined),
      ),
    { signal: ctx.signal },
  ),
}));
