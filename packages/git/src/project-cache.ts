import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

import { z } from "zod";

import { ProjectSchema, type Project } from "./models";
import { discoverProjects } from "./projects";

export const CACHE_PATH = join(homedir(), ".cache", "wt", "projects.json");

const CacheSchema = z.object({
  updatedAt: z.string(),
  projects: z.array(ProjectSchema),
});

function readCache(): Project[] | null {
  if (!existsSync(CACHE_PATH)) return null;
  try {
    const raw = readFileSync(CACHE_PATH, "utf-8");
    const parsed = CacheSchema.parse(JSON.parse(raw));
    return parsed.projects;
  } catch {
    return null;
  }
}

function writeCache(projects: Project[]): void {
  const dir = dirname(CACHE_PATH);
  mkdirSync(dir, { recursive: true });
  const data = { updatedAt: new Date().toISOString(), projects };
  writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getProjects(opts?: { refresh?: boolean }): Project[] {
  if (!opts?.refresh) {
    const cached = readCache();
    if (cached) return cached;
  }

  const projects = discoverProjects();
  writeCache(projects);
  return projects;
}
