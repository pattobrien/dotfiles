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
import { attachWorktree, listWorktreeItems } from "./lib/wt";

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
  const { data, isLoading } = useCachedPromise(() =>
    Promise.resolve(listWorktreeItems(args.cwd)),
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search worktrees...">
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
                title="Attach"
                icon={Icon.Terminal}
                onAction={async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: "Attaching...",
                  });
                  try {
                    attachWorktree(wt.name, args.cwd);
                    toast.style = Toast.Style.Success;
                    toast.title = `Attached to ${wt.name}`;
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed to attach";
                    toast.message =
                      error instanceof Error ? error.message : String(error);
                  }
                }}
              />
              <Action.CopyToClipboard
                title="Copy Path"
                content={wt.path}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
