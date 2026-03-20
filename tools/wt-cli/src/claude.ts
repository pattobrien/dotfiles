import { TmuxClient } from "tmux";
import { z } from "zod";

import { t } from "./trpc";

export const claude = t.procedure
  .meta({
    description: "Open claude in a new tmux window",
  })
  .output(z.void())
  .mutation(() => {
    if (!process.env.TMUX) {
      console.error("Error: not inside a tmux session");
      process.exit(1);
    }

    const tmux = new TmuxClient();
    const currentSession = tmux.getActiveSession();
    if (!currentSession) {
      console.error("Error: could not determine current session");
      process.exit(1);
    }

    const sessions = tmux.listSessions();
    const session = sessions.find((s) => s.name === currentSession);

    tmux.newWindow({ target: currentSession, name: "claude", cwd: session?.path, cmd: "claude" });
  });
