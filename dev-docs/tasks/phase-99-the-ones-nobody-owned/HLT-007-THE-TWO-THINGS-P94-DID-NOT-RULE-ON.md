# HLT-007 — The two things P94 did not rule on

**P94 ruled the Styles panel's shape and closed on Richard's look. These two were never in front of
him.**

## ✅ (a) BUILT 2026-09-22 (s16) — Richard ruled *Text styles* REMOVED. ✅ (b) BUILT s15.

### (a) — 🔴 the premise was false, and the ruling was taken three times

§2 says *Text styles* reads a layer that is *"empty in every real project"*. **It is not.** The
importer loads `textStyles` from `nodegx.styles.json` into exactly the layer the section reads
(`ProjectImporter.ts:427`). Measured 2026-09-22: **17 of 19** current-format projects on this
machine carry text styles, among them Richard's own *Puppy test* (`Label Small`) and *Landing page
test V2*. In the legacy `project.json` format, 39 of 154 do, including **16 shipped library
prefabs**. §2's *"measured: `null`"* was one project, and it was wrong as a generalisation.

s16 asked Richard three times. The first question repeated §2's claim, and he ruled *remove*.
The second corrected it to "empty only in projects built from scratch", which was still false,
and he ruled *remove*. The third gave the 17-of-19 figure and named his two projects. He ruled:
*"Remove it anyway. I don't feel like it's going to cause a massive backlash. You could argue
that we could convert the existing text styles into Looks in the new styles system, as a
compromise. Most of them will just be using the default text styles that come baked into the old
editor."* ⇒ [[a-reading-that-fits-is-not-one-that-excludes]]: a scan that reads one file format
is a scan of that format.

**What was built:** `TextStylesSection` is deleted and the panel draws three sections (Colours,
Looks, Other tokens). `summariseTextStyle` went with it, along with its spec block, because only
that section printed it. The P94 drive (`drive-sty005-panel.js`) now expects three headings and
has two new arms: a CONTROL that the project still holds text styles (`Body Small`,
`Label Small`), and *no text style is drawn as a row*. **Still true:** text styles apply at
runtime, a Text node can still pick one, and importing a prefab still brings them in. Nothing in
the editor lists, renames or deletes them any more.

📋 **Not built, raised by Richard as a compromise:** convert existing text styles into Looks.
Unscoped. His premise that most are the old editor's baked-in defaults (`Label Small`,
`Body Medium`, …) fits the names measured, but nobody has counted it.

**Readings 2026-09-22:** `tests-unit/sty-005` + `hlt-007` 40/40; `typecheck:editor` and
`-tests` exit 0; the drive against a copy of `STY-005 Panel Drive` all green, both themes,
[dark](./shots/hlt007a-panel-dark.png) ·
[light](./shots/hlt007a-panel-light.png). `test:ci`: see the P99 handoff.

### (b) — AC2, AC3, AC4 ✅ (s15)

**(b)** was built by a peer session on 2026-09-21 (11:50) and left uncommitted. s15 re-measured it,
closed the gap it left, and committed it.

- **What the peer did, and it held:** `getGroupForToken` reads `TOKEN_CATEGORIES`, the one table,
  instead of restating it. The docblock's reason for keeping a copy (*"would close a circular
  import"*) was false: the file already imported `TOKEN_CATEGORY_GROUPS` from the same line of the
  same barrel. `TOKEN_CATEGORIES` is `Record<TokenCategory, …>`, so a contract category with no
  entry is a **compile error** (TS2741, measured by the peer with a real contract mutant). That is
  AC3's build-time check. `tests-unit/hlt-007` enumerates the **contract's** union from its source
  text, so it is not asking the table about itself. `gradient` is asserted by name (AC4).
- 🔴 **The gap s15 closed:** every one of the peer's arms graded the **table**, and none graded the
  **panel**. Restore the hand-written copy in `TokensSection.tsx`, drop a category from it, and all
  five stay green. The lookup is now one exported function, `groupForTokenCategory`
  (`TokenCategories.ts`), and three arms grade it. It must agree with the table for every contract
  category. An unknown category is `null`, and so is `toString`/`constructor`, through an
  own-property check. The panel's `getGroupForToken` must call it and name no group literal.
  Applied to HEAD's panel, that arm is red, with all six group names inline.
- ⚠️ **A bare index answered an inherited name.** The peer's `TOKEN_CATEGORIES[token.category]` on
  an on-disk category `toString` returned `Object.prototype.toString`. Its `.group` was `undefined`,
  so the token was dropped *without* the warning meant to announce it.
- ⚠️ **An unknown on-disk category is still dropped** (not rendered), now with one `console.warn`
  per category. AC3's other option, a catch-all group that renders, would add a panel section. That
  is P94 STY-005 AC2's territory and needs a ruling, so it was not built.
- **Gates (2026-09-22):** `tests-unit/hlt-007` 8/8; `test:main` 536/536 suites, 8,545 specs;
  `typecheck:editor` + `typecheck:editor-tests` exit 0; eslint clean on the four files.

**(a), as s15 left it — superseded by the ruling above.** AC1 names the fork itself: the *Text styles*
section either **shows the project's typography tokens** or **says plainly the project has none**,
depending on whether the legacy `metadata.styles.text` layer is dead. HLT-006's R1 did not rule on
that. It ruled that a *picker* may offer tokens (*"why wouldn't I be allowed to pick a design
token?"*). Showing tokens under *Text styles* files typography in two places in a panel whose
layout P94 closed on his look. AC5 (screenshots, `test:ci`) is taken once (a) is built.

## 1. The person sentence

> **Someone looking for their project's text styles finds them under "Text styles", and a token
> whose category is new does not vanish from the panel because a second copy of a lookup table had
> not heard of it.**

## 2. (a) — "Text styles" reads a layer that is empty in every real project — 🔴 FALSE, see the top (17 of 19 carry text styles)

`TextStylesSection.tsx:28` → `getStyles('text')` → the legacy `project.metadata.styles.text`.
Measured: `null` in a real project. So the section a person looks in first is **empty**, while the
typography tokens are filed two collapsed levels down under *Other tokens → Typography*.

⚠️ **The nesting is NOT the defect and is not in scope.** P94 `STY-005` **AC2** ruled the four
sections and their order, and AC8 closed it on Richard's look at s10; the collapsed *Design tokens
(88)* sub-heading was a **deliberate s8 fix** (`STY-005:136-146`) for a Colours section 88 rows long.
**Do not reopen it.**

What P94 never ruled on is the *source* of the "Text styles" section. `STY-005:42` specifies it as
*"the project's text styles (`metadata.styles.text`)"* — the legacy layer — and **no AC notices that
this is empty in every real project.** Nothing in any phase mentions `TextStylesSection.tsx`.

## 3. (b) — 🔴 a second copy of the category→group table that drops tokens silently

```ts
// TokensSection.tsx:144-152
getGroupForToken(category) // → 'Typography' | 'Spacing' | … | null
```

It returns `null` for any category it does not know, and a `null` group means the token **is not
rendered in the panel at all**. Its own docblock records this **already happening**, to `gradient`.

This is a second copy of a mapping that exists elsewhere, drifting from the first
([[a-second-copy-of-a-palette-drifts-silently]]). The failure mode is the worst kind: a new token
category ships **invisible**, with no error, and the panel looks complete.

## 4. Scope

**In:** the source `TextStylesSection` reads; the second copy and its silent `null`.

**Out:** the panel's sections, order, nesting or collapse state — all P94 `STY-005` AC2/AC8, closed.
The pickers (HLT-006). Adding new token categories.

## 5. Acceptance criteria

1. **(person, a)** On a project with `metadata.styles: null` and typography tokens defined, the
   *Text styles* section either shows those styles or **says plainly that the project has none** —
   it does not render an empty section that looks like a bug.
   ⚠️ Which of those two is right depends on HLT-006's R1; if the ruling is that the legacy layer
   is dead, this becomes "shows the tokens". **Read R1 before building (a).**
2. **(b)** `getGroupForToken` is **not a second copy** — it derives from the same table as the
   original, or the original is its only source. A spec enumerates **every** category the contract
   defines and asserts each reaches a group.
3. 🔴 **An unknown category is loud, not silent.** A category with no group either falls into a
   named catch-all that renders, or fails a build-time check. A mutant adding an unmapped category
   is **red** — today it is invisible, which is the defect.
4. The `gradient` case named in the docblock is asserted by name — it is the one known survivor.
5. Screenshots both themes in `verdicts/HLT-007/<date>/`; `test:ci` at the floor.

## 6. Landmines

- 🔴 **P94 is closed and was ruled WORTHY.** Every change here must be arguable as *"P94 never saw
  this"*, not *"P94 got it wrong"*. If a fix requires changing something AC2 or AC8 named, it needs
  a ruling first ([[a-tasks-out-of-scope-line-can-contain-the-defect]] cuts both ways).
- ⚠️ **P94's README header is stale** and reads as open. It is closed — `NEXT-SESSION-PROMPT.md:1`.
  HLT-010 fixes the header; do not take the README as permission.
