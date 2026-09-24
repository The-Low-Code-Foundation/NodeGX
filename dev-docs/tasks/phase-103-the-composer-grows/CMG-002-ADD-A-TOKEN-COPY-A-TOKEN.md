# CMG-002 — Add a token, copy a token

**Opened 2026-09-24** from Richard's drive of P102 (README §2, findings 3 and 4).
**Status: 📋 ready once CMG-005 has placed the sections** (the + lives in each section's header).

## 1. The person sentence

> **Someone who needs one more spacing step, shadow or font size adds it in the section where the
> others live, names it, and sets it. They can copy any token to use somewhere else.**

## 2. What is wrong, measured

- **Finding 3.** *"How do I add a token? In all the token lists there's no button to add one, I
  just have to deal with the list provided, or is that normal??"* It is not normal, and there was
  never a button. `git log -S "Add token"` over `noodl-editor` returns nothing.
  [`StyleTokensModel.addCustomToken`](../../../packages/noodl-editor/src/editor/src/models/StyleTokensModel/StyleTokensModel.ts#L194-L212)
  (name, value, category, description; undoable) exists and has **one** caller:
  `tests/models/StyleTokensUndo.test.ts`. 🔴 Do **not** use `setToken` to create one: an unknown
  name falls back to category `'color-semantic'` (`:162`), so a new spacing token would be filed
  as a colour.
- **Finding 4.** *"There's no 'copy' button next to each token anymore, so I have to manually type
  it into each field in the node props."* There never was one on a token row: `git log -S clipboard`
  over the Styles panel and its predecessors finds only
  `7f2e31414` (P94 STY-005), which **added** *Copy reference* to the ⋯ menu of colour token rows
  ([`ColoursSection.tsx:202-209`](../../../packages/noodl-editor/src/editor/src/views/panels/StylesPanel/components/ColoursSection/ColoursSection.tsx#L202-L209)).
  The rows under *Other tokens* (`TokenCategorySection.tsx`) have no copy at all.
- 🔴 **The real complaint in finding 4 is the second half:** *"I have to manually type it into
  each field."* A copy button makes that paste instead of type. The field picking the token itself
  is [CMG-009](CMG-009-A-TOKEN-IN-A-FIELD-READS-AS-A-TOKEN.md) and [CMG-010](CMG-010-FROM-THE-FIELD-TO-THE-TOKEN-AND-BACK.md).
  Build the copy, but don't mistake it for the fix.

## 3. What to build

1. **＋ in every token section's header** (CMG-005's sections: Colours' design tokens, Spacing,
   Typography, Borders, Effects, Animation). It asks for:
   - a **name**, typed without `--` (the field shows the prefix). Refuse, inline, a name that
     exists (default or custom) or is not a valid custom property name;
   - a **kind** when the section holds more than one category (Typography holds five: family,
     size, weight, leading, tracking; Effects holds shadow and gradient). Say it in words: *Font*,
     *Text size*, *Weight*, *Line height*, *Letter spacing*;
   - a **starting value**: the value of the token above it in the list (a copy to adjust), never
     blank and never grey.
   It writes through `addCustomToken(…, { undo: true })`, **one** undo step. The new row appears
   in place, scrolled into view and highlighted. For the four composer types, the composer then
   opens on it, the same as *Make this a token* (CMG-008 of P102).
2. **A token you added can be deleted.** Defaults can only be reset (CMG-004), never deleted. Before
   deleting, count what uses it: node parameters, Looks and other tokens whose value contains
   `var(--name)`. If the count is above 0, say *"Used by N places. They will fall back to their
   own value."* and ask. Use one counting function, which CMG-010's *Used by* reuses.
3. **Copy on every token row.** A copy icon on row hover (the rows already have a hover state),
   plus *Copy reference* in the ⋯ menu where a row has one. It copies `var(--name)` and toasts
   *"Copied var(--name)"*, the same text as today's colour-row item. Colour rows keep theirs.

## 4. Acceptance criteria

1. On a copy of a real project, add one token in **each** section. Each one lands in the right
   category. Measured: the saved `designTokens.customTokens` record's `category` is the right one
   for all six, not `color-semantic`.
2. ⌘Z after an add removes the token and nothing else (one step); ⌘⇧Z brings it back.
3. A duplicate name and `--bad name` are refused inline; nothing is written.
4. A new shadow, gradient, easing, duration or font token opens the composer on creation.
5. Delete: a token worn by two nodes says *Used by 2* before it deletes. Specs on the counter,
   with a fixture wearing it in a node param, a Look and another token.
6. Copy works on a row in every section: the clipboard holds `var(--name)`, read back in the drive.
7. 🔴 A token added here is offered by the node field pickers (`TokensForPicking`) for its
   category. Drive it: add `--space-huge`, then pick it on a Group's padding.

## 5. Watch for

- `TokensForPicking` may filter on a known list rather than on category. Measure (AC7) before
  assuming a custom token appears.
- The MCP's `set_project_tokens` writes tokens too. A token the MCP adds must show in the right
  section: it goes through the same category rules or it lands in *color-semantic*. Check
  `styleTools.ts`.
