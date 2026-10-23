import {
  accountRouter,
  decodeJson,
  defineApp,
  defineProvider,
  header,
  object,
  secrets,
  string,
  withApprovals,
} from "apps";
import { liveOpenapiRouter } from "apps/openapi";
import { always } from "apps/operations/approval";

const figma = defineProvider({
  name: "Figma",
  hosts: ["api.figma.com"],
  auth: {
    token: secrets({
      label: "Personal access token",
      fields: object({ token: string({ minLength: 1 }) }),
      request: ({ token }) => header("x-figma-token", token),
    }),
  },
  async health({ account, fetch, signal }) {
    const response = await fetch("https://api.figma.com/v1/me", { signal, headers: account.headers() });
    const me = await decodeJson(response, object({ id: string(), handle: string(), email: string() }));
    return { accountInfo: { externalId: me.id, username: me.handle, email: me.email } };
  },
});

const requirements = { user: { accounts: { identities: figma.many() } } };

export default defineApp(requirements, async (ctx) => ({
  tools: await accountRouter(
    ctx.user?.accounts.identities ?? [],
    (account) =>
      withApprovals(
        liveOpenapiRouter({
          source: { url: "https://raw.githubusercontent.com/figma/rest-api-spec/main/openapi/openapi.yaml" },
          allowedOrigin: "https://api.figma.com",
          securitySchemes: { PersonalAccessToken: { type: "apiKey", name: "X-Figma-Token", in: "header" } },
          methods: { token: [{ scheme: "PersonalAccessToken", field: "token", part: "value", prefix: "" }] },
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
