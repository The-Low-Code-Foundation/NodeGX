---
id: P18-S110-NEWTAB
title: An exported Navigate with Open In New Tab ticked navigates in place
status: open
severity: medium
area: export / Navigate
found: P18 EXP-008 per-parameter check, session 110, 2026-10-15
evidence: packages/nodegx-export/parameter-ledger.json (measured silent by tests/parameter-coverage.test.ts); a hand-built translated context in session 110 scratch emitted byte-identical files and notes; ports: RouterNavigate.openInNewTab
---

Runtime: `router-navigate.ts` :58, :135 → `router.tsx` :959-963 opens the target in a new tab (`window.open(url,'_blank')`).
Export: the Navigate compile (`plan.ts` ~:12643-12691) reads only the `pm-` parameters; a Button → Navigate to `/Pages/Mood` on
cheer emits `navigate('/mood')` with the box ticked or not. External Link and Navigate To Path already honour their own
`openInNewTab` (`plan.ts` :12795, :14144), so the shape exists one node over.
