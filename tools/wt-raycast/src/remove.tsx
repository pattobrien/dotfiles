import { Action, Color, Icon, List } from "@raycast/api";

import { WorktreeListItem } from "./components/worktree-list-item";
import { DEFAULT_CWD } from "./data/paths";
import {
  showAnimatedToast,
  updateToastFailure,
  updateToastSuccess,
} from "./data/toasts";
import { removeWorktree } from "./data/wt-service";
import { useWorktrees } from "./hooks/use-worktrees";
import { CommandArgsSchema } from "./models";

export default function Command(props: { arguments: { cwd?: string } }) {
  const args = CommandArgsSchema.parse(props.arguments);
  const cwd = args.cwd || DEFAULT_CWD;
  const { data, isLoading, revalidate } = useWorktrees(cwd);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search worktrees to remove..."
    >
      <List.EmptyView
        title="No Worktrees Found"
        description="No git worktrees were found in the current directory."
        icon={Icon.Tree}
      />
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
                  removeWorktree(wt.name, cwd);
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
