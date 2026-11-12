# RKT-005 — The answer pad

🔴 **On a French keyboard every digit needs Shift, and on a tablet the answer box summons a
keyboard that covers half the game.** Finding 3.

## 1. The person sentence

**A child answers with one tap per digit on a tablet, or with the number keys of an AZERTY laptop
without holding Shift — and in typing mode, finds é on screen instead of hunting for it.**

## 2. What was measured (2026-09-13)

| reading | where |
|---|---|
| the only answer surface is a Text Input and a Check button | `tpl007Components.ts` `QUESTION_BOX` (783) |
| AZERTY's unshifted top row is `& é " ' ( - è _ ç à`; the grader receives whatever the field holds | |
| the grader already accepts `,` and `.` as the decimal point and ignores spaces | `tpl007Scripts.ts:91-93` (`normalise`) |
| **Text Input has no `inputmode` port** — the graph cannot ask a tablet for a numeric keypad, or for no keyboard | no hit in `noodl-viewer-react/src/components/controls` |
| **Text Input's Set abstains while the field has focus** and reports `unchanged` — a pad that writes through Value/Set into a focused field does nothing, silently | `noodl-viewer-react/src/nodes/controls/text-input.ts:149-153` |
| iOS Safari does not move focus to a tapped button, so the field keeps its focus under a pad — exactly the case above | |
| the kit's Keyboard Map draws keys; it is a display, not an input | `kit.js:689` |

## 3. Design

- **`Game/Answer pad`.** Maths: `1–9`, `0`, the language's decimal separator (`,` in FR, `.` in EN),
  `−` where a skill can go negative, `⌫`, and ✓. Typing mode: **the accented letters the current
  word list actually uses**, derived from `Data/Word lists` rather than a fixed string, plus `⌫`.
- **The pad owns the answer string** (held in a `States` node or a Function output — not a global
  `Variable`, D57), and the field shows it. On a coarse pointer (`(pointer: coarse)`) the field is
  display-only, so no soft keyboard opens. On a fine pointer the field stays a real input and the pad
  helps. The player chooses on / off / auto in the player menu (RKT-008).
- **AZERTY without Shift.** In a numeric question, a key whose `KeyboardEvent.code` is `Digit0–9` or
  `Numpad0–9` enters that digit whatever Shift says. That needs keydown access: the
  `keyboard-shortcuts` module (TPL-005 vendored it) or a kit node — decide which, and drive it in the
  template (D41).
- **The product question:** is `inputmode` (with `enterkeyhint`) a Text Input port the runtime owes?
  Look for the same need elsewhere (Site Builder forms, the P84 field report). If it is owed, file it
  rather than hand-rolling around it here.

## 4. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | Drive, touch-emulated at 1024×768 and 390×844: five maths rounds answered **only** by pad taps (CDP touch events); `document.activeElement` is never an `<input>`; each verdict is right. |
| AC2 | AZERTY laptop arm: a CDP key event with `code: "Digit4"`, `key: "'"` (unshifted) enters `4` in a numeric question, and `'` in a typing question. |
| AC3 | Decimal arm: the FR pad shows `,`, the EN pad shows `.`, and a decimal answer from each is graded right. |
| AC4 | Typing arm, FR: the strip holds exactly the accents present in the FR word list. The gate computes the set; sabotage (add a word with `ÿ`) grows the strip. |
| AC5 | Fine-pointer desktop arm: typing in the field still works, and a pad tap in the middle of typing inserts rather than being dropped — the focused-Set trap, graded. |
| AC6 | Richard, on a tablet and on a French laptop. |

## 5. Record

- **Measured before building (2026-09-13, session 6), over the engine, not guessed:**
  - Every typed maths answer, 150 questions a skill × EN/FR × typed/auto: **none is negative and none is a word.** So the pad has no
    `−` key (a custom set gets one). Decimals come from the powers-of-ten skills only.
  - **The FR word list's accents are exactly `â è é ê`**, the same set the typing questions' answers use. EN has none.
  - 🔴 **A French decimal answer is stored as `64.3`, and the correction said `La réponse était 64.3.`** beside a pad that writes
    `64,3`. It is fixed here (AC3 is about that very separator).
  - A decimal question is rare at CM2: in 200 simulated races, 55 never drew one in 80 rounds. At 6e the median was round 6 and the
    99th percentile round 33, so the decimal arm plays at 6e.
  - **The product question (§3):** no `inputmode` anywhere in `noodl-viewer-react/src`, and no insert action on a Text Input. It is
    owed, and it is filed as **D60** in P78's register rather than hand-rolled in the runtime here.
- **AC1 reproduced RED ✅ 2026-09-13 — build 4 (session 5's deploy), `drive-rkt005-pad.js`.** The page reported `(pointer: coarse)` in
  every round (the known-firing signal beside the absence).

  | arm | clause | reading on build 4 |
  |---|---|---|
  | touch, FR 1024×768, 2 rounds | `pad` 0/2 · `padFold` 0/2 · `noInput` 0/2 | no pad keys; the only surface is an `<input>`, and tapping it focuses it (`INPUT`) |
  | azerty, FR 1366×768 | `digitCode` 0/1 | the Shift-less AZERTY keys for `98765` put **`ç_è-(`** in the box |
  | azerty typing | `quote` 1/1 | `'` stays `'` (expected on any build; it guards the remap staying out of typing) |
  | fine, EN 1366×768 | `midInsert` 0/1 | no pad key to tap |

  Picture: [`rkt-shots/rkt005-before-touch-fr-1024x768-question.png`](rkt-shots/rkt005-before-touch-fr-1024x768-question.png).
- **Build 1 (2026-09-13), all through the generator (KIT_EXIT=0, GEN_EXIT=0, gates 194/194, `typecheck:mcp` 0):**
  - **`game-kit.AnswerPad`**, a new kit React node (the kit is six nodes now). It owns the answer string and its own box, types at
    the caret, and never takes the focus from the box (a key's `mousedown` is cancelled). In a numeric pad a keydown whose `code` is
    `Digit0–9` or `Numpad0–9` enters that digit whatever `key` says. Under `(pointer: coarse)` a numeric pad's box is a display-only
    `role="textbox"`, so no soft keyboard can open; a typing pad always keeps a real `<input>` (a typing lesson needs the letters).
    Outputs `Text` and `Submitted`; a new `Question` clears it. Its pure parts are on `logic` for the kit gate.
  - **Why a kit node and not the graph:** D60. The two things a pad needs, typing at the caret of a focused box and reading a key's
    `code`, are exactly what a Text Input cannot do. The template's `Game/Question box` has no Text Input and no Check button left.
  - **`Logic/Pick next question`** publishes `padKeys` and `padNumeric`: maths gets `1234567890` plus `,` (FR) or `.` (EN); a typing
    question gets the accents of its language's word list, computed from `Data/Word lists`. A custom set gets a `-` key.
  - **`Logic/Grade answer`**: the correction says the child's own answer first (*"Tu as répondu 12. La réponse était 13."*; RKT-003
    §3's unbuilt item), cut at twelve characters, and none on a timeout. The answer is written in the child's language: `64,3` in
    French, and a big number grouped the way its prompt is. `drive-rkt003-stage.js`'s worst-case correction grew to match, and the
    engine gate still holds it the longest.
  - **Gates added:** kit (7: code→digit with sabotage arms, caret insert/backspace, key list and box mode, SSR render of both boxes,
    ports/tokens/no animation), engine (6: AC4 strip with the `ÿ` sabotage arm; every typed maths answer enterable from its pad and
    graded right as entered, with a known-firing decimal count and a sabotage arm that names exactly the French decimal skills; the
    French correction; the timeout, cap and grouping), template (2: the box answers through the pad; the keys follow the picker).
- **Build 1 driven (`drive-rkt005-pad.js`, DEPLOY_EXIT=0):**

  | arm | cells | reading | exit |
  |---|---|---|---|
  | **AC1** touch, 1024×768 + 390×844 × FR/EN | 4 | 20/20 rounds answered by taps alone: `coarse`, `pad`, `padFold`, `field`, `verdict`, `noInput` all 20/20 | 0 |
  | **AC3** decimal, 6e, 1024×768 × FR/EN | 2 | FR pad has `,` and not `.`, EN the reverse; a decimal answer tapped in grades right in both | 0 |
  | **AC2** AZERTY, FR 1366×768 | 2 | `digitCode` 3/3 (Shift-less `&é"'(…` keys put digits in the box); in a typing race `'` stays `'` | 0 |
  | **AC5** fine pointer, EN 1366×768 | 1 | `typeWorks` 3/3; `midInsert` 3/3: the pad key landed at the caret moved back, and the box kept the focus | 0 |
  | **AC4** typing strip, FR | 4 | `strip` 4/4 (`âèéê`), `letters` 4/4 | — |
  | typing keyboard fold (RKT-003 §3) | 4 | 🔴 **`typingFold` 1/4**: the keyboard's last row ends at 793 on 1024×768 and 1366×768, 779 on 1280×720; the phone fits | 1 |

  The first time typing mode was ever driven through the stage. At 1280×720 the card ends at 572 and the keyboard's space row is
  cut off. **Build 2** makes a typing race's course compact (18vh, not 30vh) for the whole race: `Game/Race track` gains `Compact`, a
  States node sets the course height (a number reaching a units port keeps its `vh`), and `Race/Play` feeds it `mode === 'typing'`.
- Probe fixes: the stage and teach drives counted any numeric button as an answer option, and the pad's keys are numeric buttons;
  both now skip `.gk-pad`. The look drive only falls back to a numeric button when there is no box, so it is unchanged.
- **Build 2 (2026-09-13): GEN_EXIT=0, gates 195/195, `typecheck:mcp` 0, DEPLOY_EXIT=0.** The typing arm at 1024×768, 1366×768,
  1280×720 and 390×844: **`typingFold` 4/4**, with `strip`, `letters` and `coarse` 4/4 (TYPING_EXIT=0). A template gate pins the
  30 / 18 budget and its wires.
- **Regression on build 2, every earlier drive, one at a time:** `drive-rkt003-stage.js` 10/10 cells, every clause including
  `foldWorst` with the longer correction (STAGE_EXIT=0); `--keys` at 1366×768 and 1280×720, 4/4 cells (KEYS_EXIT=0, so Enter still
  commits through the pad and the box is still focused on arrival); `drive-rkt004-teach.js` 10/10 cells (TEACH_EXIT=0);
  `drive-rkt001-wrap.js` 60/60 (WRAP_EXIT=0); `drive-rkt002-look.js` 14/14, no console error, no failed request (LOOK_EXIT=0).
  The maths track is unchanged: 230px at 1366×768, 218px with 40px rockets at 390×844.
- **Looked at:** [`rkt005-after-touch-fr-390x844-question.png`](rkt-shots/rkt005-after-touch-fr-390x844-question.png): the pad wraps
  to three rows under the box and Vérifier, and the card ends about 75px above the bottom of an 844px phone.
  [`rkt005-after-typing-fr-1280x720.png`](rkt-shots/rkt005-after-typing-fr-1280x720.png): the compact course, the accent strip
  and the whole keyboard, space bar included, on a 720px screen. Not yet seen by a person: the display-only box still says
  *"Écris ta réponse"* ("write your answer"), which reads fine under a finger but is the old Text Input's word.
- **Status: AC1–AC5 ✅ (build 2).** AC6 waits on Richard, on a tablet and a French laptop. Build 2 is served at
  `http://127.0.0.1:8768/`.
- **Left for later, on purpose:** the pad is always shown on a fine pointer. §3's on / off / auto choice lives in the player menu
  (RKT-008), and the kit's `Box` port is ready for it. A typing race on a tablet still opens the soft keyboard; it has to, since the
  kit's Keyboard Map is a display, not an input.
