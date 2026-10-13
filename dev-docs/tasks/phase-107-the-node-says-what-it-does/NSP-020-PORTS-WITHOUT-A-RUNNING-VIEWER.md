# NSP-020 — Ports without a running viewer

**Opened 2026-09-30 (s1), from Richard's ruling that the editor is a target (README §1, R6).**
**Depends on NSP-004.** Runs alongside the batches (NSP-011 to NSP-017): each batch closes its nodes' rows here.
**Status: 🟡 s79 (2026-10-10, Fable): the design is decided and built in the format (§3.1) — `portsOf` / `drawnPorts`, `PortContext` + `derived.needs` with the needs gate, `when` and `narrow` on declared ports, `context` through the scenario, the adapter and the interpreter; the three-oracle parity drive stands with its first proofs (And with wires, String Format, Image's size-mode groups) and planted mutants. s80 (Opus): L2 done — `when` on all 448 conditioned ports, oracle (b) green and made honest (§6.2); L1 measured, its premise wrong (the fixtures are the play's wires, not the project), a format proposal in §6.3, the runtime target takes `context` and compiles again (P107-S80-DEADTARGET); L4 done — oracle (a)'s module table over all 70 hooks (§6.4). s81 (Opus): L3 measured, NOT built — decision 4 holds only for States' value outputs; the rest of the padding is the play's wires, the code's writes, or the project's saved ports, so L3 joins L1's format decision (§6.5). **s82 (Fable): the format decided and built (§6.6) — at play a node has its params and its wires, never the project: `PlayContext`, `wiredOutputs` + `backends`, `onWire`, `discoverOutput`, `outputCandidates`, `hasOutput`, re-derive after each write; proved on DbModel2 and States (traces byte-identical, both targets at 200, both L4 rows graded).** s83 (Opus): L3 done (§6.7). **s84 (Opus): L1 done (§6.8) — the last 14 specs on the format, oracle (a) 40 graded / 227 cases / 0 owed.** **s85 (Opus): L5's builder done and graded on saved projects (§6.9) — `portContextFor` agrees with the runtime's hooks on 7,812 nodes; AC4 ✅ (130 of 147); AC3 ruled R19 "check wires and show ports", `DRAWN_PORT_TYPES` the shared list.** Left: R19 part 2 (the wire check), the 10,000 run's 9 survivors (0 divergences on 22 specs), oracle (c) (and with it Cloud Function's and Navigate's project-drawn ports).**

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

### 6.6 s82 (2026-10-11, Fable) — THE FORMAT DECISION for L1 and L3, proved on DbModel2 and States

**The decision in one sentence: at play a node has its params and its wires, never the project — so one pure
`derived.outputs(params, context)` is both the editor's draw (the project in the context) and the play's registration
(the wires only), and no spec pads anything.** Decided and built in the format (`src/spec.ts`, `src/ports.ts`,
`src/interpreter.ts`, the runner, the runtime target), eight pieces, each read from the runtime:

| # | piece | where | the runtime line it says |
|---|---|---|---|
| 1 | `PortContext.wiredOutputs` — the outputs a wire leaves from; `PortContext.backends` — the project's backend list (P107-S80-BACKENDPICKER, closed) | spec.ts | record-ports.ts :305-308 `getConnectionsFrom`; schema-ports.ts :546-571 the picker |
| 2 | **`PlayContext = Pick<PortContext, 'wired' \| 'wiredOutputs'>`** — the interpreter and the runtime target hand `derived.*` exactly this (`playContextOf`); a scenario names `wired` and `wiredOutputs`, and its s79 `context` field is REFUSED by the loader | spec.ts, scenario.ts, adapter.ts (`mount`'s fourth argument retyped), interpreter.ts `mount`, node-spec-target.ts `mountIn` | dbmodelnode2.ts :140-142, :340, :448 — every `prop-` send gated on `hasOutput`; the schema is never read at play |
| 3 | **`onWire: true` on a derived output** — exists at play only when `wiredOutputs` names it; drawn from the params regardless | spec.ts `ValueOutputDecl` / `SignalOutputDecl`; ports.ts `playOutputs` | nodescope.ts :150 `registerOutputIfNeeded(sourcePort)`; states.ts :290, :918, :936 gated sends (`at-` / `reached-`); simplejavascript.ts :609 (a Function's signals) |
| 4 | **`derived.discoverOutput(port)`** — the output-side `discover`: called for each `wiredOutputs` name nothing derived, by `connect` for a late wire, and by the interpreter when a reducer `sendDerived`s / `emitDerived`s / `pulses` / `world.send`s a name the instance has no output for (the node's own write minting the port) | spec.ts, interpreter.ts `mintOutput`, ports.ts | dbmodelnode2.ts :474-486; simplejavascript.ts :298 (the Outputs proxy); logic-builder.ts :488, :601 |
| 5 | **Decision 4 narrowed to what the runtime does: `derived.rederive` names the params whose RUN-TIME setter registers ports** (States' `values`); a write to one re-derives on the interpreter — new ports registered, nothing removed or re-shaped (a shadow of a declared name is skipped there; at mount it is still the spec error). Every other node's ports are the PLACING's: the runtime target writes `model.outputPorts` / `inputPorts` ONCE at mount from `playOutputs` and never again — the headless runtime reads the model as the project saved it, and NSP-017's contracts pin it ("the kinds are the placing's"; the first draft of this piece re-derived the target's model after every write and the Logic Builder contract's control went red — so this is measured, not assumed) | spec.ts `DerivedPorts.rederive`; interpreter.ts `written` + `rederive`; node-spec-target.ts `placing` | states.ts :338-358 the `values` setter registers; javascript.ts :433-435 re-registers the SAVED `model.outputPorts` at each code read; simplejavascript.ts :600-618 reads the signal kinds there |
| 6 | **`WorldView.hasOutput(name)`** — a reducer asks what the runtime asks | spec.ts, interpreter.ts `viewOf` | node.ts `hasOutput`, every gated send above |
| 7 | **`derived.outputCandidates`** — the outputs a GENERATED sequence may wire; the generator wires each with an even chance (drawn after every other draw, so a spec naming none generates what it did); `wiredOutputs` rides through `Sequence`, `Divergence`, the shrinker and the replay; the golden hashes it only when present, so every scenario without one keeps its hash | spec.ts, generate.ts, conformance.ts, shrink.ts, golden.ts | — (this is where `RECORD_FIELDS` / `STATE_LISTS` belonged) |
| 8 | **§6.4's gaps settled in the same change:** (1) `drawnPorts` draws the outcome ports (`outcomePorts(spec)`: `done` + `completed`, `unchanged` / `failure` when listed; oracle (a) compares them on type alone, as before — a node may group them its own way); (2) `narrow` on a VALUE OUTPUT (`ValueOutputDecl.narrow`, type only — Text Input's `onTextChanged` is a lane's); (3) **`narrow` reads RAW params** — a Dropdown Value SET to `'Option 1'` outside the list is offered back exactly as options.ts :428-432 offers it; the Dropdown says the hook's own `DEFAULT_ITEMS` fallback (:418) itself, and L4's `GAP` pin is gone; (4) `ValueInputDecl.drawnDefault` — the default the announcement shows when it is not the value at mount (Component Stack's `startPage`, a lane's); (5) `dataAttributes` stays an editor rule, not a format gap. Also `'curve'` joins `ValueType` (States' transition ports announce it; the generator's pool falls back to `*`) | ports.ts, spec.ts, dropdown.ts, nsp-020-oracle-a.ts | outcome.ts :148-190; options.ts :417-447; text-input.ts :616-637; states.ts :1030 |

**What the four padded specs' fixtures were, said in the format:** `RECORD_FIELDS` → `outputCandidates: prop-title, changed-title, prop-n, changed-n`
and `derived.outputs` reading `context.schema` ∪ the wire names; `STATE_LISTS` / `VALUE_LISTS` → the generator's `examples`
(unchanged) + `outputCandidates: at-A … reached-C`, the value outputs re-derived from `values`, the state ports `onWire`;
`FUNCTION_FIXTURES`, `SCRIPT_FIXTURES`, `LOGIC_BUILDER_FIXTURES` (not moved this session, step 3's) → the saved ports ARE
`derived.outputs(params)` at the PLACING (piece 5 — no `savedPorts` field is needed: what the project saved is what the editor
drew for the saved params; a `set code` mid-play moves no saved port, as javascript.ts :433 shows), the written outputs
`discoverOutput` (piece 4), a Function's signal outputs `onWire` (piece 3). **Graph scenarios** say the same thing per node:
`GraphNodeDecl.wiredOutputs` (graph.ts) — the outputs a wire leaves from to nodes outside the scenario; s07 (four Records) and
t11 (a States) carry theirs, written from the ports their recorded traces mention, and the recordings did not move.

**Proved on DbModel2** (`record.ts`, `record-base.ts`): `derived.inputs` draws the Class dropdown from the schema (the two Parse
system classes first, record-ports.ts :124-140) and the Backend picker with two or more backends; `derived.outputs` draws one
`prop-` + `changed-` per column of the selected class and `prop-` alone per wired or parameter-named field
(`recordWiredFieldNames`); `discoverOutput` mints `prop-*` / `changed-*`; `needs: ['schema', 'backends', 'wired', 'wiredOutputs']`;
every `isField` became `w.hasOutput(...)`, `prop-` and `changed-` gated separately as :140-142 gates them. **Proved on States**
(`states.ts`): `derivedOutputs` reads the two lists alone (no universe), value outputs without a display name (the hook announces
none, :980-988), `at-` / `reached-` `onWire`; the `outputs` state key and `init` are gone, `flag` / `reached` ask `hasOutput`; the
curve ports type `curve`, a value's own transition defaults to the state's Default as set (:1030).

**Gates (s82, this tree):** 52 hand scenarios' traces **byte-identical** to HEAD's goldens (DbModel2 29 / 29, States 23 / 23 —
`wiredOutputs` written on 47 of them from the output names their HEAD traces mention; only the input hashes moved); then two
scenarios added (below). Interpreter: `batch-records` DbModel2 and `batch-time` States at seeds 13 and 20728 — every mutant
killed or declared. Runtime: `NSP_ONLY=DbModel2,States,net.noodl.controls.options` conformance at 200, seed 20737 — all three
CONFORM, States' 4 known attributed. Oracle (a) `nsp-020-ports-parity` 199 / 199 — **23 graded rows, 120 cases** (DbModel2 and
States turned from `owedBy` to graded: DbModel2 six cases incl. two backends, a wire out of `prop-zz`, a wire into `prop-n`;
States five cases), 17 owed. Oracle (b) `tests-unit/nsp-020` 452 / 452; `typecheck:editor-tests` 0; node-spec `tsc --noEmit`
0; node-spec `ports, golden, runner, pilot, adapter, catalog-parity, types, schema` 491 / 491; `spec-golden:check` 0 (108 specs,
9,209 scenarios); `spec-ledger:check` 0 (125 / 147, unmoved — the column is AC4's). Full node-spec suite and the stranger rounds:
see the handoff for the readings taken after this paragraph was written.

**Found, filed:** **P107-S82-STATESVALUEPORT** (runtime, low) — a `value-<state>-<v>` written while in that state flags `v`
without `hasOutput` and THROWS when `v` is not in Values (states.ts :534-541); the padding had registered every `v` at mount, so
no play reached it before. Known on the runtime (`KNOWN_ROWS.States`, a `row` scenario). **P107-S82-STATESLOADGATE** (runtime
announcement, low) — at load the hook announces nothing until States is set, while any later edit announces Values' outputs
regardless (:1248-1260); pinned on the States row. **Closed:** P107-S80-BACKENDPICKER (piece 1; the two L4 pins stay until Sign
File URL and Upload File spread `backendPickerPort`). A DbModel2 swap mutant that survived seed 20737 alone is killed by a hand
scenario (a bind that unbinds beside a refused Fetch to a backend named `ghost`, then a Fetch that reveals the binding).

**Where s81's handoff was wrong:** nothing material; §6.5's "a `PortContext` field for the node's saved ports" is not needed
(piece 5). **Not done:** L1's other 14 rows and L3's 3 (Function, Script, Logic Builder) move onto the format in step 3; the
L4 field disagreements on Function (step 2) untouched.

### 6.7 s83 (2026-10-11, Opus) — L3 ✅: Function, Script and Logic Builder on the decided format

All four of L3's padded specs are now on §6.6's format. No spec carries a fixture list as ports. Each fixture list is
now only the `examples` a play may set. The three nodes keep their saved ports in three different ways, and each spec
says which:

| node | the saved ports (`derived.outputs(params)`, the PLACING's) | at play | the runtime line |
|---|---|---|---|
| **Function** | the placing's Script and written lists; drawn typed (`outtype-`), named and grouped | a signal is SENT only when wired (`onWire`; the reducer filters `emitDerived` by `w.hasOutput`), but its callable exists for every saved signal, wired or not; a value exists when wired or once the code writes it (`discoverOutput`) | simplejavascript.ts :600-618, :609, :298, :903-920 |
| **Script** | the placing's Code and lists | every saved output is registered at each read (not `onWire`); a write never mints a port; Code set while the app runs writes to an output the placing never saved and sends nothing | javascript.ts :431-433, :640 |
| **Logic Builder** | the placing's blocks | values and signals both `onWire`, minted by the code's own write or send | logic-builder.ts :259-277, :488, :601 |

**One format addition: `discoverOutput(port, as?)`.** `as` says how the node's own act reaches the name: `'signal'` for a
pulse (`emitDerived`, `pulses`), `'value'` for a send (`sendDerived`, `world.send`), absent for a wire. The interpreter's
`mintOutput` passes it. A Logic Builder `send signal` to a name the placing's blocks never declared registers a VALUE
port (the kind is the placing's blocks') and `sendPulse`s on it, so the wire carries a pulse. Minting at the act's kind
gives the trace the wire's shape. Logic Builder scenario 13 grades it, and ignoring the hint is planted red. Function,
States and DbModel2 ignore the argument. **The runtime target:** `placing` writes `model.outputPorts` from EVERY drawn
output, `onWire` or not, because a Function prepares a callable for each saved signal (:600-618). It still registers the
play's list alone. Only Function and Script read `model.outputPorts` (grep), so no other node can see the change.

**Field fixes (L4's printout):** Function's `intype-` / `outtype-` are `enum` pickers named Type with the editor's choices
and default (`drawnDefault`). A list `in-<x>` takes `intype-<x>` (or `string`), named `<x>`, group Inputs. The checkbox
is named `<x>`, group Run On Value Change. Outputs are typed by `outtype-`, named, group Outputs. Script's drawn fields
(`drawnOf`) come from the lists, from `getPorts` (a declared type, or an object port's own fields) and from the names
the text mentions, first come first kept. Its pickers' defaults are `drawnDefault` (never set at mount). Logic Builder
draws each port under the block's name: value inputs typed and grouped Inputs, signal inputs Actions, values Outputs,
signals Events.

**Traces against HEAD:**
- **Function:** 32 / 32 byte-identical. `wiredOutputs` was written on the two scenarios whose traces fire a signal
  (`out-ping`, `out-go`). Two scenarios were added: an unwired `ping` sends nothing (planted: the filter removed is red),
  and a Script set mid-play calls a signal the placing never saved, which throws "Outputs.ping is not a function".
  Scenario 23 is RENAMED: it was "a signal fired by its .send", but its trace has always recorded the throw. The reader
  makes `Outputs.ping.send()` a value port (P66 FIX-016 measured it), now filed as **P107-S83-SENDFORM**.
- **Script:** 15 / 17 byte-identical, 2 moved, both explained.
  - Scenario 6's mid-play `sum` Code writes an output the placing never saved, so nothing is sent.
  - Scenario 16 is rescoped. It placed no Code and pulsed `go`, which no saved project can hold: the input picker has no
    Signal (:735-762). It now places the lists and grades values waiting for the first read. Signals waiting is
    scenario 5's, on a placing with Code.
  - **Script → v2** with a `changes` entry: "No app does anything differently", `migration: none` (the spec stopped
    padding; the runtime did not change). NSP-010's gate allows no other route for a moved trace.
- **Logic Builder:** 15 / 15 byte-identical with no scenario touched. Scenario 13's name and `because` now give the
  real reason.
- **Graph t14:** the Function `a` that calls `ping()` carries `wiredOutputs: ['out-ping']`. Its recording expected the
  pulse, which the padding had registered. The recordings did not move.

**Oracle (a):** 26 graded rows, 137 cases, 14 owed (all L1); 0 pins on the three. Function 4 cases, Script 5, Logic
Builder 3; a planted wrong `group` on Script is red.

**Gates (s83, this tree, on `ae7db7dff`):**
- **node-spec:** `tsc --noEmit` 0. Interpreter conformance with mutants at seeds 13 and 20728, all CONFORM with no
  survivors and nothing unreached: Function 214 mutants, Script 32, Logic Builder 118.
- **runtime:** `NSP_ONLY=JavaScriptFunction,Javascript2,Logic Builder,States,DbModel2` at 200, seed 20737: all CONFORM.
  The seven runtime suites that import the target (conformance, graph, runtime-target, the three contracts, parity) ran
  404 passed and 5 skipped, with `graph` red on t14 alone. After the t14 wire, `graph` is 96 / 96 and the node-spec graph
  128 / 128.
- **editor:** `tests-unit/nsp-020` 452 / 452; `typecheck:editor-tests` 0.
- **ledgers:** `spec-golden:check` 0 (108 specs, 9,211 scenarios, 2 with a history); `spec-ledger:check` 0 (125 / 147,
  unmoved).
- **full suites:** the full node-spec suite ran 33 suites, 1,895 / 1,895, exit 0. The stranger hash for `src/spec.ts` was
  refreshed, and the four rounds re-graded at 46 / 46 (+18 deep skipped), exit 0.

**Where the s82 handoff was wrong:**
- "a Function's SIGNAL outputs are `onWire`" is only half the story. Their callables exist for every saved signal, so
  the target had to write the saved list, `onWire` included.
- "`derived.rederive` none of the three, most likely" — confirmed none.
- Script needed no `onWire` and no `discoverOutput`: the runtime registers every saved port at each read.
- Logic Builder needed one thing the eight pieces did not have: the act's kind on `discoverOutput`.

**Left:** L1's 14 rows, L5, oracle (c) (waits on P107-S79-ADAPTERLABEL), and the one 10,000-sequence run once L1 lands.

### 6.8 s84 (2026-10-11, Opus) — L1 ✅: the last 14 specs on the format; oracle (a) owes nothing

All 14 rows L4 left `owedBy: 'L1'` are on §6.6's format. **Oracle (a): 40 graded rows, 227 cases, 0 owed** (from 26 / 137 / 14);
the owed block now asserts that nothing is owed. Every spec draws what its hook announces from `(params, context)`. At play the
context holds only the wires, so a schema-, stack- or component-driven port is registered by its first write or by a wire, as
the runtime registers it.

| family | specs | what the editor draws from the project | at play |
|---|---|---|---|
| Record CRUD | Create, Update, Delete Record; Add, Remove Record Relation | `recordCrudInputs` (record-base.ts): the Backend picker (two or more backends), the Class dropdown; Create / Update add `recordFieldInputs` (record-write.ts: one `prop-` per column, typed, then the wired and parameter names untyped, SBR-008); the relation nodes add the Relation picker over the class's relation columns | unchanged — a write registers each; no output is gated |
| Query | Query Records, Filter Records, Subscribe To Changes | the pickers; Filter / Sort builders (`query-filter`, `query-sorting`, new `ValueType`s) when the schema has the Class; one `qp-` / `fp-` port (and its box) per parameter the saved filter names (`filterParameterNames`, record-match.ts, twin of queryutils.ts :212-240, both shapes). Query Records: every setting typed and labelled as drawn, the Javascript filter drawn `undriven` | Query Records' `storageTotalCount` exists only on a wire (`onWire` + `discoverOutput`) and its send asks `hasOutput` (:929) |
| User | User, Set User Properties, Sign Up | `userFields` (user.ts): the `_User` columns less each node's ignore list and every Relation; on the Parse wire `ACL` is drawn (P107-S84-USERACL) | User's `prop-` / `changed-` and the three session signals are `onWire`, minted by a wire, every send gated as the runtime gates it |
| Components | Push Component To Stack, Show Popup, For Each | Push: Transition's default per Mode and each transition's `tr-` ports typed with the panel's defaults (`drawnDefault`); Target Page over the named stack's pages; the target page component's inputs as `pm-`; its Pop Component Stack nodes as `backAction-` / `backResult-` (`onWire`, no candidates: the world's stacks have no back channel). Show Popup: `popupParam-` typed by the popup's inputs; its Close Popup nodes' actions and results, a result typed by the popup's output. For Each: Script with its default mapping, `itemOutput-` / `itemOutputSignal-` from the Template's outputs | Show Popup's and For Each's outputs `onWire`; For Each's `registered` state (the padding) is gone, every read is `hasOutput` |

**Format additions (spec.ts, one stranger-hash refresh):** `BackendField` with `relation?` (a Parse Relation column);
`ValueType` gains `query-filter` and `query-sorting`; `ComponentInterface` ports may be `'signal'` and gain `nodes?` (the
params of the nodes of a type inside the component — `getNodesWithType`, read by Push and Show Popup); `NamedPages.components?`
(page id → the component it shows, a Component Stack's `pageComp-<id>`). No interpreter or runner change. Oracle (a)'s fake
project grew to match: `_`-prefixed classes in `systemCollections` (`{ name, schema: { properties } }`, as a Parse project
keeps them, the only key Sign Up reads), a Relation column, the project's Component Stacks and components.

**Also:** Sign File URL and Upload File spread `backendPickerPort`; BACKENDPICKER's two pins are gone. DbModel2 types a
column as `recordPortType` does (only String / Number / Boolean / Date keep their type) and skips relation columns and `ACL`.

**Traces against HEAD — every existing hand trace byte-identical.** `wiredOutputs` written from the gated names each HEAD
trace mentions: User 28, Show Popup 7, For Each 261, Query Records 1; graph s10 (six User nodes) and t12 (one Show Popup).
**New scenarios, each killing a mutant the generator reaches on some seeds only, or grading a gate:** Query Records
"Total Count with no wire" (a planted ungated send shows in its trace) and "a filter parameter arriving alone" (a `qp-` write
swapped with Search's survived at runtime seed 20737); Filter Records "a box written after its value" (a swap survived seed
13 — HEAD killed it there by chance, measured on HEAD's spec); User "a lost session with no wire out of Session Lost" (an
unwired sign-out binds silently — a branch HEAD never had, since the padding registered all three signals); Show Popup "a
close and a new show in one frame" (drop-set at seed 13). **A first planted check was invalid and was redone:** dropping a
scenario's `wiredOutputs` makes `golden --check` say "stale" because the INPUT hash moved, not the trace — compare the traces.

**Planted breaks, each red then restored:** `ACL` shown on the Record writes (2 cases); the legacy filter shape ignored (3);
the Total Count send ungated (the trace); `ACL` hidden on the User family (5); Replace's None default lost, Show Popup's result
type ignored, For Each's Script mapping a signal input (3 rows).

**Found:** **P107-S84-USERACL** (runtime, low): the User family draws `prop-ACL` on the Parse wire, which the Record
family hides (`userPropertyPorts` skips `shouldShowField` there; Sign Up's ignore list lacks it).

**Gates (s84, this tree, on `6e44387bc`):**
- **node-spec:** `tsc --noEmit` 0. Interpreter conformance with mutants, seeds 13 and 20728, all 19 moved specs (the 14,
  DbModel2, Upload File, Sign File URL): CONFORM, 0 survivors, 0 unreached.
- **runtime:** `NSP_ONLY=` the 19 at 200, seed 20737: all CONFORM. `nsp-020-ports-parity` 324 / 324; `graph` 96 / 96;
  runtime-target, the three contracts and the editor-suite graph 86 / 86. Node-spec graph 128 / 128.
- **editor:** `tests-unit/nsp-020` 452 / 452; `typecheck:editor-tests` 0.
- **ledgers:** `spec-golden:check` 0 (108 specs, 9,216 scenarios); `spec-ledger:check` 0 (125 / 147, unmoved).
- **full suites:** the node-spec suite without the stranger file: 33 suites, 1,895 / 1,895 after two fixes it found — both
  For Each's `registered` going: `world.test.ts`'s tap play now wires `itemOutputSignal-Tapped` (the padding had registered it),
  and the page-model gate's For Each state list drops `registered`. The stranger hash for `src/spec.ts` refreshed (the only
  guarded file that moved); the four rounds re-graded at 46 / 46 (+18 deep skipped), exit 0.

**Left:** L5 (`portContextFor` in `project-contract`, AC3, AC4), oracle (c) (waits on P107-S79-ADAPTERLABEL), the one
10,000-sequence run.

### 6.9 s85 (2026-10-11, Opus) — L5: the builder, the drive on saved projects, AC4; AC3 researched, not built

**The builder** (`packages/nodegx-project-contract/port-context.ts`, commit `7e25341ea`). `portContextFor(project, nodeId)`
and `portContextReader(project)` (the project-wide fields once, for many nodes) read a node's `PortContext` from a saved v2
project with no viewer:

| field | read from | the runtime line it says |
|---|---|---|
| `wired`, `wiredOutputs` | the component's connections into / out of the node, in order | nodescope.ts, record-ports.ts :305-308 |
| `backends` | the `cloudservices` endpoint (`_endpoint_`, "Built-in" / "Parse Server") then every `backendServices` backend | resolveBackend.pure.ts :141-174 |
| `schema` | PER NODE: its Backend param (`_active_` / none → `defaultBackendId`, the converged gate at backendServices `version` ≥ 2) selects a backend; its introspected collections (typed as `recordPortType` → `getEnhancedFieldType`), else `dbCollections` + `systemCollections` on the Parse wire | schema-ports.ts :119-195, :323-381, :479-520; resolveBackend.pure.ts :184-222 |
| `stacks`, `routers` | every Page Stack (`name` or Main, `pages[].id`, `pageComp-<id>`), every Router (`pages.routes`) | navigate.ts :338-363 |
| `components` | every component by legacy name: its Component Inputs / Outputs ports TYPED FROM THE PORTS WIRED TO THEM (no wire `*`, one wire its type, several the shared type) — a catalog resolver passed in (`options.portType`); the nodes inside by type | noodl-editor componentmodel.ts :134-240 `getPorts` `_deriveType` |

Not built: `siblings`, `instancePorts` (no spec reads them). A structural copy of the spec's `PortContext`, not an import.

**Where the handoff was wrong:** "the cache drive over the templates" — **0 of the 13 templates' nodes carry a cached
`dynamicports`** (agent-authored, never opened with a viewer). The caches live in projects the editor has opened: 5,605
nodes in 154 of Richard's local projects, and 5 committed export fixtures. And a component's port types are not the
types saved on its Component Inputs node: the editor derives them from the wires, which needs the node catalog.

**The drive** (`noodl-runtime/test/node-spec/nsp-020-port-context.test.ts`). Per node of every saved v2 project whose type
has an oracle (a) row and a spec, three lists: (A) the runtime's `setup` hook over a fake graph model made from the SAVED
project (raw `metadata`, the real wires, every node of a type) against `drawnPorts(spec, params, portContextFor(…))` —
non-circular for wires, backends, schema and stacks; for component interfaces the fake hands the hook the builder's (the
runtime is handed them by the editor's exporter and computes none), so typing is graded by (B) and by a direct check
against oracle (a)'s hand-written `PROJECT`; (B) the editor's cached `dynamicports` against the same draw; (C) hook vs
cache. Oracle (a)'s pins apply; the drive's own pins are exact lines with a seen-gate. Three synthetic projects add what
no committed one holds: two backends (legacy and converged readings, every Backend value a param can hold, a Directus
collection with `date` / `json` / select / hidden columns) and pages (an unnamed stack, a popup, a row template).

**Readings (this tree):**
- **Committed corpus, 95 projects + 3 synthetic: (A) clean on every node.** Reach (nodes whose (A) a dropped field turns
  red): wired 82, wiredOutputs 4, backends 40, schema 46, stacks 5, components 218 — the REACH gate holds each above 0.
- **Planted builder breaks, each red (6; commit `7e25341ea`'s message says 8 — wrong, 4 were red at that commit):** the converged gate ignored (44 lines), `systemCollections` dropped (36), an unnamed
  stack not read as Main, `wiredOutputs` dropped (13), a Relation's target dropped (10), interface typing ignored. **Not
  graded, by design:** the backend's display NAME (the format's enums are values only).
- **Found first run:** a REST column with no native type is `string` unless numeric / boolean / json / enum — the builder
  said `*` for `text` and `date`; fixed before commit.
- **Richard's 212 local projects (`NSP_PORT_PROJECTS`), 7,812 nodes: (A) clean on every node.** (B) where hook = cache:
  0 lines. **Wherever the cache disagrees with the spec it disagrees with the live hook too: 1,027 stale caches of 4,228**
  (Query Records' `collectionName` / `runOnChange-*` announced since; Expression's `length` / `trim` an older parser made
  into inputs; schema columns added since). §5's worry, measured: an old project shows a diff on open TODAY, with or
  without the spec — P107-S79-SILENTCACHE in numbers.
- 3.6 s for the committed corpus (the first draft took 80 s: a hook sweeps every node of its type on
  `editorImportComplete`; the fake now answers the driven node's own type with that node alone, as oracle (a) does).

**Bug filed:** **P107-S85-RESTCOLTYPES** (low, format) — the Record spec types a column by the Parse table only: a REST
`json` column the runtime draws as Object and a select column as an Enum (with its choices), the spec draws as `*`.

**AC4 ✅ (commits `f43e9d2a0`, `0957bf896`, and the `DRAWN_PORT_TYPES` commit).** `spec-ledger` prints *ports: 130 of
147 drawable without a viewer — 52 by a spec (31 from the params, 9 with the project, 12 with the schema), 78 static*,
names the 17 that are not, and holds `floor.ports`. **The first commit said 134 and was wrong:** it counted any spec with
`derived` as drawing its ports. Cloud Function's and Navigate's `derived.inputs` return nothing — their `in-*` / `pm-*`
ports are discovered on a write, never drawn from the project. A type's runtime / adapter ports now count only for a type
in **`DRAWN_PORT_TYPES`** (`src/nodes/drawn-port-types.ts`, 39 types): graded by oracle (a) and with no pin saying the
runtime announces a port the spec does not draw — which leaves out the HTTP Request (its Output Fields). The parity test
holds the list to `TABLE` both ways; the ledger and the MCP (R19) read the same list. Cloud Function, Navigate and Router
are "oracle (c) owed".

**AC3 — researched, NOT built; Richard asked for the research before deciding ("it's a big deal").** What an agent has
today, measured:
1. `get_component` hands the agent each node's SAVED `dynamicports` — stale on 1,027 of 4,228 nodes in Richard's projects.
2. The validator the MCP runs (the editor's `validation/`) treats saved `ports` ∪ `dynamicports` as the node's ports
   (`normalize.ts instancePortNames`), and for the ~50 types whose ports appear at run time a wire to any other name is
   **never an error** — `nonexistentPort.ts` (3) emits an info, "could not be statically verified … Skipped". Hand-written
   checkers cover Cloud Function, Navigate and Page Inputs (`derivedPortTargets.ts`) and the Function (`functionPorts.ts`);
   the MCP already derives and WRITES a Function's ports itself on every write (DEF-011, `scriptPorts.ts`).
3. Every wire endpoint on a dynamic-port node in 181 local projects (7,577 nodes): 2,906 are correct wires to ports the
   spec draws that the saved list does not hold — today "skipped"; 176 on graded types go to a port the live editor
   would not draw either (270 more on Cloud Function / Navigate are the spec's own gap above). **One read through:** CMG
   Drive Looks' featured products wire For Each's `addToBasket`; the port is `itemOutputSignal-addToBasket` (the editor's
   own saved list says so), and For Each registers an output only under those two prefixes (foreach.tsx :1081-1096) — the
   Add to Basket press never reaches the page, and the validator let the wire through as "skipped".

The costs, measured: the specs + `ports.ts` + `portContextFor` bundle to **1.7 MB** (the MCP is 9.8 MB); loading it costs
**~50 ms and ~27 MB** once per server start; drawing a whole component takes **0.6 ms median, 2.8 ms p95, 47 ms worst**
(the first read of a large project); the added answer is **+8% median / +20% p95** of a `get_component` answer as name,
plug and type, **+20% / +64%** with every field. **Ruled R19 (README §7): "Check wires and show ports"** — part 1
`get_component`'s drawn ports, part 2 the wire check, for `DRAWN_PORT_TYPES` only.

**The one 10,000 run (s85, seed 20737, 22 specs: everything moved in s82–s84):** 0 divergences on all 22. 19 CONFORM; 3 do
not, on mutants alone: Dropdown 7 swap-branches on unmount branches, For Each 1 (`world.resume` drop-set), Record 1
(`modelId` drop-set on the unticked object-Id branch, only a later Fetch reads it). Handed to s86 with the trap s85 met
closing the Record's (a hand scenario arms a neighbour swap-branch with its own example value).

### 6.10 s86 (2026-10-11, Opus) — the 10,000 run's survivors closed; R19 part 2, the wire check, built and measured

**The survivors, closed (three hand scenarios + two for the Record; nothing in a spec moved).** Reproduced first on the
interpreter at the deep run's own seed (20737, 10,000 sequences — mutants are interpreter-side, so this is the run that
found them; 5 min for the Dropdown, 30 s for each of the others), then each scenario checked at seeds 13 and 20728, again
at 20737, and on the runtime (200, the three specs).

| spec | what was alive | the scenario that kills it | at 20737 after |
|---|---|---|---|
| Dropdown v7 | 7 swap-branches: an act whose paint finds Mounted written off **while the element holds the keyboard** (`focused`, Blurred) **or a finger** (`pressed`, no keyboard), handed the empty branch | "Mounted written off in the frame of an act while the element holds the keyboard, a finger, or both" — every act × the three holds, each followed by a Focus action, which reads whether the element is still there (Unchanged vs Done) | 0 survivors (1133 / 1160; 27 declared) |
| For Each v10 | `world.resume` drop-set on the yield that fails a Refresh (`no-items`) and fires Items Rendered | "Items emptied (null) and a Refresh in one frame, rows on the page …" — then a new list and a tap on its row: a yield that left the queue "running" builds nothing | 445 / 445 |
| Record v4 | `modelId` drop-set on `{set:[modelId], emit:[changed, fetched]}` | "ticked again after an Id was stored unticked: an object on Id naming the record still bound …" + a Fetch | 236 / 238 (2 declared) |

The deep run reached the For Each branch in 2 of 10,000 sequences (found by playing them on a branch-recording copy of the
spec, `discoverBranches`), both ENDING at that yield — nothing after it read what it left. **Where the handoff was wrong:**
the Record's branch is the TICKED one (`fetched` is pulsed only by a binding, `setModel`), not "the unticked Id". The
unticked twin (`emit:[changed]`) was unreached too and has its own scenario now. **The s85 trap came back with distinct
ids:** the neighbour `{set:[], emit:[changed]}` handed the new example writes `r7` where its play held `r1`, and none of
the three scenarios reaching that neighbour read the stored Id after it — distinct values are necessary, not sufficient;
the neighbour needs a READER. A fourth scenario gives it one (the bound record's own object on Id, then a Fetch).
Golden: four scenarios appended to three files, no trace moved, `spec-golden:check` holds, no version.

**R19 part 2 — the wire check.** As s85 designed it, with two corrections the measurement forced:
- **The validator** (`rules/nonexistentPort.ts` (3a), the editor's `validation/`): `ValidatorOptions.drawnPorts(component,
  nodeId, nodeType)`; asked only for a wire that the catalog (1), the saved lists (2) and the derived-port rule (2b) do not
  name, on a runtime-port type. A set → the port is in it or it is an ERROR (`<Type> has no <plug> named "<port>" with its
  settings in this project.`); `undefined` → today's info. The suggestion is the drawn name with the same name after its
  prefix first (`addToBasket` → `itemOutputSignal-addToBasket`, `items` → `in-items`, `id` → `p-id` — all too far for
  `nearest`), else `nearest`.
- **The MCP** (`specPorts.ts` `drawnPortCheck`) supplies it on all three doors: a write (`validateCandidate`: the candidate
  and the baseline, each its own project, so a wrong wire already on disk does not block an unrelated edit), a plan
  (`validateStaged`: the plan's staged overlay) and the validate tools (`validateOnDisk`, so a check before a write says
  what the write will). The project is read once, on the first node asked about.
- **Correction 1 — "has the port" is drawn ∪ minted.** The first measurement refused 125; reading them, two classes were
  ports the runtime HAS: a For Each's `itemOutputSignal-x` for a row output typed `*` (drawn `itemOutput-x`; the wire
  registers it, 22) and a Function's `in-reload` wired from a counter so its script runs again (4). A wired name the spec's
  `derived.discover` / `discoverOutput` accepts is now a port. (The Function's are refused anyway at the MCP's door by
  FIX-007's own `unknown-function-port` rule: "the editor paints this wire Target missing" — an existing ruling, left.)
- **Correction 2 — a node is found in its component.** `findPortNode` read the first node with the id anywhere in the
  project; 27 of 117 local projects reuse an id across components. **P107-S86-NODEIDSCOPE** (fixed): the builder takes
  the component's legacy name; `get_component`'s drawn ports and the drive pass it. The drive had looked both sides up the
  same way, so it agreed with itself on the wrong node.

**Measured over Richard's 117 local projects** (the shipped path: the MCP's `ProjectStore` + the validator, with and without
the callback; connection notices only — the parameter checker's skip notices share the code):

| wire endpoints | |
|---|---|
| "could not be statically verified … Skipped" before | 575 |
| now checked and OK | 471 |
| **now refused** | **99** |
| still skipped (types the spec does not draw: Cloud Function, HTTP …) | 5 |
| still skipped on a `DRAWN_PORT_TYPES` type | 0 |

**Every refusal read, by class — all dead wires:** For Each `addToBasket` and `browse` (46: the CMG copies; the port is
`itemOutputSignal-…`), For Each `item` (8; no such output), Set Object Properties `stored` (22: renamed `done` in ERG-001,
**P107-S86-STOREDWIRE** filed — the copies of the Multi Choice prefab made before it), a Function's `items` / `text` (22: its
ports are `in-` / `out-`; FIX-007 already refuses these at a write), Navigate To Path `id` (1: `p-id`). **0 false refusals
after correction 1.** The check's cost: 2.5 s for the 117 whole projects. **P107-S86-WIREUNCHECKED** (fixed) records what
R19 part 2 closes.

**Graded:** `noodl-mcp/tests/nsp020WireCheck.test.ts` 4 / 4 through the tools (For Each refused + suggested, its right wire
taken; `stored` refused, `done` taken; a wrong wire on disk reported by `validate_component` and not blocking an unrelated
`update_component`; a reused node id drawn from its own component). **Planted:** the callback answering nothing → the
first three red; the lookup ignoring the component → the fourth red. `noodl-editor/tests-unit/nsp-020/wire-check.test.ts`
4 / 4 (the rule's half, with a callback of its own). `nodegx-project-contract/tests/port-context-node-scope.test.ts` 3 / 3.

**Not done — the editor.** The editor runs the same validator and passes no callback, so in the editor nothing changed.
Whether it should is Richard's (R19 named the agent server); the false-refusal count to ask it with is above: 0 of 99.

**The whole MCP suite, after the commit:** 185 / 194 files, 3866 / 3880 tests. The 9 files that fail (14 tests) fail the
same with the check made inert (`drawnPortCheck` answering `undefined`), so none is R19's.

### 6.11 s87 (2026-10-11, Opus) — oracle (c): Navigate and Cloud Function, graded by their editor adapters

Built under NSP-021 (its §6.1 has the readings): `noodl-editor/tests-unit/nsp-020/adapter-ports.test.ts` runs the REAL
`RouterNavigateAdapter` and `CloudFunctionAdapter` over a fake project model made from each saved project and lays what
they hand `setDynamicPorts` over `drawnPorts` with `portContextFor`'s context — 621 nodes in Richard's 201 projects,
0 different. Both specs draw from the project now (`ab494b0c2`, `a8faa0995`); Cloud Function's `RESULT_FIELDS` padding is
gone the L1 way (`onWire`, `discoverOutput`, `hasOutput`; 19 / 19 traces byte-identical). `ADAPTER_GRADED_TYPES` names
the types oracle (c) grades; both are in `DRAWN_PORT_TYPES` (41). **Oracle (c) did not wait on P107-S79-ADAPTERLABEL:**
the adapters it needed were read directly. The label (Router, Query Records, Filter Records) stays open; Router is the
one type still "no view" because of it.

### 6.12 s100 (2026-10-13, Opus) — the cloud nodes' ports: the editor runs no cloud setup() at all

The s99 handoff's step for AC4 was to add `noodl-viewer-cloud/src/nodes` to `nsp-020-ports-parity`'s ROOTS and grade each cloud
module's `updatePorts` against its spec. **Measured first, in the dev editor (NSP-022 §6.9): that code runs nowhere in the
editor.** A cloud function has no runtime client since WF-007. Its library is `cloud-node-library.json` (declared ports only),
and `cloudDynamicPorts.ts` derives only the wire families (SB-017). A new Aggregate Records there has no Class, Property, Filter
or Do; a new Query Records has no Class or Filter. The front-end control has both. Filed as P107-S100-CLOUDSETUPPORTS.

So a parity row for a cloud module would grade a function no person's editor calls. This task's sentence ("an editor can draw
every port of every node from the spec alone, without a viewer running") has its one real customer here. The ruling the bug
asks for decides what AC4's cloud rows grade: the spec drawing the editor's cloud ports, or the modules' hooks run against a fake
connection, or `cloudDynamicPorts.ts` extended type by type.

**R37 (s100): "From the node specs."** Measured for the build, not built:

| what | count |
|---|---|
| types in `cloud-node-library.json` | 88 |
| … with a spec | 81 (no spec: Component Inputs / Outputs, RunTasks, REST2, Component Object, Set Component Object Properties, On App Error) |
| … whose spec draws derived inputs (`derived.inputs`) | 29: Expression, JavaScriptFunction, Logic Builder, DbCollection2, DbModel2, Set / Delete / New DbModelProperties, Add / Remove DbModelRelation, FilterDBModels, Model2, SetModelProperties, NewModel, Filter Collection, Set Variable, Sign File URL, And, Or, String Mapper, String Format, Set User Properties, User, cloud Request, Response, Create User, Update User, Aggregate Records, HTTP |
| … of those 81, in `DRAWN_PORT_TYPES` (draw graded against the runtime's hooks) | 23 |

**The gap the build has to close first: a `DrawnPort` carries less than a panel draws.** It has name, plug, type, displayName,
group, description, default and enum VALUES. The runtime hooks of those types announce, by a static count over their modules:
enum `label`s 97, `allowEditOnly` 49 (the spec's decl has `editOnly`, which `drawn()` drops), `allowConnectionsOnly` 15,
`codeeditor` 8, the filter builder's `schema` 6 / `backend` 2 / `valuePortPrefix` 4, `index` 5. So the build is, in order:
(1) carry the presentation fields on `DrawnPort` (edit-only, connections-only, enum labels, the code editor, order) from the
decls, and the filter / sort builder's schema from the `PortContext` the spec already reads; (2) one editor adapter that, for a
node in a cloud component whose type has a spec, sets its dynamic ports to the derived drawn ports in the editor's port shape.
It needs one writer per type: `setDynamicPorts` replaces, SB-017's lesson. JavaScriptFunction, the Record family and Query
Records already have a writer in `CloudDynamicPortsAdapter`, so merge into it, never beside it. (3) Drive it: a new Aggregate
and a new Query Records in a cloud function show Class, Filter and Property, beside the front-end control; then the Jasmine /
`test:ci` gate.

### 6.13 s101 (2026-10-13, Opus) — R37 built: the editor draws a cloud node's settings from its spec

**Grade first, then draw.** Oracle (a)'s census now reads `noodl-viewer-cloud/src/nodes`: 17 cloud modules have a hook, 14
are empty (EXCLUDED, a line each), and Request, Response and Aggregate Records are graded rows. Aggregate's cases hand the hook
the class list in the editor's own shape (`{ name, columns }`, `meta`); the oracle's `context.schema` fixture is the raw Parse
list, which `aggregatenode.js` does not read, so the first `visualFilter` disagreement was the fixture's, not the node's.

**The oracle grades what a panel draws.** Two widenings, each with a planted mutant:

- a DERIVED port's enums (before, declared ports only). One finding: Filter Collection's Op offers the operators of the filter's
  Type (string 5, boolean 2, number 8, `filtercollectionnode.ts` :661-683); the spec offered all nine. Fixed (draw only).
- the panel's fields, `panelDiffs`: edit-only, connections-only, the code editor, an enum's labels, a filter builder's value-port
  prefix and whether it is told its backend. Measured on all 43 rows: 125 of 347 cases disagreed, from ~15 sources. All fixed
  at the source but one pin (For Each's Script: the spec's `editOnly` steers the generator; the runtime leaves it wireable — a
  GAP, For Each never sits in a cloud function).

The format grew for it (`spec.ts` `ValueInputDecl`: `labels`, `connectionsOnly`, `codeEditor`, `valuePortPrefix`,
`filterBackend`; `SignalInputDecl.connectionsOnly`; `narrow` may return `labels`), and `DrawnPort` carries them. Presentation
only: no reducer, generator or target reads them. Plus Aggregate's `derived.outputs` (`agg-<name>`, number or string by its
column, `onWire` so play is unchanged) and its Javascript filter's default script — the hook announced both, the spec drew
neither. `DRAWN_PORT_TYPES` + Aggregate, Request, Response; the ledger's ports floor 132 → 133.

**The editor.** `models/nodelibrary/cloudSpecPorts.ts`: `CLOUD_SPEC_PORT_TYPES` — 24 of the 26 cloud-library types that are graded
and draw derived ports, less Request and Response (a `namedports/list` rule draws theirs). `specPortsForNode` runs `drawnPorts`
over a one-node `PortProject` (the node, its component's wires, the project metadata — the only `derived.needs` those 24 have:
schema, backends, wired, wiredOutputs), keeps the derived ports, adds each wired name the spec `discover`s (the runtime registers
it on the wire), and converts to the editor's port shape. A filter builder's `schema` / `backend` come from the runtime's own
`recordSchemaContext` + `recordFilterSchema` (no copy), the backend's fallback `nodegx` as `QueryUtils.backendType()` answers with
no store. Merged into `CloudDynamicPortsAdapter` (one writer per node): the spec's ports first, then any SB-017 family port of a
name the spec did not draw, then `keepWiredSavedPorts` — a SAVED port a wire uses survives the redraw. A fourth subclass,
`CloudSpecPortsAdapter`, takes the 20 types no family owns; a `metadataChanged` hook (`registeradapters.ts`, forwarding
`ProjectModel.metadataChanged`) re-sweeps when the backends or classes change, as the hooks redraw on
`metadataChanged.dbCollections`.

**Measured on an old project (AC §5, "must agree with the cached list").** lepetitpicnic_local_backend's 113 spec-drawn cloud
nodes, saved by the old cloud runtime, against today's draw: 50 identical; 63 GAIN settings today's hooks announce and the old
lists predate (Function and Query Records' Run On Value Change boxes, Search, Realtime); one Set User Properties loses two
unwired ports today's hook leaves out too (`prop-password`, `prop-emailVerified`). ONE wired port would have been lost — a Query
Records' Javascript-filter value, `storageFilterValue-ParentRecordId` (the spec leaves the Javascript filter out) — and a deploy
drops a wire to a missing port. Hence `keepWiredSavedPorts`; with it, 0 wired ports lost. Filed P107-S101-JSFILTERVALUES (low:
a NEW node's Javascript-filter variables are not drawn; they were not before R37 either).

**Graded in the editor** (`tests-unit/nsp-020/cloud-spec-ports.test.ts`, 17): for Aggregate (6 cases) and Query Records (3) and
Update Record (1), `specPortsForNode` equals the type's own hook fired against a fake connected editor over the same metadata,
port by port in the editor's shape (name, plug, type with enum labels, edit-only, connections-only, code editor, prefix, backend,
the builder's columns; display name, group, default). `index` / `editorName` are not compared (named). Plus: the cloud list is
the graded types both ways; the rule-drawn two have their rule; the four adapters' type lists are disjoint and cover the list;
a wired name survives a missing class; a saved wired port survives a redraw.

**Driven** (dev editor, a copy of lepetitpicnic_local_backend's test project, s100's recipe: `LocalProjectsModel` + the fiber
router; nodes by `NodeGraphNode.fromJSON` + `addRoot`; read with `getPorts()`). The three SAVED Aggregate nodes draw their
settings after the load sweep (Class, Filter, Do, each aggregate's Property and Operation, the Filter builder or the Javascript
filter, the `agg-` outputs), and `aggregates: 'AvgAge,Names,Extra'` on one draws `aggprop-Extra` at once (s100: nothing). A NEW
Aggregate in `/#__cloud__/Records and Objects/Aggregate` draws Class, Filter, Do; with `TestQuery`, `Total`, `Age` it draws
Property, Operation (`{min Min, max Max, sum Sum, avg Avg}`, edit-only), the Filter builder and `agg-Total`. A NEW Query Records
there draws the same 13 inputs as the same node in the front-end component `/Tests - Records` (the control: the viewer's hook),
name for name. The property panel, screenshot: GENERAL Class TestQuery, Filter "Visual"; AGGREGATES Total; FILTER the builder
("No filter"); TOTAL Property Age, Operation Avg — the panel the bug said was missing.

**Found on the way: an editor import can bring the runtime with it.** `cloudSpecPorts.ts` imports `record-ports.ts`, which
imported `resolveBackend.ts`, whose lazy `require('../../../noodl-runtime')` webpack follows statically: the editor's first
compile pulled the whole runtime in (223 TS1202/TS1203 errors on its CommonJS files) and the second ran out of heap. The
editor's own `tsc --noEmit` passed — its settings are not webpack's. `record-ports.ts` now imports the pure half
(`resolveBackend.pure.ts`, which `resolveBackend.ts` re-exports): same functions, and the editor compiles clean (0 errors).
