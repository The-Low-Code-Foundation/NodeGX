---
id: P112-S18-HLT010CI
title: "CI's Renderer errors (HLT-010) gate fails on every tree since about 12:00 UTC on 2026-10-14 — the drive finds no `[data-test=\"preview-scope-board\"]` — including the unchanged v0.4.0 that passed it at 11:10"
status: open
severity: medium
area: CI / `scripts/renderer-errors/run.js` (the HLT-010 drive) on GitHub's ubuntu-24.04 runner; not a required check for `main`
found: P112 lane 1 s18, 2026-10-14 (PR #51, the 0.4.1 hotfix)
evidence: this file (GitHub Actions runs listed below)
---

**Measured.** Every run since about 12:00 UTC ends the same way: `MISS  the drive ran to the end — no element matching
[data-test="preview-scope-board"]`. Every REACH line before it passes (launcher card, community layer, fixture
opened, 10 components visited, 52 selections), and so do the three sentinels.

| run | tree | when (UTC) | HLT-010 |
|---|---|---|---|
| 38554022788 (PR #50) | v0.4.0 | 11:10 | pass |
| 38559120896 | cline-dev `54a0ce946` | 11:47 | pass |
| 38561795830 | cline-dev `d6414d61c` | 12:10 | **fail** |
| 38591962879 (PR #51) | v0.4.0 + two fixes + 0.4.1 | 15:45, rerun 16:0x | **fail**, fail |
| 38592527707 | cline-dev `e88ebeeec` | 15:48 | **fail** |
| 38554022788 rerun | **v0.4.0, unchanged** | ~16:10 | **fail** |

The last row is the control: the tree that passed at 11:10 fails now. So the cause is in the environment (the runner
image, a network dependency the drive or the preview reaches, or time), not in any commit. The commits between the
last pass and the first fail on `cline-dev` are lane 5's agent-server work and docs, none in the editor.

Not measured yet: what the preview-scope board waits for that CI no longer gets. Next step: run
`npm run renderer-errors` locally on v0.4.0, then read the drive step before the MISS.
