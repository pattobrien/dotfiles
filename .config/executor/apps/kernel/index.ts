import { accountRouter, bearer, defineApp, defineProvider, object, secrets, string, withApprovals } from "apps";
import { mcpHealth, mcpRouter } from "apps/mcp";
import { always } from "apps/operations/approval";

const url = "https://mcp.onkernel.com/mcp";

const gated = new Set([
  "manage_api_keys",
  "manage_credentials",
  "manage_credential_providers",
  "manage_vaults",
  "manage_vault_items",
  "manage_vault_credentials",
  "manage_vault_cards",
  "manage_vault_wallets",
  "manage_vault_provider_configs",
]);

const kernel = defineProvider({
  name: "Kernel",
  hosts: ["mcp.onkernel.com"],
  auth: {
    token: secrets({
      label: "API key",
      fields: object({ token: string({ minLength: 1 }) }),
      request: ({ token }) => bearer(token),
    }),
  },
  health: (check) => mcpHealth(check, { url, headers: check.account.headers() }),
});

const requirements = { user: { accounts: { identities: kernel.many() } } };

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
