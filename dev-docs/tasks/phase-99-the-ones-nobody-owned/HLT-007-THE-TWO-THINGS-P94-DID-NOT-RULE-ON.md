# HLT-007 — The two things P94 did not rule on

**P94 ruled the Styles panel's shape and closed on Richard's look. These two were never in front of
him.**

## 1. The person sentence

> **Someone looking for their project's text styles finds them under "Text styles", and a token
> whose category is new does not vanish from the panel because a second copy of a lookup table had
> not heard of it.**

## 2. (a) — "Text styles" reads a layer that is empty in every real project

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
