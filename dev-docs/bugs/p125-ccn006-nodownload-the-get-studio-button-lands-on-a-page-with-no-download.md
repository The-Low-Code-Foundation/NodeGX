---
id: P125-CCN006-NODOWNLOAD
title: "Get NodeGX Studio" goes to nodegx.io/studio/, which has no download for the desktop app
status: open
severity: medium
area: nodegx-web `site/studio/`; the app's signed build (notarisation waits on Richard's Apple credentials)
found: P125 CCN-006, 2026-10-23
evidence: "`site/studio/index.html` links to GitHub and to `/#download`; `grep -ci 'dmg' site/studio/index.html` = 0. The only build is `nodegx-studio/dist/NodeGX Studio-0.1.0-arm64.dmg`, ad hoc signed, so Gatekeeper stops it after a download (README:80)."
launch: beta
owner: Beta sweep s18 (2026-10-27)
---

`STUDIO_DOWNLOAD_URL` in `packages/noodl-mcp/src/studio/studioApp.ts` is the page the companion's "Get NodeGX Studio"
button and the "Get the desktop app" pill open. That page describes Studio but has no installer to download. The
offer only does its job once the page has a notarised DMG for Mac, plus the Windows and Linux builds. This is step 3
of the walk (BOARD §2), and lanes 2 and 7 own it.

**Beta sweep s18 (2026-10-27): built up to Richard's three steps; still open.** Measured first: nodegx-studio has no
tag and no release (`api.github.com/repos/The-Low-Code-Foundation/nodegx-studio/releases` = `[]`), and its CI kept
the installers as workflow artifacts only, which need a GitHub sign-in and expire. Built:
- **nodegx-studio** 75c8d63 (not pushed): `build.artifactName` `NodeGX-Studio-${os}-${arch}.${ext}` (no version, so a page
  can link `releases/latest/download/<name>`; a local `npm run dist` made `NodeGX-Studio-mac-arm64.dmg` / `.zip`); the
  package workflow's new `release` job, on a `v*` tag that matches package.json, makes a **draft** release holding the
  dmg, zip, exe and AppImage, and fails naming any that is missing; on a tag, the macOS leg **refuses to build
  without the Apple secrets** (an ad-hoc build is what Gatekeeper stops, so it is not released).
- **nodegx-web** 1439284 (committed, NOT deployed): `/studio/` has a Download section (`#download`) with the three
  installers and the Gatekeeper / SmartScreen / AppImage notes; the hero's first button goes there.
- **NodeGX**: `STUDIO_DOWNLOAD_URL` is `https://nodegx.io/studio/#download` (reaches the companion with the next
  `@nodegx/mcp`).

**Waits on Richard, in order:** (1) the five Apple secrets in nodegx-studio's repository settings (CSC_LINK,
CSC_KEY_PASSWORD, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID); (2) push nodegx-studio and tag `v0.1.0`, then
publish the draft the workflow makes; (3) deploy nodegx-web, after `curl -sIL` on the page's three links reads 200.
Deploying before (2) puts three 404s on the page. Gaps the page says: no Intel Mac build, Windows unsigned. The
canon's "Get the tools" names nodegx.io/start for Studio: P128 S8's download block there can link these same files.
