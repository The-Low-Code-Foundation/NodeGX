# GAM-010 — A Button can be given the keyboard

**Status: 🟢 2026-09-17 (session 22): every AC met.** AC2 and AC6 done once Richard ruled that Rocket School should be brought fully up to date (its 257 uncommitted files were only an editor re-save: 11 non-noise differences, all empty `parameters: {}` or timestamps). *(was: 🟡 2026-09-17 (session 21): AC1, AC3, AC4, AC5 met, driven in Chromium; AC2 and AC6 (Rocket School's three workarounds replaced by wires) not done — see §8.** **Source:** [P78 D59](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by P87 [RKT-003](../phase-87-the-first-play-test/RKT-003-ONE-SCREEN-PER-QUESTION.md), 2026-09-13 · **Side:** product (viewer controls))*

A game says *"press Enter to go on"*, but nothing in the graph can put the keyboard on the Next button. A
person on a keyboard has to Tab to it, or reach for the mouse.

## 1. The person sentence

**When a verdict appears, the author sends Focus to the Next button, and a person on a keyboard presses
Enter and goes on. No script looks the button up by its label.**

## 2. What was measured

HEAD `eb12ebe99`, 2026-09-14.

| reading | where |
|---|---|
| Button declares no `focus` input. Its only focus words are `focusPort: 'label'` (the editor's double-click) and the Click description. Re-read at HEAD | `packages/noodl-viewer-react/src/nodes/controls/button.ts:14-16`, `:50-57` |
| **Family census** (`grep -a -n "focus" nodes/controls/*.ts`): a `focus` signal exists on **Text Input** (Focus and Blur) and on **Group**. **None** on Button, Checkbox, Radio Button, Radio Button Group, Dropdown (`options.ts`, the Select) or Slider. Re-read at HEAD | `text-input.ts:210-231`; `nodes/visual/group.ts:178-189`; `button.ts`, `checkbox.ts`, `radiobutton.ts`, `radiobuttongroup.ts`, `options.ts`, `slider.ts` (0 hits) |
| Every control already has `Focused` / `Blurred` outputs and a `Focused` state, via `addControlEventsAndStates`. This is a known-firing signal for every AC. Re-read at HEAD | `nodes/controls/utils.ts:153-194` |
| Button renders a real `<button>` whose root ref is `noodlRootRef`; there is no `focus()` method on the component. Re-read at HEAD | `components/controls/Button/Button.tsx:112-113` |
| Checkbox, Radio Button and Slider render a real `<input>` and Select a real `<select>` (`opacity: 0`, overlaid), so a focus target exists for each. Re-read at HEAD | `Checkbox.tsx:177`, `RadioButton.tsx:181`, `Slider.tsx:176`, `Select.tsx:127-138`, `:206` |
| Text Input and Group focus through the **viewer's** tracker `context.setNodeFocused`. 🔴 That tracker does not call `_focus()` for a node already in its list (see GAM-012) | `viewer.jsx:348-376` |
| Group's `_focus` only sends its `focused` signal; it does not move DOM focus. Re-read at HEAD | `group.ts:483-488` |
| Workaround `FOCUS_BUTTON_SCRIPT`: `requestAnimationFrame`, then `document.querySelectorAll('button')`, keep visible buttons whose `innerText` equals the word, `.focus()`. Re-read at HEAD | `packages/noodl-mcp/tests/tpl007Components.ts:1232-1240` |
| ⚠️ **The register names one site (`fbFocusNext`); at HEAD there are three:** Feedback banner `fbFocusNext`, Teach card `tcFocus`, Race/Result `rrFocus`. Re-read at HEAD | `tpl007Components.ts:1285` + `:1317-1318`, `:1356`, `:1834` |
| Driven: with the workaround, `focusNext` passed on every verdict in RKT-003 AC5 run 3 (4/4 cells, 20/20 rounds). As recorded 2026-09-13, not re-driven | RKT-003 §5 lines 142-144 |

## 3. Where it bites a person

- Keyboard-only play in every game.
- A form's primary button after validation, and the confirm button of a dialog.
- Accessibility generally: the workaround matches by visible label, so it breaks under translation, when two buttons share a word, or
  when a button's label is an icon.

## 4. Related work and collisions

- **P88 [GAM-012](GAM-012-A-FIELD-FOCUSED-AS-ITS-ROW-APPEARS-HAS-THE-CURSOR.md)** owns the focus tracker's defect. A Button
  Focus routed through `setNodeFocused` would inherit it: round 1 works, and later rounds do nothing until a click. **Build
  GAM-012 first, or route this through the node's own element.**
- **P41 [ACC-001](../phase-41-accessibility/README.md)** (README line 74) owns the *visible* focus ring (`outline: none` on
  Button, Checkbox, RadioButton, Select, Range in `assets/style.css`). A focused Button nobody can see is half this sentence;
  AC2 records whether the ring is visible, and does not fix it here.
- **P41 ACC-004** (line 77) moves focus on route change. Different trigger, same need for a runtime focus path.
- Owner grep: `grep -a -rn -i "focus input\|focus signal\|no focus\|Focus action" dev-docs/tasks --include='*.md'`. No task owns a
  Focus input on a control.

## 5. Design

- **One shared definition.** Add `Focus` (and `Blur`, matching Text Input) in `Utils.addControlEventsAndStates` or beside it,
  so Button, Checkbox, Radio Button, Dropdown and Slider get the same ports, descriptions and ERG-001 outcomes (`Done`) in one place.
- **Target.** Use the control's real focusable element (`<button>`, `<input>`, `<select>`), not the wrapper `div`. Queue the call
  through `withInnerComponent` (`react-component-node.ts:1638-1660`) or its DOM equivalent, so a Focus that arrives in the frame
  the control mounts is not lost.
- 🔒 **Ruling for Richard:** does a control's Focus go through the viewer tracker (so a click elsewhere, or focusing a
  sibling, blurs it the way Text Input is blurred today), or does it call the element's `.focus()` directly and let the
  browser own focus? The tracker is the house's existing path; it is also the path GAM-012 found broken.
> 🔒 **R11, ruled 2026-09-14 (session 2): follow R13.** R13 ([GAM-012 §5](GAM-012-A-FIELD-FOCUSED-AS-ITS-ROW-APPEARS-HAS-THE-CURSOR.md)):
> a Focus to a **mounted** control focuses it every time. A Focus to an **unmounted** one **fails, is not held**, and the builder is
> told in the editor, not the browser. So a Button's Focus obeys the same rule as Text Input's, through the same (corrected)
> path. ⚠️ **This rejects the "Target" bullet's queue through `withInnerComponent`**: a Focus that arrives before mount is not
> kept for later. Build after GAM-012's fix lands, so the family inherits a working tracker.
- **Radio Button Group**: focus the checked radio, or the first. Decide and document; do not leave it undefined.
- **Do not** add `tabIndex` or change tab order in this task.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec asserts `button.ts`'s node definition has a `focus` input; it fails. A drive on a minimal project, Button + a Delay → a wire into `focus` (the editor refuses the wire, or the viewer logs `input doesn't exist`), shows `document.activeElement` is not the button while its `Focused` output never fires. Known-firing beside it: the same project's Text Input Focus does fire `Focused`. |
| AC2 | **The person sentence, in a browser.** Rocket School with `fbFocusNext`, `tcFocus` and `rrFocus` replaced by a Focus wire into each button. The keyboard-only drive (`drive-rkt003-stage.js --keys`, CDP Enter with `text: "\r"`) reaches 20/20 rounds with no pointer event, at 1366×768 and 1280×720 × FR/EN. Record whether the focus ring is visible (ACC-001's concern). |
| AC3 | **Repeat focus.** Focus the same Button on five successive verdicts with no click in between; `document.activeElement` is the button every time. This is the GAM-012 shape, applied here. |
| AC4 | **Family.** A spec per control (Button, Checkbox, Radio Button, Dropdown, Slider): Focus moves `document.activeElement` to its real element and fires `Focused`; Blur fires `Blurred`. **Sabotage arm:** point the target at the wrapper `div`, and the Checkbox and Dropdown rows go RED. |
| AC5 | **Blast radius.** The new ports appear in the node catalog and in `get_node_type`. No existing port changes name, type or default across the five nodes; a spec compares the port lists before and after. |
| AC6 | **Workaround.** `FOCUS_BUTTON_SCRIPT` and its three Function nodes are removed from `tpl007Components.ts`, and the template gates still pass. If any one stays, §8 says which and why. |

## 7. Traps

- A focused native `<button>` activates only on a key event carrying `text: "\r"`. A CDP Enter without it looks like "Focus did
  nothing" (RKT-003 AC5 run 1 made exactly this probe mistake).
- Select's real `<select>` is `opacity: 0`. `getClientRects()` still reports it, so a probe that looks for *visible* focus can pass on it.
- iOS Safari does not move focus to a tapped button (RKT-005 §2). Do not write a touch arm that expects it to.
- The export side: a new input on five node types needs a check against `packages/nodegx-export/coverage-ledger.json` (one row per
  type) and the emitter; a Focus the export drops silently is this defect again in the exported app.

## 8. Record

### Session 21 (P88) — 2026-09-17, over `416462813` (GAM-012 fault 3)

**Built.** `Utils.addFocusActions(definition, { noun })` in `nodes/controls/utils.ts`, called by Button, Checkbox, Radio Button, Dropdown
(`options.ts`) and Slider. It adds `Focus` and `Blur` signals (group Actions) and, where the node has none, the outcome ports
`Done`/`Completed`/`Unchanged`. Checkbox already had them for Check/Uncheck; its two sentences now also name Focus and Blur.
- **R11/R13:** both go through `context.setNodeFocused`, the tracker GAM-012 corrected. A control not on the page: `Unchanged`, the
  editor-only `focus/not-mounted` diagnostic, nothing recorded, nothing held.
- **Target:** the real `<button>`/`<input>`/`<select>`: the root if it is one, else the first inside it. Not the wrapper `div`. The
  `Target` bullet's `withInnerComponent` queue is not used (rejected by R11).
- `_canFocus` is false when the root is missing **or no longer connected**; `_hasFocus` compares `ownerDocument.activeElement`.
- **Radio Button Group: no Focus, decided.** It is a container, not a control, and has no element of its own to focus. An author sends
  Focus to the Radio Button they mean. Not a ruling; reverse it if a game needs "focus the checked one".
- Text Input's own Focus and Blur are unchanged. The deprecated controls are not touched.
- 🔴 **Found while driving, fixed in the tracker (`focus-tracker.ts` `onClickCapture`):** Space on a Focus-given Checkbox left
  `document.activeElement` on `body`. A key that activates a control is a **click**; the click walk names only elements carrying
  `noodlNode` (Groups), so it blurred the listed control the keyboard was on. Text Input escapes this with a mouse-only
  `preventGlobalFocusChange`. Now a listed node that still holds real focus after a click is kept and not blurred. A node that cannot
  say (a Group) is unchanged, and a mouse click elsewhere has already moved real focus, so it is blurred as before.

**AC1 — RED at HEAD.** Spec `tests/gam-010-a-control-can-be-given-the-keyboard.test.ts` before the build: **30 failed, 2 passed** (every row for
all five controls; the two "what did not change" rows green). Browser, on the viewer bundle from before any session-21 edit, a page with
14 wires (below): every Focus/Blur wire logged `Invalid connection, input doesn't exist. Trying to connect from … to
net.noodl.controls.button input focus` (and checkbox, radiobutton, options, range), and `document.activeElement` never left the field
that sent the signal. Known-firing beside it: the same page's Text Input Focus works on both bundles (GAM-012's page, below).

**AC3 and AC4 — the spec, final: 39 passed**, exit 0 (with GAM-012's spec: 56). Reverted arms on a `cp` snapshot, restored `cmp`-identical:
| reverted | red |
|---|---|
| S1 **AC4's named arm: target the wrapper** (`_focusTarget` returns the root) | 12: Checkbox, Radio Button, Dropdown, Slider × (Focus lands, AC3, Blur). **Button stays green** (its root is the `<button>`). §6 predicted Checkbox and Dropdown only |
| S2 `_canFocus` removed | 10: not-on-the-page and disconnected-element, all five |
| S3 `_hasFocus` always true | 5: AC3, all five |
| S4 the `isConnected` check removed | 5: disconnected element, all five |
| S5 the tracker's `false` ignored | 10: as S2 |
| S6 the click walk's still-focused keep removed | 5: "Enter or Space on a Focus-given … keeps it focused", all five |

**In Chromium** (scratch prod bundle `OUT_PATH`, the shared `src/external` bundle not written; `render-from-disk.js` copy with the viewer dir
from an env var; CDP keys with `text: "\r"`, focus emulation on; fields focused by script, never a pointer):
| arm | before | after |
|---|---|---|
| **V (AC3):** a field's Enter → `btnV.focus`; Enter on Next remounts its row (200 ms) → `rowV.didMount → btnV.focus`, × 5 | field keeps focus, 0/5 | **`BUTTON(Next)` 5/5**; log per cycle: `click detail=0`, `onClick`, `didMount`, `onFocus`, `done` |
| C: field Enter → Checkbox Focus, then Space | field | `INPUT:checkbox`; Space ticks it (false → true) and it **keeps focus** (first build: `body`, see above) |
| R: → Radio Button Focus, then Space | field | `INPUT:radio`, keeps focus. Not selectable outside a Radio Button Group (its own `radio-button/no-group` error, the page's only console error) |
| D: → Dropdown Focus, then ArrowDown | field | `SELECT`, keeps focus. `selectedIndex` 1 → 1: already the last default item, so the key's effect is not graded |
| S: → Slider Focus, then ArrowRight | field | `INPUT:range`, value 0 → 1 |
| U: → Focus to a Button whose row is unmounted | field | field keeps focus, nothing in the browser console (the diagnostic is editor-only, spec-graded) |
| B: → Button Focus; its Focused → 300 ms → its Blur | field | `BUTTON(BlurMe)` at +100 ms, **`body` at +700 ms** |

Zero pointer events in both runs. **Regression on the final bundle:** GAM-012's keyboard page identical to its session-21 reading (K 2–5, B 5/5,
control 2–5, C by ruling, D 5/5); its Blur page identical (E, T, F); multi-select's Dropdown identical at all 11 steps.

**AC5 — blast radius.** Catalog regenerated (`catalog:generate`, `catalog:merge`, `docs:nodes`), then compared type by type against the catalog
before it: **5 types changed, 0 ports removed, 0 altered** except Checkbox's `done`/`unchanged` sentences. Added: `focus`, `blur` on all five;
`done`, `completed`, `unchanged` on the four without them. `catalog:check`, `catalog:merge:check`, `catalog:groups:check`, `docs:nodes:check`
exit 0; `cloud-library:check` unaffected (exit 0). CHR-007's row-class snapshot, which pins the class of every existing port, moved by
exactly the ten new signal rows (`null`), 23/23 after. `get_node_type` reads this catalog. MCP `toolDisclosure` + `cmp009PortsPathConfidence`
44/44. Viewer specs touching controls, Group, the wrapper, focus or outcomes: **59 suites, 856 tests**, exit 0; `tsc --noEmit` exit 0.
**Export (§7's trap):** `parseProject` + `emitApp` over the drive page: every Focus/Blur wire is a named deferral, `wire fieldV:onEnter->btnV:focus
has no deterministic translation in step 5 (deferred to EXP-003)`, the same as a Text Input Focus today. Not silent. The coverage ledger is
per type and unchanged.

**AC2 and AC6 — not done.** They edit `packages/noodl-mcp/tests/tpl007Components.ts` and regenerate `templates/rocket-school/`, whose working
tree holds **257 uncommitted files** (key reorders and more, mtime Sep 15 13:40, an editor open) that are not this phase's. Regenerating
over them is an unperformed merge. See the handoff.

Scratch: session `a79831ee…/scratchpad/g10/` (`proj/`, `drive-controls.js`, `drive-{before,after,after2}.log`, the regression logs
`drive-*-after2.log`, `S1…S6.log`, `checks/`, `cat/`).

### Session 22 (2026-09-17) — AC2 and AC6

**AC6.** `FOCUS_BUTTON_SCRIPT` is gone from `tpl007Components.ts`, with **four** Function nodes, not three: the register's
`fbFocusNext`, `tcFocus`, `rrFocus`, and `hpFocusNext` (the Hunt game's Next grid, added after scoping). Each button now focuses itself
as it mounts: `fbNext`, `tcGotIt`, `rrAgain`, `hpNext` `didMount → focus`. The two template-gate pins that named the scripts now pin
the wires. The door raised 8 fewer diagnostics (the four Functions' dynamic-port notes). TPL-007 gates 138/138.

**AC2.** Rocket School regenerated (`npm run template:rocket`) and deployed with a rebuilt `noodl-preview/dist` engine; the shared `src/external/deploy` bundle carries GAM-010/012/017 and the Function fix. `drive-rkt003-stage.js --keys` with a 20-round plan: **ALL PASS across 10 cells** (FR and EN × 1366×768, 1280×720, 1024×768, 768×1024, 390×844), **20/20 rounds, failed clauses: none** in every cell, `focusIn` and `focusNext` included, no pointer event. (Some planned-right rounds read "Not quite": the drive's own `solve()` does not know rounding or written-number prompts; the clauses grade the stage and the focus, not the answer.)
The reward arm (`--reward --keys`, 1366×768 FR/EN): ALL PASS, `resultFocus` included (Play again holds the focus at the race's end).
**Focus ring:** not visible on the focused Next in the screenshots (ACC-001's concern, recorded, not fixed here).

