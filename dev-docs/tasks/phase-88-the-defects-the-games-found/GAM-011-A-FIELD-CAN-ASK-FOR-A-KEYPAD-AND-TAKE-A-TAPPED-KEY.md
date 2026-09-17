# GAM-011 — A field can ask for a keypad, and take a tapped key at the caret

**Status: ⬜ not started. ✅ R12 ruled s19 (§5): buildable.** **Source:** [P78 D60](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by P87 [RKT-005](../phase-87-the-first-play-test/RKT-005-THE-ANSWER-PAD.md), 2026-09-13 · **Side:** product (viewer controls, Text Input; code export)

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

Not started.
