import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { CommandArgsSchema, type WorktreeItem } from "./lib/schemas";
import { listWorktreeItems, removeWorktree } from "./lib/wt";

function statusIcon(status: WorktreeItem["sessionStatus"]) {
  switch (status) {
    case "active":
      return { source: Icon.CircleFilled, tintColor: Color.Green };
    case "detached":
      return { source: Icon.CircleFilled, tintColor: Color.Yellow };
    case "none":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

function statusLabel(status: WorktreeItem["sessionStatus"]) {
  switch (status) {
    case "active":
      return "Active";
    case "detached":
      return "Detached";
    case "none":
      return "No session";
  }
}

export default function Command(props: { arguments: { cwd?: string } }) {
  const args = CommandArgsSchema.parse(props.arguments);
  const { data, isLoading, revalidate } = useCachedPromise(() =>
    Promise.resolve(listWorktreeItems(args.cwd)),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search worktrees to remove..."
    >
      {data?.map((wt) => (
        <List.Item
          key={wt.path}
          icon={statusIcon(wt.sessionStatus)}
          title={wt.name}
          subtitle={wt.branch?.replace(/^refs\/heads\//, "")}
          accessories={[
            {
              tag: { value: statusLabel(wt.sessionStatus) },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Remove"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                onAction={async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: "Removing...",
                  });
                  try {
                    removeWorktree(wt.name, args.cwd);
                    toast.style = Toast.Style.Success;
                    toast.title = `Removed ${wt.name}`;
                    revalidate();
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed to remove";
                    toast.message =
                      error instanceof Error ? error.message : String(error);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
