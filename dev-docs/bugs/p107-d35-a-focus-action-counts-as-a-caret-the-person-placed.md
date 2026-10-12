---
id: P107-D35
title: A Focus action counts as "a caret someone placed" — on a Text Area an Insert Text then writes at the START of the text, where the browser's resting cursor is, and a field whose Type moved from Email or Number to Text inserts at the start too
status: fixed
commit: 7a92ec4b1
phase: P109
task: ISL-031
severity: low
area: runtime / Text Input (components/controls/TextInput/TextInput.tsx `caret` :304-316, `hadCaret` :177-180)
found: P107 NSP-016 s40, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.5 (row D35); the 10,000-sequence runtime deep run (TEXT-INPUT-DEEP-RUN-2026-10-04.md, seeds 3064539079 and 3033132983), replayed on both targets and the caret measured through jsdom (s40 zz probes D1, D5, P1–P6)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json "a Text Area's cursor rests at the END of its text: a Focus action then an Insert Text 'x' writes 'abcx'; typing 'y' goes in after it ('abcxy'); Backspace removes the 'y' before the cursor; after a Blur action the Insert still lands at the cursor ('abcxx') (was row D35: the runtime's Text Area rested it at the START, 'xabc'; fixed in P109 ISL-031)"
---

`edit` (Insert Text, Backspace) writes at the element's selection once `hadCaret` is set, and `hadCaret` is set by the
element's `onFocus` (TextInput.tsx :177-180) — by a person's click or Tab, and equally by the node's **Focus action**
(`_focus` → `el.focus()`), which places no caret. Where the browser's cursor rests then is HTML's:

- a `<textarea>` React mounted holds its text as default content, and its text entry cursor is at **0**: a Text Area
  given a Focus action and then an Insert Text (an on-screen keypad's key) writes at the START of what it holds —
  `'x' + 'abc'` — and a Backspace there removes nothing. An `<input>` is different only because React assigns its value
  through the setter, which moves the cursor to the end.
- a field whose Type moves from Email or Number (types without the selection API) to Text has its cursor reset to the
  start by HTML's type change steps: typed `a`, Type → Text, Insert Text `bc` gives `bca`.

In a browser a person would SEE the cursor at the start after the Focus action, so this is the browser's rule faithfully
applied; the question is whether the component should treat a Focus ACTION as a caret the person placed. The GAM-011
docblock's intent ("a field that has held focus has a caret someone placed") reads as a person's focus.

**Possible rulings:** (a) keep it — the author who wants the end can send a Blur, or the Focus action can be documented
as leaving the cursor where the browser rests it; (b) set `hadCaret` only from a person's event (the act's `onFocus`
with `e.isTrusted`, or a pointer / keyboard flag), so an Insert Text after a Focus action appends as it does before any
focus; (c) have the Focus action move the cursor to the end (`setSelectionRange(len, len)` in `_focus`), which is what a
click past the text does. The spec models today's behaviour (`caret`, `hadCaret`).


## Ruled 2026-10-05 (R12, NSP-023): the cursor rests at the end

Asked in plain words ("where does the cursor sit in a field nobody has clicked in?"), Richard chose **"at the end, both"**: a one-line
field and a Text Area alike. A keypad wired to Focus + Insert Text appends. The Text Input spec v2 states it; the runtime's Text Area,
whose cursor rests at the start, is a **known row on the runtime target only** (`textAreaRestsAtStart`, conformance.test.ts), carried by
three row scenarios. The second case above (a Type moved from Email or Number to Text puts the cursor at the start) is HTML's type
change steps and stays in the spec: it was not part of the question. Fix: put the cursor at the end when the component mounts a
`<textarea>` (or when a Focus action meets a field with no caret placed — ruling (c) above).

**Fixed 7a92ec4b1 (P109 ISL-031, 2026-10-06), as ruled ("at the end, both").** When a <textarea> attaches, TextInput puts its cursor at the end, once per element. The second case in this file (a Type moved from Email or Number to Text puts the cursor at the start) is HTML's and stays, as ruled. Control: without it, red on exactly the 3 D35 scenarios.
