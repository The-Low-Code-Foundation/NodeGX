# ISL-031 — A control shows and reports what the person did

**Status: ⬜ not started — ✅ AC2: all 15 rulings taken 2026-10-05 (1 against the recommendation). Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 23 bugs from
the ledger (`dev-docs/bugs/`) that had no task: 1 high · 14 medium · 8 low, **15 awaiting a ruling**. **Side:** noodl-viewer-react (Text Input, Checkbox, Dropdown, Slider, Radio Button (Group), drag and drop, the shared control states)

## 1. The person sentence

**A form control shows what the person did and what the graph last said. Its Changed fires when the person changes it, and only then. It never takes the keyboard away while someone types.**

## 2. Why these belong together

P107 NSP-016 rendered each control's real React component and drove it as a person would. Every control has rows. A
Text Input loses the keyboard when Enable Label changes (C80), and Insert Text / Backspace read stale text in a busy
frame (C69). A mouse press fires no Pointer Down (C68). A Dropdown, Slider and Radio Button fire Changed with nobody
touching them (D34, D36, D37). A value written back after a person's pick does nothing (C71, C73, C76). A disabled control
still reports presses (C64). A Draggable loses its keyboard pickup after a remount (C77). A Text at Opacity 0 catches
clicks (C79). These are the controls every form is made of.

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix and the question
to ask. This table is generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P107-C69](../../bugs/p107-c69-insert-text-and-backspace-read-the-field-as-react-last-drew-it.md) | high | open | Insert Text and Backspace read the field as React last drew it — one arriving in the same frame as a Value, Set, Clear or another edit works on stale text, and a Clear then a Backspace in one frame puts text back |
| [P107-C64](../../bugs/p107-c64-a-disabled-control-still-reports-a-finger-and-a-hover.md) | medium | needs-ruling | A disabled control still reports Pressed, Pointer Down and Pointer Up for a finger, and Hover for the pointer — Enabled promises it "ignores clicks, touches and typing" |
| [P107-C66](../../bugs/p107-c66-a-checkbox-loses-its-element-when-enable-label-changes.md) | medium | needs-ruling | A Checkbox loses its root element when Enable Label is turned off — Focus then reports Unchanged, Scroll Into View says it is not mounted, while the box is on the page |
| [P107-C67](../../bugs/p107-c67-an-action-reverting-a-click-in-the-same-frame-does-not-redraw-the-checkbox.md) | medium | needs-ruling | A Check or Uncheck that reverts a person's click in the same frame does not redraw the Checkbox — the box stays as the click left it and the next click reports the opposite of what the node holds |
| [P107-C68](../../bugs/p107-c68-a-mouse-press-on-a-text-input-fires-no-pointer-down.md) | medium | open | A mouse press on a Text Input fires no Pointer Down and never sets Pressed — the component's own onMouseDown replaces the control's; a Text Area, a finger and the release still report |
| [P107-C71](../../bugs/p107-c71-a-dropdowns-value-written-back-after-a-pick-leaves-the-pick-on-the-screen.md) | medium | needs-ruling | A Dropdown's Value written back to the value React last rendered, after a person's pick, changes the output but not the selection shown — picking the shown option again then raises nothing |
| [P107-C73](../../bugs/p107-c73-a-sliders-value-written-back-after-a-slide-leaves-the-handle-where-the-person-put-it.md) | medium | needs-ruling | A Slider's Value written from the graph after a person's slide does nothing when it equals the last Value the author wrote — the handle stays where the person put it |
| [P107-C76](../../bugs/p107-c76-a-radio-groups-value-written-back-in-the-pick-frame-leaves-the-pick-selected.md) | medium | needs-ruling | A Radio Button Group's Value written back in the same frame as a person's pick leaves the picked button selected under a Value that names another — picking it again raises nothing, and picking the named one raises no Changed |
| [P107-C77](../../bugs/p107-c77-a-draggable-element-loses-its-keyboard-pickup-when-its-element-is-replaced.md) | medium | open | A Draggable element can no longer be picked up from the keyboard once its element is replaced — after Mounted goes off and on, after its Tag changes, or when it mounts more than about a second after Draggable was set |
| [P107-C79](../../bugs/p107-c79-an-invisible-element-catches-clicks-after-a-pointer-events-write.md) | medium | open | A Text at Opacity 0 catches clicks once Pointer Events Enabled or Pointer Events Mode is written after it was drawn — the style write goes straight to the DOM and the component's "opacity 0 takes no pointer" rule is never re-applied |
| [P107-C80](../../bugs/p107-c80-enable-label-takes-the-keyboard-away-from-a-text-input.md) | medium | open | Turning Enable Label on or off while someone is typing in a Text Input takes the keyboard away from them, silently — React builds a new field under the label, and Focused still says true |
| [P107-D30](../../bugs/p107-d30-focused-stays-true-after-a-control-leaves-the-page.md) | medium | needs-ruling | Focused (and Hover, Pressed) stay as they were after a control leaves the page with Mounted off — the element that comes back holds no keyboard while Focused still reads true |
| [P107-D34](../../bugs/p107-d34-a-dropdown-fires-changed-with-nobody-picking-after-a-remount-or-an-items-write.md) | medium | needs-ruling | A Dropdown fires Changed with nobody picking — a remount, or Items written again after a person's pick, takes the author's Value back and announces it as a change |
| [P107-D36](../../bugs/p107-d36-a-slider-fires-changed-with-nobody-sliding.md) | medium | needs-ruling | A Slider fires Changed with nobody sliding — a Value written from the graph, a Min or Max that clamps the value, a remount after a slide, and a slider placed with Min equal to Max |
| [P107-D37](../../bugs/p107-d37-a-radio-button-fires-changed-for-a-selection-it-did-not-get.md) | medium | needs-ruling | A Radio Button fires Changed when its Checked moves for any reason while its group's last selection was a person's — a sibling carrying the same Value picked, its own Value written in the frame of a pick, a remount after a pick |
| [P107-C72](../../bugs/p107-c72-a-text-input-converts-and-measures-with-the-props-it-last-rendered.md) | low | open | A Text Input's Clear, Backspace and frame-end writes convert with the Type, and measure room with the Max length, the component LAST RENDERED — a Type turned Number with a Clear in the same frame publishes '' where the next frame says null |
| [P107-C74](../../bugs/p107-c74-a-sliders-value-output-leaves-the-handle-past-a-lowered-max-and-off-the-step.md) | low | needs-ruling | A Slider's Value output disagrees with the handle — it keeps a slid value past a lowered Max, holds a graph value the browser rounds to the step, and Value Percent keeps its old figure when Min or Max moves |
| [P107-C75](../../bugs/p107-c75-a-slider-with-min-equal-to-max-reports-value-percent-nan.md) | low | needs-ruling | A Slider with Min equal to Max reports Value Percent NaN, and every report fires Changed |
| [P107-C78](../../bugs/p107-c78-a-keyboard-drag-drops-an-element-on-itself.md) | low | open | An element that is both Draggable and a drop zone, picked up with the keyboard, starts inside itself — Enter drops it on itself (Dropped and Landed on the same node, its own Drag Value), which the pointer can never do |
| [P107-D31](../../bugs/p107-d31-set-fires-value-changed-with-nothing-changed.md) | low | needs-ruling | Text Input's Set fires Value Changed and reports Done when the field already holds the Value — "Fires whenever the Value output changes" is not what it does |
| [P107-D32](../../bugs/p107-d32-a-text-fields-value-output-keeps-the-type-it-was-given-while-off-the-page.md) | low | needs-ruling | A text-type Text Input given a number publishes '5' (text) while on the page and 5 (a number) while off it — the Value output's type depends on whether the field is mounted |
| [P107-D33](../../bugs/p107-d33-clear-on-a-number-field-reports-unchanged-while-it-empties-the-field.md) | low | needs-ruling | Clear on a Number field reports Unchanged while it empties text the field was holding — it reads the author's Value and the output, not the field |
| [P107-D35](../../bugs/p107-d35-a-focus-action-counts-as-a-caret-the-person-placed.md) | low | open | A Focus action counts as "a caret someone placed" — on a Text Area an Insert Text then writes at the START of the text, where the browser's resting cursor is, and a field whose Type moved from Email or Number to Text inserts at the start too |

## 4. Order of work

Follow NSP-023. As it rules each control's intents (R13 Text Input "each sees the last", R14 Slider/Dropdown "where the person left it" and "the last word wins"), fix that control's rows here against the ruled intent. C80 and C64 are one shared fix each (every control).

## 5. Rules for every row

- **Re-measure first, cheaply.** Every P107 row is a *known row* on the runtime target, and
  `packages/noodl-runtime/test/node-spec/conformance.test.ts:714` asserts each one **still fires** on every run. A row
  that has stopped firing turns that test red. So run the node-spec suite before you start. A row that no longer fires was fixed
  by someone else: close it in the ledger with the commit that fixed it, and do not fix it again.
- **A `needs-ruling` row is asked before it is fixed.** P107's R3 says the runtime wins until Richard rules. Most rows
  already carry the plain-words question and a recommended fix in their evidence section (the NSP task's §6, or the P107
  README §7). Ask the rows of this task **in one batch**, plain words, one decision per question, recommendation first,
  and say what the node is in each question. Ask only when this task is next to build.
- **A fix ships alone and closes its row in the same commit:** drop the known row from the spec's runtime list, bump
  the spec's `version` with a `changes` entry that names the bug's id (P107 NSP-010, P112 OWN-010), set the ledger
  file to `status: fixed` with `commit:`, and add a `regression:` line (the scenario that now passes). `node
  scripts/bugs.js check` fails a fixed kit bug without one.
- **The export is not fixed here.** If the exported app has the same fault, write a row on P18's ledger, as P107 §8 does.

## 6. Related work and collisions

- 🔴 **P107 NSP-023 is live on exactly these controls** (2026-10-05, s45–s46). It is writing ruling notes into C73, C80,
  D34 and D36 as this file is written. NSP-023 rules the *intent* and keeps React's behaviour as a known row. It does
  **not** fix the runtime. This task does that, **one control at a time, after NSP-023 has finished with it**. Check
  `git status dev-docs/bugs` and NSP-023's status line before you start a control.
- C65 and C70 (Checkbox / Dropdown crashes on a wrong-kind wire) are in ISL-026.
- Sweep rule: this task was made from the ledger, **not re-measured** when it was written (2026-10-05). The first session
  re-measures each row (§5) and closes the ones already fixed before it asks or builds anything.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled. A row ruled "keep it" becomes `wontfix` with the
  ruling as its `reason:`, or moves to [ISL-033](ISL-033-A-NODES-DESCRIPTION-SAYS-WHAT-IT-DOES.md) when the ruling is
  "describe it, don't change it".
- **AC3** — every row ruled "fix it" is fixed, one commit each (or one per shared mechanism), with its regression
  (`regression:` in the ledger) green and its known row dropped in the same commit.
- **AC4** — `node scripts/bugs.js --from P107` and `--from P109` list none of this task's rows as `open` or `needs-ruling`.

## 8. Rulings (2026-10-05)

Richard ruled every `needs-ruling` row of this task on the [Track F rulings page](https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH). Each card asked one plain-words
question with the options below; the full card is quoted in the bug's ledger file. **Build what is ruled.** A wording-only
ruling is still this task's work: the description changes, the node does not.

| bug | ruled | as recommended | what it means |
|---|---|---|---|
| P107-C64 | Ignore touches, keep hover | yes | A finger on a disabled control reports nothing, exactly as the description promises. Hover still reports, so a tooltip that explains why a button is disabled keeps working. Small change in one shared file, felt by every control. |
| P107-C66 | Fix it with the label work | yes | Focus and Scroll Into View keep working whatever the label does. About one line in each of the three controls, built alongside the label fix already scheduled. Nothing that works today depends on the lost element. |
| P107-C67 | Draw the last word | yes | The box always shows what the node holds, so an app can refuse or undo a tick and the person sees it. Small change in the Checkbox's two files. |
| P107-C71 | Fix it now | yes | Every Value from the app moves the selection, including one equal to an earlier write, so a Reset works after a pick. Small change in the Dropdown's two files. |
| P107-C73 | Fix it now | yes | Every Value from the app moves the handle, so a Reset works after a slide. Small change in one file: the new Value is compared with where the handle is. |
| P107-C76 | Show what Value says | yes | The buttons read the group's Value directly, so every write redraws them and the next pick fires Changed. Medium change in the group's two files; the group's description work loses two checks that model today's behaviour. |
| P107-D30 | Reset and announce | yes | The outputs describe the page, and logic waiting for Blurred runs. Small change in shared code, felt by every control. An app that validates or saves on Blurred will now also do so when the field is hidden. |
| P107-D34 | Fix it now | yes | The pick survives hiding and a refreshed list, and Changed fires only for a person's pick. Small to medium change in the Dropdown's two files. An app that relied on Changed firing at load stops getting it. |
| P107-D36 | Fix it now | yes | Writes from the app move the handle and report Value without Changed, and a hidden Slider keeps its place. Small to medium change in two files. An app that relied on Changed firing at load stops getting it. |
| P107-D37 | Fire from the click | yes | Changed comes from the person's click, and a button that loses the selection to that click reports the deselect. Small to medium change in the button's and the group's files. Two buttons with the same Value would still both show as selected. |
| P107-C74 | Follow the handle | yes | After Min, Max or Step change, and after a Value write, the value is clamped and rounded to the step as the browser draws it, and reported without firing Changed. A Value of 33.5 with Step 1 then reads 34. Moderate change in one file. |
| P107-C75 | Percent 0, defaults for blanks | yes | Value Percent reads 0 when Min equals Max, where the browser draws the handle. A blank Min or Max counts as 0 or 100, as the browser does. Small change in one file. |
| P107-D31 | Keep it, fix the description | **no** | Nothing changes in apps. Value Changed is described as firing whenever Set or a person writes into the field, changed or not. |
| P107-D32 | Always text | yes | Value has one type whatever the field's visibility. One-word change on the hidden path. |
| P107-D33 | Check the field's text | yes | Clear reports Done whenever it empties something. Small change in one file. |
