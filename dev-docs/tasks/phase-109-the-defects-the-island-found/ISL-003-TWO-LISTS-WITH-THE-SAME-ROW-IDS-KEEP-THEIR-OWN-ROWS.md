# ISL-003 — Two lists that reuse row ids keep their own rows, or the author is told they share them

**Status: ✅ CLOSED s9 (2026-10-03): ruled "Each list keeps its rows" and built — AC1–AC6 ✅ (AC5 deployed: treatment 6/6, control 3/3). Scoped 2026-10-01 at `27d891bf3`.** **Source:** [audit](AUDIT-2026-10-01.md) F03 ·
[P106 IG-006](../phase-106-the-island-grows/IG-006-OLIVE-READS.md) §7, deviation 10 (lines 166-167) · the template's
prefixes at `packages/noodl-mcp/tests/cg003Scripts.ts:330` and `:1250-1252` · **Side:** product (runtime: `Model`,
`Collection`, the For Each row; doctrine)

Five lesson cards each held a little list of lines, ids `l0`, `l1`, `l2`… and all five cards showed one card's lines.
A row in a Repeater is a Noodl Object, and a Noodl Object with an id is one record for the whole app. The template now
prefixes every row id by hand.

## 1. The person sentence

**Someone builds two lists from plain data, and both happen to number their rows `1, 2, 3`. Each list shows its own
rows. If the two lists really do share records, that is because the author asked for it, and the editor can say so.**

## 2. What was measured

| reading | where |
|---|---|
| `Model.get(id)` with an id returns the one record in a module-wide table (`models[id]`), creating it on first read. *Re-read at HEAD* | `packages/noodl-runtime/src/model.ts:218-241` |
| `Model.create(data)` calls `Model.get(data.id)` and then **writes every field of `data` onto that record**. *Re-read at HEAD* | `model.ts:243-252` |
| A Repeater fed plain objects converts each one with `Model.create(plain)`. F50's cache keys on the object's identity, per collection, but a plain object **with** an `id` still reaches the global record. *Re-read at HEAD* | `packages/noodl-runtime/src/collection.ts:503-546` (create `:544`) |
| Each row component takes its inputs from `model.data` and listens to `model.on('change')`. So when list B writes `l0`'s fields, list A's `l0` row re-renders with B's values. *Re-read at HEAD* | `packages/noodl-viewer-react/src/nodes/std-library/data/foreach.tsx:585-617` |
| The Repeater hands each row its record's id on an `Id`/`id` input. The classic idiom is an Object node in the row component looking that id up **globally**. *Re-read at HEAD* | `foreach.tsx:588-593`; `packages/noodl-runtime/src/nodes/std-library/data/modelnode2.ts:400` |
| A second, by-reference route exists: `Id Source = From repeater` resolves the row's own record through `_forEachModel` and does not look the id up. *Re-read at HEAD* | `packages/noodl-runtime/src/foreachitem.ts:4-48`; `componentwalk.ts:193` |
| A scoped record table already exists: `Model.Scope`, with its own `get`/`create`. The cloud runtime gives each request one, and it travels down component instances as `nodeScope.modelScope`. In the browser it is `undefined`. *Re-read at HEAD* | `model.ts:409-469`; `packages/noodl-runtime/src/nodescope.ts:57-61`; `nodes/componentinstance.ts:86` |
| The node reference for the Repeater says nothing about row ids being app-wide. A grep for `id` finds only the `itemActionItemId` output row. *Re-read at HEAD* | `docs-site/docs/nodes/visual/for-each.md:49`; `docs/node-catalog/enrichment/for-each.json:12` |
| Seen in the browser: five lesson cards showed one card's lines (`l0`, `l1`…). The fix was `<lesson>:l<i>` and `help:<block>`, gated. *As recorded 2026-09-29 (IG-006 §7 session 2, lane C), not re-driven* | `phase-106…/IG-006-OLIVE-READS.md:166-167` |
| The template prefixes its rows by hand in at least two more places: the pad's keys (`padkey-<op>`) and each robot card's abilities (`<cardId>|<block>`). The latter's comment cites "P105 D57", but **D57 is the Variable defect**, not this one. *Re-read at HEAD* | `cg003Scripts.ts:328-331`, `:1250-1254` |
| **The behaviour is relied on on purpose elsewhere.** P107 NSP-012's shared-state scenarios grade that two Object nodes naming one id see one datum (S1), and that two ids do not (S2), on the runtime, 6/6. *Re-read at HEAD (task file)* | `phase-107…/NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md:33-36`; commit `af4c15220` |

## 3. Where it bites a person

- **Anyone who writes small lists as plain data with simple ids.** Lines in a card, options in a question, steps in a
  recipe, a Static Data table per section. `1, 2, 3` and `l0, l1` are what a person and an agent both write.
- **The wrong screen is silent and looks plausible.** Every card shows real lines, just someone else's. The last list
  written wins, so the result can change with load order.
- **It reaches past Repeaters.** An Object node anywhere that names `l0` reads and writes the same record as both lists.
- **Nothing an agent reads says so.** GAM-005 put "a Variable is app-wide" into the doctrine, and the same is not said
  of row ids.

## 4. Related work and collisions

- **[GAM-005](../../tasks-archive/phase-88-the-defects-the-games-found/GAM-005-TWO-COPIES-OF-A-COMPONENT-KEEP-THEIR-OWN-STATE.md)** /
  D57 is the Variable half of "global by name". Its R6 (a warning with a "shared on purpose" escape) is the precedent
  for ruling 1(b) below, and its doctrine sentence is where a row-id sentence would sit (gate:
  `packages/noodl-mcp/tests/cmp001InterfaceDoctrine.test.ts`, owner P85 CMP-001).
- **F50** (`collection.ts:503`, `tests/corpus/f50-repeater-plain-array.test.ts`) settled that the same **object** is the
  same record within one collection. This task is about the same **id** across collections. F50's tests must stay
  green.
- **[ISL-001](ISL-001-A-LIST-GIVEN-TWICE-DRAWS-ONE-SET-OF-ROWS.md)** changes the same Repeater, and its "give rows an
  id" advice is the one that makes this defect reachable. Land ISL-001 first, or agree the order.
- **P107 NSP-012** pins global-by-id for Object nodes (S1/S2). Any change here must leave those scenarios green. It must
  not move the Object node's semantics, only what a Repeater does with plain rows (if ruling 1 is (a)).
- **Export:** P18 EXP-011 owns the Repeater translation (`packages/nodegx-export/src/analyze/plan.ts`). Record what the
  exported app does with two lists sharing an id.
- Owner grep: `grep -rln -i "global by id\|global by \`id\`" dev-docs/tasks --include='*.md'` returns IG-006 (the
  record) and NSP-012 (relies on it). Neither owns a fix. `grep -rn "same row id\|row ids" dev-docs/tasks` finds no
  owner either.

## 5. Design — 🔒 rulings first

🔒 **Ruling 1 (plain words): when two lists both have a row called `l0`, what should happen?**
- (a) **Each list keeps its own rows.** Plain data handed to a Repeater becomes records that belong to that list. A
  Noodl Object handed in as a row (from a query, an Array node, a Create New Object) stays the shared one. *Cost:* an
  Object node in the row that looks the row up **by its id** would no longer find it. It would have to use "From
  repeater". And a page that edits a row from outside the list by id would stop reaching it. Both idioms exist.
- (b) **Rows stay shared, and the app says so when it looks like an accident.** The signature is the same id, arriving
  in two lists as plain data, with **different** field values. It raises a diagnostic naming the id and both
  Repeaters. The same id with the same data stays quiet.
- (c) **Rows stay shared, and only the docs and the doctrine change.**

**Recommendation: (b) together with (c).** (a) is the cleanest for new data, but it silently breaks the
id-lookup and the edit-from-outside idioms that work today, and it splits one runtime rule into two. (b) catches the
exact case the island hit, and leaves intended sharing alone, as R6 did for Variables.

🔒 **Ruling 2 (only if 1 is (b)): how loud?** (a) A warning on the Repeater, in the editor and the deployed console.
(b) Info only. **Recommendation: (a)**, with GAM-005's "shared on purpose" comment on the Repeater as the escape, so
that one rule covers both.

Design constraints:
- Detect at conversion (`Collection.set`'s plain-object branch). That is the one place where "this id already exists,
  and another live list holds it, and a field differs" is known. Report once per id per pair of lists, not per row and
  not per frame.
- The doctrine sentence is short: *"A row's `id` is app-wide: two lists with the same ids share their rows. Prefix ids
  per list, or give rows no id."* It must pass the CMP-001 gate.
- Do not change `Model.get`, `Model.create` or the Object node.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8, before any change.** A corpus spec places two Repeaters over one row template. Repeater A gets `[{id:'l0', text:'a'}]` and B gets `[{id:'l0', text:'b'}]`, and after a settle it reads A's row input `text`. It reads `'b'`, which is RED for the person sentence. **Known-firing beside it:** ids `a0`/`b0` read `'a'`/`'b'`. Second arm: no diagnostic is raised for the shared case, beside a known-firing `repeater/items-not-a-collection` on a third Repeater fed a number in the same graph. |
| AC2 | **The ruled behaviour.** (a): A reads `'a'`, an Object node with "From repeater" in A's row reads `'a'`, and NSP-012's S1/S2 are unchanged. Or (b): exactly one diagnostic naming `l0` and both Repeaters; the same-data arm (both `text:'a'`) raises none; the "shared on purpose" comment silences it. **Sabotage arm:** remove the field comparison (b) or the per-list scope (a), and AC2 goes RED. |
| AC3 | **Doctrine.** A live `get_project_info` carries the row-id sentence in the doctrine an agent receives, and `cmp001InterfaceDoctrine.test.ts` stays green. Sabotage: delete the sentence and the spec goes RED. The node reference page `for-each.md` says the same. |
| AC4 | **Blast radius before landing.** Run the detector (or, for (a), the scoped conversion) over every shipped template, the prefabs, the embedded templates and the P86 corpus, by building each page in the harness or by a static census of Static Data / Function-literal rows feeding Repeaters. List every id shared across two lists with different data. Olive's Island **before its prefixes** (checkout `cg003Scripts.ts` at the IG-006 parent commit in a scratch copy) is the known-firing row. |
| AC5 | **The person sentence, in a browser.** A minimal project built through the door: three cards, each a Repeater over its own Static Data lines numbered `l0…l2`. Deployed with `nodegx deploy`. Under (a), each card's DOM text is its own. Under (b), the console carries the warning once per shared id and the editor rings the Repeaters. **Control arm:** the same project over HEAD shows one card's lines three times. |
| AC6 | **Workaround read.** Say which of the template's hand prefixes (`<lesson>:l<i>`, `help:<block>`, `padkey-<op>`, `<cardId>|<block>`) the ruled behaviour makes unnecessary. Change none of them here, and correct the "P105 D57" comment through P108's next session. |

## 7. Traps

- 🔴 **A single list grades nothing.** The defect needs two lists alive at once. A fixture that unmounts A before B
  binds reads correctly at HEAD.
- 🔴 **The same data in both lists looks fine.** Last writer wins, so a fixture whose two lists carry equal fields
  passes at HEAD. AC1 must use different values.
- **"Give rows an id" is the advice that makes this happen** (ISL-001, F50's comment, GAM-005 AC7). A fix to one task's
  doctrine must not contradict the other's.
- **The row's Object lookup by id is a real idiom.** Under ruling (a), grep the templates for Object nodes fed a row's
  `Id` before landing, because each one breaks.
- **The template's prefixes hide it from every garden drive.** No Olive's Island reading grades this task. AC4 needs
  the pre-prefix copy.
- `Model`'s table outlives a test. Specs reset or use unique ids, or one test's `l0` leaks into the next.

## 8. Session log

### Session 9 (2026-10-03, at `23bb0a073`)

**AC1 ✅ RED recorded, before any change.** Spec
[`isl-003-two-lists-same-row-ids.test.ts`](../../../packages/noodl-viewer-react/tests/corpus/isl-003-two-lists-same-row-ids.test.ts):
three Repeaters over one row component `/Line` (Component Inputs `text` → a sink), both lists mounted at once, each
test spelling its ids with its own suffix (the record table outlives a test).

| arm | A's rows | B's rows | warnings |
|---|---|---|---|
| known-firing: ids `a0,a1` / `b0,b1` | `['a0','a1']` | `['b0','b1']` | — |
| **the defect: ids `l0,l1` in both** | **`['b0','b1']`** (its own are `a0,a1`) | `['b0','b1']` | none on A or B |
| beside it, same graph: a third Repeater handed `42` | — | — | `repeater/items-not-a-collection` ✅ |

3/3 green as the HEAD reading (the RED clause is written as what HEAD does, so the fix flips it).
🔴 A harness trap met on the way: a row component needs `ports: [{ name, plug: 'input' }]` on the **component** as
well as the Component Inputs node, or the instance has no inputs and both arms read `undefined` (a known-firing arm
caught it, not the defect arm).

**The export already keeps each list's rows (§4's "record what the exported app does"). *Read from the emitter and its
specs, not run.*** A Repeater over plain data exports as `{DATA.map((item) => (<Row text={item.text} key={item.id} />))}`
(`nodegx-export/tests/static-data.test.ts:87-93`; the emitter at `src/emit/component.ts` `rowAttrs`, props read straight
off the item). There is no app-wide record table in the exported app, so two lists with ids `l0` each show their own
text there. **So the editor/deployed runtime and the exported React app disagree today**, and ruling (b)/(c) keeps that
disagreement while (a) removes it for plain rows.

**Census before the ruling (what ruling (a) would break), 2026-10-03.** A scratch parser over both project formats
(the split `nodegx.project.json` + `components/…` and the single `project.json`), tracing wires through Component
Inputs/Outputs and instances. Shipped: 14 `templates/` (159 Repeaters), 18 lessons, 46 prefabs (31 Repeaters), 35
modules (0), agent-chat; plus 109 fixtures, counted apart. `idSource` defaults to `'explicit'` (`modelnode2.ts:211`).

| what | shipped | how measured |
|---|---|---|
| a row component's Object/Record node looks the row up by a wired `Id`/`id` | **0** | traced |
| …by the row's id through another Object node | 5 (`filters`, `form`, `multi-select` prefabs) — rows are **records** (`Noodl.Object.create`), untouched by (a) | traced |
| a Function in a template calls `Noodl.Object.get(`/`Noodl.Objects[`/`Noodl.Model.get(` | **0** (re-grepped by me over `templates/**/nodes.json`) | grep |
| a row's click id (`itemActionItemId`) reaches an Object node | **0** — 21 wires, all to a Function, a Variable or a page link (re-read by me) | traced |
| **plain rows looked up by id from outside the list** | **1: the `table` prefab** — "Extract Headers" builds plain `RowItems` with `id: Component.Object.id + '-row-' + i.id`, and a /Table Function reads `Noodl.Object.get(Inputs.RowId).ItemId` (re-read by me in `library/prefabs/table/project/project.json`) | traced + read |
| one literal id as a plain row in two Repeaters with different fields | **0** (closest: rocket-school's Curriculum / Teach cards share 4 ids, neither reaches a For Each) | traced |
| ids prefixed by hand in shipped Functions (the workaround) | 22 places (todo `'t:'+…`, rocket-school `'r'+…`, bot-garden `padkey-`, dbt `'requires-'+…`) | regex |
| Repeater feeds | 155 Function output, 17 a parent row's field, 9 Component Object, 6 DbCollection, 3 Static Data, 3 other | traced |

Not measurable statically: ids a Function makes at runtime, and what an author hands a prefab. So (a)'s measured
shipped cost is **one prefab Function**, against the scoping's worry that it "silently breaks the id-lookup idioms".

**🔒 Ruling 1, asked 2026-10-03 in plain words** (verbatim question: *"Olive's Island had five lesson cards, each with its
own little list of lines numbered l0, l1, l2. All five cards showed the same card's lines. … The exported React app does
NOT do this … What should happen when two lists use the same row ids?"*; options: each list keeps its rows / keep
shared, warn / keep shared, document it) → **"Each list keeps its rows"** (the recommendation; its cost was quoted as
"one Function in the Table prefab … would need a one-line change"). Ruling 2 (how loud) falls away.

**Built in the form that changes least** (`noodl-runtime/src/collection.ts` `keptApart` / `plainRowRecord`, opted in by
`Collection.keepPlainRowsApart` from `foreach.tsx`'s private collection only):
- a plain row whose id no other **live** list holds → the app-wide record, exactly as before, and this list owns it;
- a plain row whose id another live list holds → this list's own record (`Model.Scope`: same id, its own fields);
- an id this list already keeps apart stays apart (the diff keys by id; a list must never swap which record an id means);
- the F50 identity cache re-checks on a hit, so the same object re-sent after another list took the id is kept apart;
- records handed in (query, Array node, Create New Object) are untouched; an Array node's collection is not opted in.

**Why not the pure form** (every Repeater gets its own records): the census can count only shipped projects, and a row
component finding its row with an Object node by its `Id` is the old Noodl idiom an imported project carries. In this
form a single list behaves as before, so that idiom, `Noodl.Object.get(rowId)` and **the `table` prefab keep working
with no change** (the quoted cost drops to zero). The cost moved instead: a lookup by id finds the **first** list's
row (load order), and two Repeaters fed the same plain objects no longer share edits. Neither was seen in the census.

**AC2 ✅** — [`isl-003-two-lists-same-row-ids.test.ts`](../../../packages/noodl-viewer-react/tests/corpus/isl-003-two-lists-same-row-ids.test.ts) 8/8:

| arm | reads |
|---|---|
| known-firing: distinct ids | A `['a0','a1']`, B `['b0','b1']` |
| **ids `l0,l1` in both** (HEAD: A read `['b0','b1']`) | **A `['a0','a1']`, B `['b0','b1']`**; B's rows still carry ids `l0,l1` |
| an Object node "From repeater" in each row | its own list's text |
| a lookup by id (`Model.get('l0')`) | the first list's row, `a0` |
| both lists re-set with new objects, same ids | A `['A0','A1']`, B `['B0','B1']`, B still 2 rows |
| A emptied, then B binds `l0` | B owns the app-wide record (`Model.get` → `b0`) |
| two `Collection.create` (Array node) with one id | still one shared record (unchanged) |
| warnings | none on A/B, beside `items-not-a-collection` on the third |

Sabotage: drop the opt-in in `foreach.tsx` → **4 red** (the four that grade the fix), 4 green; make `keptApart` ignore
`contains` → the "A emptied" arm red, alone. Neighbours: the viewer's Repeater corpus (F50, ISL-001, NDA-001/012/013/015,
OBS-003, ERG-001) 81/81; runtime collection/model/GAM-007/ISL-005 85 green (6 skipped as before); node-spec
`graph.test.ts` **87/87** (NSP-012's S1/S2 shared-object scenarios among them). `dist-types` regenerated
(`npm run build:types` in `noodl-runtime`: the viewer type-checks against it, not the source).

**AC6 ✅ (read):** with this rule, `<lesson>:l<i>` and `help:<block>` (rows in different lists) and `<cardId>|<block>`
are unnecessary; `padkey-<op>` (one list) never was. None changed here; the "P105 D57" comment is P108's (IW-010
rebuilds the island).

**Export:** now agrees for the colliding case (each list its own rows, §8 above); it never had app-wide rows.

**AC3 ✅ — the doctrine, rewritten for the ruled behaviour.** The scoped sentence ("a row's id is app-wide … prefix
ids per list") is no longer true, so the interface doctrine §9 (`noodl-editor/…/authoring/prompts/interfaces.ts`) now
says: *two lists may number their plain rows the same and each keeps its own; an id still names one record for the
whole app, so a lookup by id (an Object node given the row's `Id`, a page writing to `itemActionItemId`) finds the first
list's row; inside a row use `From repeater`, and give rows the page edits by id ids no other list uses.* That last
clause matters because the same doctrine teaches "take the id from `itemActionItemId` and write to that row".
Graded through a live `get_project_info` in `cmp001InterfaceDoctrine.test.ts` (new test green; delete the sentence →
red). The For Each page and catalog carry it as a "Watch out for" line (`docs/node-catalog/enrichment/for-each.json`
→ `catalog:merge` → `docs:nodes`; the 27 other pages the generator rewrote were put back from HEAD, as in s8).
🔴 The first wording pushed AWP-005's storefront basket to **8,354 / 8,350** tokens (`nodeDocBudget.test.ts`); shortened
to fit (15/15), not the limit moved. ⚠️ `cmp001InterfaceDoctrine.test.ts` has one red that is not this change: the
corpus publish rate reads 39%, the doctrine says 33%, stale for 25+ catalog commits — filed `P109-S9-CMP001RATE`.
MCP doctrine/budget specs: 126/127 (that row) + nodeDocBudget 15/15.

**🔴 Met before AC5: the Repeater's opt-in did not reach Static Data.** A Static Data node converts its rows itself, into
its own collection (`staticdata.ts`), so the Repeater fed by it only ever sees records, and three cards over three
tables numbered `l0…l2` would still have shown one card's lines (AC5's own shape). Static Data rows are "rows you type",
so its collection opts in too. 🔴 And it makes a **fresh collection on every parse**, so a claim held per collection
made an edited table look like a second list holding its own ids: the list is now the **node**
(`keepPlainRowsApart(collection, list)`; the claim is read on the collection the list holds now).

| arm (spec now 10/10) | reads |
|---|---|
| three cards over three Static Data tables, ids `l0…l2` each | each card its own `cardN lineI`; `Model.get('l0')` → card 1's |
| card 1's table re-parsed (JSON edited) | card 1 `['edited']`, `Model.get('l0')` → `edited`, card 2 unchanged |
| sabotage: no opt-in in `staticdata.ts` | both arms red, 8 green |
| sabotage: opt in without the node as the list | the re-parse arm red, alone |

Neighbours: runtime `test/corpus` + collection/model/GAM-007/CSV/ISL-005 + node-spec graph **837 green** (6 skipped as
before); viewer `tests/corpus` **878/878**; P107 conformance `NSP_ONLY="Static Data"` **CONFORMS, 200/200, 0
divergences**. Export: a Static Data table exports as its own `const …_DATA` array, so it agrees.

**AC5 — control arm ✅, treatment owed the engine rebuild.** Project [`isl003-three-cards/`](isl003-three-cards) built
through the door by [`isl003ThreeCards.ts`](../../../packages/noodl-mcp/tests/isl003ThreeCards.ts) (0 errors; one
`page-cannot-scroll` warning, the three cards fit): three cards, each a Repeater over its own Static Data, lines
`l0…l2` in every table, each card `data-testid="card-N"`. Drive
[`drive-isl003-three-cards.js`](../../../scripts/devtools/drive-isl003-three-cards.js) (known-firing in both modes: every
card draws three lines). **Control** — `nodegx deploy … --allow-development-engine` exit 0 on the engine bundle on disk
(`noodl.deploy.js`, 10-03 09:13, `keepPlainRowsApart` ×0): **3/3, every card reads `card 3 line 0…2`** — the island's
defect, in a browser. The treatment waits for the deploy bundle to be rebuilt (a peer's 10,000-case conformance run held
the box all session; one heavy job at a time).

**AC5 ✅ — treatment.** After the peer's run exited, the deploy bundle was rebuilt from HEAD
(`webpack-configs/webpack.deploy.dev.js`, compiled in 10 s — 🔴 that config has `watch: true`, so the command never
returns: stop it after "compiled successfully"); `keepPlainRowsApart` ×5 in `noodl.deploy.js`. `nodegx deploy` exit 0;
the drive **6/6**: `card 1 line 0…2`, `card 2 line 0…2`, `card 3 line 0…2`, no two alike, every card three lines, no
console errors. Beside the control (old engine) 3/3: card 3's lines in all three. **ISL-003 closed.**
