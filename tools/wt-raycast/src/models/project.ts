import { z } from "zod/v4";

export type { Project } from "git";

// Local schema for reading the project cache file
export const ProjectCacheSchema = z.object({
  updatedAt: z.string(),
  projects: z.array(
    z.object({
      repoDir: z.string(),
      repoName: z.string(),
      repoOrg: z.string(),
      isBare: z.boolean(),
    }),
  ),
});
