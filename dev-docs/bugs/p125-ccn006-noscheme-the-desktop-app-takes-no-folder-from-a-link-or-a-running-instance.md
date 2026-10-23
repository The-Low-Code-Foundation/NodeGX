---
id: P125-CCN006-NOSCHEME
title: The Studio desktop app registers no nodegx-studio:// link and a running app ignores a folder handed to it, so a browser window whose agent has gone cannot open its folder in the app
status: open
severity: medium
area: nodegx-studio `app/main.cjs` (no `setAsDefaultProtocolClient`, no `open-url`, no `second-instance`), `package.json` `build.protocols`
found: P125 CCN-006, 2026-10-23 — building the offer of the desktop app in a browser window of Studio (`packages/noodl-mcp/src/studio/companion.ts`)
evidence: "`grep -n 'setAsDefaultProtocolClient\\|open-url\\|second-instance' app/main.cjs` finds nothing; the folder comes only from argv (`projectArg`, main.cjs:24). macOS `open -a <app> --args <dir>` on a running app only brings it to the front, so `launchStudioApp` uses `open -n` (a second instance)."
---

When the agent's host quits, the browser window of Studio still knows the project's folder but has no server left to
launch anything. A link is the only way left to hand the folder to the app. The companion already sends
`nodegx-studio://open?dir=<folder>` when the installed app declares the scheme (read from its `Info.plist` by
`findStudioApp`). Until the app declares it, the card says "Open it and choose this folder" and offers to copy the
folder's location.

**Proposed (Studio repo):** `build.protocols: [{ name: 'NodeGX Studio', schemes: ['nodegx-studio'] }]`; in main.cjs,
`app.setAsDefaultProtocolClient('nodegx-studio')`, `open-url` and `second-instance` handlers that open the folder from
`?dir=`, and `requestSingleInstanceLock()` so `launchStudioApp` can drop `-n`.
