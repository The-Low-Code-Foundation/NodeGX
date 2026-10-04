---
id: P107-C70
title: A Dropdown whose Items is wired a value that is not a list — the legacy string form included — or a list holding null crashes the page's render
status: needs-ruling
severity: high
area: runtime / Dropdown (components/controls/Select/Select.tsx, nodes/controls/options.ts)
found: P107 NSP-016 s39, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.4 (row C70); the Dropdown's generated run at seed 13 (sequences 303991510, 216769170, 3369803677 — `items: "x"`)
kit: node-spec
regression: packages/noodl-runtime/test/node-spec/conformance.test.ts "NSP-016 §6 C70"
---

A Dropdown whose **Items** input receives a truthy value that is not an array — a string, a number, `true`, a
record — throws inside React's render the next time the page paints: `props.items.findIndex is not a function`
(Select.tsx :60, reached whenever a Value is held) or `props.items.map is not a function` (:118). A list that holds a
`null` throws at :119 reading `.Value` of it. In the app that is the React root erroring: the whole page, not one
node. `null`, `undefined`, `''`, `0` and `false` are safe (:117 `if (props.items)`; options.ts :160 ignores undefined).

The string case is the one an author meets: `items` was an `array` port holding a JSON string before it became an
`optionslist` (options.ts :122-172), the editor's codec still decodes that legacy form (:332-362 `readItems`, editor
side only), and a Text node, a Variable or a backend field wired into Items delivers a string to the runtime, where
nothing decodes it.

**Where:** `packages/noodl-viewer-react/src/components/controls/Select/Select.tsx` :60 (`findIndex`), :118 (`map`),
:119 (`i.Value` on each item); `nodes/controls/options.ts` :158-171 (the setter keeps whatever arrives).

**Reproduce:** `{ "set": "items", "value": "x" }` then any paint (a settle or a person's act) on the runtime target.

**Proposed fix:** normalise in the setter — a string parsed as JSON (what `readItems` does for the editor), anything
that is not an array after that treated as no options, `null` items dropped — so the render only ever sees a list.
The spec models the intent (no options) and the runner knows the row.
