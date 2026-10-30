---
id: P112-OWN034-INPUTHIT
title: A Text Input's drawn box is taller than the part that takes a tap: a press on its padding focuses nothing
status: fixed
commit: PENDING
severity: medium
area: runtime / Text Input (packages/noodl-viewer-react/src/components/controls/TextInput/TextInput.tsx, the `inputWrapper` div at :296–303)
found: P112 OWN-034 s2, 2026-10-30 (D·kit round 1, B13 on a 390 px phone)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-034/RESULTS.md §3; runs/d-kit-1/ (grade/grade.json B13, grade/phone.png)
phase: P112 OWN-034
kit: node-spec
regression: packages/noodl-viewer-react/tests/own034-inputhit-a-press-on-the-padding-takes-the-keyboard.test.tsx
---

What happened: DeepSeek built a habit tracker with the NodeGX kit (0.2.8). The grader's phone check (B13) failed it
with `too small: the name field 257×22`. On the phone screenshot, the field is a bordered box about 40 px tall.

Measured in the running preview at 390 px (headless Chrome, `mobile: true`):

| | box (CSS px) |
|---|---|
| the `<input>` | 257 × 22 |
| its `inputWrapper` div (the box a person sees: 1 px border, padding 8 px 12 px) | 283 × 40 |

| a real press at | lands on | focused afterwards |
|---|---|---|
| the centre of the `<input>` | `INPUT` | `INPUT` |
| the wrapper, 4 px below its top edge | `DIV[noodl-style-tag=inputWrapper]` | `BODY` |
| the wrapper, 4 px above its bottom edge | `DIV[noodl-style-tag=inputWrapper]` | `BODY` |

So on this field, a band 9 px deep at the top and the bottom, and 13 px wide at each side, is drawn as part of the
field but does nothing when pressed. On a phone, a thumb that lands near the field's edge does not get the keyboard.

Why: the node's padding and border go on the wrapper `div`, but only the `<input>` inside it takes a press. Nothing
on the wrapper moves focus to the input. The only `this.focus()` handler is on the optional icon (`_renderIcon`,
:170). A `<label>` does not cover the box either: it is a separate element above the box, and it appears only with
Enable Label on.

This is not specific to that app. Any Text Input with padding has the band, so every NodeGX form has it on a phone.

Fix, for whoever owns the controls: on the wrapper, a press whose target is the wrapper itself (not the input or the
icon) should focus the input, keeping the default caret placement inside the input. That is the way a native field's
padding behaves. The Text Area shares the component and needs the same. Add a node-spec scenario: a press on the
padding puts the keyboard on the field and fires Focused. Note how P107-C68 (onMouseDown on the input) interacts with
that scenario.

Not fixed in OWN-034. It is a race lane, and this does not block any of its acceptance criteria. D·kit round 1's B13
fail stands as measured.

## Fixed (2026-10-30)

The `inputWrapper` div has an `onMouseDown`. A primary-button press that lands in the box but not on the field (the
padding, the border, an icon) cancels the mousedown's default action, which would move the keyboard to the body, and
focuses the field. It also adds the same `preventGlobalFocusChange` listener the field's own mousedown adds. A
disabled field takes nothing. The Text Area shares the code. A press on the field itself is left alone, so P107-C68's
Pointer Down still runs there.

| test (`own034-inputhit-…test.tsx`, a real node rendered into jsdom) | handler off | handler on |
|---|---|---|
| a press on the field (the known-firing control) | focused, Focused ×1 | focused, Focused ×1 |
| a press on the wrapper | not focused | focused, Focused ×1 |
| the same for a Text Area | not focused | focused |
| a press on a disabled field's wrapper | nothing | nothing |

No node-spec scenario. The spec's press acts land on the control and it has no geometry, so it cannot say "the
padding". Not done: a press on the padding fires no Pointer Down or Pressed (those handlers stay on the field), and
it was not driven on a phone. **Not yet in the kit:** apps get it when the viewer is next built into
`@nodegx/preview`.
