# GAM-007 — A data field called `on`, `get` or `data` reads as the data

**Status: 🟢 B built (session 8, 2026-09-14, uncommitted).** AC1–AC4 are graded with reverted arms, and AC6 is read from source. **Left:** the browser halves of AC1 and AC5, AC7 (Rocket School's gate, owned by the TPL-007 peer), and A, which is registered as [GAM-025](GAM-025-A-ROW-FIELD-NAMED-ON-READS-AS-THE-DATA.md). **Source:** [P78 D64](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by P87 [RKT-011](../phase-87-the-first-play-test/RKT-011-THE-HANGAR.md), 2026-09-13 · **Side:** product (runtime, `Model`)

Rocket School's hangar drew no tiles. A shelf row's `on` field came back as the record's event method, so the
script threw `Cannot read properties of undefined (reading 'part')`. All 252 gates passed, because every gate fed the
script plain JSON.

## 1. The person sentence

**Someone names a data field `on`, `set`, `get` or `data`, and reading it gives back what they wrote, or the editor
names the field before the app runs.**

## 2. What was measured

Readings are re-read at HEAD `eb12ebe99` (2026-09-14) unless marked.

| reading | where |
|---|---|
| Seen: the hangar had a header, a preview and tabs, and no tile; the console showed the throw above. Reproduced headlessly, where `Collection.get().set(HANGAR_SHELF)` throws the same message and a plain array gives 12 rows. *As recorded 2026-09-13, not re-run* | RKT-011 §5 session 10; register D64 |
| Static Data's `items` output is its Collection, filled by `Collection.get()` + `set(rows)` for both CSV and JSON | `packages/noodl-runtime/src/nodes/std-library/data/staticdata.ts:129-137`, `:203-204`, `:233-234` |
| `Collection.set` turns each plain row into a Model | `packages/noodl-runtime/src/collection.ts:531-535` (`Model.create(plain)` at `:534`) |
| 🔴 **The proxy's `get` trap** answers any name whose value on the record is a function with that function, bound. Then comes any name `in` the record. Only after both does it read the data | `packages/noodl-runtime/src/model.ts:105-111` |
| `ownKeys` and `getOwnPropertyDescriptor` report the **data's** keys, so `Object.keys(row)` lists `on`. The row looks like data to anyone who inspects it | `model.ts:123-128` |
| Prototype members that shadow data: `on` `:279`, `off` `:288`, `notify` `:295`, `setAll` `:305`, `fill` `:316`, `set` `:325`, `getId` `:352`, `get` `:356`, `toJSON` `:372`, plus `constructor`. Instance fields: `id`, `data` (`:97-98`). `id` reads back the row's own id, so it is safe | `model.ts` |
| ⚠️ **The register's list is incomplete, read from source.** `Object.prototype` functions (`toString`, `valueOf`, `hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable`, `toLocaleString`, `__defineGetter__`…) also answer `typeof === 'function'` through the chain, so they shadow too. `listeners` becomes an instance field the first time anything calls `on` (`:280`), and after that it shadows a data field of that name. `_class` behaves the same (`:114`). **Predicted, not measured** | `model.ts:108-109`, `:280`, `:114` |
| The Rocket School gate walks the Model's prototypes but **stops before `Object.prototype`**, so its reserved list omits those names | `packages/noodl-mcp/tests/tpl007Template.test.ts:931-936` (working tree) |
| Workaround: the field is `faces`. A gate refuses any `Data/*` row field on the list, with a sabotage arm, and the engine gate runs the scripts on a real Collection. *Working tree* | `tpl007Template.test.ts:926-957`; RKT-011 §5 |
| The code export hoists Static Data as a frozen literal, so exported rows are plain objects and `row.on` should read the data. **The interpreter and the export are predicted to disagree. Not measured** | `packages/nodegx-export/src/emit/component.ts:1610`, `:2026` |
| Runtime code calls members **through** the proxy, e.g. `item.getId()` inside `Collection.set`. A row field `getId` would therefore also break the collection itself under a "data wins" fix | `collection.ts:497` |

## 3. Where it bites a person

Any Static Data, Array, query result or Object whose fields happen to be named `on` (a calendar's "on" date), `set`
(a workout set), `get`, `fill` (a chart fill), `data` (a chart's data), `notify` or `off`. It is silent, it reads like a
script bug, `Object.keys` shows the field, and no plain-JS test can see it. An agent writing JSON for a chart will
produce a `data` field sooner or later.

## 4. Related work and collisions

- **No owner found.** Greps over `dev-docs/tasks`: `proxy.*member`, `Model member`, `typeof member`, `model.ts:10`,
  `reserved.*field`, `static data` combined with `reserved|field name|member`. The only hits are D64's own records (P87 README `:34`, RKT-011 `:210`).
- ⚠️ **[REACTIVITY-CONTRACT](../../reference/REACTIVITY-CONTRACT.md)** makes the Model Proxy the notification mechanism, and Collection
  adopts the same pattern. A change to the `get` trap sits under that contract and under NDA-002's compatibility notes.
- [FLD-015](../phase-84-the-defects-the-field-report-found/FLD-015-CHARTS-THAT-EXPORT.md) (Static Data in the export) is the export side for AC6.

## 5. Design

- **(A) Data wins.** In the `get` trap, an own key of `target.data` is returned before any member. Members stay reachable
  through `Noodl.Object` APIs and through internal code that holds the raw target. **Trade-off:** every internal call made
  through the proxy (`item.getId()`, `record.set(...)`) breaks on a row carrying that field. AC3 has to enumerate those
  call sites, and each one moves to the raw record first.
- **(B) The names are reserved, loudly.** Keep the trap. The door warns when a Static Data or Array literal row carries a
  reserved field (validate + plan tools), and `Collection.set` raises a runtime error naming the field and the row. It is cheap
  and it changes no existing behaviour, but the field name stays unusable.
- **(C)** B now, then A behind it.
- 🔒 **Richard: A, B or C?** Is `on` a name a person may use for their data, or a name NodeGX reserves and says so?
  > 🔒 **Ruled, 2026-09-14 (session 1): C. Reserve now, and data wins later.** B lands first: the door warns on a reserved
  > field and `Collection.set` raises a runtime error naming it. A follows once AC3's call-site sweep is done. — Richard
  >
  > So this task builds B, under AC4's B arms, and **registers A as a follow-up with an owner** rather than leaving it
  > as a sentence. The reserved list is AC2's derived output, not a typed one.
- **Do not** rename the Model's members. `get`/`set`/`on` are the published `Noodl.Object` API.
- **Do not** fix it in Static Data only. The trap belongs to the Model, and query records and Objects share it.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A runtime spec with a real `Collection.get().set([{ on: { a: 1 }, faces: { a: 1 } }])`: `typeof rows[0].on === 'function'`. Beside it, the known-firing arm: `rows[0].faces.a === 1`. Then a browser page, a Static Data row with `on` → Function → For Each: no row draws and the console throws. Control: the same page with `faces` draws its rows. |
| AC2 | **The list is read off the runtime, not typed.** A spec derives every shadowing name, including the `Object.prototype` chain, `listeners` after an `on()`, and `_class`, and records it in §8. §2's register list is corrected from that output. |
| AC3 | **Blast radius before landing.** If A: every call site in `packages/noodl-runtime`, `noodl-viewer-react` and the prefab scripts that reaches a Model member through the proxy, listed and moved. If B: every Static Data, Array literal and `.content.json` row field in the shipped library, templates and the P86 corpus that is on AC2's list, listed. |
| AC4 | The fix per the ruling. If A: AC1's `on` arm reads the data, and a row with `getId` still sets into a Collection. If B: the door warning names `Data/X: on` on the fixture and is silent on `faces`. Sabotage arm either way: revert and the arm goes RED. |
| AC5 | **Person, real browser:** the D64 shape (a shelf whose rows carry `on`, read by a Function, drawn by a For Each) either draws its tiles (A), or is refused in the editor or at `validate_component` with the field named before it runs (B). |
| AC6 | **Export parity:** the same project run interpreted and exported. Under A both read the data. Under B both refuse or warn. Measured, not assumed. |
| AC7 | **Workaround:** Rocket School's `faces` rename stays either way, since it is a clearer name. Its template gate either follows AC2's list (Object.prototype names included) or, under A, is retired with the reason written in the gate. Checked by that gate's own sabotage arm. |

## 7. Traps

- 🔴 **A gate that feeds a script plain JSON cannot see this.** Every fixture must build its rows with `Collection.get().set(...)`, the way the runtime does.
- 🔴 **`Object.keys(row)` includes the field.** A clause that inspects keys passes on the broken record. Read the value.
- ⚠️ `id` is safe and is not on the list; a list that includes it would refuse every row.
- ⚠️ The Model registry is process-wide (`model.ts:101`). A spec that leaves records behind can change the next spec's reading.

## 8. Record

### Session 8 (2026-09-14, at HEAD `f9981f7aa`, over session 7's uncommitted GAM-005)

**What was built (R8's B).** The proxy trap is unchanged, as C requires.

| half | where | what |
|---|---|---|
| runtime predicate | `noodl-runtime/src/model.ts`, `Model.isReservedFieldName` | Answers the trap's own rule (a function up the chain, or `in` the record) against an unregistered probe that has run `on()` and had `_class` set. `id` is excluded, because it reads back the row's own id. |
| runtime error | `noodl-runtime/src/collection.ts`, `set` | For each plain row being converted into a record, any reserved key raises `collection/reserved-field-name` through `raiseUnattributedRuntimeError`. It fires once per field per `set`, names the first row carrying the field, and has `detail: { field, row }`. Rows already converted (F50's cache) are not re-read. |
| door warning | `noodl-editor/.../validation/reservedRowField.ts`, wired into `authoredPreconditionDiagnostics` | New code `reserved-row-field` (warning), one finding per field per Static Data node, at port `json` or `csv`. It reads the format the node's `type` selects (CSV when unset, as the runtime does). CSV field names are the header, read like the runtime tokeniser: BOM, quotes, `""`, CRLF, no trim. JSON that does not parse is left to `static-array/json-parse-failed`. |
| door list | `RESERVED_ROW_FIELD_NAMES` | Spelled in the editor, which cannot load the runtime. It is pinned to `Model.isReservedFieldName` by the MCP spec. |

**AC1, RED at HEAD** (`test/gam-007-a-data-field-called-on.test.ts`, before any source change: 6/6 on the AC1 and AC2 arms, `JEST_EXIT=0`).
Through a real `Collection.get().set(...)`, `typeof rows[0].on === 'function'`, and `rows[0].faces` reads its data beside it. The D64
script shape `r.on['pixel-art'].part` throws `Cannot read properties of undefined (reading 'part')`, and the `faces` shelf gives
`['hat']`. `Object.keys(row)` lists `on`. **The browser half is not run.**

**AC2, the list read off real rows through the trap**, in three conditions: fresh, after `on()`, and after `_class` is set. 24 names:

| shadows | names |
|---|---|
| always | `on` `off` `notify` `setAll` `fill` `set` `get` `getId` `toJSON` `constructor` `data` `__proto__` |
| always, from `Object.prototype` | `toString` `valueOf` `hasOwnProperty` `isPrototypeOf` `propertyIsEnumerable` `toLocaleString` `__defineGetter__` `__defineSetter__` `__lookupGetter__` `__lookupSetter__` |
| only after an `on()` | `listeners` |
| only after `_class` is set | `_class` |

`id` and `faces` read their data. §2's prediction holds: the register's list and Rocket School's gate both miss the
`Object.prototype` names, `listeners` and `_class`.

**AC3, blast radius under B** (scratch `gam007/ac3.ts`, one rule over every JSON file):

| population | files | Static Data nodes | row fields read | hits |
|---|---|---|---|---|
| `templates/` (Rocket School and TPL-008 included) | 691 | 17 | 68 | 0 |
| `library/` (prefabs and modules) | 190 | 14 | 43 | 0 |
| embedded `.content.json` | 4 | 4 | 22 | 0 |
| `docs/node-catalog/examples` (P86 corpus included) | 104 | 8 | 20 | 0 |

The known-firing arm (`SABOTAGE=1` reserves `faces`) names exactly `templates/rocket-school/components/Data/Hangar #datahangarData (json): faces`.
⚠️ **Not covered:** rows built by scripts (a Function returning object literals), and backend or query records whose fields
arrive at runtime. Only the runtime error sees those.

**AC4, green, and graded by reverted arms** (scratch `gam007/sabotage.js`). Each arm snapshots the file, makes one exact mutation,
runs the owning specs, then restores and byte-compares:

| spec | before the fix | after |
|---|---|---|
| runtime `gam-007-a-data-field-called-on` | 5 failed / 6 passed (the five B arms) | **11/11** |
| editor `tests-unit/gam-007/reservedRowField` | n/a (new module) | **10/10** |
| MCP `gam007ReservedRowField` | n/a | **8/8** |

| reverted arm | red, exactly |
|---|---|
| s1, `Collection.set` never records a field | runtime: the 4 raise tests; parity stays green |
| s2a, the probe skips `on()` | runtime parity (1), MCP parity (1) |
| s2b, `id` is not excluded | runtime parity plus the 3 raise tests whose rows carry an `id` (4), MCP parity (1) |
| s3, the door wiring line removed | unit: the wiring test (1); MCP: all 6 door tests; parity stays green |
| s4, `'toString'` dropped from the door list | unit: the list test (1); MCP parity (1) |

All five were restored byte-identical. ⚠️ A mutation to `name in probe` alone would grade nothing, because `in` already walks the
prototype chain. The function test and the `in` test give the same set here, and the trap keeps both.

**AC5 (B), half graded.** An agent's doors name the field before the app runs: `validate_component`, `validate_project` (exactly
once) and `create_component` (accepted, with the finding carried). The door stays quiet on `faces` beside `unsourced-image` in the
same response, and it is quiet on JSON the runtime does not read (Type unset). **Not driven:** the editor and a browser page, where a
person meets the runtime error through the editor warning subscriber (`<runtime>` provenance, shown globally).

**AC6, read from source, not run.** The export hoists Static Data as `Object.freeze([...])` of plain objects
(`nodegx-export/src/emit/component.ts:6312`, read by name at `:2035`). So an exported `row.on` **reads the data**, while the
interpreter reads the member and now raises. The door's warning is the same for both, because it judges the project, not the
target. The two targets therefore still disagree on the read, and that disagreement is the case for A (GAM-025).

**AC7, not done: that file is a peer's.** Rocket School's gate (`noodl-mcp/tests/tpl007Template.test.ts:951-958`, untracked, TPL-007)
still walks the prototypes and stops before `Object.prototype`. It can now ask `Model.isReservedFieldName` for each row field. The
`faces` rename stays either way.

**Wide gates after the fix**, one at a time, each with its own exit line (scratch `gam007/gates.log`):

| gate | result |
|---|---|
| editor `test:main` (`tests-main` + `tests-unit`) | **7,522 / 7,522**, 458 suites, `TEST_MAIN_EXIT=0` (session 7's 7,512 plus these 10) |
| whole `noodl-runtime` suite (it sits under every list) | **2,738 passed, 13 skipped**, 161 of 162 suites, `RUNTIME_EXIT=0` |
| MCP template gates (they pin warning lists): TPL-003, 005, 006, 007, 008, plus GAM-005's and GAM-007's specs | **7 PASS lines for 7 files, 287/287**, `MCP_GATES_EXIT=0` |
| full noodl-mcp suite, Electron `test:ci`, MCP bundle rebuild | **not run** |

**A is registered, with an owner:** [GAM-025](GAM-025-A-ROW-FIELD-NAMED-ON-READS-AS-THE-DATA.md). **Closed 2026-09-16 by R22: A is not built.** Renaming is the fix, and this task's texts stay as they are (`row.get('on')` throws in exported code, GAM-025 §7).
