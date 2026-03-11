import { Action, Color, Icon, List } from "@raycast/api";
import { z } from "zod/v4";

import { WorktreeListItem } from "./components/worktree-list-item";
import {
  showAnimatedToast,
  updateToastFailure,
  updateToastSuccess,
} from "./data/toasts";
import { removeWorktree } from "./data/wt-service";
import { useWorktrees } from "./hooks/use-worktrees";
import { CommandArgsSchema } from "./models";

type RemoveCommandProps = z.infer<typeof CommandArgsSchema>;

export default function Command(props: { arguments: RemoveCommandProps }) {
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
