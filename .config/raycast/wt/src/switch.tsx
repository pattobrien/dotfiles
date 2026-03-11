import { useState } from "react";

import { Action, Icon, List } from "@raycast/api";

import { ProjectDropdown } from "./components/project-dropdown";
import { WorktreeListItem } from "./components/worktree-list-item";
import { DEFAULT_CWD } from "./data/paths";
import {
  showAnimatedToast,
  updateToastFailure,
  updateToastSuccess,
} from "./data/toasts";
import { switchWorktree } from "./data/wt-service";
import { useWorktrees } from "./hooks/use-worktrees";
import { CommandArgsSchema, SessionStatus } from "./models";

export default function Command(props: { arguments: { cwd?: string } }) {
  const args = CommandArgsSchema.parse(props.arguments);
  const [selectedProject, setSelectedProject] = useState(args.cwd || DEFAULT_CWD);
  const { data, isLoading } = useWorktrees(selectedProject);

  const sessions = data?.filter(
    (wt) => wt.sessionStatus !== SessionStatus.None,
  );

  return (
    <List
      filtering={true}
      isLoading={isLoading}
      searchBarPlaceholder="Search sessions..."
      searchBarAccessory={
        <ProjectDropdown
          defaultCwd={selectedProject}
          onProjectChange={setSelectedProject}
        />
      }
    >
      <List.EmptyView
        title="No Sessions Found"
        description="No active or detached tmux sessions were found."
        icon={Icon.Terminal}
      />
      {sessions?.map((wt) => (
        <WorktreeListItem
          key={wt.path}
          worktree={wt}
          actions={
            <>
              <Action
                title="Switch"
                icon={Icon.Switch}
                onAction={async () => {
                  const toast = await showAnimatedToast("Switching...");
                  try {
                    switchWorktree(wt.sessionName);
                    updateToastSuccess(toast, `Switched to ${wt.name}`);
                  } catch (error) {
                    updateToastFailure(toast, "Failed to switch", error);
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
