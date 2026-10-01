# ISL-003 — Two lists that reuse row ids keep their own rows, or the author is told they share them

**Status: ⬜ not started — scoped 2026-10-01 at `27d891bf3`.** **Source:** [audit](AUDIT-2026-10-01.md) F03 ·
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

- **[GAM-005](../phase-88-the-defects-the-games-found/GAM-005-TWO-COPIES-OF-A-COMPONENT-KEEP-THEIR-OWN-STATE.md)** /
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

None yet.
