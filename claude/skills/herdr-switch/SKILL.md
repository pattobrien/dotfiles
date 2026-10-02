---
name: herdr-switch
description: Create a new herdr worktree and move this session's pane into it.
---

Create a new herdr worktree, then move this session's herdr pane to it.

1. Create the worktree, with a short kebab-case branch name from the current
   task:

   ```bash
   herdr worktree create --workspace "$HERDR_WORKSPACE_ID" --branch <branch> --no-focus
   ```

   Read `.result.tab.tab_id` and `.result.worktree.path` from the JSON.

2. Move this pane into the worktree's tab:

   ```bash
   herdr pane move "$HERDR_PANE_ID" --tab <tab_id> --split right --focus
   ```

3. `cd <worktree path>` and do all further work there.
