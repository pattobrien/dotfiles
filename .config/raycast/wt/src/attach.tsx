import { Action, Icon, List } from "@raycast/api";

import { WorktreeListItem } from "./components/worktree-list-item";
import {
  showAnimatedToast,
  updateToastFailure,
  updateToastSuccess,
} from "./data/toasts";
import { attachWorktree } from "./data/wt-service";
import { useWorktrees } from "./hooks/use-worktrees";
import { CommandArgsSchema } from "./models";

export default function Command(props: { arguments: { cwd?: string } }) {
  const args = CommandArgsSchema.parse(props.arguments);
  const { data, isLoading } = useWorktrees(args.cwd);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search worktrees...">
      {data?.map((wt) => (
        <WorktreeListItem
          key={wt.path}
          worktree={wt}
          actions={
            <>
              <Action
                title="Attach"
                icon={Icon.Terminal}
                onAction={async () => {
                  const toast = await showAnimatedToast("Attaching...");
                  try {
                    attachWorktree(wt.name, args.cwd);
                    updateToastSuccess(toast, `Attached to ${wt.name}`);
                  } catch (error) {
                    updateToastFailure(toast, "Failed to attach", error);
                  }
                }}
              />
              <Action.CopyToClipboard
                title="Copy Path"
                content={wt.path}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </>
          }
        />
      ))}
    </List>
  );
}
