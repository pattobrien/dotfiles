import { readFileSync, existsSync } from "node:fs";

import { useCachedPromise } from "@raycast/utils";
import { CACHE_PATH } from "git";

import { ProjectCacheSchema, type Project } from "../models";

function fetchProjects(): Project[] {
  if (!existsSync(CACHE_PATH)) return [];
  try {
    const raw = readFileSync(CACHE_PATH, "utf-8");
    const parsed = ProjectCacheSchema.parse(JSON.parse(raw));
    return parsed.projects;
  } catch {
    return [];
  }
}

export function useProjects() {
  return useCachedPromise(() => Promise.resolve(fetchProjects()));
}
