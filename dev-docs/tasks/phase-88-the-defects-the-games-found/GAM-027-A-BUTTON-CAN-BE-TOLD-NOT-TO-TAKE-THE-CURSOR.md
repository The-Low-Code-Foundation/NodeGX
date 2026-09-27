# GAM-027 — A button can be told not to take the cursor

**Status: 🟢 built, session 24 (2026-09-17).** R26 ruled and applied; AC1–AC5 met, AC6 met as a reported refusal, AC7 answered. Written session 23 (2026-09-17) on Richard's ask, from GAM-011 AC7's record.
**Source:** GAM-011 AC7 (s23) · found by P87 [RKT-005](../phase-87-the-first-play-test/RKT-005-THE-ANSWER-PAD.md)'s answer pad ·
**Side:** product (viewer controls, Button)

## 1. The person sentence

**A person can build a keypad out of ordinary Buttons: tapping a key types into the answer box and the cursor stays in the box, so
the next key — or the next thing they type — goes where they are looking.**

## 2. What was measured

- **GAM-011 s21, in Chromium:** typing `123` in a Text Input, caret after `1`, then clicking a `9` Button wired to `Insert Text`:
  the field reads **`1923`** either way, so the insert itself is right.
  - With the page cancelling the Button's `mousedown`: **caret 2, `document.activeElement` is still the field**.
  - With a plain click: **focus moves to the Button and the caret sits at the end.** Desktop Chrome focuses a clicked button.
- **The cancel is not something a graph can do.** s21 cancelled `mousedown` in a page script. A Button placed in the editor has no
  port for it, so the keypad a person actually builds loses the cursor on every key.
- **s23, GAM-011 AC7:** this is one of exactly two facts standing between "Text Input + Buttons" and Rocket School's kit
  `game-kit.AnswerPad`. The other is GAM-028.

## 3. Where it bites a person

A child on a laptop taps a pad key, then types the next digit on the real keyboard and it goes nowhere — the Button has the cursor.
Every on-screen pad, calculator, emoji picker, formatting bar and "insert field" toolbar anybody builds with this tool has the same
defect, and the only escape today is a custom kit node written in JavaScript.

## 4. Related work and collisions

- **GAM-011** built `Insert Text` / `Backspace` and `Input Mode`; its AC7 record is the measurement above. This task does not
  re-open it.
- **GAM-010** gave five controls a Focus action, and its click walk keeps a listed node that still holds real focus after a click
  (§8 s21) — that code reads the same event this task changes, so the focus tracker's arms are part of AC4.
- **GAM-026** draws a ring on keyboard focus. A Button that never takes focus by pointer must still be reachable and ringed by Tab.
- **The export** (`nodegx-export`) translates Button props; a new port owes its row there or a named refusal (GAM-011 (b)'s pattern).

## 5. Design

- A Button port — working name **`Keeps Focus`** (boolean, default **unset = today's behaviour**) — that cancels the pointer-down
  default so the element that had focus keeps it. Unset must change nothing anywhere: this is a defaults-are-sacred change.
- ✅ **R26 ruled (s24): a `Keeps Focus` port on the Button, default off.** Not "always": unset keeps today's behaviour, so no app
  ever built changes, and the keypad author ticks one box. The alternative — a clicked Button never taking the caret from a text
  field — was offered and declined, so *"a click moves focus to the Button"* stays the default everywhere.
- ✅ **R26, second half (s24): Button only.** The port does not go on the Checkbox, the Radio Button or the rest of the `-2` set;
  Button is enough for the person sentence. A pad built from other controls is not covered — say so if it comes up.
- Keyboard operation must not change: Tab still reaches the Button, Space and Enter still activate it, and activating it by key is
  still a click (GAM-010 §8 s21's finding).

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded:** a jsdom or viewer spec places a Text Input and a Button, focuses the field, clicks the Button, and reads focus **on the Button**. Beside it, the known-firing control: the same click with the page cancelling `mousedown` keeps the field. |
| AC2 | **The person sentence, in a browser.** GAM-011's keypad page, no page script: type `12`, tap three keys, and after each tap `document.activeElement` is the field, the caret is after the inserted digit, and a real keyboard digit typed at the end lands in the field. 5/5 answers right at 1024×768 and 390×844. |
| AC3 | **Unset changes nothing:** every Button in `library/prefabs` and `templates/` behaves as before — clicked focus, `Click` signal, and the focus tracker's list identical, counted. |
| AC4 | **GAM-010's tracker holds:** `erg-001`, the focus and outcome viewer specs, and GAM-010/012's specs pass unchanged; a Space on a Checkbox still does not blur it. |
| AC5 | **Reverted arms:** remove the cancel and AC2 goes red; leave the port out of the catalog and the door refuses a wire to it (GAM-019's gate). |
| AC6 | **Export:** the port is translated, or named as refused with its reason, and the ledger row says which. |
| AC7 | **Workaround:** say whether `game-kit.AnswerPad`'s own field could now be a Text Input + Buttons if GAM-028 also lands (it is the other half of GAM-011 AC7). Do not remove the kit node here. |

## 7. Traps

- 🔴 **A key that activates a control is a click** (GAM-010 §8 s21). A cancel written on the pointer path must not swallow the
  keyboard path, or Space on a Button stops working.
- 🔴 **iOS keeps focus on a tapped button anyway**, so a passing touch reading does not prove the cancel fired. Grade the desktop
  mouse case, which is where it is observable.
- ⚠️ `preventDefault` on `mousedown` also stops text selection inside the button; read whether anything in the shipped templates
  depends on that.
- ⚠️ A Text Input whose caret was never real appends instead of inserting (`hadCaret`, GAM-011 (b)) — do not read that as this bug.

## 8. Record

_(empty — nothing built yet)_

## 8. Record

### Session 24 (2026-09-17) — built, over `19b3517d3`

**R26 ruled by Richard: a `Keeps Focus` port on the Button, default off, Button only.** The alternative — a clicked Button never
taking the caret from a text field — was offered and declined, so *"a click moves focus to the button"* stays the default in every
app ever built. The other `-2` controls do **not** get the port: a pad built from Checkboxes is not covered.

**The fix.** Focusing the pressed element is the **default action** of `mousedown`, so the whole of it is cancelling that event:
`Button.tsx` wraps the handler `Utils.controlEvents` already built and calls `preventDefault()` before it. Composed, not appended —
FH-015 slice 1 is the standing lesson that a handler written after the spread *replaces* the one the spread made, taking
`blockTouch`'s `stopPropagation` and the runtime's dirty-node flush with it. With the port off nothing is installed at all.
⚠️ `mousedown` only: cancelling `touchstart` would stop the browser synthesising the click and take scrolling with it, and a tap
on a touch screen does not focus a button anyway.

🔴 **jsdom cannot grade the person sentence, and saying so is half this task's instrument.** Measured before the spec was written:
with an `<input>` focused, dispatching `mousedown` on a `<button>` — and calling `.click()` — leaves `document.activeElement` on
the input and `defaultPrevented` false. An arm there asserting "focus moved to the button" reads **identically in both arms and
grades nothing**. So the split is: the **spec** grades the mechanism (is the press cancelled, and does cancelling cost the graph a
signal), and the **browser** grades the consequence (the caret stays, the next typed digit lands).

| reading | result |
|---|---|
| AC1/AC4 spec, `tests/gam-027-a-button-can-keep-the-cursor.test.tsx` | **8/8**: unset leaves the press uncancelled, on cancels it, the port is off by default, and `Click` and `Pointer Down` each fire exactly once **in both arms** |
| AC5 reverted arm: the cancel removed from `Button.tsx` | **1 red, and the right one** — only the "Keeps Focus on" row |
| AC2, deployed keypad, 1024×768 **and** 390×844 | **ALL PASS at both.** Key `7` (on): `12` → `192`, caret **2**, the field still has the keyboard, and a `5` typed on the real keyboard gives **`1952`**. Key `4` (off), same page, same wiring: `12` → `192`, caret **3**, focus on the `<button>`, and the typed `5` **goes nowhere** — the value stays `192` |
| AC3 census: Buttons in `templates/` + `library/prefabs` | **185**, and **0** set `keepsFocus`. Every one of them is the `4` row above, which is HEAD's behaviour unchanged |
| AC6 export, `nodegx export` of the keypad | *"parameter keepsFocus on keep-7 has no style/content mapping — dropped, reported"* — a **named refusal**, one per node. `export-ledger:check` OK, 177 types |
| Catalog | regenerated: the port is one 12-line entry, `keepsFocus` / `Keeps Focus` / General / boolean / default `false` |

🔴 **The control pair is what makes AC2 a measurement.** Both keys sit on one page, wired identically to the same field's
`Insert Text`; only the port differs. The `4` row is the known-firing signal — if a plain key had *not* moved the caret, the drive
would not be pressing and the `7` row would prove nothing. Both rows are read in the same run, and the two disagree exactly where
the port says they should.

**AC6's honest half:** a keypad **exported as React code still steals the caret**. The export reports the port as dropped rather
than silently ignoring it, which is the discipline EXP-011 asks for, but `CONTENT_PARAMS` can only express `children`, `attr:` and
`attr-not:` — an event handler is a shape the table does not have. Emitting it is owed and belongs in P18.

**AC7 (the workaround question):** with this port, `game-kit.AnswerPad`'s field **could** be a Text Input plus ordinary Buttons as
far as the *caret* is concerned — GAM-011 built `Insert Text`/`Backspace`, and this keeps the cursor. What still stands between
them is **GAM-028**: the pad has to know it is on a touch screen to stop the soft keyboard covering the game. The kit node stays
until that lands.

**Gates run:** the new spec 8/8; `noodl-viewer-react` `tsc --noEmit` 0 and the whole viewer suite 122 suites / 1627 ✓.

🔴 **A new port regenerates CHR-007's snapshot, and this session learned it the expensive way.** `tests-unit/chr-007/widgetDispatch.test.ts`
records the class every catalog port gets, so adding `keepsFocus` reddened it — one line, `"keepsFocus": "BooleanType"`. That is the
spec working as designed: its whole job is to notice a port appearing. Regenerated with the spec's own switch
(`CHR007_WRITE_SNAPSHOT=1`), diff verified as exactly that one line, chr-007 then 2 suites / 23 ✓ read-only, and editor `test:main` re-run **with** the port: **493 suites, 7919 ✓, exit 0**.
⚠️ **The mistake was ordering, not the snapshot:** editor `test:main` was run green *after* GAM-026 and *before* this port existed,
and never re-run. A peer's own full run found it. The file's history (`9e165a5ca` GAM-013, `8c7f57a06` GAM-011b) shows every P88
port before this one regenerating it — so **a catalog port owes a chr-007 regeneration and a re-run of `test:main` after the port,
not before**.
