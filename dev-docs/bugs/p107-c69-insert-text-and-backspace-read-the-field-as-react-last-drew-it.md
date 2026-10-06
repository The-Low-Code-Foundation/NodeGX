---
id: P107-C69
title: Insert Text and Backspace read the field as React last drew it — one arriving in the same frame as a Value, Set, Clear or another edit works on stale text, and a Clear then a Backspace in one frame puts text back
status: fixed
commit: 580ce9e27
phase: P109
task: ISL-031
severity: high
area: runtime / Text Input (components/controls/TextInput/TextInput.tsx `edit`)
found: P107 NSP-016 s38, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.3 (row C69); measured side by side on both targets (zz probe, cases a, e, f, g, h); scenarios "two Sets and an Insert in one frame" and "Max length 3" in packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json "two Sets and an Insert in one frame are answered in the order pressed: Done, Done (the second with nothing to change, still Done), then the Insert Done on the Sets' text ('si'); Value Changed three times — the runtime's Insert reads the field before the Sets ('i', row C69)"
---

`edit` (TextInput.tsx :330-371, behind Insert Text and Backspace) reads `this.state.value` (:331) — the text React
last COMMITTED. Every write from the graph goes through `setState` (:93) inside the runtime's frame, where React commits
nothing until the frame is over, so an Insert Text or Backspace in the same frame as another write works on the text
before it, and React's last `setState` wins. Measured on the runtime target (s38):

- Value `abc` then Backspace in one frame: Backspace reads `''` → **Unchanged**; the field shows `abc`.
- Value `abc` (field was `''`), Insert Text `z` in the same frame: Value reads **`z`**, not `abcz`.
- Two Backspaces in one frame remove ONE character; two Insert Texts insert ONCE.
- **Clear then Backspace in one frame: the field ends holding `ab`** — the Backspace read `abc`, wrote `ab`, and its
  `setState` landed after the Clear's. A person's Clear button wired beside a Backspace key loses the clear.

A person's keystroke is a browser event, which React commits before it returns, so typing never sees this; only the
graph's writes do. Two Sets in one frame are fine (`setText` reads nothing from the state).

**Where:** TextInput.tsx :331 `const value = this.state.value ?? ''` and :359 `this.setText(next, …)`. The node side
(text-input.ts :463-483) is consistent off the page because it reads `props.startValue`, which it also writes.

**Proposed fix:** keep the field's text in an instance field the component writes synchronously (and mirrors into
state for the render), or read `props.startValue` (text-input.ts keeps it current on every path, `_typed` included) in
`edit` instead of `this.state.value`. Small. The spec models today's behaviour (`field` / `pending`).


## Ruled 2026-10-05 (R12, NSP-023): each write sees the last

Asked in plain words, Richard chose **"each sees the last"**: every write from the graph acts on the field as the write before it left
it. The Text Input spec v2 states it (no `field` / `pending` any more); the runtime's stale read is a **known row on the runtime target
only** (`staleEdit`, conformance.test.ts), carried by four row scenarios (Max length 3 with a Backspace and an Insert in one frame; two
Sets and an Insert; one write after another with and without a turn; the matrix's writing Insert queued behind a Clear). The proposed
fix above stands.

**Fixed 580ce9e27 (P109 ISL-031, 2026-10-06), as ruled ("each sees the last").** TextInput keeps its text (`text`) and the cursor each write leaves (`pendingCaret`) at once; `edit` reads them, not `state.value` and the element's selection. Known row gone; four scenarios unmarked. The cursor half needs a cursor placed mid-text, which the node-spec face never does: graded by two cases in packages/noodl-viewer-react/tests/gam-011-a-field-can-ask-for-a-keypad.test.tsx ("two Backspaces at 123|4 …", "a Backspace at 12|34 and an Insert Text 9 …"). Controls: red on exactly the four scenarios; HEAD's component red on both viewer cases.
