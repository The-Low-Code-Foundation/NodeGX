---
id: P109-S12-WORKTREEVIEWER
title: render_report answers "The viewer bundle is missing" for every agent round run from a worktree
status: fixed
commit: 97a53c579
severity: low
area: tooling / scripts/devtools/make-worktree.sh
found: P109 s12, 2026-10-03 (both agent rounds; also met in ISL-014 s4)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-015-A-KIT-AUTHOR-READS-THE-TRAPS-BEFORE-MEETING-THEM.md §8 s12
---

The server resolves `render-report.js` beside itself and probes `packages/noodl-editor/src/external/viewer`, a
gitignored build output `make-worktree.sh` did not link. Three agents in two sessions lost their one visual check
to it; the stranger said so and called its work verified "by graph inspection" only. **Fixed:** the script links
it (making the ignored parent first); a render through the worktree's server returned a full report after.
