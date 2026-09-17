# GAM-026 — Every control a keyboard reaches shows where it is

**Status: ⬜ not started.** Written session 23 (2026-09-17) as the remainder of the ring Richard ruled first that session.
**Source:** P41 [ACC-001](../phase-41-accessibility/README.md) row 1 · found again by P87 RKT-003's keyboard screenshots, 2026-09-17 ·
**Side:** product (viewer controls stylesheet, the two `-2` control components)

Session 23 gave the Button, the deprecated Checkbox and Radio Button, the Select and both sliders a visible ring for keyboard focus
(`5e91dc469`, GAM-010 §8 s23). The two controls a person authoring today actually places — the current **Checkbox** and **Radio
Button** — still show nothing, because the ring cannot land on the element that was fixed.

## 1. The person sentence

**A child playing Rocket School with the keyboard, and anyone who cannot use a mouse, can always see which control the keyboard is
on — every control, not most of them.**

## 2. What was measured

- **Session 23, driven** (`drive-rkt003-stage.js --keys`, 1366×768): before the fix, Next (focused by its Focus wire) and an answer
  reached by Tab both matched `:focus-visible` and read `outline-style: none` — **7 red of 7**. After: 0. The rule reverted: 6 red.
- 🔴 **`outline: auto` passed every clause and could hardly be seen** on Rocket School's dark border and hard shadow. The screenshot
  caught it; the `outline-style` reading did not. Any AC here that reads a property alone repeats that mistake.
- **Not measured in s23, and this task's subject:** `.ndl-controls-checkbox-2` and `.ndl-controls-radio-2` set `opacity: 0` on the
  real `<input>` and draw the visible box as a **sibling**, so `:focus-visible` on the input paints nothing anybody can see. The
  current `Select` component (`Select.tsx`, whose class comes from `props.className`) was never read at all. A **click-only** round
  was never graded, so "a mouse click draws no ring" is a design claim here, not a measurement.
- Session 23's ring colour is `var(--ring, #101010)`, 3px, offset 2px. `--ring` exists in Minimal, Playful, Enterprise and Soft and
  in the templates; **Modern declares none**, so Modern projects get the fallback. Nobody has checked either against 3:1.

## 3. Where it bites a person

Every app ever built with the tool ships the same controls. A keyboard-only player tabs into a checkbox and the page looks
unchanged, so there is no way to know what Space will toggle. WCAG 2.4.7 and 2.4.11, Opquast 165 — and P41's README says the
replacement ring "was never written" since the first commit.

## 4. Related work and collisions

- **P41 ACC-001** owns the whole row and has no task file; Richard ruled (s23) that the remainder is done **here**, in P88. When P41
  starts, its ACC-001 says what this task delivered and what it did not.
- **GAM-010 §8 s23** holds the readings, the reverted arms and the gate
  (`noodl-viewer-react/tests/corpus/gam-focus-ring-a-control-the-keyboard-reaches-draws-a-ring.test.ts`, 9 rows). That gate's
  `RINGED`/`NO_RING` lists are where a new control class must be accounted for, so this task edits it rather than adding a second.
- **GAM-012 / GAM-010** put focus where a Focus wire says; this task is only about seeing it.
- The ring reaches a deployed app and the editor canvas through the same `src/external` bundles — a rebuild is part of any reading.

## 5. Design

- The ring for a hidden-input control goes on the **visible sibling**, selected from the input's focus state
  (`.ndl-controls-checkbox-2:focus-visible + <the box>`, or a wrapper class the component already renders) — decided by reading
  `Checkbox.tsx` and `RadioButton.tsx`, not guessed here.
- The same token and geometry as s23: `3px solid var(--ring, #101010)`, `outline-offset: 2px`, keyboard focus only.
- 🔒 **Ruling for Richard:** should `Modern` gain a `--ring` token (every other preset has one), or does the fallback stay?
- 🔒 **Ruling for Richard:** the ring is one look for every app. Is a per-project ring **width** owed (a token), or is 3px for all?

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED first, and in a browser.** A page with the current Checkbox, Radio Button and Select, reached by Tab: each is `:focus-visible` and **nothing visible changes** — read as a screenshot **and** as the visible element's computed outline/box-shadow, beside a Button in the same run as the known-firing signal. |
| AC2 | After: each of the three draws the ring on the element a person can see, ≥ 2px, in `var(--ring)`, offset from the control. Screenshots looked at, not only properties. |
| AC3 | **A mouse click draws no ring** — the clause s23 never graded: click each control with a real pointer event and read the same properties, in the same run as a Tab arm that does draw one. |
| AC4 | **Contrast, measured:** the ring against the ground it sits on, for all five presets and every template, ≥ 3:1. Where a preset fails, say so and let Richard rule rather than changing a palette here. |
| AC5 | **Reverted arms:** remove the sibling selector and AC2's checkbox/radio rows go red; put `opacity: 0` back on a fixed control and the same rows go red. |
| AC6 | The s23 gate grows the new classes in its `RINGED` list, its totality check still passes, and its five existing arms still go red. |
| AC7 | **Blast radius:** every control in `library/prefabs` and `templates/` renders the same as before for mouse and touch — the ring is the only difference, and only on keyboard focus. |
| AC8 | **The person's door:** `drive-rkt003-stage.js --keys` still ALL PASS, and a Rocket School screen with a checkbox (the player menu) is screenshotted with the box focused. |

## 7. Traps

- 🔴 **A property reading passes a ring nobody can see** (s23, `outline: auto`). Look at the screenshot every time.
- 🔴 **`:focus-visible` on an `opacity: 0` input paints nothing** even though the selector matches — the match is not the ring.
- ⚠️ An inline `box-shadow` from a node parameter beats a stylesheet `box-shadow`, which is why s23 used `outline`. A sibling ring
  drawn with `box-shadow` can be overwritten by the author's own shadow; `outline` on the sibling cannot.
- ⚠️ The bundles: a reading on a deployed page needs `src/external` rebuilt, and a peer's dev stack may be rebuilding it already.

## 8. Record

_(empty — nothing built yet)_
