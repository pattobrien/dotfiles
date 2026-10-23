import {
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

const url = "http://127.0.0.1:8787/mcp";

const bearer = (account: { fields: { token: string } }) => ({
  Authorization: "Bearer " + account.fields.token,
});

const bridge = defineProvider({
  name: "Doppler MCP bridge",
  auth: {
    apiKey: secrets({
      label: "Bridge API key",
      fields: object({ token: string({ minLength: 1 }) }),
    }),
  },
  health: (check) => mcpHealth(check, { url, headers: bearer(check.account) }),
});

const requirements = { app: { accounts: { bridge } } };

export default defineApp(requirements, async (ctx) => ({
  tools: withApprovals(
    await mcpRouter({
      url,
      account: ctx.app.accounts.bridge,
      headers: bearer(ctx.app.accounts.bridge),
      cache: ctx.cache,
      signal: ctx.signal,
    }),
    (tool) =>
      toolAnnotations(tool)?.readOnlyHint === true ? undefined : always(),
  ),
}));
