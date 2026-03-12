import { z } from "zod/v4";

export const ProjectSchema = z.object({
  repoDir: z.string(),
  repoName: z.string(),
  repoOrg: z.string(),
  isBare: z.boolean(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const ProjectCacheSchema = z.object({
  updatedAt: z.string(),
  projects: z.array(ProjectSchema),
});
