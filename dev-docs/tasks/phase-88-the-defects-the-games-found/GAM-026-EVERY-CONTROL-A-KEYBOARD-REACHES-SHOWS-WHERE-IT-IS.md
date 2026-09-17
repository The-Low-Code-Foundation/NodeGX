# GAM-026 — Every control a keyboard reaches shows where it is

**Status: 🟢 built, session 24 (2026-09-17).** AC1–AC6 met and AC4 measured clean; AC7's blast radius and AC8's screenshot half
are named below with what they could and could not reach. R25 answered — and its first half was already true in the product.
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
  in the templates; ~~**Modern declares none**, so Modern projects get the fallback~~ — 🔴 **false, corrected in §8 s24:** Modern's
  preset file is empty *because Modern is the defaults*, and the default vocabulary declares `--ring: #2563eb`. Measured in a
  deployed page: a project declaring no `--ring` of its own still reads `#2563eb`. Nobody had checked either against 3:1 (now done).

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

### Session 24 (2026-09-17) — built, over `653905d1e`

**R25 answered by Richard, both halves — and the first half was already true in the product.**

- *"Yes — give Modern a `--ring`."* **Nothing to add: Modern already has one.** Modern's preset file overrides no tokens **because
  Modern IS the defaults** (`ModernPreset.ts`: *"its token values match DefaultTokens.ts exactly"*), and the default vocabulary
  declares `--ring: #2563eb` (`nodegx-project-contract/tokens.ts`, DEF-001, tracking `--primary`). Driven, not inferred: a deployed
  fixture that declares **no** `--ring` of its own still reads `#2563eb` in the page, because the runtime injects the defaults under
  a project's own tokens. So §2's *"Modern declares none, so Modern projects get the fallback"* is **false** — it read the preset
  file, which is the one palette in the set that is empty on purpose. The `#101010` fallback in the rule is unreachable for any real
  project; it is kept as a fallback, not relied on.
- *"Yes — a width token too."* Built: **`--ring-width`, `3px`, category `border-width`**, added to the shared vocabulary beside
  `--ring`/`--ring-offset`. Both rules now read `outline: var(--ring-width, 3px) solid var(--ring, #101010)`, so a project that
  never heard of the token draws exactly what session 23 drew.

**The fix, and why it is where it is.** The visible box of the current Checkbox, Radio Button and Dropdown is the **wrapper**
(`div.ndl-controls-pointer`), and the focusable element is a **direct child** of it — `opacity: 0` by class for the two `-2`
controls, inline for the Dropdown's `<select>`. Not a sibling, as §5 guessed: read from `Checkbox.tsx`, `RadioButton.tsx` and
`Select.tsx`. So one rule in `noodl-viewer-react/src/assets/style.css` rings the wrapper from the child's focus state:

```css
.ndl-controls-pointer:has(> .ndl-controls-checkbox-2:focus-visible),
.ndl-controls-pointer:has(> .ndl-controls-radio-2:focus-visible),
.ndl-controls-pointer:has(> select:focus-visible) { outline: var(--ring-width, 3px) solid var(--ring, #101010); outline-offset: 2px }
```

The Dropdown is matched **by element**: `Select.tsx` passes `props.className` straight through, so its `<select>` carries the
author's style class and no control class of its own. `ndl-controls-select` belongs to the **deprecated** Options node only.

**The instrument** (`scripts/devtools/drive-gam026-ring.js`, new; fixture generator + project in scratch). A ring is a visibility
claim, so the drive reads the outline on **the first ancestor a person can actually see** (opacity > 0.05, a box with area), not on
whatever holds the focus — a ring on an invisible input would otherwise pass every clause, which is session 23's `outline: auto`
trap one level up. `:focus-visible` is read in the same reading as the known-firing signal.

| reading | result |
|---|---|
| AC1, deployed fixture at HEAD's bundle, Tab round 1366×768 | **3 RED of 5**: checkbox, radio, dropdown each `fv=true` with the visible box (`div`, one hop up) `outline-style: none`; Button rang; Text Input correctly bare. Screenshot looked at: the page is **unchanged** with the checkbox focused |
| AC2, same after the fix | **ALL PASS (5)**: all three draw `solid 3px rgb(124,58,237)` — the fixture's own `--ring` — offset 2px, on the wrapper. Screenshots looked at: a clear purple ring round the box and round the dropdown |
| AC3, mouse arm + Tab arm in one run | **ALL PASS (10)**. Button/Checkbox/Radio: a real pointer click leaves `:focus-visible` **false** and draws nothing |
| AC4, contrast, 5 presets × 7 templates × 5 grounds | **every ring clears 3:1**; the worst is Modern `#2563eb` on `--muted`, **4.72** |
| AC5, four reverted arms cut in the deployed engine | A1 no wrapper rule **3 red**; A2 ring on the focused element instead **3 red**; A3 plain `:focus` **2 red** (mouse arm); A4 width fallback `0px` **3 red** |
| AC6, the s23 gate, grown | **13/13** (was 9) |
| AC7, the same fixture at rest, rule present vs neutralised (A1), nothing focused | **byte-identical screenshots** (`sha1 ac75276a…` both) — the rule changes nothing until something is focused |
| AC8, `drive-rkt003-stage.js --keys` 1366×768 EN + FR, 5 rounds each | **ALL PASS across 2 cells** — s23's `ringNext`/`ringTab` unaffected |

🔴 **AC3 is not the clause it was written as, and the platform is why.** A click into the **Dropdown** leaves `:focus-visible`
**true** in Chromium — as it does for the Text Input, and as a native `<select>` does — because typing is the next thing you do in
either. So "a mouse click draws no ring" is graded where the platform makes that claim (Button, Checkbox, Radio: `fv=false` and no
ring), and for the Dropdown the clause is the exact one the rule makes: **the ring follows `:focus-visible` and nothing else**.
Asserting `noRing` for all five would have been an assertion written from the intent, losing to a decision the platform had already
made — so the drive states both, with the reason, rather than passing the row quietly.

🔴 **AC5's second arm cannot be run as written.** It says *"put `opacity: 0` back on a fixed control"*, which assumes a fix that
**unhid** the input. This fix does not: the input stays hidden and the ring moves to the wrapper. A2 above replaces it and tests the
same thing more directly — put the ring back on the focused element (the shape of the mistake this task exists to correct) and the
three rows go red.

🔴 **AC8's screenshot half has no subject in Rocket School.** The template carries **no Checkbox and no Radio Button** at all — one
Dropdown, in `Game/Keyboard`. So "a Rocket School screen with a checkbox (the player menu)" does not exist; the keyboard drive's
ALL PASS is the regression half, and the AC2 screenshots are the ring on a real deployed page. A shipped template that *does* place
a checkbox is **members-area** (`Pages/Account`), behind its sign-in — not driven here.

**Owed, and named:** AC7 is met for the at-rest render and for the mouse arm, but **no prefab or template corpus was rendered
before-and-after** — the claim "every control in `library/prefabs` and `templates/`" is still an argument from the selector
(`:focus-visible` gates the whole rule) plus one fixture. `library/prefabs/form` carries the Checkbox, the Radio Button and the
Dropdown in one project and is the obvious subject; it has no page and no router, so it needs wrapping before it can be deployed.

**Gates run:** focus-ring gate **13/13**; whole `noodl-viewer-react` suite **121 suites, 1619 ✓, exit 0**; the token vocabulary's
readers — `noodl-mcp` `cmp007TokensAcrossTheShelf` + `styleTools` **23/23**, `nodegx-export` `hls001-package-boundary` +
`the-typeface` + `stores-events` **42/42**, editor `def-001` + `sbr-003` + `vib-007/spacingLiteral` (+1) **43/43**. Editor
`test:main`: see the handoff.

**Traps this session added**

- 🔴 **v2 `nodes.json` is FLAT** — `children` is an array of **IDs** and each child carries `parent`. Nested node objects are dropped
  with no diagnostic: the first fixture deployed a Page with nothing in it while the deploy said *"2 of 2 components render"*.
- 🔴 **A ring on an invisible element passes every property clause.** Read the outline on the element a person can see; `hops` from
  the focused element is part of the reading.
- ⚠️ A project's own tokens sit **on top of** the shipped defaults in the page, so "this preset declares no `--ring`" says nothing
  about what the page gets. Read the token in the browser.
