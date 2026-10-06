---
id: P107-C80
title: Turning Enable Label on or off while someone is typing in a Text Input takes the keyboard away from them, silently — React builds a new field under the label, and Focused still says true
status: fixed
commit: 94b83d7ea
phase: P109
task: ISL-031
severity: medium
area: runtime / Text Input, Checkbox, Dropdown (TextInput.tsx render :233-281, Checkbox.tsx :167-210, Select.tsx :223-252); the Radio Button shares the Checkbox's tree
found: P107 NSP-023 s45, 2026-10-05 (modelled as spec behaviour since NSP-016 s38; ruled the other way 2026-10-05)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-023-THE-SPEC-WITHOUT-REACT.md §8; scenarios "focused, then Enable Label turned on: the field and the keyboard on it stay …" and "focused and a finger held across a frame, then Enable Label turned on …" in packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json "focused, then Enable Label turned on: the field and the keyboard on it stay — a Focus action is Done with nothing more; turned off again, the same — the runtime rebuilds the input under the label and the keyboard leaves with the old one, silently (a Focus fires Focused again: was row C80, fixed in P109 ISL-031)"
---

**What a person sees.** Someone is typing in a Text Input. The app turns its label on (or off), for example to show an error. The
cursor vanishes from the field: the next key goes nowhere. Nothing tells the app: **Focused** still reads true and **Blurred** never
fires, so a Focus action has to be sent to put the keyboard back, and a Blur action finds nothing to blur.

**Where.** TextInput.tsx :233-281: without a label the component returns the input's wrapper `<div>`; with one it returns an outer
`<div>` holding a `<label>` and that wrapper. React compares the trees by position, finds a different element at the root, and makes the
wrapper and the `<input>` (or `<textarea>`) anew. The browser fires no blur for an element removed from the page, and `utils.ts` never
resets Focused (row D30's silence).

**Ruled 2026-10-05 (R12, NSP-023).** Asked in plain words, Richard chose **"keeps the keyboard"**: showing or hiding a label does not
touch the field. The Text Input spec v2 states it; the runtime's behaviour is a **known row on the runtime target only**
(`labelTakesKeyboard`, `packages/noodl-runtime/test/node-spec/conformance.test.ts`), carried by two row scenarios. A change between Text
Area and a one-line Type still replaces the element (a different element in any renderer): not this row.

**The Checkbox and the Dropdown too (ruled the same day: "Yes, all three").** Their label changes the tree the same way (Checkbox.tsx
:167-210, Select.tsx :223-252); their specs (v2) say the keyboard stays, and `labelTakesKeyboard` is in both runtime row lists, one
row scenario on the Checkbox and two on the Dropdown. The Radio Button shares the Checkbox's tree and still models the rebuild: NSP-023
step 5 takes it. C66 (label on then off loses the Checkbox's and the Dropdown's root element) is a different defect and stays.

**Fix.** Render the same tree either way, so the input keeps its place: always the outer `<div>`, the `<label>` only when on (or a keyed
wrapper). Small, once per component (Text Input, Checkbox, Dropdown, Radio Button).

**s46 (2026-10-05): the Radio Button too** — Richard: "Yes, same rule" (R14). Its spec still models the rebuild; NSP-023 step 5
takes it out and adds the C80 row to the Radio Button's runtime list.

**s47 (2026-10-06): the Radio Button takes the same rule** (R14; NSP-023 §8.6, the Radio Button v2). Its spec drops
`wantsLabel` / `labelOn`, and the runtime knows the row through the shared `labelTakesKeyboard` matcher (10 row scenarios).
The Dropdown's 10,000 at seed 20732 found the matcher blind to a node PLACED with the label on: the placing is a paint, a
Focus before the first frame waits for the element it drew, and a label written off before the first frame drops the
keyboard. The matcher now starts from the placing's label (NSP-023 §8.5).

**Fixed 94b83d7ea (P109 ISL-031, 2026-10-06), as ruled, on all four controls.** One tree either way: the outer <div> always, the label in its slot or null; without a label the outer div is `display: contents` and the wrapper is the root with its old styles, so an unlabelled control lays out as before. Root styles the node wrote straight onto the old root are blanked on the element that is no longer the root (noodl-root-ref.ts `clearedRootStyles`) — found by the Radio Button's "hidden, holding the keyboard" scenario, now added to the other three. Control: HEAD's components red on exactly the 18 C66 / C80 scenarios; without the clearing, on exactly the four hidden ones. Not measured: layout in a real browser.
