---
id: P109-F42
title: The Nightbook desktop app has no menu on a Mac, so Cmd+Q does not quit and Cmd+C / Cmd+V do nothing in a text box
status: scheduled
phase: P91
task: DSK-009
severity: medium
area: desktop shell / Nightbook (Electron menu)
found: P105 CG-004 §8 s3, 2026-09-28 (audit P109 F42)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/AUDIT-2026-10-01.md §1 F42 and README §5; dev-docs/tasks/phase-105-the-coding-garden/CG-004-THE-SHELL-AND-THE-MODEL.md:368-370
---

On a Mac, a person writing in Nightbook cannot paste into a text box or quit with Cmd+Q: the shell removes the
application menu, and on macOS Electron's Edit shortcuts and Quit come from that menu. **Inferred from Electron's
documented behaviour, not measured** (CDP cannot press accelerators); Windows is unaffected.

**Where:** `dev-docs/tasks/phase-78-the-templates/nightbook-desktop/shell/main.js:296` —
`Menu.setApplicationMenu(null)`. Still there at HEAD `d2b2f0101`. The garden's shell already fixed its own copy
(`phase-105-the-coding-garden/garden-desktop/shell/copies.js:599`: app menu with `role: 'quit'` plus `role: 'editMenu'`
on darwin), which is the reference.

**Reproduce:** by hand on a Mac — open the packaged Nightbook, type in a text box, press Cmd+V; press Cmd+Q.

**Proposed:** an app menu and Edit menu by role on darwin (copy the garden's). Small. P91's product shell (DSK-009)
should carry it, checked by hand.
