# P102 — next session

**Status (s1, 2026-09-24): ✅ CMP-001…006, 008, 009 BUILT, typechecked, spec'd and driven (23/23
arms). Left: CMP-007 — Richard drives it and rules WORTHY. 0.3.0 waits on that ruling.**

Read [README.md](./README.md) §6 (the nine rules) and [CMP-007](CMP-007-RICHARD-DRIVES-IT.md).

## Start here

1. **Give Richard the drive.** Launch the editor (`npm run dev:debug`), open a COPY of one of his
   projects, and walk CMP-007 §2's six changes with him. Write what he finds as rows in CMP-007
   **before** fixing anything (§3.2). RC-5 in particular: does *a mode, not a replacement* read
   right from the node's side?
2. **Before that, look yourself at the four things the drive graded but no eye has seen:** the
   Dark ground on a black shadow (CMP-002 AC6), the ball's motion (CMP-004 AC2), the font list
   (`shots/cmp005-font-composer.png` — 25 of 39 fonts are *preview unavailable* on this machine,
   which is honest but may read as broken), and the property panel's *Make this a token* button +
   the shadow-token picker (CMP-008 AC1/AC2/AC6 — no shot yet: select a Group with a shadow, turn
   it on, look under the six fields).
3. **Re-run the drive after any composer change:**
   `node scripts/devtools/drive-cmp001-composer.js` against `NodeGX test projects/CMP-001 Composer Drive`
   (a copy; recreate it from `STY-005 Panel Drive` if it drifts). It closes stray popouts first and
   scopes every selector by token name — a crashed run used to poison the next.

## What you should know

- **One codec module**: `packages/nodegx-project-contract/token-codecs/`. The editor row, the
  composer, `validate_project` and the census all import it; `tests-unit/cmp-006` and `cmp-009`
  assert identity. Every `decode` ends with `encode(model) === value || null` — that is the
  round-trip rule made mechanical. Do not add a codec path that skips it.
- **RC-6 kept literals** are `{ kind: 'literal', css }` on a colour; the chip reads *Custom*. A
  Strength slider must never be offered on one (re-serialising is where a rewrite creeps in).
- 🔴 **`requestAnimationFrame` never fires in a hidden window** (every drive). The draft throttle
  is a 16 ms timer for that reason; keep it so.
- 🔴 **MCP budgets**: prompt 4,324 / 4,400 and surface 8,255 / 8,280 after the COMPOSABLE
  SPELLINGS line. Both gates print the margin; a red is answered by cutting, never by bumping.
- The shipped `dist/noodl-mcp.cjs` was rebuilt 2026-09-24 11:59 with the validator check.
- The catalog and enriched catalog were regenerated for `boxShadowSource`/`boxShadowToken` (7
  node types). A regen is a merge: run it only with no other node-source edits in the tree.
- **P103** (`phase-103-the-composer-grows`) holds everything Richard asks for beyond RC-1: dragging,
  a custom colour, strength on a project colour, the pencil on a node's token field, *Used by*.
