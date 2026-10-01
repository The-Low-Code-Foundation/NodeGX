---
id: P101-INS003-ICONBTN
title: Icon-only buttons across the editor have no accessible name (the inspector's collapse button among them)
status: open
severity: medium
area: core-ui / IconButton
found: P101 INS-003 s3 (row 5), 2026-09-24; re-read at HEAD 2026-10-01
evidence: dev-docs/tasks/phase-101-the-inspector/INS-003-EVERYTHING-THAT-ASSUMED-THE-LEFT.md §5, row 5
---

A screen reader reads the inspector's collapse button, and every other icon-only button in the editor, as an
unnamed "button". `IconButton` takes no `aria-label` or `title`. The left panel's mode buttons wrap it in a
hover `Tooltip`, which does not name the button either.

**Where:** `packages/noodl-core-ui/src/components/inputs/IconButton/IconButton.tsx`. The props have no label,
and no commit has touched the file since this was found.

**Proposed:** add a required (or strongly typed optional) `label` prop rendered as `aria-label`, fill it at every
caller (a census of `<IconButton` usages), and let `Tooltip` reuse it. Pin it with a spec that renders every
caller's button and asserts a non-empty accessible name. Medium, because of the number of callers.
