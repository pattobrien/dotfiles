import { execSync } from "node:child_process";
import { homedir } from "node:os";

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";

import { WT_BIN, WT_PATH } from "./data/paths";
import {
  showAnimatedToast,
  updateToastFailure,
  updateToastSuccess,
} from "./data/toasts";
import { useProjects } from "./hooks/use-projects";
import type { Project } from "./models";

const HOME = homedir();

function projectIcon(project: Project) {
  return project.isBare
    ? { source: Icon.HardDrive, tintColor: Color.Blue }
    : { source: Icon.Folder, tintColor: Color.SecondaryText };
}

function tildePath(absPath: string): string {
  return absPath.startsWith(HOME) ? "~" + absPath.slice(HOME.length) : absPath;
}

function refreshCache() {
  execSync([WT_BIN, "projects", "list", "--refresh", "true"].join(" "), {
    cwd: HOME,
    encoding: "utf-8",
    timeout: 30_000,
    env: { ...process.env, PATH: WT_PATH },
  });
}

export default function Command() {
  const { data, isLoading, revalidate } = useProjects();
  const { data: sorted, visitItem } = useFrecencySorting(data ?? [], {
    key: (project) => project.repoDir,
  });

  async function handleRefresh() {
    const toast = await showAnimatedToast("Scanning...");
    try {
      refreshCache();
      revalidate();
      updateToastSuccess(toast, "Projects refreshed");
    } catch (error) {
      updateToastFailure(toast, "Scan failed", error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      <List.EmptyView
        title="No Projects Found"
        description="Press ⌘R to scan for repos."
        icon={Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action
              title="Refresh Projects"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={handleRefresh}
            />
          </ActionPanel>
        }
      />
      {sorted.map((project) => (
        <List.Item
          key={project.repoDir}
          icon={projectIcon(project)}
          title={project.repoName}
          subtitle={tildePath(project.repoDir)}
          keywords={project.repoDir
            .split("/")
            .concat(project.repoOrg, project.isBare ? "bare" : "git")}
          accessories={[{ tag: project.isBare ? "bare" : "git" }]}
          actions={
            <ActionPanel>
              <Action.Open
                title="Open in Finder"
                target={project.repoDir}
                onOpen={() => visitItem(project)}
              />
              <Action.CopyToClipboard
                title="Copy Path"
                content={project.repoDir}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action
                title="Refresh Projects"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={handleRefresh}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
