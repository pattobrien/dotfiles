import type { PreToolUseHookInput, StopHookInput } from "@anthropic-ai/claude-agent-sdk";
/* eslint-disable typescript-eslint/consistent-type-assertions, typescript-eslint/no-unsafe-type-assertion */
import { describe, it, expectTypeOf } from "vitest";
import type { z } from "zod";

import { PreToolUseHookInputSchema, StopHookInputSchema } from "./schemas.ts";

describe("schemas match SDK types", () => {
  it("PreToolUseHookInputSchema", () => {
    expectTypeOf({} as z.infer<typeof PreToolUseHookInputSchema>).toMatchTypeOf(
      {} as PreToolUseHookInput,
    );
    expectTypeOf({} as PreToolUseHookInput).toMatchTypeOf(
      {} as z.infer<typeof PreToolUseHookInputSchema>,
    );
  });

  it("StopHookInputSchema", () => {
    expectTypeOf({} as z.infer<typeof StopHookInputSchema>).toMatchTypeOf({} as StopHookInput);
    expectTypeOf({} as StopHookInput).toMatchTypeOf({} as z.infer<typeof StopHookInputSchema>);
  });
});
