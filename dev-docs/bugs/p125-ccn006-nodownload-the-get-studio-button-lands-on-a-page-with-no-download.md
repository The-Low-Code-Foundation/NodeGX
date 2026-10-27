---
id: P125-CCN006-NODOWNLOAD
title: "Get NodeGX Studio" goes to nodegx.io/studio/, which has no download for the desktop app
status: open
severity: medium
area: nodegx-web `site/studio/`; the app's signed build (notarisation waits on Richard's Apple credentials)
found: P125 CCN-006, 2026-10-23
evidence: "`site/studio/index.html` links to GitHub and to `/#download`; `grep -ci 'dmg' site/studio/index.html` = 0. The only build is `nodegx-studio/dist/NodeGX Studio-0.1.0-arm64.dmg`, ad hoc signed, so Gatekeeper stops it after a download (README:80)."
launch: beta
---

`STUDIO_DOWNLOAD_URL` in `packages/noodl-mcp/src/studio/studioApp.ts` is the page the companion's "Get NodeGX Studio"
button and the "Get the desktop app" pill open. That page describes Studio but has no installer to download. The
offer only does its job once the page has a notarised DMG for Mac, plus the Windows and Linux builds. This is step 3
of the walk (BOARD §2), and lanes 2 and 7 own it.
