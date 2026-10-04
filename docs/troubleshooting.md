# Troubleshooting

## macOS "would like to access data from other apps" dialog keeps reappearing

On macOS Sequoia, apps can get stuck in a limbo permission state
(`auth_value=5`) in the TCC database, causing the "would like to access data
from other apps" dialog to reappear on every restart.

> **Before running the fix:** quit the affected apps and dismiss any pending
> "access data from other apps" dialog first. While a prompt is on screen (or
> the app is running), macOS keeps re-writing the entry back to the `5` limbo
> state, which clobbers the `UPDATE` below. If an entry reverts to `5` right
> after you fix it, a live prompt/app is the cause — close it and re-run.

**Check for stuck entries:**

```sh
sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
  "SELECT client, auth_value FROM access WHERE service = 'kTCCServiceSystemPolicyAppData' AND auth_value = 5;"
```

**Fix all stuck entries:**

```sh
sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
  "UPDATE access SET auth_value = 2 WHERE service = 'kTCCServiceSystemPolicyAppData' AND auth_value = 5;"
```

This sets the permission to "allowed" (2) directly, which persists across
reboots. Using `tccutil reset` does **not** work — it deletes the entry, causing
macOS to re-create it in the same broken state.
