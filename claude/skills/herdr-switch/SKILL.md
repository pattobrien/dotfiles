---
name: herdr-switch
description: Create a new herdr worktree and move this session into it.
---

Create a new herdr worktree, resume this session there, and close this pane.

1. Read this pane's live ids (`$HERDR_PANE_ID` and `$HERDR_WORKSPACE_ID` go
   stale once a pane has moved):

   ```bash
   herdr pane current --current
   ```

   Use `.result.pane.pane_id` and `.result.pane.workspace_id` below. Then read
   this session's id:

   ```bash
   echo "$CLAUDE_CODE_SESSION_ID"
   ```

   Do not use herdr's `agent_session` for this; a nested `claude` run in this
   pane overwrites it.

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

   Read `.result.workspace.workspace_id` from the JSON.

4. The worktree layout starts an empty Claude session in the new workspace.
   Find it:

   ```bash
   herdr pane list --workspace <new_workspace_id>
   ```

   Take the `pane_id` of the pane that has `agent` set. If none is listed, list
   once more. If still none, take the first pane's `pane_id` and skip step 6.

5. Closing a workspace's last pane closes it, which orphans its worktrees. If
   this pane is alone in its workspace (`workspace_id` from step 1), leave a
   shell behind first:

   ```bash
   herdr pane split <pane_id> --direction right --no-focus
   ```

6. Quit the empty Claude, which leaves its shell in the worktree:

   ```bash
   herdr agent prompt <agent_pane_id> "/exit"
   ```

   Then wait for that shell to be back in the foreground:

   ```bash
   herdr pane process-info --pane <agent_pane_id>
   ```

   Repeat until `.result.process_info.foreground_process_group_id` equals
   `.result.process_info.shell_pid`.

7. Hand this session over. The worktree shell closes this pane, then resumes
   this session in the worktree and continues it. Run this as your last
   command; it ends this process:

   ```bash
   herdr pane run <agent_pane_id> "herdr pane close <pane_id>; claude --resume <session_id> Continue"
   ```
