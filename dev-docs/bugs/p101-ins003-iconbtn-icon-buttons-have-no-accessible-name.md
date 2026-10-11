---
id: P101-INS003-ICONBTN
title: Icon-only buttons across the editor have no accessible name (the inspector's collapse button among them)
status: fixed
phase: P109
task: ISL-044
severity: medium
area: core-ui / IconButton
found: P101 INS-003 s3 (row 5), 2026-09-24; re-read at HEAD 2026-10-01
evidence: dev-docs/tasks/phase-101-the-inspector/INS-003-EVERYTHING-THAT-ASSUMED-THE-LEFT.md §5, row 5
regression: packages/noodl-editor/tests-unit/isl-044/icon-buttons-have-a-name.test.ts (every `<IconButton` in source, .jsx included); the type of `IconButtonProps` (tsc)
---

A screen reader reads the inspector's collapse button, and every other icon-only button in the editor, as an
unnamed "button". `IconButton` takes no `aria-label` or `title`. The left panel's mode buttons wrap it in a
hover `Tooltip`, which does not name the button either.

**Where:** `packages/noodl-core-ui/src/components/inputs/IconButton/IconButton.tsx`. The props have no label,
and no commit has touched the file since this was found.

**Proposed:** add a required (or strongly typed optional) `label` prop rendered as `aria-label`, fill it at every
caller (a census of `<IconButton` usages), and let `Tooltip` reuse it. Pin it with a spec that renders every
caller's button and asserts a non-empty accessible name. Medium, because of the number of callers.

**Fixed (P109 s43, 2026-10-11).** Re-read at HEAD first: `IconButton` still rendered no `aria-label`, `title` or
text, and none of the 70-odd callers could pass one. Now `ariaLabel` is rendered as `aria-label`, and the props are
typed so a button with no `label` must have one: the compiler made the census (69 errors in core-ui's program, 68 in
the editor's). Every caller is named, 45 files, reusing a Tooltip's or title's words where the button had them. One
`.jsx` caller (the colour style picker) is outside the compiler, so a spec reads every `<IconButton` in source. It
was red on HEAD's files (about 76 unnamed). Not done: `Tooltip` still does not reuse the name, and three disclosure
carets (CollapsableSection, NodeReferencesPanel, GitStashCard) are focusable buttons whose row does the toggling.

**Read in the running editor (s43, same day):** with the project view open, all 22 `IconButton`s on screen have a
name, and every one of them gets it only from `aria-label`: none has text or a `title`, so all 22 were nameless on
HEAD. The same reading found three nameless buttons that are not `IconButton`s, all drawn icon-only in a narrow
window: the top bar's Design and Preview, and its Deploy `PrimaryButton`. Named in the follow-up commit, with an
optional `ariaLabel` on `PrimaryButton`. After it, no button on screen is nameless.
