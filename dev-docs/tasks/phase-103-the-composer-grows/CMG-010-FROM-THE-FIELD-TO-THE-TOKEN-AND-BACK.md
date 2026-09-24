# CMG-010 — From the field to the token, and back

**Opened 2026-09-24** from Richard's drive of P102 (README §2, finding 12). Absorbs two §5
candidates: **the pencil on a node's token field** and **Used by**.
**Status: 📋 ready once CMG-005 (`revealStyle`) and CMG-009 (the chip) exist.**

## 1. The person sentence

> **Someone looking at a node wearing a style token can edit that token without leaving the node,
> or jump to it in Styles. Someone looking at a token in Styles can see what wears it and go to
> any of them.**

## 2. What is wrong, measured

*"I can see 'Shadow' now has a dropdown with the option 'From a style token' which is very cool,
but there should be a pointer to the styles tab that jumps the user to that style to edit it if
they need to, to make a better connection between those two points."*

- **Node → token: nothing.** `boxShadowToken` renders as a text row with the token button
  (`BasicType.ts:183-221`). There is no link to the token's row in Styles and no edit.
  `makeShadowToken.tsx:206`: *"The composer opens once, at creation (RC-5); editing it from the
  node later is P103."*
- **Nothing can point Styles at a token:** CMG-005 builds `revealStyle`.
- **The composer can already open from a node.** `openTokenComposer({ token, anchor, tokens,
  model, onClosed })`
  ([`openTokenComposer.tsx:67`](../../../packages/noodl-editor/src/editor/src/views/panels/StylesPanel/composer/openTokenComposer.tsx#L67))
  anchors to any element. `makeShadowToken.tsx:207-213` calls it from the property panel (a
  `new StyleTokensModel()`, `getToken(name)`, dispose in `onClosed`). It returns early unless
  `isComposerCategory(token.category)` (`:76`).
- **Token → nodes: nothing.** Looks have *Used by* (`StyleRow.tsx:98-146` + `useGoToWearer`);
  token rows don't.

## 3. What to build

1. **On every token chip (CMG-009), not only shadow:**
   - **✎ Edit.** For the four composer types, `openTokenComposer` anchored to the field. For the
     other nine, a small popout holding the same row editor Styles uses. The change applies to
     every wearer, and the popout says so: *"Changes shadow-md everywhere (14 places)."*
   - **Show in Styles.** `revealStyle({ kind: 'token', name })`.
2. **The same pair on the node's Look row** is CMG-006's *Show in Styles*. Don't build it twice.
3. **Used by on token rows in Styles.** Reuse CMG-002's reference counter and `StyleRow`'s usage
   chip. The list shows each wearer (component · node · field); clicking one goes to it with
   `useGoToWearer`. Count node parameters, Looks and **other tokens** (`--ring: var(--primary)`),
   and label the kind. A token worn by nothing says *"Nothing wears this yet"*, which is the §5
   row's words.
4. The composer header shows the same count when opened from either side.

## 4. Acceptance criteria

1. **Richard's drive:** a Group with *Shadow source: From a style token*, `shadow-lg`. *Show in
   Styles* → Effects is open and `--shadow-lg` is on screen and highlighted. Back on the node:
   ✎ → the composer opens beside the field. Make it bigger, Apply: this Group **and** another
   wearing `shadow-lg` both change, and ⌘Z undoes it in one step.
2. ✎ on a padding chip (a non-composer type) edits `--space-4`, and every wearer moves.
3. `--shadow-lg`'s row in Styles shows *Used by 2*; the list goes to each Group.
4. `--primary` shows its token wearers (`--ring`, `--primary-hover` if they reference it) as
   well as node fields. Spec the counter on a fixture with all three kinds.
5. A fresh token shows *Nothing wears this yet*.
6. §2's touch-point table re-read on the running editor after this task: every ✗ is ✅ or has a
   named reason. Paste the table here.

## 5. Watch for

- 🔴 [[count-the-reach-first]]: the counter is the number a beginner trusts before editing a shared
  token. Test it against a real project (one with Looks and aliases), not only a fixture
  ([[a-budget-measured-on-a-fixture-is-a-budget-on-the-fixture]]).
- 🔴 [[a-project-scan-must-read-both-project-formats]].

## 6. Built (s1, 2026-09-24)

**On every chip (§3.1).** `TokenChipActions` (`propertyeditor/components/TokenChipActions.tsx`)
rides in the chip's `actions` slot on all five controls CMG-009 built — the number fields, the
padding box (in the compact chip's hover overlay beside ✕, since a ~45px side has no width to
give), the shadow row and the font picker row:
- **✎ Edit** — `openTokenEdit`: for the four composer types, `openTokenComposer` anchored to the
  chip (the composer opens beside the field; the inspector is at the window's right edge, so it
  opens leftward); for the other nine, `openTokenRowEditor` — a small popout with the value box,
  Cancel/Apply, and the sentence *"Changes --space-4 everywhere (6 places)"*
  (`changesEverywhereText`). Apply is `setToken` with undo: every wearer moves, ⌘Z is one step.
- **⇱ Show in Styles** — `revealStyle({ kind: 'token', name })` (CMG-005).
Everything the editor's singletons touch is `require`d at press time: the component rides on the
same path `rel-014` and `hlt-012` travel under the plain-Node runner.

**One walk, not one per row (§3.3).** `tokenUsageAll(project, tokens)` reads every node once and
files each reference under the token it names; `tokenUsageIn` is that map read at one name, so the
delete-confirm (CMG-002), the row, the row editor and the composer header print one reading
([[count-the-reach-first]]). Three kinds: nodes (with the fields named, visual states included),
Looks, and other tokens (`--gradient-brand: … var(--primary) …`).

**Used by on token rows.** `TokenCategorySection` rows (Type, Spacing, Borders, Effects, Motion)
draw `N×`, pressable, opening a list: node entries go to the node (`useGoToWearer`), a Look entry
is a rule (not pressable), a token entry reveals that token's row. `0` prints *unused* with the
title *Nothing wears this yet*. The Colours section's token rows are `StyleRow`s: `StyleWearerList`
gained `tokens` and `onGoToToken`, and `describeUsage`/`usageListTitle` count them. A row never
asked draws no count. The walk is redone when the tokens change, on a Look/style change, and when
the section (or the colour-token list) is opened — a node edited while the section was closed is
read on the next open.

**The composer header (§3.4)** says *Used by 2 nodes* whichever side opened it: `openTokenComposer`
counts, `TokenComposer` draws it (`data-worn-by`).

**§4 measured** (`scripts/devtools/drive-cmg010-field-to-token.js` on a fresh copy of *CMP-001
Composer Drive*, `CMG Drive Looks K`; 18/18 arms):

| AC | reading |
|---|---|
| 1 | two Groups with *Shadow source: From a style token*, `--shadow-lg`. From the first's chip, *Show in Styles*: `SidebarModel.ActiveId = styles`, Effects `data-section-open="true"`, the `--shadow-lg` row in the viewport with `data-revealed="true"` (`shots/cmg010-ac1-show-in-styles.png`). Back on the node, ✎: `[data-token-composer="--shadow-lg"]` to the left of the chip, the chip's line inside its height, header `Used by 2 nodes` (`shots/cmg010-ac1-composer-from-field.png`). A slider to its end + Apply: `--shadow-lg` `0 10px 15px -3px …` → `0 10px 80px -3px …`, both Groups still `var(--shadow-lg)`, undo +1; ⌘Z → the original, one step |
| 2 | ✎ on the padding chip (hover overlay, computed opacity 0 → 1): the row editor `[data-token-row-editor="--space-4"]` with *Changes --space-4 everywhere (6 places)* and `16px` (`shots/cmg010-ac2-row-editor.png`); `20px` + Apply → `--space-4 = 20px`, the Group's Pad Left resolves to 20px, undo +1; ⌘Z → 16px. ⇱ from the same chip lands on `--space-4` in Spacing, revealed |
| 3 | the `--shadow-lg` row: a `2×` button titled *Used by 2 nodes — press to see which*; open, two entries (`Page canvas`, `SSR probe`, each `boxShadowToken · Home`); pressing the second selects it on the canvas (`selected: ["probe-group"]`). `shots/cmg010-ac3-used-by.png` |
| 4 | `--primary` in Colours: `17×` — *Used by 15 nodes and 2 other tokens*; the list ends with `--gradient-brand` and `--gradient-spotlight` badged *token* (`shots/cmg010-ac4-primary-wearers.png`). The spec's fixture holds all three kinds (two nodes, one through a visual state; one Look; two aliases) |
| 5 | `--cmg010-fresh` added: `unused`, titled *Nothing wears this yet*, not pressable |
| 6 | below |

**§2's touch-point table, re-read on the running editor after this task (AC6):**

| from ↓ / to → | the token | the Look | the nodes wearing it |
|---|---|---|---|
| a node's token field | ✅ ✎ opens the composer / row editor on *this* token; ⇱ *Show in Styles* | — | ✅ the count in the composer header; the list is one press further (⇱ → *Used by*) |
| a node's Look dropdown | — | ✅ *Editing the Look* (CMG-006), *In Styles* | ✅ the Look editor's header counts them (*worn by N nodes*); the list is *In Styles* → *Used by* |
| a Styles token row | ✅ composer (4 types) / text box (9), ✎ | — | ✅ *Used by* → nodes, Looks and the tokens built from it |
| a Styles Look row | — | ✅ *Edit* (CMG-006) | ✅ *Used by* → selects the node |

Named reason for the two "one press further" cells: a count in a header is what a person needs
before an Apply; the list is a Styles-panel thing and lives in one place.

**Found on the way.**
- `StyleRow`'s menu is a dialog that reads `document` at render; a spec that renders a colour row
  mocks `ContextMenu` (cmg-003's mock).
- A drive that toggles a wearer list must *open* it, not click it: the Styles panel stays mounted
  between runs and a list left open reads as empty after a blind press.
- The Colours section keeps its token list closed (88 rows) — the walk for it runs only once the
  list is opened, so a closed panel costs nothing.
