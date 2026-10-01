---
id: P78-TPL011-INSTALLER
title: Nightbook 0.0.4 will not install over 0.0.3 on either tablet ("Nightbook cannot be closed")
status: open
severity: high
area: templates / Nightbook desktop installer (electron-builder NSIS upgrade)
found: P78 TPL-011, 2026-09-30 (Richard, on both tablets)
evidence: dev-docs/tasks/phase-78-the-templates/NEXT-SESSION-PROMPT.md top entry "2026-09-30 (TPL-011) — 0.0.4 WOULD NOT INSTALL ON EITHER TABLET"
---

On both kids' tablets, the 0.0.4 installer said Nightbook could not be closed, with the app closed and no Nightbook
in Task Manager. Retry repeated the message. After Cancel came *"Failed to uninstall old application files…: 2"*.
Both tablets are still on 0.0.3 and hold journal pages that must not be lost.

**Where:** read, not driven (there is no Windows machine here). The messages point to the old version's uninstaller
aborting during an upgrade. On `--updated`, electron-builder 26.15.3's `un.atomicRMDir` (`uninstaller.nsh`) renames
every file of `$INSTDIR` into `$PLUGINSDIR\old-install`, and one file that will not move means restore and `Abort`
(exit 2). Which file, and what holds it, is open. Ruled out: the running-app check (no "is running" message), a
Mac-built uninstaller (same bytes as the CI one apart from the version), and MAX_PATH (the longest path is 90
characters). The shell is `dev-docs/tasks/phase-78-the-templates/nightbook-desktop/shell/` (`package.json` `nsis`).
No change there since 2026-09-30. P105's Olive's Island installer is forked from this shell and may share it.

**Reproduce:** install 0.0.3 on Windows 10, use it (write a page), then run the 0.0.4 installer.

**Proposed:**
1. `resmon` › Associated Handles › "nightbook" on a tablet names the held file.
2. Add a CI Windows drive that installs a USED N−1, installs N over it, and reads the page back, before any
   installer goes to the tablets again.
3. Until then, tell Richard that an uninstall from Settings followed by a fresh install keeps the data
   (`deleteAppDataOnUninstall: false`).

Medium.
