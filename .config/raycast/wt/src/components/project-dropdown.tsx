import { List } from "@raycast/api";

import { useProjects } from "../hooks/use-projects";
import type { Project } from "../models";

interface ProjectDropdownProps {
  onProjectChange: (projectDir: string) => void;
  defaultCwd?: string;
}

export function ProjectDropdown({ onProjectChange, defaultCwd }: ProjectDropdownProps) {
  const { data: projects } = useProjects();

  const grouped = new Map<string, Project[]>();
  for (const p of projects ?? []) {
    const list = grouped.get(p.repoOrg) ?? [];
    list.push(p);
    grouped.set(p.repoOrg, list);
  }

  const sortedOrgs = [...grouped.keys()].sort();

  return (
    <List.Dropdown
      tooltip="Filter by Project"
      defaultValue={defaultCwd ?? ""}
      onChange={onProjectChange}
    >
      {sortedOrgs.map((org) => (
        <List.Dropdown.Section key={org} title={org}>
          {grouped.get(org)?.map((project) => (
            <List.Dropdown.Item
              key={project.repoDir}
              title={project.repoName}
              value={project.repoDir}
            />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}
