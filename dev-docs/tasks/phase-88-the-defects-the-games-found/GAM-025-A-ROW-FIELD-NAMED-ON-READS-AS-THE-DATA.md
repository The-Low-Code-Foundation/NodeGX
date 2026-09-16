# GAM-025 — A row field named `on` reads as the data

**Status: ✅ closed by ruling, nothing built (session 16, 2026-09-16).** 🔒 R22 ruled twice: first D, then, once `row.get('on')` was measured throwing in exported code, **"just rename it"**. The trap stays, GAM-007's warning and error keep saying "Rename the field", and no escape is named (§7, session 16). **Source:**** [GAM-007](GAM-007-A-DATA-FIELD-CALLED-ON-READS-AS-DATA.md) §5, the second half of 🔒 R8 · registered 2026-09-14 (P88 session 8) · **Side:** product (runtime, `Model`)

## 1. The person sentence

**Someone names a data field `on`, `set`, `get` or `data`, and reading it gives back what they wrote.**

GAM-007 built the first half of R8. The names are reserved loudly: the door warns (`reserved-row-field`), and
`Collection.set` raises `collection/reserved-field-name`. This task is the second half, "data wins later".

> 🔒 **R8, Richard 2026-09-14: C. Reserve now, and data wins later.** B lands first. A follows once AC3's call-site
> sweep is done.

## 2. Why it is owed

- **The interpreter and the export disagree today.** The export hoists Static Data as `Object.freeze([...])` of plain
  objects, so an exported `row.on` already reads the data. The interpreter reads the member (GAM-007 §8, AC6, read from source).
  A makes the interpreter agree with the export.
- GAM-007's census found **0** reserved fields in shipped graphs, but it cannot see rows built by scripts or records that
  arrive from a backend. A backend record with a `data` field is ordinary JSON.
- The reserved list is 24 names. Ten of them (`toString`, `valueOf`, `constructor`…) come from `Object.prototype`, not from NodeGX.

## 3. What A is

In `_modelProxyHandler.get` (`noodl-runtime/src/model.ts`), return an own key of `target.data` before any member.

**Trade-off, from GAM-007 §2:** every internal call made **through the proxy** to a member (`item.getId()` inside
`Collection.set`, `record.set(...)`, `record.on('change', …)`) breaks on a row whose data carries that name. Each call
site has to move to the raw record first.

## 4. Collisions

- **REACTIVITY-CONTRACT:** the Model proxy is the notification mechanism. A trap change sits under that contract and
  under NDA-002's compatibility notes.
- **GAM-007:** once A lands, `Model.isReservedFieldName`, `reserved-row-field`, `collection/reserved-field-name` and their
  specs either shrink to the names A still cannot free (for example `id`), or are retired with the reason written where they were.
- ⚠️ `Model.instanceOf` reads `value.target` through the proxy, so a row field named `target` already reaches it today.
- `noodl-mcp/tests/tpl007Template.test.ts` (Rocket School's D64 gate) retires under A, with the reason written in the gate.

## 5. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD:** GAM-007's AC1 arm, inverted, so `rows[0].on` reads the data. It is red until A lands. |
| AC2 | **The call-site sweep, before the trap changes.** Every place in `noodl-runtime`, `noodl-viewer-react`, `noodl-viewer-cloud` and the prefab scripts that reaches a Model member through a proxy, listed with file and line, and each moved to the raw record. A spec per moved site feeds a row carrying that member's name. |
| AC3 | The trap reads data first. A row with `getId`, `set` and `on` fields sets into a Collection, diffs on a second `set`, and notifies a Repeater. Reverted arm: restore the old trap, and exactly those specs go red. |
| AC4 | **Person, real browser:** the D64 shape (a shelf whose rows carry `on`, read by a Function, drawn by a For Each) draws its tiles, with no console error. |
| AC5 | **Export parity, measured:** the same project run interpreted and exported reads the same row values. |
| AC6 | GAM-007's warnings and runtime error shrink or retire, per §4, with their specs. |

## 6. Traps

- 🔴 A fixture that feeds plain JSON cannot see this. Build rows with `Collection.get().set(...)`.
- 🔴 `Object.keys(row)` already lists the field, both before and after. Read the value.
- ⚠️ The Model registry is process-wide. A spec that leaves named records behind can change the next spec's reading.

## 7. Record

### Session 13 (2026-09-15, at HEAD `e740727f8`): AC2, the sweep

**No product file changed.** The sweep used two instruments. The scripts and readings are in session scratch `d740f1e3…/scratchpad/gam025/`.

- **Static:** the TypeScript checker over `src/` in `noodl-runtime`, `noodl-viewer-react` and `noodl-viewer-cloud`. It found
  **1,786** accesses to a name the trap answers with a member, each with the receiver's checked type.
- **Dynamic:** `_modelProxyHandler.get` logged the caller's frame each time it answered with a member rather than the data. The
  log was env-gated, and `model.ts` was restored from a snapshot afterwards (sha `0dc5fb87…`, the same before and after, and clean against git).
  All three suites stayed green under the trace: runtime **2,774 passed** (13 skipped), viewer-react **1,496** (1 todo),
  viewer-cloud **226**, each `EXIT=0`.

The static list overcounts. The checker types `graphModel` and `componentModel` as records, but both are `EventSender`s
(`models/graphmodel.ts:101`, `componentmodel.ts:103`), and they account for most of its 177 record-typed `on` calls. The trace
is the arbiter for every path a test reaches. It found **12 sites the static list missed:** `collection.ts:206`
(`notifyMember`), `expression-evaluator.ts:139`, `tocsv.ts:54`, `arraychanged.ts:105,106,204,219,226` and
`objectchanged.ts:101,102,142,187`.

**Tier 1: internal sites that must move to the raw record.** There are **265 sites in 44 files** (`sites.tsv`): runtime 164, viewer-react 91, viewer-cloud 10.

| member | `getId` | `data` | `set` | `off` | `get` | `on` | `_class` | `notify` | `setAll` |
|---|---|---|---|---|---|---|---|---|---|
| sites | 60 | 55 | 46 | 30 | 28 | 24 | 15 | 5 | 2 |

**114 are reached by a test, and 151 by none.** The largest are `agent/globalstore.ts` (27), deprecated `dbmodelnode.ts`
(26), `api/records.js` (19), deprecated `modelnode.ts` (13), `dbmodelnode2.ts` (13), `foreach.tsx` (12), `modelnode2.ts`
(12) and `user/user.ts` (11). AC2 asks for a spec per moved site, which means 265 specs, and 151 of them would cover a path no test reaches today.

**Tier 2: the engine reads members, so there is no site to move.** `JSON.stringify` reads `toJSON`, and `Array.join`, `isNaN` and string
coercion read `toString` and `valueOf`, all through the trap. Both were traced in the runtime and viewer-react suites. Under A, a row with a
`toString` field makes `String(row)` throw.

**Tier 3: authored scripts call the published API, so there is no site to move.** The trace caught a Map node's compiled
script calling `.get` (`eval at compileMapScript`). A census of the 682 scripts in 1,018 JSON files (`library/prefabs`,
`library/modules`, `templates`, `docs/node-catalog/examples`) found these on records:

| where | calls |
|---|---|
| `templates/members-area` cloud functions `notifyMembers`, `myNotifySetting`, `setNotifySetting`, `unsubscribe` | `m.data`, `m.getId()`, `rows[i].data` on query records |
| prefab `form` | `formValues.getId()` ×2 |
| prefabs `supabase`, `xano` | `currUser.set`, `currUser.setAll`, `Noodl.Objects.currentUser.setAll` |
| prefabs `date-picker`, `filters`, `form`, `table`, `time-picker` | `Component.Object.on` |
| prefab `app-shell` | `item.get(key)`, guarded by `typeof item.get === 'function'`, so it survives A |

**What the sweep changes about A:**

1. **`record.data` is published.** `ModelLike.data` is documented as "read directly by nodes that want the whole object". There are
   55 internal reads of it, and members-area's scripts read it too. Under A, a record whose backend table has a `data` column
   returns the column instead. That breaks an app that works today, not just a row that is already broken. *Read from A's
   definition, not run.*
2. **The escape already exists, measured.** Through a real `Model.create({ on: {a:1}, get: 5, data: {x:1}, set: 's', faces: {a:1} })`,
   `row.get('on')` gives `{a:1}`, `row.get('set')` gives `'s'` and `row.get('data')` gives `{x:1}`. Beside them, `typeof row.on` is
   `'function'` and the control `row.faces.a` is `1`. `row.get` stays the method even when a field is named `get`, so
   `row.get('get')` follows (not run). **Nothing names this escape.** GAM-007's `collection/reserved-field-name` says only
   "Rename the field", and so does the door warning.
3. A `For Each` item's ports already read through `model.get(name)` (`foreach.tsx:542`), so tiles bound by port draw. Only
   dot-access in a script fails.
4. The export's Static Data rows are frozen plain objects mapped straight into JSX (`nodegx-export/src/emit/component.ts:5461`),
   and they have no `get`. **Whether `row.get('on')` works in an exported script is not measured.**

> 🔒 **R22, Richard: does A stand at this size?**
> - **(A) As ruled.** Move 265 sites (151 untested) behind a raw accessor. Rule on the engine's names. Accept that a script calling
>   a member on a row carrying that name breaks, and that `record.data` changes meaning on a `data` column.
> - **(A′) A, keeping `data` and the engine's names.** Frees `on`, `set`, `get`, `getId`, `off`, `notify`, `setAll`, `fill`,
>   `listeners` and `_class`. `data`, `toJSON`, `toString`, `valueOf` and the other `Object.prototype` names stay reserved and warned.
>   The tier-1 sweep and the tier-3 breakage are the same as A, minus `data`.
> - **(D) Keep the trap, and name the escape.** GAM-007's warning and runtime error say `row.get('on')`, and the doctrine says it too.
>   AC5's export parity is measured for `row.get`, and nothing moves.
>
> **Recommendation: D.** It gives the person sentence through a call that already works, it regresses nothing, and it is
> graded on one parity reading. A and A′ pay for 265 moves and change the meaning of published calls, all to save typing `.get(…)`.

**Sweep traps (s13, moved here from the handoff in s15):**
- 🔴 "traced 0" was a parse bug, not a reading: the joined key held a tab, so every column shifted. Put a zero beside a count
  known to fire (115 traced sites).
- ⚠️ A peer's reverted-arm copy can sit in runtime `src/` while your suite runs, and the trace names it by file.

### Session 16 (2026-09-16, over `593de4f57`): R22 ruled, and D measured before it was built

**Richard, first answer: D** ("point to `row.get`"), with the condition that it also works in exported code.

**The export was read before building** (an Explore pass over `nodegx-export`, source only, not run):
- Static Data rows are emitted as a plain object literal inside `Object.freeze([...])` (`nodegx-export/src/emit/component.ts:6312`,
  literal from `staticRowsLiteral` at `:7268`; the outer array is frozen, the rows are not). Backend query rows are built as plain
  objects by `fromWire` (`emitApp.ts:1609-1637`). No shim gives an exported row a `get`, and a body that says `Noodl.` is not
  exported at all (`analyze/jsfun.ts:218`).
- The exported Function node wraps the body in `try { … } catch (e) { console.error('Function node X threw:', e) }`
  (`component.ts:5975-5980`), so a throw leaves the outputs unset.

**Measured** (esbuild bundle of `noodl-runtime/src/collection.ts`, a row `{id, on, get, data, faces}` set through `Collection.get().set`,
beside the same object left plain as the export's stand-in; probe in session scratch `755e094b…/scratchpad/gam025/probe.ts`):

| read | runtime row | plain row (export) |
|---|---|---|
| `row.on` | the member (`function`) | `{part:'hat'}` |
| `row.get('on')` | `{part:'hat'}` | **throws `r.get is not a function`** |
| `Object.getOwnPropertyDescriptor(row,'on').value` | `{part:'hat'}` | `{part:'hat'}` |
| `typeof row.get === 'function' ? row.get('on') : row.on` | `{part:'hat'}` | `{part:'hat'}` |
| control `row.faces.a` | `1` | `1` |
| `collection/reserved-field-name` raised (known-firing) | 3 (`on`, `get`, `data`) | — |

🔴 **So D as recommended in session 13 would have taught code that breaks on export**, silently: session 13's "the escape already
exists, measured" was measured on one target only.

**Richard, second answer (given the table): "Just 'rename it'."** No escape is named. GAM-007's texts stay as committed in `d57a11668`.
**Nothing is owed here.** The interpreter/export disagreement on `row.on` (§2) remains, and is what GAM-007's warning exists to say.

