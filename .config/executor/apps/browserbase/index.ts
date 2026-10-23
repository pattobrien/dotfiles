import { accountRouter, bearer, defineApp, defineProvider, object, secrets, string } from "apps";
import { mcpHealth, mcpRouter } from "apps/mcp";

const url = "https://mcp.browserbase.com/mcp";

const browserbase = defineProvider({
  name: "Browserbase",
  hosts: ["mcp.browserbase.com"],
  auth: {
    token: secrets({
      label: "API key",
      fields: object({ token: string({ minLength: 1 }) }),
      request: ({ token }) => bearer(token),
    }),
  },
  health: (check) => mcpHealth(check, { url, headers: check.account.headers() }),
});

const requirements = { user: { accounts: { identities: browserbase.many() } } };

export default defineApp(requirements, async (ctx) => ({
  tools: await accountRouter(
    ctx.user?.accounts.identities ?? [],
    (account) => mcpRouter({ url, account, headers: account.headers(), cache: ctx.cache, signal: ctx.signal }),
    { signal: ctx.signal },
  ),
}));
