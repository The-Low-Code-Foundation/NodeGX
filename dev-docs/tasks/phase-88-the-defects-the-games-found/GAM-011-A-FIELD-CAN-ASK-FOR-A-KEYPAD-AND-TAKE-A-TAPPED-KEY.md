# GAM-011 — A field can ask for a keypad, and take a tapped key at the caret

**Status: 🟢 2026-09-17 (session 22): AC2 met.** Richard ruled the keypad trap *"whatever actually fixes it"*: a value a Function writes in the same run as it fires a signal is now sent with that signal even when unchanged (runtime), and session 21's keypad page types 5/5 by touch at 1024×768 and 390×844 (was 3/5). AC1, AC3–AC5 met in s21; AC6 met by naming. **Left:** AC7. *(s21 status: 🟡 2026-09-17 (session 21): (a) and (b) built. AC1, AC3, AC4, AC5 met; AC6 met by naming (Insert/Backspace deferred, not translated). 🔴 AC2 NOT met: a keypad wired the obvious way mistypes (a Function publishes only on change) — a question for Richard, §8. AC7 not recorded. ✅ R12 ruled s19 (§5).** **Source:** [P78 D60](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by P87 [RKT-005](../phase-87-the-first-play-test/RKT-005-THE-ANSWER-PAD.md), 2026-09-13 · **Side:** product (viewer controls, Text Input; code export))*

On a tablet, a number answer opens the full letter keyboard over half the game. An on-screen pad cannot type into the box while a
child's caret is in it. Rocket School had to build its own React node to get either.

## 1. The person sentence

**A child on a tablet taps a number box and gets a number keypad, and a tapped on-screen key lands at the
caret, even while the box has focus. The author uses a plain Text Input.**

## 2. What was measured

HEAD `eb12ebe99`, 2026-09-14.

| reading | where |
|---|---|
| `grep -a -rn -i "inputmode\|enterkeyhint" packages --include='*.ts' --include='*.tsx' --include='*.js'` (excluding `node_modules`, `dist`): **0 hits in `noodl-viewer-react/src`**. The only hits are the kit gate and a bundled TS lib. Re-read at HEAD | `packages/noodl-mcp/tests/tpl007GameKit.test.ts:583-585`; `noodl-editor/ts.worker.js:153871-153872` |
| What exists: a `Type` enum (`text`, `textArea`, `email`, `number`, `password`, `url`) passed as `<input type>`, *"which also changes the on-screen keyboard"*. There is no `tel`, no `decimal`, no `none`, and no `enterkeyhint`. Re-read at HEAD | `nodes/controls/text-input.ts:74-91`; `components/controls/TextInput/TextInput.tsx:175` |
| The `<input>`'s props are a fixed list (`id`, `value`, events, `disabled`, `style`, `className`, `placeholder`, `maxLength`, `onChange`); nothing else can reach the element. Re-read at HEAD | `TextInput.tsx:154-164` |
| **Set abstains while focused**: `setText` writes the DOM only when `hasFocus() === false`, and `Set` reports `Unchanged` otherwise (ERG-001 §4). No insert action exists. Re-read at HEAD | `text-input.ts:146-155`, `:372-380`; `TextInput.tsx:274-276` |
| `Clear` is deliberately **unconditional** while focused: *"an explicit Clear that skipped a focused field would be a dead button"*. It is the precedent for an insert that ignores focus. Re-read at HEAD | `text-input.ts:350-356` |
| Driven RED on build 4: touch arm `pad 0/2`, `noInput 0/2`; AZERTY `digitCode 0/1` (`98765` typed as `ç_è-(`); fine pointer `midInsert 0/1`. As recorded 2026-09-13, not re-driven | RKT-005 §5 lines 63-73 |
| The workaround `game-kit.AnswerPad` (a kit React node) sets `inputMode: numeric ? 'decimal' : 'text'` and reads `selectionStart`/`selectionEnd` to insert at the caret. Under `(pointer: coarse)` it swaps to a display-only `role="textbox"`. Re-read at HEAD | `library/modules/game-kit/src/kit.js:1336-1337`, `:1376-1377`, `:1554` |
| Driven GREEN with the kit node: AC1 20/20 touch rounds, AC5 `midInsert` 3/3. As recorded 2026-09-13 | RKT-005 §5 lines 92-101 |
| Export: Text Input is one ledger row, `"translated"`, `"controlled input"`. The emitter maps it to role `input` with `startValue`/`onTextChanged` as its state pair and `clear` as its only control action. Re-read at HEAD; **how the emitter treats an input it does not know was not read** | `packages/nodegx-export/coverage-ledger.json:727-730`; `src/structurePorts.ts:116`; `src/analyze/plan.ts:7215-7222`, `:7229-7232` |

## 3. Where it bites a person

- Every numeric, phone, email, postcode or PIN field: Site Builder forms, checkout, sign-in codes.
- Any on-screen keypad, accent strip or emoji picker. Today each one is its own React node, or it silently drops keys while the
  box has focus.
- `Type = Number` is not a substitute: it brings a spinner and an empty value on a French `64,3`, and still no way to say "no
  keyboard".

## 4. Related work and collisions

- **P88 [GAM-009](GAM-009-WHAT-SOMEONE-TYPED-IS-STILL-THERE-WHEN-THE-FIELD-COMES-BACK.md)** changes what typing writes on the
  same node. An insert action writes text too, so land GAM-009 first and build this on its rule.
- **ERG-001 §4** ([phase-35](../phase-35-authoring-ergonomics/ERG-001-OUTCOME-CONTRACT.md)): `Set` must keep abstaining while
  focused. Insert is a new action beside it, not a change to it.
- **P18 code export**: every new port on a translated type must be emitted or refused by name. See `coverage-ledger.json` and
  EXP-011's ledger discipline.
- Owner grep: `grep -a -rn -i "inputmode\|input mode\|enterkeyhint\|numeric keypad\|soft keyboard" dev-docs/tasks --include='*.md'`.
  Only P78 D60 and P87 hit it. No owner.

## 5. Design

- **(a) `Input Mode`** enum on Text Input: `text`, `numeric`, `decimal`, `tel`, `email`, `url`, `search`, `none`. Unset means no
  attribute, so nothing already built changes. **`Enter Key Hint`** enum: `enter`, `done`, `go`, `next`, `previous`, `search`, `send`.
- **(b) `Insert Text`** action + a value input. It writes at the caret, or replaces the selection, **whether or not the field has
  focus**, and **keeps** focus and caret where they were (caret after the insert). It fires `Value` / `Value Changed` once. With no
  caret (never focused) it appends. A `Backspace` action is the same decision; include it or rule it out.
- 🔒 **Ruling for Richard:** should `Insert Text` respect `Max length`, the way typing does, or ignore it the way a wired Value does
  (`text-input.ts:119`: *"it does not truncate a value arriving on Text"*)?
- 🔒 **Ruling:** is `Input Mode = none` enough for "no soft keyboard on a touch screen", or does the product also owe the kit's
  display-only box? `none` still lets the field take focus and a caret; the kit decided that was wrong for a child.
- (a) and (b) are separable. Land them as two commits so each has its own blast radius.
- **Do not** read a digit by `KeyboardEvent.code` in Text Input. That is a game's AZERTY choice (RKT-005 AC2), not a field's.

> 🔒 **R12** **Ruled (2026-09-17, s19, asked in plain words):** `Insert Text` **respects Max length**, as a typed key does. **`Input Mode = none` is enough**: no display-only box is owed.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec asserts the node declares `inputMode`, `enterKeyHint` and an insert action; it fails. A jsdom spec focuses a Text Input, sends `Set` with `12`, and reads `Unchanged` with the DOM unchanged. Known-firing beside it: the same `Set` unfocused reports `Done` and lands. |
| AC2 | **The person sentence, touch.** CDP with `Emulation.setTouchEmulationEnabled` + reload, so the page reports `(pointer: coarse)` (recorded as the known-firing signal), at 1024×768 and 390×844. A minimal project: Text Input `Input Mode = decimal`, a row of Buttons wired to `Insert Text`. Five answers entered by tap alone; the `<input>` carries `inputmode="decimal"`; each value is right. |
| AC3 | **Insert while focused, fine pointer.** Type `123`, move the caret between `1` and `2`, tap a `9` button: the field reads `1923`, the caret sits after `9`, and `document.activeElement` is still the field. **Sabotage arm:** route Insert through `setText` and it goes RED (dropped while focused). |
| AC4 | **ERG-001 §4 holds.** The existing focused-`Set` and unfocused-control rows in `erg-001-visual-outcomes.test.ts` still pass unchanged. |
| AC5 | **Blast radius.** Every Text Input in shipped `library/` and `templates/` renders the same `<input>` attributes before and after (no `inputmode` attribute where the port is unset). The spec counts the fields it compared. |
| AC6 | **Export.** An exported app of AC2's project carries `inputMode="decimal"` and a working insert, or the pre-flight names both ports as refused. The ledger row is updated to say which. |
| AC7 | **Workaround.** Record whether Rocket School's `game-kit.AnswerPad` could now be a Text Input + Buttons, clause by clause against RKT-005 AC1-AC5. `(pointer: coarse)` display-only and `KeyboardEvent.code` digits are expected to stay kit-only. Do not remove the kit node in this task. |

## 7. Traps

- `inputmode` has no effect in desktop Chrome, and a probe that "sees the keypad" there sees nothing. Grade the attribute, and put
  the real keyboard in front of Richard on a tablet.
- iOS Safari does not move focus to a tapped button, so the field keeps focus under a pad (RKT-005 §2). A desktop drive where the
  click moves focus away grades the unfocused path and passes for the wrong reason. Cancel the button's `mousedown`, or assert
  `activeElement` before the tap.
- React's controlled `<input>`: writing `el.value` directly is reverted on the next render. Insert must go through React state.
- `selectionStart` is `null` on `type="number"` and `type="email"`. An insert that reads it must not throw there.

## 8. Record

### Session 21 (P88) — 2026-09-17, over `35e9e4ae6` (GAM-010): part (a)

**Built.**
- `text-input.ts`: `Input Mode` (`text`, `numeric`, `decimal`, `tel`, `email`, `url`, `search`, `none`; index 20) and `Enter Key Hint`
  (`enter`, `done`, `go`, `next`, `previous`, `search`, `send`; index 21), group Text, **no default**.
- `TextInput.tsx`: both passed to the `<input>` and the `<textarea>` as `inputMode={props.inputMode || undefined}` (and
  `enterKeyHint`), so an unset port renders no attribute.
- **Export** (`nodegx-export`): `CONTENT_PARAMS` maps both to `attr:` roles on Text Input (both spellings), `CONTENT_ATTR_ORDER` prints
  them after `maxLength`. A **wire** into either is refused by name (`KEYWORD_ATTRS` in `component.ts`): React types both as a keyword
  union, and a typed `string` component input printed as `inputMode={mode}` failed the exported app's typecheck (`TS2322 … 'string' is
  not assignable to "search" | "none" | …`, measured before the refusal existed). Ledger note on Text Input updated.

**AC1 — RED at HEAD** (`noodl-viewer-react/tests/gam-011-a-field-can-ask-for-a-keypad.test.tsx`, GAM-009's harness: a real Text Input node
rendered by its own `render()` into `createRoot` over hand-built jsdom): **5 failed, 1 passed**. The passing row is the refusal, "unset
renders no attribute". §6's AC1 also names the insert action and the focused-`Set` rows; those belong to part (b) and GAM-009's
existing AC4 rows, which pass unchanged.

**Part (a), the spec, final: 6/6.** Reverted arm: the two props not passed to the element → exactly the three attribute rows red.

**AC5 — census.** 926 JSON files under `library/` and `templates/`: **61 Text Inputs** (library 24, templates 37), **none** sets
`inputMode` or `enterKeyHint`. Every one takes the path the "unset renders no attribute" row grades. (A census, not a per-field render.)

**AC6 — export, part (a)** (`nodegx-export/tests/gam-011-input-mode.test.ts`, a project written to a temp dir because several suites walk
every folder in `tests/fixtures`): **7/7**, including `typecheckEmittedApp(app) → []`. Before the change the same project exported
`<input placeholder="Answer" />` with `parameter inputMode on answer has no style/content mapping — dropped, reported`. Reverted arms:
| reverted | red |
|---|---|
| E1 both out of `CONTENT_ATTR_ORDER` | authored keywords print (1) |
| E2 both out of `CONTENT_PARAMS` | authored keywords print; the old drop is gone; the typed-input refusal (3) |
| E3 the keyword refusal skipped | the typed-input refusal; **the emitted app compiles** (2) |
| E3, first form (`false && …`) | **did not compile, `Tests: 0 total`: graded nothing**, replaced by E3 |
| E4 a branch printing a wire that folds to a literal | **green: unreachable in this project, so the branch was removed**, not kept untested |

**Catalog and docs:** regenerated (`catalog:generate`, `catalog:merge`, `docs:nodes`, CHR-007's snapshot): the delta is the two ports.
**Not done for (a):** a browser reading of the attribute; AC2's touch drive is written for the whole sentence and waits for part (b).

**Found, not ours:** a Text Area exports as `<input type="textArea" />` (seen in the probe). Not registered.

### Session 21 (P88), continued: part (b)

**Built.**
- `text-input.ts`: `Text To Insert` (string, group Text: SIG-003's gate refuses a value in "Actions", caught by `catalog:groups:check`),
  `Insert Text` and `Backspace` (signals, Actions). Both report `Done`/`Unchanged`; the two outcome sentences name them.
- `TextInput.tsx` `edit(mode, text)`: through React state, never `el.value`. The caret is the selection **only if the field has held focus
  since it mounted** (`hadCaret`, set in `onFocus`); otherwise, and where `selectionStart` is `null` or throws (Number, Email), it appends.
  🔒 R12: Max length holds, by whole characters; what does not fit is not written, and a full field is `Unchanged`. Backspace removes the
  selection or one whole character (an emoji is two UTF-16 units). The write goes through `_typed` (GAM-009 R10, so a remount keeps it),
  then `setText`, and the caret is set after the commit, **only while the field holds focus**. **Backspace included** (§5 asked to include
  it or rule it out: a pad needs it).
- Not mounted: Insert appends to (and Backspace trims) the start value, and the Value output is set and flagged, as `Set` does while
  unmounted.

**Spec** (`gam-011-a-field-can-ask-for-a-keypad.test.tsx`, parts (a)+(b)): **17/17**. Reverted arms (`cp` snapshots, `cmp`-restored):
| reverted | red |
|---|---|
| B1 **§6 AC3's named arm: Insert routed through `setText`** | caret insert, selection, Max length, Number field (4) |
| B2 the selection never read | caret insert, selection, both Backspace rows (4) |
| B3 Max length ignored | Max length (1) |
| B4 `hadCaret` never set | caret insert, selection, both Backspace rows (4) |
| B5 caret not restored | caret insert, selection, emoji Backspace (3) |
| B6 Backspace by UTF-16 unit | emoji Backspace (1) |
| B7 not-mounted output not flagged | **green at first**; a row spying on `flagOutputDirty` added → red (1) |
| B8 `_typed` not called | **green at first**; a hide/show row added → red (1) |

AC4: viewer specs mentioning Text Input, controls, focus or outcomes (ERG-001's corpus rows, GAM-009, GAM-010, GAM-012 included): **46
suites, 737 tests**, exit 0; `tsc --noEmit` exit 0. GAM-010's spec pinned Text Input's old `Done` sentence; updated to the new one.

**Catalog:** `catalog:generate`/`merge`, `docs:nodes`, CHR-007 snapshot: the delta is the three ports and the two sentences. `catalog:check`,
`merge:check`, `groups:check` (after the Text To Insert move), `docs:nodes:check`, `cloud-library:check` exit 0; editor CHR-007/008, FB-018,
AIB-001 223/223. `nodegx-export` whole suite (part (a) in, before (b)): **104 suites, 3567 passed, 1 skipped**, exit 0.

**Export (b):** a Button's `onClick → answer.insert` and `→ answer.backspace` are named deferrals (`no deterministic translation in step 5
(deferred to EXP-003)`), and an authored `Text To Insert` is `has no style/content mapping — dropped, reported`. Ledger note says so.
**AC6 is met by naming, not by translation.**

**In Chromium** (scratch prod bundle; `render-from-disk.js` copy; before = the GAM-010 bundle): a page with a decimal field and a keypad of
eleven Buttons, each `onClick → a Function` whose script is `Outputs.key = "<k>"; Outputs.press();`, wired `out-key → Text To Insert` and
`out-press → Insert Text`, plus `⌫ → Backspace`.
| reading | before | after |
|---|---|---|
| attributes on the `<input>` | none | `inputmode="decimal"`, `enterkeyhint="next"` |
| **AC3, fine pointer, focus kept** (the page cancels a button's `mousedown`, as a pad would; iOS keeps focus anyway): type `123`, caret 1, click `9` | `123`, caret 1 | **`1923`, caret 2, `activeElement` = the field** |
| AC3, plain mouse click | `123` | `1923`; focus moved to the button, caret at the end (desktop Chrome focuses a clicked button; §7) |
| **AC2, touch** (`setTouchEmulationEnabled` + reload, `(pointer: coarse)` true), answers 12, 7,5, 305, 9, 42 | 0/5, `Invalid connection, input doesn't exist` | 🔴 **3/5 at 1024×768 and at 390×844: `305` → `300`, `42` → `44`** |

🔴 **Why AC2 misses, measured:** a Function publishes an output **only when its value changes** (`simplejavascript.ts:160-166`, kept for
backward compatibility). Key 5's Function already held `5` from the earlier answer `7,5`, so it published nothing, and `Text To Insert`
still held `0`. Pressing 3, 0, 5, 4, 2 once each lands every key (`30542`, logged `set textToInsert` then `EDIT insert` per tap). So
**any keypad wired this way types `121` as `122`**. A `Outputs.key = null` first made it worse: nothing landed, because Insert read the
`null`. The first touch runs also had instrument faults, fixed before these readings: undeclared Function ports; a 12-key row off-screen at 390.
**This is not a defect in Insert. It is a trap in the obvious way to author this task's person sentence, and it is Richard's to rule on**
(handoff). Scratch: `g11/pad` (the plain page), `g11/pad-null`, `drive-pad.js`, `drive-order.js`, `drive-pad3-{before,after}.log`.

**AC7 not recorded.**

### Session 22 (2026-09-17) — AC2, ruled and fixed

**Ruling (Richard, asked in plain words):** *"I'd say whatever actually fixes it."* The fix that repairs the keypad people actually
build is in Function, not in Insert: **a value written in the same run as a signal is published with that signal, even when unchanged.**
A value written on its own keeps the old publish-on-change rule that old projects rely on.

- `noodl-runtime/src/nodes/std-library/simplejavascript.ts`: an unchanged write is held (`heldWrites`), and `publishHeldWrites` flags
  it dirty just before any `Outputs.<signal>()` of the same run is sent. Reset per run.
- Spec `noodl-runtime/test/gam-011-a-value-sent-with-a-signal-arrives.test.ts` (real Function nodes, ports as a project file carries
  them, one tap per frame): HEAD 1 red, **`121` typed as `122`** (s21's browser reading reproduced), beside 3 green controls (`123`,
  `11`, and the backwards-compatible row: an unchanged write with no signal still publishes nothing). Fix 4/4.
  🔴 The first run graded nothing: without `ports` on the node, `Outputs.press` does not exist and every arm read `""`.
- Reverted arms: M1 the publish call removed → exactly the `121` row red; M2 every unchanged write published → exactly the
  backwards-compatibility row red.
- Whole `noodl-runtime` suite: 164 suites, 2778 ✓ (13 skipped), exit 0; `tsc --noEmit` 0.
- **Chromium, AC2 touch** (s21's `g11/pad` project and `drive-pad.js`, served by `render-from-disk.js` over the current viewer bundle,
  which carries the fix): **5/5 at 1024×768 and 5/5 at 390×844** (12, 7,5, 305, 9, 42), `inputmode="decimal"`, 0 console errors.
  AC3 unchanged: `1923`, caret 2, focus kept. The deploy engine in `noodl-preview/dist` is stale (its catalog predates Insert Text) and
  refused the project; not rebuilt.

