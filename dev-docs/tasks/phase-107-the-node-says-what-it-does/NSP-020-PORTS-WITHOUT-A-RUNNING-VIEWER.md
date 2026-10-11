# NSP-020 — Ports without a running viewer

**Opened 2026-09-30 (s1), from Richard's ruling that the editor is a target (README §1, R6).**
**Depends on NSP-004.** Runs alongside the batches (NSP-011 to NSP-017): each batch closes its nodes' rows here.
**Status: 🟡 s79 (2026-10-10, Fable): the design is decided and built in the format (§3.1) — `portsOf` / `drawnPorts`, `PortContext` + `derived.needs` with the needs gate, `when` and `narrow` on declared ports, `context` through the scenario, the adapter and the interpreter; the three-oracle parity drive stands with its first proofs (And with wires, String Format, Image's size-mode groups) and planted mutants. s80 (Opus): L2 done — `when` on all 448 conditioned ports, oracle (b) green and made honest (§6.2); L1 measured, its premise wrong (the fixtures are the play's wires, not the project), a format proposal in §6.3, the runtime target takes `context` and compiles again (P107-S80-DEADTARGET); L4 done — oracle (a)'s module table over all 70 hooks (§6.4). s81 (Opus): L3 measured, NOT built — decision 4 holds only for States' value outputs; the rest of the padding is the play's wires, the code's writes, or the project's saved ports, so L3 joins L1's format decision (§6.5). Left: the lanes (§6 s79) — `needs` on the 22 project- and schema-dependent specs, the padding out of four specs, oracle (c), the context builder in `project-contract`, AC3 (MCP) and AC4 (ledger column).**

## 1. The person sentence

> **An editor — this one, the MCP server, or one that does not exist yet — can draw every port of
> every node from the spec alone, for any parameter values, without a viewer running.**

## 2. Why this is the editor's deepest coupling to the runtime

Measured 2026-09-30 from the catalog's `dynamicPorts.mechanisms` over the 147 picker nodes:

| mechanism | nodes | how the editor learns the ports today |
|---|---|---|
| `runtime-discovered` | **50** | the **running viewer** calls `EditorConnection.sendDynamicPorts(id, ports)` (`noodl-runtime/src/nodedefinition.ts:651`) per instance — no viewer, no ports |
| `declared-port-groups` | 27 | static groups in the registration, shown or hidden by a parameter value |
| `editor-adapter` | 6 | editor-side code that knows the node (`noodl-editor`) |
| `numbered-inputs` | 4 | "`<base> N`" counting from 0 (And, Or, …) |
| `component-ports` | 2 | Component Inputs / Outputs — read from the component being edited |
| `runtime-narrowed` | 2 | the runtime narrows a static list per instance |

So for a third of the picker, a replacement editor cannot even show the node's ports without
embedding this runtime. NSP-001 designed `derived.inputs(params)` as a pure function for exactly this (and NSP-004
built the first two — String Format's placeholders and And's numbered inputs — with `derived.discover` beside it for
what the runtime registers on first write; the catalog-parity gate now grades `inputs({})` against the catalog's
`dynamicPorts` block);
this task makes every mechanism above an instance of it.

## 3. What to build

*(s1's sketch, kept for the record; §3.1 is the design as measured and decided in s79.)*

1. In the spec format: `ports(params)` — the complete input and output port list for given parameter
   values (static ports plus derived ones), pure, in the spec package. `derived.inputs` (NSP-001) is
   its dynamic half; generalise so `component-ports` and `runtime-narrowed` can be expressed
   (`ports(params, context)` where `context` is the component's interface, supplied by the caller).
2. A **port-parity drive**: for each specced node and a set of parameter values (the catalog's
   defaults, then each `declaredPortGroups` switch, then the fixtures the existing dynamic-port tests
   use), mount the node in the interpreted runtime, capture what `sendDynamicPorts` announces, and
   compare to `ports(params)`. Both directions; a mismatch is a §6 row (R3 (a)).
3. The Function / Script / Expression case (`runtime-discovered` from **user code**) is NSP-017's:
   `ports(params)` runs the same small parser the runtime runs — specify the parser, cite its lines.

### 3.1 The design (s79, 2026-10-10 — Fable; four measurements, cited)

**What was measured first.** (a) The runtime announces dynamic ports **per graph-model node, never per running
instance**: every announcement comes out of a module-level `setup(context, graphModel)` hook, subscribed to
`graphModel.on('nodeAdded.<type>')` and then the node's `parameterUpdated` / `inputConnectionAdded` /
`inputConnectionRemoved` (`noodl-runtime.ts:663-669` wires it; `nodedefinition.ts:607-679` is the numbered-inputs one;
~50 `setup` callers). `EditorConnection.sendDynamicPorts` (`editorconnection.ts:720-777`) is not debounced, drops a
repeat by `JSON.stringify` hash, and sends `RuntimeDiscoveredPort {name, plug, type?, displayName?, group?, default?,
index?, tab?, parent?, parentItemId?}` (`noodl-types/src/runtime/node-definition.d.ts:1049-1070`). Every hook returns
early unless `isRunningLocally()` — the node-spec runtime target (`test/helpers/node-spec-target.ts`) never fires one
and has no stub; three tests already drive the hook headless with a fake graph model (`noodl-editor/tests-unit/sb-017/
cloud-ports-agree-with-the-runtime.test.ts:124-199` is the richest). (b) `declared-port-groups` is **not announced at
all**: `dynamicports: [{condition, inputs/outputs}]` is static registration metadata, evaluated in the editor by
`evaluateDynamicPortsCondition` (`models/nodelibrary/dynamicPortRules.ts:116-172`: `<param> = v | != v | NOT SET`
joined by `AND`/`OR` right-associatively, 218 such conditions in the catalog; and `#js <expr>`, 6 conditions, all the
Icon/Checkbox/Radio Button icon-source pair). (c) The editor's drawn list is `getPorts` (`NodeGraphNode.ts:505-566`):
static ports ∪ user instance ports ∪ `derivedPortsForNode(type.dynamicports, params)` then
`replaceOrAppendPorts(this.dynamicports)` — a dynamic port REPLACES a static one of the same name and plug — sorted
by `index`, then filtered by conditions (`nodelibrary.ts:475`). The cached list is `dynamicports` on the node
(`components/<Name>/nodes.json` in v2, `ProjectExporter.ts:238-240`), overwritten **silently** by any announcement
(`setDynamicPorts` :883-929; no diff, no warning) and trusted by the validator as real (`validation/normalize.ts:
67-70`). (d) 43 spec types already have `derived` (not §6's "5"): 21 read the node's own params only; 13 the backend
schema; 5 the project or a component's interface; 4 user code. Each project-dependent one stands a **fixture constant**
in for the project (`RECORD_FIELDS`, `USER_FIELDS`, `RESULTS`/`ACTIONS`, `ROUTER_PAGES`, `REPEATER_TEMPLATES`), and
four (States, Function, Script, Logic Builder) PAD `derived.outputs(params)` with every test fixture's outputs so a
list parameter that changes mid-play lands on ports both targets registered at mount. The format has no `index`, no
visibility condition and no context argument (`spec.ts:705-745`).

**The decisions.**

1. **One function, in the package, not one per spec:** `portsOf(spec, params, context)` (`src/ports.ts`) = the declared
   inputs and outputs whose `when(params)` holds (or have none) ∪ `derived.inputs(params, context)` ∪
   `derived.outputs(params, context)`. A derived port under a declared name is a spec error, as the interpreter already
   says; `narrow` (below) is the only way a declared port changes shape. `drawnPorts(spec, params, context)` is the
   same list as plain data — `{name, plug, type, displayName?, group?, default?, description?}` in declaration order,
   derived after declared — what the drive compares and what an editor or the MCP server reads. Spec authors keep
   writing `derived`; nothing is added per spec for the complete list.
2. **The context is a JSON object of what an editor has WITHOUT a viewer** (`PortContext`, spec.ts): `wired` (the
   input names a wire reaches — the scenario format's C155 list; numbered inputs count them, the Record family's
   `prop-*` come from them), `instancePorts` (the ports the user drew on the node — Component Inputs / Outputs),
   `components` (the interface of a named component — For Each's template, Push's target page, Show Popup's popup,
   a cloud function's request / response), `routers`, `stacks` (names and pages), `schema` (the backend's classes and
   fields, the user class), `siblings` (nodes of a type in the project with their params — Event Receiver reads the
   Senders on its channel; Page Inputs copies its siblings). Every field optional. A spec names what it reads in
   `derived.needs: (keyof PortContext)[]`; **the needs gate** (`tests/ports.test.ts`) calls `portsOf` with a context
   that holds only the declared fields and TRAPS a read of any other, so an undeclared read is red, not a silent
   `undefined`. The ledger's AC4 column is read from `needs`: *params only* / *+ project* / *+ schema* — all three
   are "without a viewer"; the count that is NOT derivable is what has no spec or no `derived` where the catalog
   says it should.
3. **`when(params)` on a declared port** (PortMeta) says the catalog's `declaredPortGroups` condition in the spec:
   `when: (p) => p.sizeMode === 'explicit'` on Image's `objectFit`. Per port, not per group — a group name is editor
   presentation. **`narrow(params, context)` on a declared value input** returns the fields that change per instance
   (`enums`, `type`, `default`) — the two `runtime-narrowed` nodes, Dropdown's `value` enum from `items` and Text
   Input's `startValue` type from `type`. Both are functions in the TS spec; a non-TS target implements the spec, it
   does not read these out of JSON (R2 is about traces).
4. **`ports` is pure and un-padded; the two targets re-derive after every parameter write.** The padding in States,
   Function, Script and Logic Builder answered the PLAY's question (what to register at mount) with the EDITOR's
   function. The interpreter and the runtime target instead re-run `derived.outputs` (and `inputs`) after each param
   write and register what is new — which is what the live runtime does (`_onNodeModelParameterUpdated` →
   `registerInputIfNeeded`, and the `setup` hook on `parameterUpdated`). A lane does this with `spec-golden:check`
   beside it; a moved trace is a row.
   *(s81: measured against the runtime, this holds only for States' VALUE outputs. The other padded ports exist because a
   wire registered them, the code wrote them, or the project saved them. See §6.5; it is part of L1's format decision.)*
5. **The parity drive has three oracles, none of which mounts a node.** (a) `runtime-discovered` and
   `numbered-inputs`: fire the module's `setup` (or `defineNode(...).setupNumberedInputDynamicPorts`) with a fake
   graph model built from `(params, context)` — `getConnectionsTo` from `context.wired`, `getNodesWithType` from
   `context.siblings`, `getMetaData` from `context.schema` — fire `nodeAdded.<type>` then `editorImportComplete`,
   read the last `sendDynamicPorts`; compare with `drawnPorts` minus the declared static ports, both directions.
   `noodl-runtime/test/node-spec/nsp-020-ports-parity.test.ts`. (b) `declared-port-groups`: over a probe set (the
   defaults, then every value a condition names), `evaluateDynamicPortsCondition(condition, params)` ⇔ `when(params)`
   for each port the group lists, and the set of ports with a `when` equals the union of the groups —
   `noodl-editor/tests-unit/nsp-020/` (the evaluator is editor code; the editor already imports the spec package for
   NSP-019). (c) `editor-adapter`: run the adapter against a fake project model built from the same context and
   compare — same folder. **Compared on** `name`, `plug`, the type's name, `displayName`, `group`, `default`.
   **Not compared:** `index` (the format has no order field; order is declaration order — a ruling only if the
   editor's sort ever shows a visible difference), `tab`, `parent`.
6. **The context builder lives in `@nodegx/project-contract`** (`portContextFor(project, nodeId)`): it has the project
   format, the V2 store and the editor suite, and already carries `function-ports.ts` as a byte-identical copy rather
   than importing the spec package — so the two packages stay independent and the builder is graded by parity, as
   that copy is. The cache drive (§5: `portsOf` must equal the cached `dynamicports` of every node in the templates,
   ranked by product surface) and AC3 (the MCP's per-instance ports) both go through it. Not this session's.

**Rows found by the measurement** (filed in `dev-docs/bugs/`): the catalog's `editor-adapter` label is wrong for three
of its six nodes — Router, Query Records and Filter Records set no ports in their adapters (`RouterAdapter.ts`,
`QueryRecordsAdapter.ts`, `FilterRecordsAdapter.ts`: they rename pages and clear `visualFilter`); their ports come
from the runtime through the backend schema (P107-S79-ADAPTERLABEL). A stale cached `dynamicports` list is trusted as
the node's real ports until a viewer connects, and then replaced with no diff (P107-S79-SILENTCACHE) — the §5 hazard,
measured; the P112 editor suite compares two editors' cached lists field by field (`compare.ts:100-112`), so it is
also where two editors first disagree.

## 4. Acceptance criteria

1. `ports(params)` exists for every specced node; the parity drive runs on every one at the
   catalog's defaults and passes or has a row.
2. Every `runtime-discovered` node in the census has a row here (50), closed by its batch.
3. The MCP server's `get_node_type` answers per-instance ports from `ports(params)` for specced
   nodes (NSP-018 lands the wiring; this task supplies the function).
4. The ledger (NSP-009) reports *ports derivable without a viewer: N of 147* beside spec coverage.

## 5. Watch for

- `sendDynamicPorts` is announced from the **viewer** window and the Logic Builder's port I/O had to
  live in the runtime bundle for that reason (`@nodegx/project-contract` README). Read that before
  moving anything.
- The editor caches announced ports in the project file for instances it has seen. A pure
  `ports(params)` must agree with the **cached** list too, or opening an old project shows a diff.

## 6. Built

*(the task itself is not started; the batches close rows here)*

**Rows closed by NSP-011 (s4, 2026-09-30), all `numbered-inputs`:** **Or** (`input <n>`, as And), **String Mapper** (TWO
families on one node — `input <n>` drawn as *Input n* in group *Inputs*, `output <n>` drawn as *Mapping n* in group
*Mappings*; `inputString` starts with `input` and is a declared port, so `discover` refuses it) and **Color Blend**
(`color <n>`). Each `derived.inputs(params)` follows `collectPorts` (nodedefinition.ts :613-647: the highest index
mentioned plus one spare, or `<base> 0` alone) and the catalog-parity gate checks `<base> 0`'s prefix and type. With And
and String Format: **5 of the 68 dynamic-port nodes** have `ports(params)`; 63 rows open. `tests/batch.test.ts` pins the
three.

**Rows read by NSP-015 (s17–s20, 2026-10-01/02) — the navigation family splits in two.** Derivable from the node's OWN
params: **Pop Component Stack** (`result-<n>` / `backAction-<n>` from Results / Back Actions), **Page Inputs**
(`pm-<n>` outputs from Path / Query Parameters, split on `,`, untrimmed — s19) and **Close Popup** (`result-<n>` /
`closeAction-<n>` from Results / Close Actions — s20); each spec's `derived` draws them. From the PROJECT, not the
node: **Push Component To Stack** (`target`, `pm-` — the Component Stack named Stack, its pages, the target's
inputs), **Navigate** (`router`, `target`, `pm-` — the project's Routers and their pages) and **Show Popup**
(`popupParam-<n>` from the Target component's inputs; `closeResult-<n>` / `closeAction-<n>` from the Close Popups
inside it, closeResult types from its outputs — showpopup.ts setup :341-416). These need the project model, which
the editor has without a viewer; a `ports(params, project)` shape, not `ports(params)`. Show Popup's spec grades a
fixed project (a popup with Results `name,ok`, Close Actions `Save,Cancel`).

### 6.1 s79 (2026-10-10, Fable) — the design, the format, the drive's first proofs

**Measured first** (four read-only measurements, §3.1 "What was measured first"); the two rows filed:
P107-S79-ADAPTERLABEL, P107-S79-SILENTCACHE (`dev-docs/bugs/`). §6's "5 of 68" was three weeks stale: 43 specs had
`derived` ([[a-none-owned-blocker-is-the-one-most-likely-already-fixed]]).

**Built.** `packages/nodegx-node-spec`: `src/ports.ts` — `portsOf(spec, params, context)`, `drawnPorts` (plain data,
`source: declared | derived`), `needsContext` (the needs gate's trapped context: a getter that throws, not a Proxy — a
Proxy survives a spread as a plain copy), `portsDerivability` (the ledger class); `spec.ts` — `PortContext` (+ `PortRef`,
`ComponentInterface`, `NamedPages`, `BackendSchema`, `PORT_CONTEXT_FIELDS`), `PortMeta.when`, `ValueInputDecl.narrow`,
`DerivedPorts.inputs/outputs(params, context)` + `needs` (and `AnyNodeSpec`'s erased copy); `interpreter.ts mount` takes
`context` and folds `wired` into it; `runner/scenario.ts` `context?`; `adapter.ts` `TargetAdapter.mount(…, context?)`
and `play(…, context?)` — a scenario without one calls exactly what it called; `adapters/interpreter.ts`,
`runner/conformance.ts` pass it through; `runner/generate.ts` and the runtime target's three `derived.*` calls pass `{}`.
`when`/`narrow` read the params WITH the declared defaults filled in (`effectiveParams`: the editor's evaluator reads
`getParameter`, which falls back to the port default — so `NOT SET` is true only for a port without one); `derived.*`
read the RAW params (the runtime's hooks read `node.parameters` as stored). **And** reads `context.wired`
(`collectPorts` :624 counts the wires' target ports — the drive's first finding), `needs: ['wired']`. **Image**'s
`objectFit`, `width`, `height` carry the catalog's three size-mode conditions as `when`.

**The drive, three oracles.** (a) `noodl-runtime/test/node-spec/nsp-020-ports-parity.test.ts` — fires the module's
`setup` / `setupNumberedInputDynamicPorts` with a fake graph model (wires from `context.wired`, siblings from
`context.siblings`, `dbCollections` from `context.schema`), `nodeAdded.<type>` then `editorImportComplete`, reads the
LAST `sendDynamicPorts`; compares `drawnPorts` minus the declared ports on `name, plug, type name, displayName, group,
default`, both directions. And: 6 parameter sets incl. a wire on `input 3` and no param (runtime 5 ports, the s78 spec 1
— PLANTED and red); String Format: 5 sets, a first-placeholder-only mutant PLANTED and red. 13 / 13.
(b) `noodl-editor/tests-unit/nsp-020/declared-port-groups-agree.test.ts` — for every catalog group whose ports carry a
`when`: `evaluateDynamicPortsCondition(condition, node)` ⇔ `port in portsOf(spec, probe)` over the defaults, each
assignment alone and negated, all together; the reverse direction (a `when` in no group) must be empty; the census
printed: **3 graded, 445 owed (436 no `when`, 9 `#js`), 0 unlisted**; `WHEN_FLOOR = 3` is the ratchet, raised to the
census by the lane that adds `when`s; a reversed `when` PLANTED and red. 6 / 6. (c) editor adapters — not started
(needs the true adapter list, P107-S79-ADAPTERLABEL). `tests/ports.test.ts` (53): the list, the shadow rule, `narrow`,
the needs gate over every derived spec with a FULL context (a declared field has something to read; the trap is what
fires), a greedy spec PLANTED and red, the derivability census.

**Gates (s79):** node-spec `tsc --noEmit` 0; node-spec jest `ports, pilot, batch, batch-escape, catalog-parity,
adapter, runner, types, golden` 540 / 540; runtime `nsp-020-ports-parity` 13 / 13; editor `tests-unit/nsp-020` 6 / 6;
`tsc -p packages/noodl-editor --noEmit` 0; `typecheck:editor-tests` 0. Not run: the full node-spec
suite, the runtime batch, `spec-golden:check` (no trace moves: `golden.ts` hashes declared ports and the play;
`derived.inputs` at `{}` is unchanged for every spec — And's change reads `wired`, which no scenario sets on it).

**The lanes (Opus; worktrees via `make-worktree.sh`; small runs only, one 10,000-sequence run at the end on the primary):**

| lane | what | gate |
|---|---|---|
| L1 `needs` + the fixtures out | the 13 schema specs read `context.schema` (`needs: ['schema']`), the 5 project ones `components` / `routers` / `stacks`, Event Receiver `siblings`; each spec's fixture constant becomes `context` on its scenarios (`scenarios/<Type>.json` `context`); the runtime target builds its fake backend / project from `scenario.context` (node-spec-target.ts) | needs gate; conformance at 200 per node; `spec-golden:check` |
| L2 `when` on the 445 | the 13 declared-port-groups visuals + the D specs' groups; `#js` nine as `when` functions; raise `WHEN_FLOOR` to the census | oracle (b) |
| L3 the padding out | States, Function, Script, Logic Builder: `derived.outputs` pure; the interpreter and the runtime target re-derive derived ports after each param write (decision 4) | golden; conformance on the four |
| L4 the module table | oracle (a) over every `setup` caller (~50) and the 4 numbered; the catalog's `parameterEncoding` probes and the three existing fixtures (sb-017, fb-026, p82) as parameter sets; `narrow` on Dropdown `value` and Text Input `startValue` | oracle (a) |
| L5 the builder | `portContextFor(project, nodeId)` in `@nodegx/project-contract`; the cache drive over the templates (§5); AC3 the MCP's per-instance ports; AC4 the ledger column from `portsDerivability` + the drives' result file | spec-ledger:check; MCP tests |

L1–L4 are independent; L5 needs L1's `context` shape settled (it is — the fields are in `PortContext`; a new field is a
row). Oracle (c) waits on P107-S79-ADAPTERLABEL.

### 6.2 s80 (2026-10-11, Opus) — L2: `when` on every conditioned port

**Built.** All 445 owed ports carry a `when` — 439 declaration sites in 21 spec files (`record-base.ts`'s `modelId` and
`repeaterComponent` serve four record types each; the two shared ones carry a typed parameter because they sit outside a
`defineNode` call). Written by a generator from the catalog's `declaredPortGroups` condition, one per port (no port sits
under two conditions): `<p> = v` → `p.x === 'v'` (`true`/`false` as booleans), `!=` → `!==`, `NOT SET` → `=== undefined`,
`AND`/`OR` right-associative as the evaluator reads them (no condition in the catalog mixes the two so that precedence
differs); the nine `#js` conditions (the icon-source pair on Checkbox, Radio Button and Icon) as their own expression over
`p`. Census: **448 ports graded by a `when`, 0 owed, 0 `when` in no catalog group**; `WHEN_FLOOR = 448`.

**Oracle (b) made honest in two ways.** (1) The editor's node in the test fell back to the SPEC's default under an unset
name — so a spec default that drifted from the registration's agreed with itself. It now falls back to the CATALOG's
default (the registration's, what `getParameter` really reads); a planted drift (Image `sizeMode` default `explicit`
against the editor's `contentSize`) is red. (2) `#js` conditions were census-only; they are graded now, over the cross
product of every `params.<name> === <literal>` they name, each also unset and also something else. 452 / 452.

**Where the handoff was wrong:** s79 changed three stranger-guarded files (`src/spec.ts`, `src/adapter.ts`,
`src/nodes/and.ts`) and did not refresh `tests/stranger-suite-hashes.json` — the stranger gate was red at HEAD
`32745136a` before this session touched anything. Refreshed with `dropdown.ts` (this lane's guarded edit); all four
rounds re-graded green at 200 (46 passed, the 18 deep tests skipped as designed, 460 s). No behaviour moved in any of the
four files (s79: `context` is optional and no scenario sets it on And; s80: `when` is read only by `portsOf`).

**Cost:** the browser entry grows ~6.2 KB gzipped (310.2 → 316.5 KB measured the same way at HEAD and after; P107-SIZE
already over its 240 KB budget, P112's call — noted on the row).

**Gates (s80 L2):** `spec-golden:check` 0 and `spec-ledger:check` 0 (125 / 147) BEFORE the lane; node-spec `tsc --noEmit`
0; node-spec jest `ports, catalog-parity, golden, types, batch-visual, page-model, page-model-plants, layout,
layout-map, layout-check, rules-reader, schema` 1,341 / 1,341; `stranger.test.ts` 46 / 46 (+18 deep skipped); editor
`tests-unit/nsp-020` 452 / 452; `typecheck:editor-tests` 0.

### 6.3 s80 (2026-10-11, Opus) — L1 measured: the fixture constants are the play's WIRES, not the project

**Built:** the runtime target takes the scenario's `context` (`TargetAdapter.mount(type, params, wired, context)` →
`mountIn`) and hands every derived call the same context the interpreter builds (`{...context, wired: [...context.wired,
...wired]}`), kept per handle in `portContexts` and read again by `derivedSignal` / `derivedSignalOutput`. No scenario sets
`context` yet, so no play moves; And, Or, String Format, Color Blend, String Mapper, DbModel2 conform on the runtime at 200.
**Fixed on the way: P107-S80-DEADTARGET** — s79 left one `outputs(params)` call without its new `context` argument, and the
runtime target has not compiled since `9a786e0b2`: every runtime conformance, graph and target suite "failed to run" with
`Tests: 0`. s79's runtime gate (`nsp-020-ports-parity`) does not import the target.

**Not built — the lane as written rests on a premise the runtime contradicts.** §6.1 says each project-dependent spec's
fixture constant "stands in for the project" and "becomes `context` on its scenarios". Read against the runtime, for the
Record family (and User, and Show Popup — the same three lines in each):

- **What the editor draws** (the announcement): the Class dropdown, then one `prop-<field>` + `changed-<field>` per column of
  the selected class (`dbmodelnode2.ts` `updatePorts` :548-571 → `record-ports.ts` `recordFieldPorts` :170-201), then
  `prop-<name>` for every name a WIRE touches — a parameter key, a wire into the node, **or a wire out of it**
  (`recordWiredFieldPorts` :260-345, "the wire is the declaration", P77 SBR-008). That is `context.schema` ∪ the wires.
- **What exists at play**: only what a wire registered — `registerOutputIfNeeded` mints `prop-*` and `changed-*` on connect
  (`dbmodelnode2.ts` :474-486; `user.ts` :453; `showpopup.ts` :322) — and every send is gated on it: `if
  (this.hasOutput('prop-' + key)) this.flagOutputDirty(...)` (`dbmodelnode2.ts` :140-142, :340, :448; `user.ts` :107, :383;
  `showpopup.ts` :270). **The schema is never read at play.**

So `RECORD_FIELDS = ['title', 'n']` is not a stand-in for a schema: it is "the graph wired `prop-title`, `changed-title`,
`prop-n`, `changed-n`", and the reducers iterate it because the runtime sends only what is wired. Replacing it with
`context.schema` would make the PLAY depend on the project — something the runtime never does — and the editor's list
would still lack the wired half. `PortContext.wired` holds input names only; the Record node's wires are OUTPUTS.

**Proposed (a format decision — the next session takes it or replaces it before any spec moves):**

1. `PortContext.wiredOutputs` beside `wired`: the output names a wire leaves from (the runtime's `getConnectionsFrom`).
2. `derived.discoverOutput(port)`: the output-side twin of `discover` — what `registerOutputIfNeeded` makes of a wired
   output name (Record: `prop-*` a getter, `changed-*` a signal).
3. **At play a node has its params and its wires, never the project.** The play registers the declared ports ∪
   `derived.outputs(params, {wired, wiredOutputs})` (the context with ONLY its wire fields) ∪ `discoverOutput(p)` for each
   wired output not already there. `derived.outputs(params, fullContext)` stays the editor's draw (schema ∪ wires). For the
   params-only specs (States, Function, Script, Logic Builder — L3) nothing changes: their derived ports read no context.
4. `WorldView.hasOutput(name)` — the reducers ask what the runtime asks (`this.hasOutput('prop-' + key)`) instead of iterating
   a constant.
5. The wires a GENERATED sequence plays under: a spec-level default (`derived.playWires`, the fixture renamed for what it
   is) that a scenario's own `context` overrides.

Pieces 1, 2, 4 touch `src/spec.ts` (a FORMAT file): hashes refreshed + every round re-graded in the same commit; a round
whose specs use none of them is unaffected, and a later stranger round is owed for the new surface. Gate for each spec
that moves: its traces byte-identical (`spec-golden:check`), conformance at 200 on both targets, the needs gate, and
oracle (a)'s row for it (L4's table marks these `owedBy: 'L1'`) turning green. Show Popup's announcement reads the
target component's Close Popups (`showpopup.ts` :341-416), which `ComponentInterface` cannot carry — a further
`PortContext` field, to be measured with it.

### 6.4 s80 (2026-10-11, Opus, a lane agent in a worktree) — L4: the module table (oracle (a) over every hook)

**Built.** `noodl-runtime/test/node-spec/nsp-020-oracle-a.ts` (the drive's machinery, out of the test) and
`nsp-020-module-table.ts` (the table); `nsp-020-ports-parity.test.ts` runs both. The comparison now lays the LAST
announcement over `drawnPorts` the way the editor lays it over the registration: an announced port under a DECLARED name
replaces that port (`runtime-narrowed` — compared with the declared port after `when` and `narrow`, enum VALUES included);
a declared port the spec narrows for these params must be announced; `plug: 'input/output'` (the Object family's
`prop-<p>`) is both; an output named by the spec's `outcomes` is the registration's outcome port (type only — `drawnPorts`
draws none, below); a `dataAttributes` port is the editor's `namedports/derived` rule, not a hook's, and is skipped.
Every row runs at the catalog defaults (`{}`), at the catalog's `parameterEncoding` probe (each pattern's `example` read
back into the parameter its variable names), and at its own cases (the p82, fb-026, nda-012 and http-outcome fixtures'
parameter sets among them). A disagreement measured and not fixable here is PINNED by its exact line to a bug row or a
format gap; a pin no case produces any more is red.

**The census** walks `noodl-runtime/src/nodes`, `noodl-viewer-react/src/nodes` and `nodes-deprecated`, requires every
file whose text names a hook, a CRUD mixin, `numberedInputs` or `sendDynamicPorts`, and lists every exported
registration with a `setup` or `numberedInputs`: **70 hooks** in 69 modules, plus 9 libraries (files that build ports for
others). Every one is in the table (40), excluded with a reason (30), or a named library; a dropped row is red, named
(planted). **Graded and passing: 21** — And, Or, String Mapper, Color Blend; String Format, Expression, Set Variable,
Object, New Object, Set Object Properties, Array Filter, HTTP, Close Popup, Pop Component Stack, Navigate To Path, Page
Inputs, Component Stack, Sign File URL, Upload File; Dropdown and Text Input (`runtime-narrowed`) — 106 cases. **Owed by
L1: 15** (the Record family ×9 incl. Subscribe To Changes, User / Set User Properties / Sign Up, Push Component To Stack,
Show Popup, For Each — what each hook reads is in its row's `reads`, and its disagreements are printed per case). **Owed
by L3: 4** (States, Function, Script, Logic Builder: the padding, plus field disagreements printed — `intype-`/`outtype-`
typed `enum`, `in-<x>` typed `string`, labels and groups — for whoever lands after L3). **Excluded: 30** (10 no spec —
NSP-022's, incl. Event Receiver and the old Cloud Function, both on L1's list; 13 deprecated; 7 setups that announce
nothing — Map Collection, CloudFunction2 and For Each Actions "handled in editor adapter", the four user-mail nodes).

**Spec changes (the runtime wins; each cites its lines):** **Or, String Mapper, Color Blend** count the wires into the
node (`collectPorts` :624 — s79's And finding, on the other three numbered nodes), `needs: ['wired']`; **Expression**'s
ports in group Parameters, their checkboxes labelled and grouped (expression.ts :827-847, run-on-value-change.ts :160-178);
**Close Popup / Pop Component Stack** `result-<n>` labelled (closepopup.ts :374-375, navigate-back.ts :227-228);
**Navigate To Path** `p-`/`q-` labelled (:297-312); **Array Filter** the value port typed by the filter's Type, and Limit /
Skip drawn with 10 / 0 (filtercollectionnode.ts :616-633, :704-713); **Dropdown** `value.narrow` (options.ts :417-447 —
enum over Items' values, default the first, a stray Value offered back, nothing when Items cannot be read); **Text Input**
`startValue.narrow` (text-input.ts :616-637, textInputValue.ts :27-29). No trace moved (`spec-golden:check` 0); planted
mutants red for each mechanism (numbered with a wire, a dropped derived port, a lost group, wrong enums, no narrow, a
narrow never announced, a narrow ignoring Type, a stale pin, a dropped table row).

**Rows filed:** P107-S80-HTTPANNOUNCE (the announcement drops URL's default `''` and moves Error into Events — the
registration says otherwise); P107-S80-BACKENDPICKER (two or more backends announce a `backendId` picker from
`backendServices`, which no `PortContext` field carries — "a new field is a row"; it touches the Record family, so L1
should see it before settling `needs`). And one found on the way, not the table's (filed as P107-S80-TARGETCTX, folded at the merge into P107-S80-DEADTARGET, which the primary had already fixed in `f5fcd704a`) — since s79 the runtime
target's `derivedSignalOutput` calls `outputs(params)` with one argument, so every suite importing `node-spec-target.ts`
(conformance, runtime-target, the contracts) fails to compile with `Tests: 0`; measured with type diagnostics off, the
nodes L4 changed conform at 200 except one Close Popup mutant survivor that the HEAD spec has too (closed by a hand scenario in `f5fcd704a`).

**Format gaps found (pinned, not fixed — the format is NSP-020's call, not a lane's):** (1) `drawnPorts` draws no outcome
port (`done`/`completed`/`unchanged`/`failure`) — AC3's per-instance ports would miss them; (2) no `narrow` on an
OUTPUT — Text Input's runtime narrows `onTextChanged` too; (3) `narrow` reads params with the declared defaults filled
in, so it cannot tell a Dropdown Value SET to `'Option 1'` from one never set (the runtime reads it as stored); (4) an
editor-only default on a derived port (Component Stack's `startPage` and `pagePath-<id>`) has nowhere to go — a spec
`default` is the value at mount; (5) the `dataAttributes` ports are an editor rule no oracle grades yet (oracle (b) reads
`declaredPortGroups` conditions, this one the hooks). HTTP's Conditional and Output Fields stay as http.ts :47-50 names
them, pinned.

**Where the handoff was wrong:** "~43 / ~50 `setup` callers" — 70 hooks on disk, 40 with a spec; two of L1's named
nodes (Event Receiver, Cloud Function) have no spec under the runtime's type name (the spec is CloudFunction2's, whose
setup is empty). HTTP and Component Stack subscribe to `nodeAdded` only inside `editorImportComplete` — the drive's
`getNodesWithType` sweep is what reaches them.

### 6.5 s81 (2026-10-11, Opus) — L3 measured: the padding is wires, writes and saved ports, not params

**Not built.** The handoff called L3 "independent of step 1". Measured against the runtime, it is not. Decision 4 (§3.1) has
`derived.outputs` pure and both targets re-deriving after each param write, "which is what the live runtime does". For
these four nodes the live runtime does that for ONE family of ports. The rest of each spec's padding stands in for
something else, and two of those are exactly L1's wired outputs (§6.3):

| node | ports the spec pads | where the runtime gets them | the format piece it needs |
|---|---|---|---|
| **States** | value outputs (`x`, `label` …) | the `values` SETTER registers each name as it is written (`states.ts` :338-358) — params, re-derived on a write | decision 4 as written: re-derive after a param write |
| | `at-<state>`, `reached-<state>` | ONLY a wire: `nodescope.ts` :150 `sourceNode.registerOutputIfNeeded(sourcePort)`; every send gated on `hasOutput` (:290, :918, :936) | L1's `wiredOutputs` + an output-side `discover` |
| **Function** | `out-<name>` values | when the CODE writes one: `registerOutputIfNeeded('out-' + prop)` in the Outputs proxy (`simplejavascript.ts` :298) and `publishHeldWrites` (:240); typed from `outtype-<name>` (:903-920) | an output made by the node's own write — not in the format |
| | `out-<name>` signals | typed from `model.outputPorts` (the project's saved ports, :601, :854); sent only if wired (`hasOutput`, :609) | L1's `wiredOutputs`, plus the saved ports |
| **Script** | every output | `model.outputPorts` read at each code read (`javascript.ts` :433-435): the ports the EDITOR announced and the project saved (`editormodeleventshandler.ts` :120, :250 `addOutputPort`) | a context field for the node's saved ports (`PortContext` has none) |
| **Logic Builder** | values and signals | when the program writes or sends them: `registerOutputIfNeeded` after a run (`logic-builder.ts` :488) and on a signal send (:601) | an output made by the node's own write |

The runtime target already shows the padding is two things at once. At mount it registers every derived output "as a
wire would make the runtime do" (`noodl-runtime/test/helpers/node-spec-target.ts` :1886-1888), and it hands the same list
to `model.outputPorts` "as a loaded project's saved `dynamicports` give the model" (:1877-1885). So the fixture lists in
these specs (`STATE_LISTS` / `VALUE_LISTS`, `FUNCTION_FIXTURES`, `SCRIPT_FIXTURES`, `LOGIC_BUILDER_FIXTURES`) are what
`RECORD_FIELDS` is: the play's wires and its saved project. They are not a stand-in for future params.

**For the format decision (one change, not two).** On top of §6.3's five pieces, L3 adds:

1. **An output the node makes by writing it.** Function and Logic Builder register on write. §6.3's `discoverOutput(port)`
   is the right shape if the interpreter calls it on the node's own write as well as on a wired output. Then the reducers'
   sends need no list at all for values. Which outputs exist still matters for SIGNALS: Function sends only a wired one.
2. **The node's saved ports**, for Script and for Function's signal types: what the project file holds for the instance.
   That could be a `PortContext` field (`savedPorts`, close to P107-S79-SILENTCACHE's cached `dynamicports`) or the same
   `derived.playWires` default §6.3 piece 5 proposes, renamed for both.
3. **States' value outputs keep decision 4**: re-derive after a `values` write. It is the only case of the four that
   decision 4 describes as written.

Each spec's L4 row stays `owedBy: 'L3'` until the format lands. The field disagreements L4 printed (Function's
`intype-` / `outtype-` should be `enum`, `in-*` `string`, labels and groups) do not depend on any of this and can be fixed
on their own, with `spec-golden:check` and oracle (a) beside them.

**Gates:** none run; this session changed no code.
