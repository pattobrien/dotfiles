import { useCachedPromise } from "@raycast/utils";

import { listWorktreeItems } from "../data/wt-service";

export function useWorktrees(cwd?: string) {
  return useCachedPromise(() => Promise.resolve(listWorktreeItems(cwd)));
}
