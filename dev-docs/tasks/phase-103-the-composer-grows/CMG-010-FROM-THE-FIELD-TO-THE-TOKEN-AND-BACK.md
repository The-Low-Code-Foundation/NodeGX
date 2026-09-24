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
