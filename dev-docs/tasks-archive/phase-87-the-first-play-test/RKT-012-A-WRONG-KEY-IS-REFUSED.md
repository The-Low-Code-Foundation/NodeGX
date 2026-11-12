# RKT-012 — A wrong key is refused

Added at Richard's request on 2026-09-14, after playing a typing race:

> "On the typing practice game, when you have a word and you see the letter you need to type, you can type anything
> you want and it'll progress to the second character view and keyboard letter highlighted. [...] I feel disturbed by
> the visual of typing the wrong letter 3 times and the keyboard continues showing the next letter as if everything's
> fine keep going."

**Status: 🏗️ BUILT — AC1–AC5 ✅, AC6 waits on Richard's replay.** Nothing committed.

## 1. The person sentence

**A child who presses the wrong key sees that key and the answer box flash red, and the letter they still need stays
lit, so they look for it instead of carrying on.**

## 2. What was there (2026-09-14)

| reading | where |
|---|---|
| 🔴 the lit key was `answer.charAt(typed.length)`: it counted **characters**, not letters, so "xxx" for "rocket" lit the `k` | `rdNextKey`, `tpl007Components.ts` (Race/Round) |
| the pad accepted every key; the word was only compared when Check or Enter graded it | kit `AnswerPad`, `kit.js` |
| ⌫ was drawn only at the end of a key strip, so an English typing word (no accents, no strip) had no ⌫ at all | `AnswerPad`, `if (keyEls.length)` |
| the grader saw only the final text | `GRADE_ANSWER_SCRIPT`, `tpl007Scripts.ts` |

## 3. Design

### 3.1 ✅ Ruled 2026-09-14: refused, flash only

Richard was shown two options:

| option | how it works |
|---|---|
| **Refused, flash only** ✅ | the wrong key never enters the box; it flashes red on the keyboard, the box shakes, the due letter stays lit |
| Shows red, must delete | the wrong letter enters in red, and nothing else enters until it is deleted |

He also asked for *"a backspace icon next to the input field they can click in case they aren't used to backspacing"*.

### 3.2 What was built

- **Kit `Answer Pad`: new `Expected` input.** Set, a key is accepted only when the text after it is the start of the
  word, letter case aside (`acceptsTyping`). Both input paths are checked:
  - the key listener stops a keydown before the box shows it
  - `onChange` catches what has no usable keydown (a tablet keyboard, a dead-key accent, a paste). The box is
    controlled, so a refused edit is drawn back.
- A refused key does four things:
  - adds to `Mistakes`, which a new Question resets to 0
  - names the key in `Wrong Key`, and fires `Mistake`
  - outlines the box in `Wrong Key` colour (`var(--destructive)`) for 450 ms
  - shakes the box: two identical keyframes, swapped so a second refusal restarts the shake. Reduced motion stills
    the shake and keeps the outline.
- **⌫ beside the box** whenever `Expected` is set, between the box and Check. It is faint while there is nothing to
  delete, its tooltip reads "Delete", and it keeps the focus in the box. A pad without `Expected` (maths) keeps ⌫ at
  the end of its strip, as before.
- **Kit `Keyboard Map`: new `Wrong Key` and `Wrong Count` inputs.** `Wrong Key` flashes red for 450 ms each time
  `Wrong Count` goes up, so the same wrong key pressed twice flashes twice. The next key stays lit.
- **Template.**
  - Race/Round: `rdExpected` = `isTyping === true ? answer : ''`, into the Question box, which passes it to the pad.
  - The pad's Mistakes and Wrong Key go up to Round, then to the grader and to the keyboard.
  - Maths gets `''` and accepts every key.
- **Grading, from the keys refused.** The word always ends spelled right, so the refused keys are what grade accuracy:
  - **0**: graded as before.
  - **1–2**: right, never fluent.
  - **3 or more** (`MISTAKES_WRONG`): a miss. The correction says *"3 wrong keys. Find the lit key before you press
    it."* followed by the typing tip. *"You answered rocket. The answer was rocket."* would say nothing.
  - A word not spelled right (Enter pressed early) is corrected with the answer, as before.

## 4. Acceptance criteria

| AC | criterion | status | evidence |
|---|---|---|---|
| AC1 | a wrong key never enters the box, by keydown or by input alone | ✅ | kit gate `acceptsTyping`, with a sabotage arm: the old length rule accepts "xxx" for "rocket". Drive: `refused` on every wrong-key round, EN and FR, including an `Input.insertText` refusal mid-word |
| AC2 | the box and exactly that key flash; the due letter stays lit | ✅ | kit gate (Keyboard Map `data-wrong`, plus a count-0 arm). Drive: `boxFlash`, `keyFlash` and `stillLit` 2/2 per language. **Sabotage arm (no wrong keys pressed): `boxFlash` 0/2, `keyFlash` 0/2** |
| AC3 | ⌫ sits beside the box, before Check, and deletes one letter, keeping the focus | ✅ | kit gate (beside, before Check, not repeated in the strip; maths unchanged). Drive: `backBeside` 6/6, `backWorks` |
| AC4 | 0 wrong keys grade as before; 1–2 never fluent; 3 is a miss that says so | ✅ | engine gate ([undefined, 0, 1, 2, 3, 7] → fluent, fluent, correct, correct, wrong, wrong; FR message; spelled-wrong arm). Drive: `verdict` 3/3 per language |
| AC5 | reduced motion stills the shake | ✅ | kit gate: `reducedMotionReport(PAD_CSS)` = animated `gk-pad-wrong-a/b`, unstilled `[]` |
| AC6 | Richard plays a typing race and says it feels right, including whether 3 is the right number for a miss | ⏳ | — |

## 5. Session log

**2026-09-14 (built).**
- Gates: `tpl007GameKit` + `tpl007Engine` 200/200, `tpl007Template` 73/73 after `npm run template:rocket`. Before the
  regeneration, the artefact gate was red on exactly the 12 files the change touches.
- Deploy: `nodegx-deploy.cjs templates/rocket-school <scratch>/rocket-rkt012`.
- Drive `scripts/devtools/drive-rkt012-wrong-key.js`: ALL PASS, EN and FR (1366x768, a Practice typing race, rounds
  with 1, 3 and 0 wrong keys), 0 console errors. `--sabotage` is red as above.
- Screenshots looked at: red box, red X, B lit, ⌫ between box and Check; the verdict reads "Not quite. 3 wrong keys.
  Find the lit key before you press it. Reach up from the home row and come back."
- Two drive faults were found and fixed on the way. Neither was a product defect.
  - A read 60 ms after an `insertText` refusal came before the keyboard's flash. That path takes about 150 ms, well
    inside the 450 ms flash, so the drive now polls for up to 300 ms.
  - A one-letter word has nothing due after its letter, so no key is lit. The drive expected one.
- The drive also sends AZERTY codes for a French player's letters, so RKT-008's layout probe never reads it as a
  QWERTY keyboard.

**Read from the code, not driven:** a letter typed while the box does not have the focus, and not on the strip, is
ignored rather than flashed. That is the pad's existing rule for an unfocused box.
