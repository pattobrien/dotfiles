---
name: browser-providers
description: Choose where agent-browser runs - local Chrome or a cloud provider (`-p`), and which provider. Use before launching a browser task that needs logins, stealth, proxies, parallelism or unattended runs.
---

# Browser providers

## Providers

- **Kernel:** best all-rounder. Saved logins via named profiles (`KERNEL_PROFILE_NAME` + `KERNEL_PROFILE_SAVE_CHANGES`), optional stealth (`KERNEL_STEALTH`), configurable timeout. No proxy setting yet.
- **Browser Use:** location-specific IPs (`BROWSER_USE_PROXY_COUNTRY`), saved profiles (`BROWSER_USE_PROFILE_ID`), session recording.
- **Browserless:** cheap scraping past bot checks; stealth on by default. Self-hostable via `BROWSERLESS_API_URL`.
- **Browserbase:** plain cloud browser; `-p browserbase` sends no options, so no saved logins, stealth or proxy. Supports 1Password (passwords + TOTP) through its 1Password integration: create the session with the Browserbase SDK and the uploaded 1Password extension, then attach with `--cdp <connectUrl>`.
- **Cloudflare Browser Run:** not built in, and not usable yet; blocked until vercel-labs/agent-browser#2005 (`--cdp-headers`) merges.

## Local, no provider (default)

- Needs Patt's logins: cloned profile, `--cdp 9222 --pin-tab`.
- Clean or test browsing: `--session <name> --restore`.
- One-off look at Patt's live Chrome: `--auto-connect` (one consent prompt per session).

## Remote provider (`-p`)

- Bot walls, residential IPs, CAPTCHAs: Kernel (`KERNEL_STEALTH`) or Browserless.
- Logins that persist in the cloud: Kernel profiles.
- Unattended, scheduled or CI runs with no Mac: Kernel.
- Many parallel browsers beyond what the Mac can run: any provider.
- Per-country IPs: Browser Use.
- 1Password-backed logins in the cloud: Browserbase.
- Always `close` remote sessions explicitly; `close --all` leaks them.

## Related Skills

- **[agent-browser](../agent-browser/SKILL.md)** — Commands, sessions, auth and snapshots for driving the chosen browser; load it before running any `agent-browser` command
