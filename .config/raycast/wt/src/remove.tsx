import { Action, Color, Icon, List } from "@raycast/api";

import { WorktreeListItem } from "./components/worktree-list-item";
import { updateToastFailure, updateToastSuccess, showAnimatedToast } from "./data/toasts";
import { removeWorktree } from "./data/wt-service";
import { useWorktrees } from "./hooks/use-worktrees";
import { CommandArgsSchema } from "./models";

export default function Command(props: { arguments: { cwd?: string } }) {
  const args = CommandArgsSchema.parse(props.arguments);
  const { data, isLoading, revalidate } = useWorktrees(args.cwd);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search worktrees to remove..."
    >
      {data?.map((wt) => (
        <WorktreeListItem
          key={wt.path}
          worktree={wt}
          actions={
            <Action
              title="Remove"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              onAction={async () => {
                const toast = await showAnimatedToast("Removing...");
                try {
                  removeWorktree(wt.name, args.cwd);
                  updateToastSuccess(toast, `Removed ${wt.name}`);
                  revalidate();
                } catch (error) {
                  updateToastFailure(toast, "Failed to remove", error);
                }
              }}
            />
          }
        />
      ))}
    </List>
  );
}
