import pc from "picocolors";
import { z } from "zod";

import { getProjects } from "git";

import { t } from "./trpc";

const listInput = z.object({
  refresh: z
    .boolean()
    .default(false)
    .describe("force re-scan instead of reading cache"),
});

const listOutput = z.void();

const projectsList = t.procedure
  .meta({ description: "List all discovered projects", aliases: { command: ["ls"] } })
  .input(listInput)
  .output(listOutput)
  .query(({ input }) => {
    const projects = getProjects({ refresh: input.refresh });

    if (projects.length === 0) {
      console.log("No projects found. Run with --refresh to scan.");
      return;
    }

    const nameWidth = Math.max(...projects.map((p) => p.repoName.length), 4);
    const orgWidth = Math.max(...projects.map((p) => p.repoOrg.length), 3);
    const typeWidth = 6;

    console.log(
      `${"NAME".padEnd(nameWidth)}  ${"ORG".padEnd(orgWidth)}  ${"TYPE".padEnd(typeWidth)}  PATH`,
    );
    console.log(
      `${"─".repeat(nameWidth)}  ${"─".repeat(orgWidth)}  ${"─".repeat(typeWidth)}  ${"─".repeat(30)}`,
    );

    for (const p of projects) {
      const typeLabel = p.isBare ? "bare" : "git";
      const colored = p.isBare ? pc.cyan(typeLabel.padEnd(typeWidth)) : pc.dim(typeLabel.padEnd(typeWidth));
      console.log(
        `${p.repoName.padEnd(nameWidth)}  ${pc.dim(p.repoOrg.padEnd(orgWidth))}  ${colored}  ${pc.dim(p.repoDir)}`,
      );
    }
  });

export const projects = t.router({
  list: projectsList,
});
