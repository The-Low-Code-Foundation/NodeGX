# CHR-007 — The rows become descriptors

`Ports` is a 1,182-line view that decides what a node's properties are **and** builds their DOM.
The deciding is pure and the building is not. Separate them, change nothing a person can see, and
pin the separation with the specs that already exist. This is the task that makes CHR-008 a
render change rather than a rewrite.

## 1. The person sentence

**Nobody notices this task shipped.** Every property row for every node type renders exactly as
before — and a developer can now ask, without a DOM, "what rows does this node get, in what
groups, with what gates?"

## 2. What the code says (audit, re-read at HEAD)

- `DataTypes/Ports.ts:92` `class Ports extends ListenableView`. `renderGroups` (`:636-661`) hashes
  `{ports, variant, capabilities, schemaNotice, schemaAddField, filter}` and returns early on a
  match — six sites clear `_portsHash` by hand (`:143,205,410,744,756`).
- `renderParams` (`:431-465`) builds `portsByName`, instantiates a row class per port, and wraps
  each row's element through four functions: `describePortElement` (`utils/portDescription.ts`),
  `decoratePortElement` (`capability-gating/portDecoration.ts`), `applyPortGate` (`utils/portGate.ts`),
  `applyPortHint` (`utils/portHint.ts`) — 551 LOC that read a row's DOM after it renders.
- `viewClassForPort` (`:790-1072`): **37 `isOf*` predicates, 40 branches, 38 classes**, in one
  method. `tests/nodegraph/propertyeditor.js:14-21` instantiates `PropertyEditor` and calls
  `pe.portsView.viewClassForPort(...)` directly — the existing characterisation.
- Grouping: `getViewGroupsFromPorts` (`:1145-1156`) groups by the English `group` string with
  `'Other'` as the fallback; `showHeaders` (`:686`) depends on the group being named `Other`.
  `propertyPanelTiers.ts:91-127` decides basic/advanced from a table of 27 group names;
  `propertyPanelViewState.ts:47` persists expansion by group name globally.
- `TabGroup` views carry **no `name`**, so `countActiveInGroup` under-reports (`:576-582`) and a
  per-port wrapper reaches none of the corner-radius / per-edge ports
  ([[the-property-panel-row-wrappers-cannot-see-a-tab-group-port]]).
- 38 row classes: 23 `extends TypeView`, 6 `extends PickerTypeView`, 9 `extends WorkflowTypeView`.
  All 38 mount React via `createRoot` in `render()`; the class is a lifecycle wrapper around a
  component that already exists (`BasicType.ts:65-72`, `EnumType.ts:46-53`, …).

## 3. Scope

1. **`describeRows(node, ctx): RowDescriptor[]`** — a pure function in a new
   `propertyeditor/model/describeRows.ts`. Input: the node (through the same `ModelProxy` the
   views get — [[a-typeview-is-handed-a-modelproxy-not-the-node]]), the variant, capabilities,
   schema notice, filter. Output, per row:
   ```ts
   { key, name, group, groupKey, widget, port, value, connected,
     description?, decoration?, gate?: { by: string, on: boolean, reason }, hint?, tab?: { group, label } }
   ```
   where `groupKey` is a stable id (the node type's group *slot*, not its English label) and
   `gate` is computed from the same rules `portGate.ts` applies to the DOM today.
2. **A widget registry.** `widgets.ts`: an ordered array of `{ test: (port) => boolean, widget:
   WidgetId }` built from the 37 predicates in the order `viewClassForPort` tries them; a map
   `WidgetId → row class` for now. `viewClassForPort` becomes a lookup and the 283-line method
   goes. The `ByobFilterType` double entry becomes one entry with two tests.
3. **`Ports` consumes descriptors.** `renderParams` iterates `describeRows(...)`, instantiates the
   class the registry names, and applies the four decorators **from the descriptor's fields**
   rather than re-deriving them from the DOM. The `_portsHash` is computed from the descriptor
   array (`JSON.stringify` of it is a legitimate hash), and the six manual clears become one:
   descriptors changed ⇒ re-render.
4. **`TabGroup` rows get a `name`** — the tab group's own — so the descriptor for a folded port
   carries `tab: { group, label }` and wrappers reach it.
5. **Tiers and expansion key on `groupKey`**, with a one-time migration that maps stored English
   names to keys (the stored preference survives).
6. **Characterisation first.** Before any of the above: a spec that, for every node type in the
   library and for the QA fixture's nodes, snapshots `viewClassForPort` per port and the rendered
   group/row order. Then the refactor. Then the same spec, unchanged, green.

Out: how rows render (CHR-008). Any visual change at all. `PopoutGroup` (it builds a second
`Ports`; it will consume descriptors for free).

## 4. Acceptance criteria

1. **(person)** Select twenty nodes of different types in the QA fixture before and after; the
   panel is pixel-identical (P23 corpus diff on the panel surface, or CHR-001's eval numbers
   unchanged: element count, inline count, order of labels). Screenshots for the four nodes the
   audit named (Group, a Function, a Query Records, a Columns) into `verdicts/CHR-007/<date>/`.
2. The characterisation spec from §3.6 passes unchanged on both sides of the refactor; its
   snapshot covers **every** node type the library exposes (assert the count against
   `NodeLibrary`'s, so an unregistered type cannot hide — [[a-gate-can-have-a-hole-shaped-like-the-defect]]).
3. `describeRows` has a spec of its own that needs no DOM: for the Group, it returns the Box
   Shadow group's six rows each with `gate: { by: 'shadowEnabled', on: false, … }` and the
   `shadowEnabled` row with none. **Reverted arm:** flip the parameter and the six gates read
   `on: true`.
4. `grep -c "_portsHash = undefined" Ports.ts` reads **≤ 1**; `viewClassForPort` is under 20 lines;
   the four `utils/port*.ts` files read a descriptor field, not `el.querySelector`.
5. `tests/nodegraph/propertyeditor.js` and every spec under `tests-unit/property-editor/`,
   `fb-017/`, `fb-018/`, `leg-005/` green; `test:ci` at the floor.

## 5. Traps

- 🔴 **`node.setParameter()` does not re-render the panel** and the panel's `dynamicports` cache
  disagrees with the rendered rows ([[a-model-write-never-re-renders-the-property-panel]]). The
  characterisation must read the **rendered** row list, and the descriptor spec must read the
  **model** — and they are compared to each other, which is the point.
- 🔴 **A group named `Other` changes the chrome.** Keep that behaviour in the descriptor
  (`showHeaders` becomes a field) — CHR-009 decides whether to keep it in the design.
- ⚠️ `PickerTypeView` subclasses forward only some of the `ModelProxy`; a field they do not
  forward reads `undefined` silently. The descriptor is built from the proxy once, in one place —
  that is a feature, and the place to fix any missing forward.
- ⚠️ The `focusGatePort` retry (`Ports.ts:398-419`) exists because React commits asynchronously
  after a forced re-render. With descriptors it can target a row by `key` — do not delete the
  retry until CHR-008 gives it a `ref` to target instead.

## 6. What was built (2026-09-15, s4)

Commits: `e3bafda8d` (the characterisation, committed alone and before the refactor), `c6f24e1f0` (the
refactor and the two retargeted specs), then this write-up. Evidence: [`verdicts/CHR-007/2026-09-15/`](./verdicts/CHR-007/2026-09-15/)
— `before.json` (20 panels on `e2352b60c`), `after.json` (the same 20 on the refactored build), and the
instrument, `panelFingerprint.js` + `compare.js`; panel PNGs local, per the CHR-001 ruling.

**Built:** `propertyeditor/model/widgets.ts` (the dispatch as an ordered table, `WIDGET_RULES`, and
`widgetForPort`), `propertyeditor/model/describeRows.ts` (rows as data), `models/nodelibrary/portTypeName.ts`
(`nameForPortType`, import-free; `NodeLibrary.nameForPortType` and `getEditType` delegate).
`Ports.viewClassForPort` is a 3-line lookup through `Ports.WIDGET_CLASSES`; `Ports.rowDescriptors()`
feeds `renderParams`, which reads description, capability gate, switched-off reason and connection off
the descriptor.

### 6.1 §2 re-read at HEAD — what was wrong

| §2 / §3 / §4 said | HEAD | consequence |
|---|---|---|
| The four decorators are in `propertyeditor/utils/` and `propertyeditor/capability-gating/`, "551 LOC that read a row's DOM after it renders" | They are in **`src/editor/src/utils/`** (`portGate`, `portHint`, `portDescription`, `capability-gating/portDecoration`), 551 LOC is right — but **none decides anything from the DOM**. `renderParams` computed every input from port objects and the decorators only *wrap* the element. The DOM reads left are `portHint`'s idempotent note removal and `portDescription`'s "a `title` is already set" check | AC4's third clause was mostly true already. What moved is where the inputs are computed (a descriptor), not what the decorators read |
| "six sites clear `_portsHash`" | **five** (`:142, :205, :410, :744, :756`) | — |
| AC3: gates `by: 'shadowEnabled'` | The Group's switch is **`boxShadowEnabled`** (catalog `dynamicPorts`: `boxShadowEnabled = true` gates six ports) | Spec uses the real name |
| AC3 reverted arm: gates read `on: true` | **Impossible from what the panel draws.** `partitionGatedPorts` marks a port only while its condition switches it OFF; a port whose condition holds carries nothing, in the model and on screen | Descriptor field is `switchedOff?: PortGateReason`; the reverted arm asserts it is **absent** |
| §3.1 `groupKey` = "the node type's group *slot*" | **No slot exists.** A port declares only the English `group` string (catalog: 1,982 inputs, keys `name, displayName, group, plug, type, …`), and `propertyPanelViewState.ts:8-15` argues the group name is "the right key, not a fallback" | §3.5 (tiers and expansion keyed on `groupKey`, with a migration) is **not built**: a key derived from the label *is* the label, and a migration would map every name to itself. A real slot needs a declaration field on 176 node types — out of a behaviour-identical task |
| §3.4 `TabGroup` rows get a `name` | Giving `TabGroup` a `name` would make `renderParams` gate it, look up its description and count it in the activity badge **as if it were a port** — a visible change | **Not built.** Descriptors are per port and carry `tab`; `portNamesForView` already reaches tab ports |
| §3.6 characterisation "for every node type in the library" | `Ports.ts` cannot load in plain jest (`capability-gating` and `schemahandler` → `projectmodel` → `bugtracker` touches the platform at import), and the catalog **drops `tab`, `popout` and `parent`** | Characterisation runs over the catalog (176 types, 1,982 inputs) with every `Ports.ts` import stubbed, plus 43 synthetic ports for branches the catalog never reaches. Tab folding and popouts are graded by AC1's drive only |
| AC1's four nodes: Group, a Function, a Query Records, a Columns | Neither drive fixture has a Query Records node; `JavaScriptFunction` fell outside the first 20 types | The 20 driven: Group, Columns, Text, Icon, Slider, Button, Static Array, Expression, And, States, Delay, Repeater, Variable, Array Filter, four Form Fields components, Is valid email, FilterPill |

### 6.2 Decisions this task had to make

| decision | chosen | why |
|---|---|---|
| Keep the dispatch's sharp edges | **Kept verbatim**: `type: null` throws (`typeof null === 'object'`); `marginPaddingComp` on a non-number still beats `BasicType` | Behaviour-identical is the task. Both are pinned in the snapshot (`"null type": "<throws TypeError>"`) so a later fix is a visible, deliberate diff |
| The `_portsHash` clears (AC4 "≤ 1") | **Not consolidated.** The five stay | Folding them into one `invalidate()` would satisfy the grep and change nothing the hash sees — a gate with a hole shaped like the defect. Each clear exists for a state the hash cannot see (expansion, undone *values*, a schema outcome); putting values in the hash rebuilds rows under a focused field (FB-017). CHR-008's keyed tree is what removes the need |
| Hash from descriptors (§3.3) | **Not done.** The hash stays over the port objects | A descriptor omits `type`, so a dynamic enum whose options change would stop re-rendering |
| `fb-018` / `fb-022` parsed `Ports.ts`'s `if/else` chain as text | Retargeted: `fb-022` reads `WIDGET_RULES` **for real**; `fb-018` reads `Ports.WIDGET_CLASSES` as text (the file cannot load) and checks its keys against `WIDGET_RULES` both ways | Both old regexes matched only `if (isOf…()) return X;` — **the two early `editorType` returns were never in either population**. Found by the retarget, not by reading |
| The two Logic Builder rows in `CONNECTED_ROW_POLICY` | `exception`, both | Both ports are `allowEditOnly` in the catalog — no wire can drive them; `LogicBuilderHiddenType` renders `display: none` |
| `scrubPolicy.isClaimedByAnEarlierRow` | Asks the registry, for `number`/`dimension` ports only; pin renamed `WIDGETS_AHEAD_OF_NUMERIC` and gains the two Logic Builder widgets | Its doc said only `marginPaddingComp` can steal a number port. False in principle: a `number` declaring `editorType: 'logic-builder-workspace'` renders the Logic Builder row (snapshot row `editorType workspace on a number`). No shipped port has that shape; over the mixins it still reads exactly 8 |

### 6.3 Acceptance criteria

| AC | reading | state |
|---|---|---|
| 1 (person) | 20 panels selected by id through `__nodeGraphEditor` (no canvas coordinates) on a fresh copy of `Landing page test V2`, reading element count, inline-styled count, leaf-text order and a sha256 of the panel's `outerHTML` with ids and React ids normalised. **Stability control first:** a second run on the same `e2352b60c` build reads **20/20 identical**. **After**, on a rebuilt stack from the refactored source with the fixture and profile reset: **20/20 identical to before** — every hash, count and label order. The 20 include both decorations `renderParams` owns: Group's six switched-off Box Shadow rows and tabbed corners, Slider's thumb/track tabs. Fixture `App/nodes.json` md5 `4373f147…` unchanged throughout | ✅ |
| 2 | `tests-unit/chr-007/widgetDispatch.test.ts`, snapshot written **before any source change** at `e2352b60c`; after the refactor **8/8, file unchanged**. Covers all 176 catalog types (asserted against the catalog's count) + 43 synthetic ports. **Mutant** (`identifier` above `textArea`): red on two synthetic rows. 🔴 The catalog arm stayed **green** on that mutant — no shipped port has both `multiline` and `identifierOf`, so the synthetic corpus is load-bearing | ✅ |
| 3 | `tests-unit/chr-007/describeRows.test.ts` **15/15**, no DOM, ports built through the real `evaluateDynamicPortsCondition` → `reasonsForGatedPorts` → `partitionGatedPorts`: six Box Shadow rows `switchedOff` by `boxShadowEnabled`, the switch itself ungated, reverted arm (`boxShadowEnabled: true`) no marks | ✅ (with §6.1's two corrections) |
| 4 | `viewClassForPort` **3 lines** ✅. `grep -c "_portsHash = undefined"` reads **5** ❌ by decision (§6.2). Decorators take descriptor fields ✅; `portHint`'s in-place `querySelector` stays (FB-017's live refresh) | 🟡 |
| 5 | jest over `property-editor/`, `fb-017/`, `fb-018/`, `fb-021/`, `fb-022/`, `leg-005/`, `rel-014/`, `chr-007/`, `cn-014`, `cn-015`: **28 suites, 475 tests green**. `tsc -p packages/noodl-editor --noEmit` **0 errors** (control: all eight changed files in its 2,928-file list). Retarget mutants: `fb-022` pin red on a reordered rule; `fb-018` both directions red on a dropped class. **`test:ci`**, `e2352b60c` + this working tree, `.webpack-cache` cleared, run alone, `NOODL_SPEC_SEED=39393`: **`2984 specs, 8 failures`**, fresh `test-results.json` (16:47:59, the run's own finish) — **the same eight by full name** as CHR-003 §6.3 (`SUB-006` ×3, `SUB-011` ×3, `NDA-017` ×2, all P88's). `tests/nodegraph/propertyeditor.js`, which calls `viewClassForPort` directly, is green | ✅ |

### 6.4 Traps this session paid for

- 🔴 **A throw during jest collection fails the suite TO RUN** (`Tests: 0 total`). The first
  characterisation run died on `type: null` before recording anything. Record throws per row.
- 🔴 **zsh does not word-split an unquoted `$VAR`**: eight suite paths reached jest as one pattern,
  "No tests found", exit 1 — indistinguishable by exit code from a red. Use an array.
- 🔴 **A text-parsing gate cannot see a branch its regex does not match.** Both `fb-018` and `fb-022`
  had graded a population missing two dispatched classes since they were written.
- ⚠️ `window.__nodeGraphEditor` + `getActiveComponent().owner.getComponentWithName()` +
  `findNodeWithId()` + `selectNode()` selects any node by id with no canvas coordinates — the drive
  script is `verdicts/CHR-007/2026-09-15/panelFingerprint.js`.
- ⚠️ A fingerprint diff needs a same-build control first; without it a drifting hash would read as a
  regression (or its absence as a pass).
