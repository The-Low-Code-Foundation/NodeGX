---
id: P107-C87
title: A Group whose Tag arrives empty (or null, 0, false) throws while React draws it, and the page stops drawing
status: open
severity: medium
area: runtime / Group (noodl-viewer-react/src/components/visual/Group/Group.tsx render — `const { as = 'div', ...props } = this.props`)
found: P107 NSP-016 s52, 2026-10-06
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.13; the first side-by-side run of the Group spec on the runtime target (a Text scenario carried over: Tag written "")
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Group.json "row C87 — a Tag written empty draws a div, as no Tag does (the runtime: React throws on the empty element name)"
---

**What a person sees.** A Group's Tag is wired from data (a list of sections whose element type is stored per row, say)
and one row has no value — an empty text, or null. The page stops drawing: React throws `"" did not match the Name
production` (or "Element type is invalid" for null), and a render error with no boundary takes the app's root down with it.

**Where.** Group.tsx takes the tag with a destructuring default, `const { as = 'div', ...props } = this.props`. A default
applies only to `undefined`, so `""`, `null`, `0` and `false` reach `React.createElement`. The Text does the same thing with
`props.as || 'div'` (Text.tsx :50) and draws a `div`.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec says what the Text does (a Tag with
no value draws a `div`), so the scenario carries `row` and the runtime's throw is counted as known (`emptyTag`).

**Proposed fix (one line).** `const Component = (props.as || 'div') as React.ElementType`, as the Text does. When it is
fixed, remove the scenario's `row` field and the C87 entry from KNOWN_ROWS in the same commit.
