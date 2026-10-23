import {
  defineApp,
  defineProvider,
  object,
  plain,
  secrets,
  string,
  toolAnnotations,
  withApprovals,
} from "apps";
import { mcpHealth, mcpRouter } from "apps/mcp";
import { always } from "apps/operations/approval";

type Bridge = { fields: { url: string; token: string } };

const bearer = (account: Bridge) => ({
  Authorization: "Bearer " + account.fields.token,
});

const bridge = defineProvider({
  name: "Doppler MCP bridge",
  auth: {
    apiKey: secrets({
      label: "Bridge API key",
      fields: object({ url: plain(string({ minLength: 1 })), token: string({ minLength: 1 }) }),
    }),
  },
  health: (check) => mcpHealth(check, { url: check.account.fields.url, headers: bearer(check.account) }),
});

const requirements = { app: { accounts: { bridge } } };

export default defineApp(requirements, async (ctx) => ({
  tools: withApprovals(
    await mcpRouter({
      url: ctx.app.accounts.bridge.fields.url,
      account: ctx.app.accounts.bridge,
      headers: bearer(ctx.app.accounts.bridge),
      cache: ctx.cache,
      signal: ctx.signal,
    }),
    (tool) =>
      toolAnnotations(tool)?.readOnlyHint === true ? undefined : always(),
  ),
}));
