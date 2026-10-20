---
id: P112-OWN021-UPLOADVERSION
title: Upload File gained three inputs at spec version 3, so the PR workflow's golden check would fail the 0.4.2 cut
status: fixed
commit: 11e908686
severity: medium
area: "`@nodegx/node-spec` `src/nodes/upload-file.ts`; `golden/Upload File.json`"
found: P112 OWN-021 s1, 2026-10-19 (the cut's survey: "Upload File spec stays at v3")
evidence: node scripts/node-spec/golden.js --check --base origin/main --type 'Upload File' → exit 1, 2 problems
kit: node-spec
regression: packages/nodegx-node-spec/tests/golden.test.ts
phase: P112
---

`672b8b58c` (P121's MEMBERSPHOTO and UPLOADSHRINK, committed in OWN-021 S1) added Readers, Shrink To and Photo
Quality to Upload File's spec without a version or its golden file. The package's jest suite passed (2042 / 0):
the version rule runs in `scripts/node-spec/golden.js --check`, a separate step of the PR workflow
(`.github/workflows/pr.yml`, `spec-golden:check --base "$BASE"`), and nobody had run it. Against `origin/main`:

```
✗ Upload File: the golden file is stale …
✗ Upload File: behaviour changed at version 3 — input photoQuality added; input readers added; input shrinkTo added.
```

**Fixed:** version 4 with its `changes` entry (migration `none`: each new input is empty in an app built on v3, and
an empty one sends the same request), and the golden regenerated for Upload File only. The whole check against
`origin/main`: 125 specs, 9584 scenarios fresh, the version rule held, exit 0.

Same family as *the package's own gate is not the gate CI runs* (P121-S19-PLACEHOLDERTYPE, the same week).
