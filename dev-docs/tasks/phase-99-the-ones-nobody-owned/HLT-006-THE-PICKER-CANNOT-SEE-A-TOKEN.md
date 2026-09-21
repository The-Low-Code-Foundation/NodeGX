# HLT-006 — The picker cannot see a token

## ✅ RULED AND BUILT — s4, 2026-09-21. R1 ruled YES; see §2a for what the re-measurement changed.

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
⚠️ **Wrong — there are four, see §2a.**

## 2a. 🔴 THE RE-MEASUREMENT, 2026-09-21 (s4) — §2's headline SURVIVES, three of its supports do not

The previous session unblocked this row and wrote one instruction on it: *measure §2 before writing
a line*, because this phase's task files had been materially wrong three times out of three. They
are now wrong four times out of four — but **not about the thing the task is named for**.

**✅ What survived, exactly as written.** No property-editor picker *enumerates* design tokens.
`colorstylepicker` and `TextStylePicker` read `getStyles('colors' | 'text')`, that layer is absent
in real projects, and neither file mentions the token model. The headline is sound.

**🔴 (a) The colour picker nonetheless DISPLAYS token rows, and that is how P94 and this task were
both right.** `getProjectColors` walks every node's `type === 'color'` ports and collects the
**values already set on them**. On a token-authored project those values *are* `var(--primary)`
strings. So the picker shows tokens **by echo, never by enumeration** — P94's `STY-007` was fixing
the paint of echoed rows, while §2 was correctly describing the absent enumeration. Two true
statements about two different lists, and the phase spent a session treating them as a contradiction.

🔴 **The echo cannot bootstrap.** A token reaches the list only once some node already wears it, and
the only way to first make a node wear one is to type `var(--name)` by hand
([[a-derivation-fed-by-its-own-gate-cannot-bootstrap]]). Measured on `Puppy test 3`:

| | count |
|---|---|
| effective design tokens | **193** |
| of which colours (`color-semantic` + `color-palette` + `gradient`) | **91** |
| colour tokens the picker could show (used on a colour port somewhere) | **13** |
| colour tokens unreachable by any path | **78** |
| non-colour tokens in use — unreachable by the colour picker forever (`type === 'color'`) | **36** |
| tokens the **text** picker can show, by any path | **0** |

**🔴 (b) §2's consumer list was short by two, and one of them is inside the property editor.**
`BenchInputsRail.tsx:94` and `propertyeditor/components/StyleSuggestionHost.tsx:30` each construct
their own `StyleTokensModel`. Neither is a picker — the suggestion host draws a *banner* ("this
hard-coded colour matches `--primary`") — so the headline holds. But "the only UI consumers are the
context and the Styles panel" was the sentence that made a token-aware property editor sound
impossible, and the property editor has been token-aware in one corner all along.

**🔴 (c) AC4 named the wrong surface, and Richard re-scoped it.** AC4 asked for typography and
spacing tokens in the **text** picker. That picker picks a named *text style* — a bundle of family,
size and weight — so a single `--text-sm` row is a category error in it. The 36 non-colour tokens
this project uses sit on `fontSize`, `paddingTop`, `rowGap`, `borderRadius`, `lineHeight`,
`letterSpacing` — **numeric fields**, which already *tolerate* a `var()` value (`NumberWithUnits`,
`Dimension`, `MarginPaddingType` each document the parsing) and none of which *offers* one.
⇒ **AC4 is retired and replaced by AC4′ below; the numeric-field surface becomes [HLT-012](./HLT-012-THE-NUMERIC-FIELDS-CANNOT-OFFER-A-TOKEN.md)**, not an observation.

**🔴 (d) And the 91 is not a palette — it is a shipped ramp nobody uses.** Richard, on being shown
the number: *"why TF does one app have 91 colour tokens? Normally apps should be based on like a few
colours max"*. He is right and the split is the answer: **25** semantic tokens (`--primary`,
`--muted`, `--border`, `--ring`…), **16 of them this project's own overrides**, plus **61** raw
Tailwind ramp swatches (`--gray-50` … `--purple-900`) and **5** gradients that this project
references **not once**. All 13 tokens it actually uses are semantic. So the picker offers the 25
open and the ramp behind one closed row — which is independently where P94 landed in
`ColoursSection` after 88 open rows "buried" the styles above them.
⚠️ Gradients are excluded from both: their group is `Effects` and no `type === 'color'` port can
wear one.

## 3. Its history — ~~why the ruling is required~~ why it *looked* required

| when | what happened |
|---|---|
| P66 `FIX-015:24` | stated exactly: *"The colour picker knows nothing about tokens."* Gap **I** at `:43`: *"Two style systems coexist (legacy `metadata.styles` owns the picker UI … and has zero real usage; `designTokens` has all the usage and none of those)"* |
| P66 `FIX-015:94` | **✅ RULED 2026-08-16 — "this becomes its own phase"** |
| P94 | that phase. Its **R1** ruled: *"🟢 **BESIDE.** The picker stays for *picking* on a selected node; the panel is for *managing*"* |
| P94 s10 | **closed**, all seven tasks WORTHY. **No STY task has an AC about the picker enumerating tokens** |

🔴 **STRUCK 2026-09-21. The paragraph that stood here was this row's whole blocker and it was
wrong.** It read: *"Whether the picker should now offer tokens is a reversal of a ruling Richard gave
on his own look, and this task does not get to make it."* P94's R1 answered **"does the panel replace
the picker?"** — not **"may the picker offer tokens?"**. An answer carried without its question
generalises into a prohibition nobody ever gave. Kept visible rather than deleted, because the shape
of the mistake is the reusable part; see the UNBLOCKED section at the foot of this file.

⚠️ **P94's nearest row is a different defect** and must not be confused with this one: its handoff
§3.2 records *"Every `var(--…)` swatch in the colour picker painted NOTHING"* — a **paint** bug in
rows the picker already shows. That is about rendering, this is about enumeration.

## 4. Scope

**In:** the **colour** picker offering the project's design tokens alongside whatever the legacy
layer holds; one enumeration source shared with the Styles panel.

⚠️ **The text picker is NOT in scope after the re-measurement** (§2a(c)). It picks a named text
*style*; the typography tokens AC4 wanted in it belong on the numeric fields, which is HLT-012.

**Out:** deleting the legacy layer; importing legacy styles; the Styles panel (P94, closed); the
paint bug in P94's §3.2 unless it is the same seam — and if it is, that is a **finding with a row**.

## 5. Acceptance criteria — ✅ **all met except AC5, which is Richard's look**

1. **(person)** On a project whose `metadata.styles` is `null` and which has design tokens, opening
   a node's colour picker offers those tokens, named, and picking one sets the parameter to the
   token reference rather than a resolved hex.
2. **One enumeration, not two.** ~~Both pickers~~ **the colour picker** and the Styles panel resolve
   the token list through the same call — `ColourTokensForPicking.ts`. 🔴 A second list is how
   HLT-007(b) happened. (The text picker left scope with AC4; see §2a(c).)
3. A **spec on a project fixture with `metadata.styles: null`** — the real shape, not a fixture with
   a populated legacy layer, which would pass while the product stays blank
   ([[a-frozen-fixture-answers-a-different-question-once-its-subject-moves]]).
4. ~~Typography and spacing tokens reach the **text** picker~~ **RETIRED — wrong surface, §2a(c).**
   **AC4′ replaces it: the 91 colour tokens do not arrive as 91 rows.** The semantic set is offered
   open and the raw ramp sits behind one closed row that states its count, so the list a person
   reads on opening is the project's palette and not a shipped vocabulary dump. Richard: *"I don't
   want hundreds of lines in a colour picker."* And the ramp is reachable by filtering — a closed
   disclosure that hides matches is a search box that lies.
5. **(AC4b) The echo does not double the enumeration.** A token already used on a node appears **once**,
   in the tokens section, not again under *Colors in project*. This is the defect the fix itself
   could introduce, and it is counted ([[a-drive-that-counts-only-the-cured-error-cannot-see-a-trade]]).
6. **(AC5)** Screenshots both themes; **Richard rules WORTHY** — 📋 the one criterion still open.
7. **(AC6)** `test:ci` at the floor — ✅ 8 by name. And `test:main` green (P99 §7): ✅ 527/527, 8425/8425.

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
