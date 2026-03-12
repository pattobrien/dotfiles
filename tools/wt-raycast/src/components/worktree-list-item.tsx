import { ActionPanel, List } from "@raycast/api";

import { getSessionIcon, getSessionLabel } from "../data/session-display";
import type { WorktreeItem } from "../models";

interface WorktreeListItemProps {
  worktree: WorktreeItem;
  actions: React.ReactNode;
}

export function WorktreeListItem({ worktree, actions }: WorktreeListItemProps) {
  return (
    <List.Item
      key={worktree.path}
      icon={getSessionIcon(worktree.sessionStatus)}
      title={worktree.name}
      subtitle={worktree.displayBranch}
      accessories={[
        {
          tag: { value: getSessionLabel(worktree.sessionStatus) },
        },
      ]}
      actions={<ActionPanel>{actions}</ActionPanel>}
    />
  );
}
