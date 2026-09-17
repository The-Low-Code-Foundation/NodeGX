# GAM-027 — A button can be told not to take the cursor

**Status: ⬜ not started.** Written session 23 (2026-09-17) on Richard's ask, from GAM-011 AC7's record.
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
- 🔒 **Ruling for Richard:** is this a port on the Button, or is it what the Button should do **always** when the thing losing focus
  is a text field? (Always is the behaviour a person expects from a keypad, and it is a change to every existing app.)
- 🔒 **Ruling for Richard:** does the same port belong on the other controls a pad might use (Checkbox, Radio Button, the whole
  `-2` set), or is Button enough for the sentence?
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
