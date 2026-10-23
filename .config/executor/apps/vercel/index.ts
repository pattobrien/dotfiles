import {
  accountRouter,
  bearer,
  decodeJson,
  defineApp,
  defineProvider,
  object,
  ProviderError,
  secrets,
  string,
  withApprovals,
} from "apps";
import { liveOpenapiRouter } from "apps/openapi";
import { always } from "apps/operations/approval";

const vercel = defineProvider({
  name: "Vercel",
  hosts: ["api.vercel.com"],
  auth: {
    token: secrets({
      label: "API token",
      fields: object({ token: string({ minLength: 1 }) }),
      request: ({ token }) => bearer(token),
    }),
  },
  async health({ account, fetch, signal }) {
    const response = await fetch("https://api.vercel.com/v2/user", { signal, headers: account.headers() });
    if (response.status === 403 && (await response.json()).error?.invalidToken === true)
      throw new ProviderError({ reason: "unauthorized", status: 403 });
    const { user } = await decodeJson(response, object({ user: object({ id: string(), username: string() }) }));
    return { accountInfo: { externalId: user.id, username: user.username } };
  },
});

const requirements = { user: { accounts: { identities: vercel.many() } } };

export default defineApp(requirements, async (ctx) => ({
  tools: await accountRouter(
    ctx.user?.accounts.identities ?? [],
    (account) =>
      withApprovals(
        liveOpenapiRouter({
          source: { url: "https://openapi.vercel.sh" },
          allowedOrigin: "https://api.vercel.com",
          securitySchemes: { bearerToken: { type: "http", scheme: "bearer" } },
          methods: { token: [{ scheme: "bearerToken", field: "token", part: "value", prefix: "" }] },
          oauth: [],
          cache: ctx.cache,
          fetch: ctx.fetch,
          signal: ctx.signal,
          account,
        }),
        (tool) => (tool.kind === "mutation" ? always() : undefined),
      ),
    { signal: ctx.signal },
  ),
}));
