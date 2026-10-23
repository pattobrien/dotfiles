import {
  accountRouter,
  defineApp,
  defineProvider,
  oauth2,
  object,
  secrets,
  string,
  toolAnnotations,
  withApprovals,
} from "apps";
import { mcpHealth, mcpRouter } from "apps/mcp";
import { always } from "apps/operations/approval";

const url = "https://mcp.linear.app/mcp";

type LinearAccount =
  | { method: "apiKey"; fields: { token: string } }
  | { method: "build" | "triage"; fields: { access_token: string } };

const bearer = (account: LinearAccount) => ({
  Authorization:
    "Bearer " +
    (account.method === "apiKey"
      ? account.fields.token
      : account.fields.access_token),
});

const agent = (scopes: string[]) =>
  oauth2({
    grant: "client_credentials",
    tokenUrl: "https://api.linear.app/oauth/token",
    scopes,
    scopeSeparator: ",",
    tokenEndpointAuthMethod: "client_secret_basic",
  });

const linear = defineProvider({
  name: "Linear",
  hosts: ["mcp.linear.app", "api.linear.app"],
  auth: {
    apiKey: secrets({
      label: "Personal API key",
      fields: object({ token: string({ minLength: 1 }) }),
    }),
    build: agent([
      "read",
      "write",
      "comments:create",
      "issues:create",
      "app:mentionable",
      "app:assignable",
    ]),
    triage: agent([
      "read",
      "write",
      "comments:create",
      "issues:create",
      "app:mentionable",
    ]),
  },
  health: (check) =>
    mcpHealth(check, { url, headers: bearer(check.account as LinearAccount) }),
});

const requirements = { user: { accounts: { identities: linear.many() } } };

export default defineApp(requirements, async (ctx) => ({
  tools: await accountRouter(
    ctx.user?.accounts.identities ?? [],
    async (account) =>
      withApprovals(
        await mcpRouter({
          url,
          account,
          headers: bearer(account as LinearAccount),
          cache: ctx.cache,
          signal: ctx.signal,
        }),
        (tool) =>
          toolAnnotations(tool)?.destructiveHint === true
            ? always()
            : undefined,
      ),
    { signal: ctx.signal },
  ),
}));
