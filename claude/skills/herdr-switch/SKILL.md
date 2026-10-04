---
name: herdr-switch
description: Create a new herdr worktree and move this session's pane into it.
---

Create a new herdr worktree, then move this session's herdr pane to it.

1. Read this pane's live ids (`$HERDR_PANE_ID` and `$HERDR_WORKSPACE_ID` go
   stale once a pane has moved):

   ```bash
   herdr pane current --current
   ```

   Use `.result.pane.pane_id` and `.result.pane.workspace_id` below.

2. Worktrees are created from the main-checkout workspace of the repo. Find it
   for this pane's workspace, or for another workspace if the task names a
   different repo:

   ```bash
   herdr worktree list --workspace <workspace_id>
   ```

   Use `.result.source.source_workspace_id` as-is, even if it is not the
   workspace you expected.

3. Create the worktree. Omit `--base` when the branch already exists. If the
   main checkout has that branch checked out, `git checkout main` there first
   (it must be clean):

   ```bash
   herdr worktree create --workspace <source_workspace_id> --branch <branch> --base <ref> --no-focus
   ```

   Read `.result.workspace.workspace_id` and `.result.worktree.path` from the
   JSON.

4. The worktree layout starts an empty Claude session in the new workspace.
   Find it:

   ```bash
   herdr pane list --workspace <new_workspace_id>
   ```

   Take the `pane_id` and `tab_id` of the pane that has `agent` set. If none is
   listed, list once more. If still none, take the first pane's `tab_id` and
   skip the `pane close` in step 5.

5. Moving a workspace's last pane closes it, which orphans its worktrees. If
   this pane is alone in its workspace (`workspace_id` from step 1), leave a
   shell behind first:

   ```bash
   herdr pane split <pane_id> --direction right --no-focus
   ```

   Then replace that empty session with this pane:

   ```bash
   herdr pane move <pane_id> --tab <tab_id> --split right --no-focus
   herdr pane close <agent_pane_id>
   ```

   The move gives this pane a new id: `.result.pane.pane_id`.

6. Report the new cwd to herdr. Run this command alone:

   ```bash
   printf '\033]7;file://%s\033\\' "<worktree path>" > "/dev/$(ps -o tty= -p $PPID | tr -d ' ')"
   ```

7. Move this session to the worktree. Claude cannot run `/cd` itself, so queue
   it through herdr; it runs when this turn ends:

   ```bash
   herdr agent prompt <new_pane_id> "/cd <worktree path>"
   ```

   Then end the turn: reply with the worktree path and nothing else.
