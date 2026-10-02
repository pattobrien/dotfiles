---
name: herdr-switch
description: Create a new herdr worktree and move this session's pane into it.
---

Create a new herdr worktree, then move this session's herdr pane to it.

1. Create the worktree. `<workspace_id>` is the workspace of the repo to branch
   in; default `$HERDR_WORKSPACE_ID`:

   ```bash
   herdr worktree create --workspace <workspace_id> --branch <branch> --base <ref> --no-focus
   ```

   Read `.result.tab.tab_id` and `.result.worktree.path` from the JSON.

2. Move this pane into the worktree's tab:

   ```bash
   herdr pane move "$HERDR_PANE_ID" --tab <tab_id> --split right --focus
   ```

3. `cd <worktree path>` and do all further work there.

4. Report the new cwd to herdr:

   ```bash
   printf '\033]7;file://%s\033\\' "<worktree path>" > "/dev/$(ps -o tty= -p $PPID | tr -d ' ')"
   ```
