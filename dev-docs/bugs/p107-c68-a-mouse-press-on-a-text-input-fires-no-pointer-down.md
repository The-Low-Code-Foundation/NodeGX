---
id: P107-C68
title: A mouse press on a Text Input fires no Pointer Down and never sets Pressed — the component's own onMouseDown replaces the control's; a Text Area, a finger and the release still report
status: fixed
commit: 7a92ec4b1
phase: P109
task: ISL-031
severity: medium
area: runtime / Text Input (components/controls/TextInput/TextInput.tsx)
found: P107 NSP-016 s38, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.3 (row C68); scenario "a mouse press on the field puts the keyboard on it (Focused) and fires NO Pointer Down" in packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json "a mouse press on the field fires Pointer Down with Pressed true and puts the keyboard on it (Focused); the release fires Pointer Up with Pressed false; a click is the same pair (was row C68: the runtime's one-line field fired neither; fixed in P109 ISL-031)"
---

A mouse button going down on a Text Input moves nothing on **Pressed** and fires no **Pointer Down**; the release still
fires **Pointer Up** (and writes Pressed false), a finger still fires both and sets Pressed, and a Text Area fires all of
them. The control's shared pointer handlers (controls/utils.ts :255-259, :285-293) are spread onto the `<input>` and
then overridden.

**Where:** `packages/noodl-viewer-react/src/components/controls/TextInput/TextInput.tsx` :202-204 — `{...inputProps}`
carries the control's `onMouseDown` (from `Utils.controlEvents`), and the `<input>` then sets its own
`onMouseDown={() => window.addEventListener('click', preventGlobalFocusChange, true)}` after the spread, which wins.
The `<textarea>` branch (:211-221) sets none, so it keeps the control's. The component's handler also skips the
pointer wrapper's drain (pointerlisteners.ts :173-186), so a mousedown on a Text Input does not update the graph in
the same frame while every other control's does.

**Reproduce:** the scenario named above on the runtime target; compare with "a Text Area: a press fires Pointer Down".

**Proposed fix:** compose — `onMouseDown={(e) => { inputProps.onMouseDown?.(e); window.addEventListener(...) }}` — one
line. The spec models today's behaviour (press on an `<input>`: the keyboard moves, nothing else).


## Ruled 2026-10-05 (R12, NSP-023): Pointer Down fires

Asked in plain words, Richard chose **"Pointer Down fires"**: the Pointer Down description ("fires as a mouse button or finger goes
down on this control") is the intent. The Text Input spec v2 (`packages/nodegx-node-spec/src/nodes/text-input.ts`) states it: a mouse
press on a one-line field fires Pointer Down, sets Pressed and drains the frame, as a Text Area's and a finger's do. The runtime's
behaviour is now a **known row on the runtime target only** (`mousePressOnOneLine`, `packages/noodl-runtime/test/node-spec/conformance.test.ts`),
carried by 15 row scenarios in `scenarios/net.noodl.controls.textinput.json` (14 beside a Text Area twin the runtime passes; the first beside the Text Area press scenario that was already there). The
proposed fix above stands: compose the two handlers (one line).

**Fixed 7a92ec4b1 (P109 ISL-031, 2026-10-06), as ruled.** The <input> runs the control's onMouseDown, then its own (which arms preventGlobalFocusChange): a mouse press on a one-line field fires Pointer Down, sets Pressed and drains, as a Text Area does. The known row is gone from conformance.test.ts and its 15 scenarios lost their marks. Control: without the compose, red on exactly those 15 and 13 generated sequences.
