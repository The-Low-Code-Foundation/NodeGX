# ISL-031 — A control shows and reports what the person did

**Status: ✅ s31 (2026-10-08): 23 of 23 fixed — C77 landed (`167c40e9c`), the spec remodelled as P107 ruled, graded on the runtime at seeds 13 and 20732 with a control (§12). s30 (2026-10-08): 22 of 23 fixed — C79 (`7496d93f0`) and C78 (`23d91e383`) landed, each graded on the runtime at seeds 13 and 20732 with a control (§11); C77 built and parked on branch `p109-c77-wip` (its spec change strands ~630 mutants; P107 ruled: remove the dead model, §11). s28 (2026-10-07): 20 of 23 fixed — D30 landed as `32e1856b0` (built s27 on `p109-d30`; rebased over P107's Group v2 and re-graded, then fast-forwarded). s27: 19 of 23 fixed — the Slider's four in two commits (§10: C73 + D36 `21b27462d`, C74 + C75 `c92fa2afa`, Slider spec v3) and the shared C64 (`d8a9f0069`, six control specs); D30 built and graded on worktree branch `p109-d30`; left: the Text's drag rows C77, C78, C79. s26 (2026-10-06/07): 14 of 23 fixed, each with a control (§9) — the Text Input's eight, the label work on four controls (C80, C66), the Checkbox's C67, the Dropdown's C71 + D34, the radio pair's C76 + D37. ✅ AC2: all 15 rulings taken 2026-10-05 (1 against the recommendation). Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 23 bugs from
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
| [P107-C69](../../bugs/p107-c69-insert-text-and-backspace-read-the-field-as-react-last-drew-it.md) | high | fixed `580ce9e27` | Insert Text and Backspace read the field as React last drew it — one arriving in the same frame as a Value, Set, Clear or another edit works on stale text, and a Clear then a Backspace in one frame puts text back |
| [P107-C64](../../bugs/p107-c64-a-disabled-control-still-reports-a-finger-and-a-hover.md) | medium | fixed `d8a9f0069` | A disabled control still reports Pressed, Pointer Down and Pointer Up for a finger, and Hover for the pointer — Enabled promises it "ignores clicks, touches and typing" |
| [P107-C66](../../bugs/p107-c66-a-checkbox-loses-its-element-when-enable-label-changes.md) | medium | fixed `94b83d7ea` | A Checkbox loses its root element when Enable Label is turned off — Focus then reports Unchanged, Scroll Into View says it is not mounted, while the box is on the page |
| [P107-C67](../../bugs/p107-c67-an-action-reverting-a-click-in-the-same-frame-does-not-redraw-the-checkbox.md) | medium | fixed `b07b2a5a4` | A Check or Uncheck that reverts a person's click in the same frame does not redraw the Checkbox — the box stays as the click left it and the next click reports the opposite of what the node holds |
| [P107-C68](../../bugs/p107-c68-a-mouse-press-on-a-text-input-fires-no-pointer-down.md) | medium | fixed `7a92ec4b1` | A mouse press on a Text Input fires no Pointer Down and never sets Pressed — the component's own onMouseDown replaces the control's; a Text Area, a finger and the release still report |
| [P107-C71](../../bugs/p107-c71-a-dropdowns-value-written-back-after-a-pick-leaves-the-pick-on-the-screen.md) | medium | fixed `5d40a7aa3` | A Dropdown's Value written back to the value React last rendered, after a person's pick, changes the output but not the selection shown — picking the shown option again then raises nothing |
| [P107-C73](../../bugs/p107-c73-a-sliders-value-written-back-after-a-slide-leaves-the-handle-where-the-person-put-it.md) | medium | fixed `21b27462d` | A Slider's Value written from the graph after a person's slide does nothing when it equals the last Value the author wrote — the handle stays where the person put it |
| [P107-C76](../../bugs/p107-c76-a-radio-groups-value-written-back-in-the-pick-frame-leaves-the-pick-selected.md) | medium | fixed `8dbeb8f33` | A Radio Button Group's Value written back in the same frame as a person's pick leaves the picked button selected under a Value that names another — picking it again raises nothing, and picking the named one raises no Changed |
| [P107-C77](../../bugs/p107-c77-a-draggable-element-loses-its-keyboard-pickup-when-its-element-is-replaced.md) | medium | fixed `167c40e9c` | A Draggable element can no longer be picked up from the keyboard once its element is replaced — after Mounted goes off and on, after its Tag changes, or when it mounts more than about a second after Draggable was set |
| [P107-C79](../../bugs/p107-c79-an-invisible-element-catches-clicks-after-a-pointer-events-write.md) | medium | fixed `7496d93f0` | A Text at Opacity 0 catches clicks once Pointer Events Enabled or Pointer Events Mode is written after it was drawn — the style write goes straight to the DOM and the component's "opacity 0 takes no pointer" rule is never re-applied |
| [P107-C80](../../bugs/p107-c80-enable-label-takes-the-keyboard-away-from-a-text-input.md) | medium | fixed `94b83d7ea` | Turning Enable Label on or off while someone is typing in a Text Input takes the keyboard away from them, silently — React builds a new field under the label, and Focused still says true |
| [P107-D30](../../bugs/p107-d30-focused-stays-true-after-a-control-leaves-the-page.md) | medium | fixed `32e1856b0` | Focused (and Hover, Pressed) stay as they were after a control leaves the page with Mounted off — the element that comes back holds no keyboard while Focused still reads true |
| [P107-D34](../../bugs/p107-d34-a-dropdown-fires-changed-with-nobody-picking-after-a-remount-or-an-items-write.md) | medium | fixed `5d40a7aa3` | A Dropdown fires Changed with nobody picking — a remount, or Items written again after a person's pick, takes the author's Value back and announces it as a change |
| [P107-D36](../../bugs/p107-d36-a-slider-fires-changed-with-nobody-sliding.md) | medium | fixed `21b27462d` | A Slider fires Changed with nobody sliding — a Value written from the graph, a Min or Max that clamps the value, a remount after a slide, and a slider placed with Min equal to Max |
| [P107-D37](../../bugs/p107-d37-a-radio-button-fires-changed-for-a-selection-it-did-not-get.md) | medium | fixed `8dbeb8f33` | A Radio Button fires Changed when its Checked moves for any reason while its group's last selection was a person's — a sibling carrying the same Value picked, its own Value written in the frame of a pick, a remount after a pick |
| [P107-C72](../../bugs/p107-c72-a-text-input-converts-and-measures-with-the-props-it-last-rendered.md) | low | fixed `580ce9e27` | A Text Input's Clear, Backspace and frame-end writes convert with the Type, and measure room with the Max length, the component LAST RENDERED — a Type turned Number with a Clear in the same frame publishes '' where the next frame says null |
| [P107-C74](../../bugs/p107-c74-a-sliders-value-output-leaves-the-handle-past-a-lowered-max-and-off-the-step.md) | low | fixed `c92fa2afa` | A Slider's Value output disagrees with the handle — it keeps a slid value past a lowered Max, holds a graph value the browser rounds to the step, and Value Percent keeps its old figure when Min or Max moves |
| [P107-C75](../../bugs/p107-c75-a-slider-with-min-equal-to-max-reports-value-percent-nan.md) | low | fixed `c92fa2afa` | A Slider with Min equal to Max reports Value Percent NaN, and every report fires Changed |
| [P107-C78](../../bugs/p107-c78-a-keyboard-drag-drops-an-element-on-itself.md) | low | fixed `23d91e383` | An element that is both Draggable and a drop zone, picked up with the keyboard, starts inside itself — Enter drops it on itself (Dropped and Landed on the same node, its own Drag Value), which the pointer can never do |
| [P107-D31](../../bugs/p107-d31-set-fires-value-changed-with-nothing-changed.md) | low | fixed `a969b4b31` | Text Input's Set fires Value Changed and reports Done when the field already holds the Value — "Fires whenever the Value output changes" is not what it does |
| [P107-D32](../../bugs/p107-d32-a-text-fields-value-output-keeps-the-type-it-was-given-while-off-the-page.md) | low | fixed `0a6bb1d90` | A text-type Text Input given a number publishes '5' (text) while on the page and 5 (a number) while off it — the Value output's type depends on whether the field is mounted |
| [P107-D33](../../bugs/p107-d33-clear-on-a-number-field-reports-unchanged-while-it-empties-the-field.md) | low | fixed `70621abcc` | Clear on a Number field reports Unchanged while it empties text the field was holding — it reads the author's Value and the output, not the field |
| [P107-D35](../../bugs/p107-d35-a-focus-action-counts-as-a-caret-the-person-placed.md) | low | fixed `7a92ec4b1` | A Focus action counts as "a caret someone placed" — on a Text Area an Insert Text then writes at the START of the text, where the browser's resting cursor is, and a field whose Type moved from Email or Number to Text inserts at the start too |

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

## 9. Session 26 (2026-10-06/07) — fourteen of twenty-three

**AC1, re-measured** (the five control specs on the runtime at seed 20732, before any change): every known row still fired
(the Text Input's C68 ×13, C72, C69 in generated sequences; the rest in their row scenarios). Three reds were not this task's:
one surviving mutant each on the Text Input (`person.release`, still there at 20732 at the end, gone at seed 13) and the Slider
(`world.place`), and a Text matrix scenario where the runtime threw "window is not defined" while P107's Group edit was open. No
row had been fixed elsewhere.

| Row | Commit | What changed | Grade |
|---|---|---|---|
| D31 | `a969b4b31` | Value Changed's sentence: every write into the field fires it, changed or not (ruled against the recommendation) | words; every copy |
| D32 | `0a6bb1d90` | off the page the value is made text as the component makes it, compared as published; Text Input v3 | control red on exactly 2 scenarios + 6 sequences |
| D33 | `70621abcc` | Clear's "already empty" reads the field's text — the component's `text` (kept at once in setText) on the page, the start value off it; v4; a scenario for a focused Set; the on-page twin of an equivalent mutant declared | controls: red on the 2 D33 scenarios; the start value alone, on the focused one |
| C69 + C72 | `580ce9e27` | `edit` reads `text` and a cursor kept at each write (`pendingCaret`); setText / edit read Type and Max length from the node's props | controls red on exactly 4 + 2 scenarios; the cursor half graded by two new GAM-011 viewer cases (the face never places a cursor mid-text) |
| C68 + D35 | `7a92ec4b1` | the <input> runs the control's onMouseDown, then its own; a new <textarea>'s cursor is put at the end, once per element | controls red on exactly 15 + 3 scenarios |
| C80 + C66 | `94b83d7ea` | Text Input, Checkbox, Dropdown, Radio Button render one tree whether the label shows or not (outer div always, `display: contents` without a label, one root ref); root styles the node wrote onto the old root are blanked (`clearedRootStyles`) | HEAD red on exactly 18 scenarios; without the clearing, on the 4 "hidden, holding the keyboard" ones (3 added) |
| C67 | `b07b2a5a4` | the Checkbox counts every write of Checked; the component's effect is keyed on the count | control red on exactly its scenario |
| D34 + C71 | `5d40a7aa3` | a pick writes the Dropdown's `props.value` too; the node counts value writes, the effect keys on the count; the six D34 twins dropped as the ledger asked | HEAD red on exactly 7; without the counter, on C71's 1 |
| C76 + D37 | `8dbeb8f33` | the group counts Value writes; the selection carries the click (`RadioClick`), each button reports it once — Changed on the clicked button and the one that lost the selection | HEAD red on exactly 9; without the counter, on C76's 4 |

**The pattern, five times over:** a component kept a copy of a value and re-read the node's through an effect keyed on what React
LAST RENDERED, while the node wrote its props without a render. A write-back to the last render, or a person's change the node
never mirrored, was invisible to the effect. The fix each time: the node writes one value on both sides and counts its writes; the
effect keys on the count. The Slider's C73 is the same shape (next session).

**Traps met:** zsh does not word-split `$FILES` — a control's backup loop copied nothing and HEAD's files stood in for mine until I
re-applied the edits from their scripts ([[zsh-does-not-word-split-and-colon-is-a-modifier]]); a predicate-removal helper ran past a
one-line arrow to the end of `KNOWN_ROWS` and took P107's open Group rows with it — rebuilt from HEAD + my removals + P107's two
hunks (verbatim, their diff unchanged all session) before anyone wrote the file; s25's D10 commit had left `stranger.test.ts` red
(round 3's hashes and Stop line, fixed `1d1496929`).

**Gates:** the five control specs conform at seeds 20732 and 13 after each commit (the Text Input's baseline survivor aside);
viewer suite 1777 / 1777 after the label work; spec stranger (rounds 1–4), batch-visual (Group's in-progress spec red, P107's),
page model, catalog parity green; viewer, spec tsc 0. **Not measured:** layout of an unlabelled control in a real browser
(`display: contents` takes the outer div out of layout; a stylesheet selecting a Group's children by position would see it).
**The export:** not checked for any of these rows; the exported controls are React components with their own state.

## 10. Session 27 (2026-10-07) — the Slider, eighteen of twenty-three

**AC1, re-measured:** the Slider's two known rows (D36, C73) still fired at HEAD; C74 and C75 were the spec's own (v2 modelled
the runtime), so they needed a spec version, not a row drop.

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C73 + D36 | `21b27462d` | every Value write is a word the node counts (`valueWrites`); the component draws it through `takeGraphValue`, which reports without Changed; the node keeps the handle (`props.handle`), so a remount starts where the person left it | HEAD red on exactly the 30 formerly marked scenarios; seeds 13 and 20732 conform (20732's one survivor was s26's baseline) |
| C74 + C75 | `c92fa2afa` | spec v3: every paint draws the handle as the browser holds it (clamped, rounded to the step from Min, a reversed range at Min) against the attributes then, and reports it without Changed; Min, Max, Step are attributes, not words; Value Percent recomputed at every report, 0 when Min = Max, a blank Min / Max read as 0 / 100; the Value description says "rounded to the Step" | HEAD (after the first commit) red on exactly the 24 scenarios v3 changed or added; seeds 13 and 20732 conform on the runtime, six seeds on the interpreter |

**What the Slider taught:**

- **A spec paint that sets a key only when it moved splits every reducer into twin branches.** v3's first draft (out, Value
  Percent and the word's flag set only when they changed) made 3,291 interpreter mutants with 458 survivors — each act now came in
  "the paint moved something" and "it didn't" shapes, and swap-branch hands one the other's recorded example. Writing the three
  keys at every paint on the page (sending only what moved) collapsed it to 506 mutants and let v2's thirty "no word waiting"
  equivalence declarations go. What survived after that was real: an act on a HIDDEN slider still paints first, and that paint's
  clamp sticks (Max 60, act, Max 100 in one frame ends at 60) — one scenario added. The runtime conformance fell from 640 s to 45 s.
- **jsdom's sanitization of a reversed range does not settle** (a value at or above Min becomes Max, below Min becomes Min), so a
  paint that re-sanitizes at every frame flipped the handle 50 → 10 → 50. Found by a stability check (two quiet frames after
  6,000 generated sequences must send nothing: 153 red, 0 after); the node follows Chromium (Max raised to Min).
- **Clamping when Value is written would be wrong once the paint clamps** (Value 120, Max 200 in one frame must land on 120), so
  the node stores the Value as written; the two NDA-012 viewer tests that read `props.value` now read the drawn handle.
- The plant in `page-model-plants.test.ts` that re-creates v1's C73 is written against the spec's text: a spec rewrite makes the
  whole plants FILE fail to collect (the Tests line then reads the other file's 14 alone — read the Suites line).

**The export:** not changed. The exported Slider is a native controlled `<input type="range">` on a state variable
(`emit/component.ts` role `range`); whether it reports the drawn value, clamps on a Min / Max change or fires a change for a graph
write was not checked — P18's to read.

## 11. Session 30 (2026-10-08) — C79 and C78 landed, twenty-two of twenty-three; C77 built, parked

**AC1, re-measured** at `a6caefdde`: C79 was still a known row on the Text, Shape, Image and Group (twenty marked scenarios). C77 and
C78 were not known rows but MODELLED: the five specs that share drag-drop.ts copied the runtime (R3), so each fix needed new spec
versions and scenario renames, not a row dropped. Built in worktrees, graded on the runtime at seeds 13 and 20732, landed by
fast-forward.

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C79 | `7496d93f0` | `setStyle` sends a Pointer Events write through the render, `removeStyle` leaves the removal to it, so "Opacity 0 takes no pointer" has the last word; known row dropped with `invisibleTakesPointer`; the 20 scenarios unmarked; no spec version (the spec already said it) | probe 20 / 20; control (react-component-node.ts before) red on exactly the 20; runtime: Text, Shape, Image, Group conform at 13 and 20732 |
| C78 | `23d91e383` | one rule, `insideSource`: never the source node, nor inside the element the gesture started on or the one it has now — the pointer (`zoneAt`) and the keyboard's zone list both ask it. Text v8, Shape v4, Image v4, Group v6, Video v4: `zoneFor` is a card's only; `sourceElem`, `drop`, `pointerAt` and the own gesture's `inZone` writes removed; Drag Value and Drag Kind inert on this page | 1,389 scenarios read differently, 613 renamed; control red on 27 / 28 / 27 / 28 / 9 of those naming it; interpreter mutants at 13 and 20732 all killed or declared; runtime: all five conform at 13 and 20732 |

**C77 is built and NOT landed** (branch `p109-c77-wip`, commit `a133d19b6`). The runtime half is right (`elementChanged` from
`setDOMElement`, `whenMounted` gone; its control red on 14 / 110 / 110 / 23 / 12 scenarios). The spec half strands ~630 mutants
(Text 215 at seed 13): with the tabindex on every element, whether an act's paint or the frame end made the new element is visible
nowhere. Keeping `attrsOn` (set at every new element) did not help (`c77-attrsOn-remodel.diff`, scratchpad, not kept). **P107's
ruling (s30, by message): remove the state the fix made unobservable in the spec version that lands C77; declare individually only
a field another output still reads, and name that output.**

**What s30 taught:**

- **A modelled row is not a known row.** Find the changed scenarios by diffing every scenario's interpreter trace before and after
  the spec change; rename only those whose names claim the old outcome (a matrix name that describes the setup stays true).
- **Fixing a modelled row strands mutants, and the probe is cheap.** `runConformance(spec, interpreterAdapter(...), { mutants: true,
  sequences: 200, seed, equivalent })` per node is 45 s on the Text; run it at two seeds before any runtime grade. C78 stranded 27 on
  the Text; most were dead state (`pointerAt`, an `inZone: false` written where it was always false), and the rest were killed by
  scenarios that read them (a click a swallow eats while it ends a pending press; a held finger, then a mouse click; the second card,
  so a swapped example is not the same card).
- **A swap-branch mutant returns the sibling's whole recorded patch**, values and all (`runner/mutants.ts` `mutatePatch`). Two
  branches that write the same values in a state where they already hold are equivalent; a scenario cannot kill that.

**The export:** not checked (P18's).

## 12. Session 31 (2026-10-08) — C77 landed; twenty-three of twenty-three

**C77** (`167c40e9c`): the runtime half as s30 built it (`elementChanged` from `setDOMElement`; `whenMounted` gone). The spec
half, as P107 ruled: the state the fix made unobservable is removed, not declared as a class.

- **What was unobservable.** With every element of a Draggable taking the keyboard, nothing outside tells whether an act's
  paint or the frame end made a new element. The specs still split every act's branch on it, because the paint wrote
  `elem`, `shownTag`, `onPage` and `elementFocused: false` only when it made or dropped an element (Text 216 survivors at 13).
- **What changed, on all five (Text v9, Shape v5, Image v5, Group v7, Video v5).** Which element is on the page (`onPage`,
  `elem`, `shownTag`, the Group's `stampOn`) is the paint's sync, `synced` (spec.ts, P107's NSP-016 s37 mechanism: left out
  of a branch's shape, kept through a swap). The keyboard is the element that holds it, `focusedElem` (replacing the
  `elementFocused` flag; `holdsKeyboard` reads `onPage && focusedElem === elem`): a new element simply is not that one, so a
  paint writes nothing about the keyboard. Survivors fell 216 → 39 on the Text from these two alone.
- **Declared.** The rows' shapes follow (no synced keys; `focusedElem`). The three rows naming `chain` / `attrsOn` were
  dropped (they matched nothing since C77 removed the chain). One new row, alone: a file leave or let go with no drag whose
  paint mounts the element (the unmount left the count 0 and Is Dragging Over false; the twin writes them as they stand).
- **Killed.** 118 scenarios (Text 40, Shape 16, Image 16, Video 18, Group 28), found by generating ~1,000 candidates per
  node and keeping only those that killed a mutant nothing else did. Their reader is a key act while the node is hidden (a
  visible node takes the keyboard back at every key act, which is why the generated sequences never told these apart): a
  focused element given a new Tag and its old one back in one frame; Draggable off and on around an act; a card grabbed during
  the node's own keyboard lift; a press or a click that mounts the element during a keyboard carry; a second element clicked
  while it holds the keyboard (the twin's example names element 1). Each name's outcome is asserted against its trace. Nine
  Video ones need a pointer and are marked C100, as the Video's others are.
- **Grades.** Interpreter mutants, seeds 13 and 20732: 0 survivors on all five (Text 1,886 / 1,893, Shape 1,906 / 1,916,
  Image 1,935 / 1,945, Video 2,781 / 2,789, Group 3,662 / 3,668 and 3,661 / 3,668; the rest declared). Runtime at 13 and
  20732: Text 1,252, Shape 1,248, Image 1,263, Group 1,434 scenarios conform, the Video with its known rows; 200 / 200
  generated, 0 divergences. Control (drag-drop.ts and react-component-node.ts before): red on 21 / 117 / 117 / 30 / 16 of the
  C77 scenarios. Spec gates 502 / 520 (18 skipped), spec tsc 0; viewer 1,815 / 1,815, viewer tsc 0. Rebased once over P107's
  Repeater v2 (`page-model.helper.ts`), gates re-run green.

**What s31 taught:**

- **A flag that a paint resets splits every act.** A boolean the paint clears when it makes an element (`elementFocused:
  false`) doubles every branch by whether a paint made one. Naming WHICH element holds it removes the write without removing
  what it tells: a new element is never the one named.
- **A reader that is also a writer hides a hole.** The key act puts the keyboard on a visible Draggable node before it reads
  it, so every focus mutant survived the generated sequences; the reader that sees them is a key on a hidden node.
- **A candidate that reaches a new branch and does not kill it adds survivors.** Keep only the killers; re-run with only them.

**The export:** not checked (P18's).
