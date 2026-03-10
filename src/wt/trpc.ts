import { initTRPC } from "@trpc/server";

export interface WtMeta {
  description?: string;
  aliases?: { command: string[] };
  /** Maps param names to shell commands that produce completion candidates. */
  _completion?: Record<string, string>;
}

export const t = initTRPC.meta<WtMeta>().create();
