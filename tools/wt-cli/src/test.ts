import { t } from "./trpc";

export const test = t.procedure
  .meta({ description: "Test that the CLI is working" })
  .query(() => {
    console.log("wt-cli v0.0.0 (monorepo build)");
    return "ok";
  });
