---
id: P109-F18
title: A missing kit reader is reported as a missing module — the same defect as P78-D83
status: duplicate
of: P78-D83
severity: medium
area: mcp / unknown-node-type (kit overlay)
found: every worktree lane of P105, P106, P108, 2026-09-27 → 10-01 (audit P109 F18)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/AUDIT-2026-10-01.md §1 F18; IG-001 dev 8
---

With `dist/kit-extract.cjs` unbuilt, the door refuses every kit node as "ensure the module is installed". This is D83;
the ledger file for the defect is P78-D83, which ISL-014 fixes.
