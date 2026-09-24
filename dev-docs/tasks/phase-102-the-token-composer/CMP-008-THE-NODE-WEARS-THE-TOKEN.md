# CMP-008 — The node wears the token

**Opened 2026-09-24.** **Status: ✅ BUILT s1 (2026-09-24): `boxShadowSource` (Custom default / From a style token) + `boxShadowToken` on every `addShadowInputs` node; runtime emits `box-shadow: var(--x)`; exporter too (spec in `nodegx-export/tests/visual.test.ts`); `PORT_TOKEN_RULES` row; the picker draws shadow tokens as cards with the composer's words; the string row grew the token pencil; *Make this a token* under the six fields (`makeShadowToken.tsx`, one `UndoActionGroup` — driven, AC3 both halves). Catalog + enriched catalog regenerated (7 node types). AC1's shot beside HEAD, AC2's picker drive and AC6 are CMP-007's look.** Depends on CMP-002 (the shadow codec is the
*Make this a token* encoder). Ruling: RC-5 (README §4).

## 1. The person sentence

> **Someone selects a card, sees in its Shadow section that it can wear one of the project's
> shadows, picks *Lifted* from a list drawn as real shadows, and every card sharing that token
> changes with it. Someone else, who already built a shadow by hand in the six fields, presses
> one button and it becomes a token the rest of the app can wear.**

## 2. What is wrong today, measured (README §2, second look)

A Group's shadow is six ports composed into one string at
[`node-shared-port-definitions.ts:1841`](../../../packages/noodl-viewer-react/src/node-shared-port-definitions.ts#L1841).
No port holds a whole `box-shadow`, so `var(--shadow-md)` has nowhere to go; the token picker
refuses the blur and spread ports by rule; and nothing in the product references a shadow token
(0 hits in `noodl-mcp/src`, the Looks, the contract and the viewer). **Every shadow token P102
lets someone compose is, today, a shadow nothing can wear.** Richard's worry 2 on 2026-09-24
(*"if I just place a node and look through its properties, I'll think I have to do it all by
hand"*) is true and understated: by hand is the *only* way.

The gradient side needs nothing here: `backgroundGradient` is a string port that already takes a
token (its docblock says so at line 1893), and the colour picker already lists tokens.

## 3. What to build

**On every node that has `addShadowInputs`** (Group and the controls that share the mixin):

- A **Shadow source** port: enum, *Custom* (default) / *From a style token*. Group name and
  ordering are the existing shadow group's. Custom shows the six ports exactly as today. Token
  mode hides them and shows one port, **Shadow token**, a string holding `var(--shadow-x)`.
- The runtime emits `box-shadow: var(--shadow-x)` in token mode, the composed string in Custom.
  `boxShadowEnabled` still gates both.
- **The token field's picker** lists the project's shadow tokens, each drawn as a small card
  wearing that shadow with its `describe()` words (CMP-001's codec), through `tokenFieldPopout`
  ([`tokenFieldPopout.ts`](../../../packages/noodl-editor/src/editor/src/views/panels/propertyeditor/DataTypes/tokenFieldPopout.ts)),
  which HLT-012 built so that one opener serves every field. Add a `PORT_TOKEN_RULES` row for the
  new port name mapping to the shadow category; leave the blur/spread refusal exactly as it is.
- **Make this a token**: a button in the Custom mode's shadow section. Reads the six ports, asks
  for a name (default `--shadow-<component>`, must not collide), writes the token through
  `setToken(name, encode(model), { undo: true })`, switches the source to *From a style token*
  with the new name, and opens the composer on it. **One undo step** for the whole thing (a
  transaction, not three), and ⌘Z leaves the node in Custom with its six values and no new token.
  The six ports **keep their values** underneath token mode, so switching back to Custom is not a
  loss.

**Not here (P103):** the pencil on the token field that opens the composer on that token from the
node's side. *Make this a token* opens the composer once, at creation; editing an existing token
from a node is P103's row.

## 4. Backwards compatibility

- It is an **added** port with a default equal to today's behaviour. No project changes shape, no
  migration, no on-load save ([[an-on-load-migration-owes-its-own-save]] is not triggered because
  nothing migrates). An old editor opening a project that uses token mode draws the six fields and
  the token port as unknown; that is acceptable for 0.3.0 → 0.2.x and is written into UPG-006's
  notes.
- 🔴 **A new port owes the node catalog** (`noodl-types/src/node-catalog.json`, the enriched
  catalog, `noodl-mcp`'s `get_node_type`) and the MCP picker, the same as any new port. Regenerate,
  never hand-edit; a regen is a merge ([[regenerating-a-shared-artefact-is-an-unperformed-merge]]).
- The exporter (`nodegx-export`) must emit `box-shadow: var(--shadow-x)` for token mode. Check it
  before claiming the AC; the viewer is not the only renderer.

## 5. Acceptance criteria

1. On a fresh project a Group's Shadow section shows *Custom* by default and the six fields are
   byte-identical to HEAD's (a shot beside a control shot). Nothing in any of the 217 projects'
   render output changes (CMP-006's loader, `render_report` on three projects that use shadows).
2. Switch to *From a style token*, pick `--shadow-lg` from the drawn list: the Group's computed
   `box-shadow` in the preview equals the resolved token; change the token in Styles and the Group
   follows without touching the node.
3. **Make this a token** on a Group with `0 4px 12px 0 rgb(0 0 0 / 0.2)` in its six fields writes
   exactly that string as the new token (a spec against the codec), switches the node, and opens
   the composer. **One ⌘Z** puts the node back in Custom with its six values and removes the token.
4. The catalog and `get_node_type('Group')` show the two new ports with descriptions written for a
   person, not a parser; `find_tools`/the picker offer the shadow tokens on the new field.
5. The exporter emits token mode as `var()` (a spec on one exported component).
6. A drive: the person sentence, both halves, with `elementFromPoint` on the picker's rows.
