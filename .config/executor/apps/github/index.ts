import {
  accountRouter,
  bearer,
  defineApp,
  defineProvider,
  object,
  secrets,
  string,
  toolAnnotations,
  withApprovals,
} from "apps";
import { mcpHealth, mcpRouter } from "apps/mcp";
import { always } from "apps/operations/approval";

const url = "https://api.githubcopilot.com/mcp/";

const github = defineProvider({
  name: "GitHub",
  hosts: ["api.githubcopilot.com"],
  auth: {
    token: secrets({
      label: "Personal access token",
      fields: object({ token: string({ minLength: 1 }) }),
      request: ({ token }) => bearer(token),
    }),
  },
  health: (check) => mcpHealth(check, { url, headers: check.account.headers() }),
});

const requirements = { user: { accounts: { identities: github.many() } } };

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
