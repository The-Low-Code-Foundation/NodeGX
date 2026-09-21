# HLT-006 — The picker cannot see a token

## 🔴 THIS TASK NEEDS A RULING BEFORE IT IS BUILT — README §6 R1.

## 1. The person sentence

> **Someone who has defined their project's colours picks one from the node's colour picker, instead
> of finding the picker empty and the colours somewhere else entirely.**

## 2. What it is

**No property-editor picker in the editor enumerates project design tokens at all.** Both pickers
read only the **legacy** style layer:

- `colorstylepicker.jsx:81-88` → `stylesModel.getStyles('colors')` → `Object.keys(project.metadata.styles.colors)`
  (`models/StylesModel.ts:64-71`)
- `TextStylePicker.jsx:29` → `getStyles('text')`, same source

**In real projects that source is `null`.** Measured on `Puppy test 3`: `metadata.styles` is `null`,
while the project carries **28 custom design tokens** and the shipped contract adds many more. The
picker's only other input is `getProjectColors()` (`colorstylepicker.jsx:43-62`), a scan of node
parameters restricted to ports of `type === 'color'` — so a typography or spacing token can never
reach it by any path.

Grepping every consumer of `StyleTokensModel` / `designTokens`: outside the model's own folder the
only UI consumers are `ProjectDesignTokenContext` and the Styles panel.

## 3. 🔴 Its history — why the ruling is required

| when | what happened |
|---|---|
| P66 `FIX-015:24` | stated exactly: *"The colour picker knows nothing about tokens."* Gap **I** at `:43`: *"Two style systems coexist (legacy `metadata.styles` owns the picker UI … and has zero real usage; `designTokens` has all the usage and none of those)"* |
| P66 `FIX-015:94` | **✅ RULED 2026-08-16 — "this becomes its own phase"** |
| P94 | that phase. Its **R1** ruled: *"🟢 **BESIDE.** The picker stays for *picking* on a selected node; the panel is for *managing*"* |
| P94 s10 | **closed**, all seven tasks WORTHY. **No STY task has an AC about the picker enumerating tokens** |

So this was seen, promoted to its own phase, and that phase decided the split and closed. **P94 did
not forget it — P94 ruled on it.** Whether the picker should now offer tokens is a reversal of a
ruling Richard gave on his own look, and this task does not get to make it
([[an-assertion-written-from-the-intent-contradicts-the-decision]]).

⚠️ **P94's nearest row is a different defect** and must not be confused with this one: its handoff
§3.2 records *"Every `var(--…)` swatch in the colour picker painted NOTHING"* — a **paint** bug in
rows the picker already shows. That is about rendering, this is about enumeration.

## 4. Scope

**Blocked until R1.** If ruled build:

**In:** the two pickers offering the project's design tokens alongside whatever the legacy layer
holds; one enumeration source shared by both.

**Out:** deleting the legacy layer; importing legacy styles; the Styles panel (P94, closed); the
paint bug in P94's §3.2 unless it is the same seam — and if it is, that is a **finding with a row**.

## 5. Acceptance criteria — *only if R1 rules build*

1. **(person)** On a project whose `metadata.styles` is `null` and which has design tokens, opening
   a node's colour picker offers those tokens, named, and picking one sets the parameter to the
   token reference rather than a resolved hex.
2. **One enumeration, not two.** Both pickers and the Styles panel resolve the token list through
   the same call. 🔴 A second list is how HLT-007(b) happened.
3. A **spec on a project fixture with `metadata.styles: null`** — the real shape, not a fixture with
   a populated legacy layer, which would pass while the product stays blank
   ([[a-frozen-fixture-answers-a-different-question-once-its-subject-moves]]).
4. Typography and spacing tokens reach the **text** picker, proving the fix is not colour-only —
   the `type === 'color'` restriction is the current ceiling and the arm that proves it is gone.
5. Screenshots both themes; Richard rules WORTHY.
6. `test:ci` at the floor.

## 6. Landmines

- 🔴 **Reversing R1 makes the picker a second place to manage tokens**, which is the exact thing
  P94 designed against. If it is ruled build, the task says in writing how picking differs from
  managing, or P94's ruling is lost rather than superseded.
- ⚠️ **`metadata.styles: null` is the normal case, not an edge case.** Any fixture that populates it
  is testing a project nobody has.

---

## ✅ UNBLOCKED — 2026-09-21. R1 ruled YES, and no ruling was ever required.

**Richard, 2026-09-21:** *"The picker is for picking sure, so why wouldn't I be allowed to pick a
design token?"*

🔴 **This task was blocked on a misreading, and the misreading is instructive.** P94's R1 is quoted
in full in that phase's README:

> **Q:** Does the panel **replace** the in-node pickers, or sit beside them?
> **A:** 🟢 BESIDE. The picker stays for *picking* on a selected node; the panel is for *managing* —
> create, rename, delete, see what uses it

That answers *whether the panel supersedes the picker*. It **preserves** the picker as the picking
surface and keeps **management** out of it. It says nothing about which values may be picked — and
"the picker stays for picking" is, if anything, an argument that picking has to work.

🔴 **P94 did not merely permit tokens in the picker; it repaired them.** `STY-007`, the task that
**closed the phase**, fixed *"every `var(--…)` swatch in the colour picker painted nothing"* — a
defect **Richard found himself** in the after-picture. And `STY-001` §5 set out to measure
*"Does a `designTokens` colour appear in the colour picker's list?"* as an open question. A phase
that fixes token swatches inside a surface has not ruled that surface out of scope.

⚠️ **THEREFORE §2's PREMISE IS SUSPECT AND MUST BE RE-MEASURED FIRST.** §2 says *no* property-editor
picker enumerates design tokens *at all*. That cannot be true unchanged of the **colour** picker,
whose `var(--…)` rows P94 fixed — token rows reach it by some path. The most likely shape is **two
pickers with two different sources**: the colour picker receiving tokens via element configs or the
suggestion host, and `colorstylepicker.jsx:81` / `TextStylePicker.jsx:29`'s own lists reading the
legacy `metadata.styles` layer that is `null` in real projects. **Measure which before writing a
line** — this phase's task files have now been materially wrong three times out of three
([[measure-the-artefact-before-believing-the-task-file]]).

**The reusable lesson, which is bigger than this row:** a ruling is an answer to a *specific
question*, and this phase recorded the answer without the question. "BESIDE" became "the picker is
out of scope" became "building it reverses Richard's ruling" — three paraphrases, each defensible,
ending in a false prohibition that blocked a row for a session and was only broken by Richard asking
the obvious question. **Carry the question with the ruling, or quote it verbatim.**
