# NSP-021 — The second editor

**Opened 2026-09-30 (s1), from Richard's ruling that the editor is a target (README §1, R6).**
**Depends on NSP-018, NSP-020.** The phase's last thesis test, beside NSP-006.
**Status: 🟡 s88 — AC1 written (the census's §5 "source after"); §3.2: Navigate and Cloud Function draw their ports
from the spec, graded by their editor adapters (oracle (c), s87); `typecasts` has one table and one rule (s88, R21 + R22).**
**Shared with phase 112 (2026-10-02):** OWN-000 builds §3.1's census here, in this folder, and OWN-006 runs §3.3's
round trip as two adapters in its editor suite. Build each once; both phases cite it.

## 1. The person sentence

> **Everything the Electron editor knows about a node, a second editor learns from the same files,
> and a graph authored in either opens in the other with no difference a person can see.**

## 2. The second editor already exists

`packages/noodl-mcp` is an editor with no screen: it creates components, sets parameters, connects
ports, validates, registers pages and renders reports — over a wire, for an agent. It is the cheapest
possible proof that the editor is exchangeable, because it is already exchanged. What it is **not**
yet is independent: today it learns node types from the catalog that is generated from the runtime,
and per-instance ports from a viewer or from editor-side adapters.

## 3. What to build

1. **Census the editor's knowledge.** Every question the Electron editor asks about a node type or
   instance — ports, defaults, groups, descriptions, enum labels, dynamic ports, connection validity
   (the catalog's `typecasts`), inspect text, visual-ness, allowed children — and where the answer
   comes from today (runtime registration, viewer message, editor adapter, catalog). A table, in this
   folder, generated where it can be.
2. **One answer per question, from the spec.** For each row: the spec field or function that answers
   it (NSP-018 for descriptions and the catalog, NSP-020 for ports, this task for the rest —
   `typecasts`, `allowAsChild`, `inspect`). Editor-adapter code that encodes node knowledge moves into
   the spec or is recorded as *editor-only with a reason*.
3. **The round trip.** A project authored through the MCP server from spec-derived information only,
   opened in the Electron editor: no diagnostics, no port differences, no "unknown port" warnings; and
   the reverse — a project authored in the editor, read back through the MCP server, describes every
   node identically. Graded by a drive, like NSP-006.

## 4. Acceptance criteria

1. The knowledge census exists; every row names its source today and its source after.
2. For the specced nodes, no row's answer comes from the runtime's registration code or a viewer
   message — a gate reads the census.
3. The round trip passes on the templates (rank by the product surface) with a diff of zero ports.
4. README §1's third sentence is graded by this task and NSP-006 together, and the R4-style question
   is asked with the numbers: *what would a replacement editor still need from this repo?* The answer
   should be a list of files in `nodegx-node-spec` and `nodegx-project-contract`, and nothing else.

## 5. Watch for

- Memory: *two `.mcp.json` writers* (P66) and *a new node type owes `noodl-mcp` too* — the MCP
  server has its own gates (`toolDisclosure` budget: 8 tokens free). Anything that grows a tool
  description pays there.
- The project file format is `@nodegx/project-contract`'s; do not grow a second one here.

## 6. Built

### 6.1 s87 (2026-10-11, Opus) — AC1's table, and the two adapters the agent server still leaned on

**AC1.** [The census §5](NSP-021-EDITOR-KNOWLEDGE-CENSUS.md) gives every §2 row its source after: the spec field that
answers it for a specced node, what the MCP server reads now, and what is left — owed to the spec, or editor-only with
the reason (the picker list, category, colour, tooltip, the widget table, kit provenance: presentation or packaging, not
behaviour). NSP-021's own three fields are still owed: `allowAsChild` (with visual-ness), `typecasts` (where the MCP's
`isTypeCompatible` already differs from the editor's table) and display name / deprecation at node level.

**§3.2, the first rows moved — measured first** over 128 of Richard's projects + the templates:

| adapter knowledge | nodes | wires to its minted ports | s87 |
|---|---|---|---|
| Navigate (`RouterNavigateAdapter`) | 468 in 44 projects | 74 `pm-*` | ✅ `ab494b0c2` |
| Cloud Function (`CloudFunctionAdapter`) | 153 in 24 | 266 `in-*`, 27 `out-*` | ✅ `a8faa0995` |
| conditional ports (catalog conditions) | 17,772 of 41 types | — | not moved: oracle (b) proves the spec's `when` and the catalog agree, so no output changes |

- **Navigate** — `derived.inputs` from `routers` + `components` as the adapter draws them (Router picker at two or more
  Routers, Target over the chosen Router's pages, `pm-` per name in the target page's Page Inputs, typed `string`). At
  play the context has no Routers: nothing drawn, no trace moved.
- **Cloud Function** — the Function picker and `in-*` from the called function's Request nodes, `out-*` (`onWire`) from
  its Response nodes. Its `RESULT_FIELDS` padding went the L1 way: `discoverOutput` + `world.hasOutput`, the nine
  scenarios whose HEAD traces show a result naming it in `wiredOutputs` — 19 / 19 traces byte-identical by name.
- **Oracle (c)** — `noodl-editor/tests-unit/nsp-020/adapter-ports.test.ts`: the REAL adapters over a fake project model
  made from each saved project, against `drawnPorts` with `portContextFor`'s context. 7 synthetic projects; Richard's 201
  (`NSP_PORT_PROJECTS`): **621 nodes, 228 with parameter ports, 0 different**; 14 pinned (a Navigate in a project with no
  Router: the adapter draws an empty Target picker). Five planted breaks, each red. `ADAPTER_GRADED_TYPES` is held to the
  test's adapters both ways; the runtime parity test holds the rest of `DRAWN_PORT_TYPES` to oracle (a).
- **What a person sees:** `get_component` draws both types' ports from the project instead of the last list an editor
  saved. The wire check refuses nothing new (no wire in Richard's projects reaches a Navigate port outside the catalog,
  `pm-`, `target`, `router`; a Cloud Function's other names were already refused by ISL-042's rule); an undeclared `pm-` /
  `in-` / `out-` is still DEF-002's refusal (`derivedPortTargets.ts`, the adapters' reader).
- Ledger: ports 130 → 132 of 147.

**Gates (s87):** oracle (c) 10 / 10 (committed corpus and Richard's); runtime `nsp-020-ports-parity` 325 / 325 (its
DRAWN check planted red with the adapter list emptied); node-spec `ports` + `spec-ledger` 76 / 76; interpreter batch with
mutants at seeds 13 and 20728 (Navigate, Cloud Function); runtime conformance at seed 20737 (Navigate, Page Inputs, Cloud
Function: 200 / 200, 0 divergences); both graph suites (128, 96); `spec-golden:check`, `spec-ledger:check` 0; MCP
`nsp020DrawnPorts` + `nsp020WireCheck` + `isl042CloudFunctionPorts` + `def011ScriptPortsDrive` + `toolDisclosure`
(surface 8,279 / 8,280, unchanged); `tsc` node-spec 0, `typecheck:editor-tests` 0. MCP `tsc`: 3 errors, all in
`tests/tpl010Template.test.ts`, a peer's uncommitted edit. **Not run:** the whole MCP suite, `test:main`, `test:ci`.

**R20 — ruled and built in the same session (`2a05e8833`).** Asked in plain words (Add to Basket's dead wire; 99 such
wires over 117 projects, all dead, 0 false): **"Error, as the agent does."** The R19 callback moved into the editor's
`validation/drawnPortLookup.ts` as one body for both doors: the agent server's `drawnPortCheck` delegates to it, and the
Problems panel (`ProjectValidationService`) passes it over its live model (`portProjectFromLegacy` — `toJSON()`'s nested
trees made flat). `tests-unit/nsp-020/problems-panel-wire-check` goes through the service itself (a cut-down CMG shop:
`addToBasket` refused, `itemOutputSignal-addToBasket` named; planted: the service without the callback → red). **Not
driven in the running editor**: a peer's editor held port 9222 at the time.

**Left (s88 on):** the R20 drive (a copy of CMG Drive Looks B opened in the editor; the Problems panel shows the Add to
Basket wire as an error); Router's catalog labels (P107-S79-ADAPTERLABEL: its only dynamic ports are data attributes its spec
already draws; the "runtime-discovered" label comes from a source-text heuristic, `build-catalog.js` :68-76); the
validator's `derivedPortTargets` reading the spec's draw instead of the adapters' reader (the refusal of an undeclared
prefixed name); then NSP-021's own fields (`typecasts` first: the MCP and the editor disagree today); §3.3's round trip
is P112 OWN-006's.

### 6.2 s88 (2026-10-11, Opus) — `typecasts`: one table, one rule, measured before designed

**Measured first** ([[count-the-reach-first]]), over Richard's 201 projects and the committed corpus: 42,466 wires;
31,026 typed at both ends (by the spec's drawn ports, else the catalog's, else the node's saved `ports` /
`dynamicports`); 11,140 touch a component instance (not typed by the rule); 300 untyped. Two predicates over each:
the **canvas** (the table, plus `ConnectionBar.tsx` :251-255: a signal output reaches only a signal or `*` input) and the
**validator** (`CatalogIndex.isTypeCompatible`: the table, but a signal on either end is fine).

- **They differ on 0 wires.** Every signal-to-value wire in the corpus goes through a `*` port (171), which both allow.
  Control beside it: a planted pair (`string → signal`) does differ, and both predicates refuse wires (next line).
- **They refuse the same 34**, and 30 are one defect: a list wired into a Dropdown's Items (site builder
  `/Pages/PageEditor` ×19, `/Form Fields/Labelled Select` ×11). Items became an `optionslist` on 2026-09-05
  (`0ce92adc7`) and the table was not told — the canvas has refused the wire since, and the Problems panel and the agent
  server warn on every one. Filed **P107-S88-OPTIONSCAST**. The other 4 are component ports saved with a type that is not
  a type (`image URL`, `text`) or a `string` component input into a `font` port (nightbook).

**Ruled (README §7):** R21 "Allow it, and fix bare labels"; R22 "The canvas's rule".

**Built (`813657773`).** The table and the rule live in **`@nodegx/project-contract/typecasts`**, not in the spec package:
the runtime already depends on project-contract (and not on the spec), so it now IMPORTS the table — one table, not a
graded copy. `TYPECASTS` (with `array → optionslist`, R21), `canCastPortType` (the table: what the editor asks when it
types a component port from its wires, `findCompatiblePortType`) and `canConnectPortTypes` (the table plus the
signal-output rule: what a person may draw). The canvas (`NodeLibrary.canCastPortTypes`, keeping "two untyped ports
connect"), the Ports tab (`portTypes.ts`, its "byte-equivalent twin" gone) and the validator (R22) call them. The
catalog regenerated from the runtime moved by exactly that one row. `ConnectionBar`'s own signal check stays: it is what
labels the refusal `signal-rule` for the popup's sentence. `cloud-node-library.json` keeps its snapshot table (the cloud
runtime has no Dropdown). `tests-unit/nsp-021/typecasts`: the catalog's table is project-contract's row for row; the
validator, the Ports tab and the shared rule answer every pair alike (planted: the old signal leniency → red).

**R21's second half (Dropdown v8).** A wired list of bare words reached the runtime unchanged, and `Select` reads `Label`
and `Value` off each item — `["Small", "Large"]` drew two empty, nameless options. `options.ts` `optionItems` now makes a
word an option labelled and valued by it (a list of `{ Label, Value }` rows still keeps its identity, its Value and its
Disabled); the spec is v8 (`fecab7823`; `changes`: migration none) with two scenarios (a list of words; a list mixing a row, a word,
a number and an empty item). Stranger round 4's plain-DOM engine gets the same rule, marked not the stranger's line.
**Trap found while planting:** a plant guarded by `Date.now() > 0` never fires on the runtime target — the play's
clock is the world's and reads 0 — so the first plant "stayed green" for the wrong reason; planted with a guard that
reads no clock, the runtime fails exactly the two new scenarios.

**Left (s89 on):** the R20 drive and this one in the running editor (a Static Data's Items onto a Dropdown connects;
s88's editor port was held by a peer again); `allowAsChild` / visual-ness (census §2: the catalog mirrors the rule by
hand three times); display name / deprecation at node level; Router's labels only if a reason appears.

### 6.3 s89 (2026-10-12, Opus) — the R20 and R21 drives, then `allowAsChild` measured, ruled (R23) and built

**The drives (one editor launch, a copy of CMG Drive Looks B; the source's checksum unchanged after).**
- **R20 ✅** — `ProjectValidationService.instance.report` (the service starts when the Problems panel mounts): the For Each
  `addToBasket` wire is an `error`, "For Each has no output named "addToBasket" … — did you mean
  "itemOutputSignal-addToBasket"?"; the panel shows it (`shots/s89-r20-problems-panel.png`).
- **R21 ✅** — a real press-move-release drag from a Static Data's output onto a Dropdown on `/Pages/Home` opened the
  connection popup; with Items picked on the source, the Dropdown's `Items` row is offered (`enabled`, not among the
  refused), and choosing it made `s89-static.items → s89-dropdown.items`; neither the canvas (`WarningsModel`) nor the
  Problems panel has a type warning on it (summary unchanged, 4 errors · 58 warnings). Control beside the zero: a
  `failure` (signal) → `items` wire on the same pair fired `con-type-mismatch` and `type-incompatible-connection` +
  `signal-into-value-port`, and was removed. `shots/s89-r21-connection-popup-offers-items.png`,
  `shots/s89-r21-static-data-into-dropdown-items.png`. (The Dropdown was a root for the drive — inside the page lane it
  sat under the Show Popup column — so its one other warning is "detached from the main node tree", from the set-up.)

**`allowAsChild` / visual-ness, measured first.** A census bundled with the catalog's own extractor (the REAL
`generateNodeLibrary` beside the committed catalog), over Richard's 123 projects (everything under `vscode_projects`
plus the launcher's recent list, de-duplicated) and the 85 committed (export fixtures, templates, lessons, P109's):
- **Types: 0 differences** between the runtime export and the catalog on category, `allowAsChild`,
  `allowChildrenWithCategory`, `allowAsExportRoot`, `singleton` and `isVisual` for every type both carry (163; the 17
  catalog-only ones are cloud nodes). The one gap: `Component Children`'s `haveComponentChildren`, which the export seeds
  and the catalog's hand mirror never had.
- **Visual roots: 0 components** where the editor's derivation and the agent's (`visualRoots.ts`) differ. One saved
  `visualRoots` disagrees with the editor's derivation (`phase58-awp006-deepseek /Components/Hero`, the saved list lacks
  `hero-shell-wrap`); the editor re-derives on save and the agent believes the file (AWP-001's design) — noted, not filed.
- **The hierarchy rules: the agent asked none of them.** The editor's four (`node-not-child`, `node-invalid-child`,
  `node-no-children`, `node-child-cat`) fire on **60 nodes** in 34,361: nightbook 52 (its eight `/Data/*` components
  inside Groups and the Page — P107-S89-NIGHTBOOK), phase55-s6-haiku 6 (three For Each holding cards / a link column),
  slot-desk 2 (a fixture built for it). Read in the running editor (`WarningsModel`, a second launch, copies): nightbook
  26 + 26, haiku 3 + 3, and the control SBR-006 Admin Drive (`/Admin/Shell` holding a Group through its
  `Component Children` slot) 0 — the census's control project fired as planted on both sides first. A rule on the catalog
  as it was would match all 60 and add 70 wrong ones (every `Component Children` component read as holding nothing).

**Ruled: R23 "Yes, as errors"** (README §7). **Built:**
- `@nodegx/project-contract/hierarchy` — the four predicates (`cannotBeAChild`, `cannotHoldChild`, `cannotHaveChildren`,
  `rootCategoryDisagrees`), a component instance's type (`componentHierarchyType`, `componentChildCategories`) and
  `hierarchyFindings` over one component. The editor's `NodeGraphNode.evaluateHealth` and `ComponentModel`'s `category`
  / `allowAsChild` / `collectAllowedChildCategories` call it (behaviour unchanged).
- The validator's **`invalid-hierarchy`** (`rules/invalidHierarchy.ts`, error, after `detachedPageContent`): one diagnostic
  per node (where the editor raises "not a child" and "not held" on one node, the first only), types from the catalog
  and, for an instance, from its component's graph. Existing errors do not block an agent write (`validate.ts`
  `newErrors`), so nightbook's 26 are reported, not blocking.
- **The catalog's mirror is gone**: `build-catalog.js` takes `singleton`, `allowAsChild`, `allowChildrenWithCategory`,
  `haveComponentChildren` and `allowAsExportRoot` from the export (browser, then cloud; `extractor-entry.js`). The
  catalog moved by exactly `Component Children`'s new field; `node-catalog.d.ts` declares it. The kit overlay's own copy
  (`nodegx-kit-catalog/src/index.js` :438-443) is the one mirror left.
- **Found on the way: R21 had never reached the agent server** (P107-S89-ENRICHEDSTALE). The MCP validates against
  `node-catalog-enriched.json`; s88 regenerated only `node-catalog.json`, because `catalog:merge` refuses a typecast with
  no `castSemantics` entry. Written (`compatibility.json`, from `optionItems`), merged, and held by a test.
- **Two published examples taught rows inside a For Each** (`bubble-read-a-feed-into-a-list`, `bubble-read-an-xml-response`):
  each now names a template (`/Post Row` with Title / Published through Component Inputs; `/Tool Row`, unchanged —
  its list is fed by nothing, P107-S89-XMLEXAMPLE). `catalog:examples` 107 / 109: the two left are Cloud Function
  examples, red before s89 (measured with the rule off; P107-S89-CFEXAMPLES).

**Left (s90 on):** the kit overlay's copy of the child rules; display name / deprecation at node level; Router's labels
only if a reason appears. nightbook's fix is the template owner's (P78), and moves the pinned 26 in
`tests-unit/nsp-021/hierarchy`.

### 6.4 s90 (2026-10-12, Opus) — the kit overlay's mirror retired; display name and deprecation measured, ruled (R24, R25) and built

**The kit overlay's child rules, measured first.** The overlay's input is the runtime's own `generateNodeLibrary`
payload, so its "mirror" was a second application of the export's derivation (`isVisual || allowAsChild`, a Visual
`allowAsExportRoot`). Every project with a `noodl_modules` folder under `vscode_projects` plus the committed kit fixtures
(204 folders, 203 extracted with the agent server's real `kit-extract.cjs`, 358 kit entries, 65 distinct types): the
overlay's `allowAsChild`, `allowChildrenWithCategory`, `allowAsExportRoot`, `singleton` differed from the payload's
**0** times. Control: a Visual entry the export could not produce (no `allowAsChild`) differed on two fields. The overlay
now copies the four fields (`429404268`). It cannot import `@nodegx/project-contract`: it is a plain-JS package with no
build step, and the rule needs nothing derived, only the fields. A test pins the copy (planted: old derivation → red).

**Display name and deprecation, measured.** Types first: over the 180 exported types, the export's
`displayNodeName || name` and `deprecated` against the catalog's `displayName` and `isDeprecated`: **0 and 0**
different. A `displayName` on the spec's `NodeDecl` would change nothing a person sees. Nodes next, over 357 projects
(258 of Richard's, 122,451 nodes; a synthetic control project beside them, which fired): the card's title (the editor's
`label || labelForNode`) against the agent's name for the same node (`describe.ts` `endpoint`):
- **17,130 nodes in 169 projects** whose card is titled by a port (`usePortAsLabel`, 45 types: Text 5,404, Expression
  3,350, Variable2 1,467, the Button control 1,014, …), where the agent read the type. The value is among the agent's
  `parameters` for all but about 100 of them, but never as the node's name. **R24 "Card title + type"**.
- **97 nodes with `label: ""`**: the canvas shows the type, and the agent's endpoint was an empty name (`??` kept `""`).
  P107-S90-EMPTYLABEL, fixed (`97617baab`).
- **52 nodes of deprecated types** (REST2 34, Button 7, the user-email four 6, Variable 2, Radio Button 2, Range 1). The
  editor refuses to create one; no check in the agent's validator read `isDeprecated` (by grep). **R25 "Warn on any"**.

**Built.** R24: `@nodegx/project-contract/node-title` `portTitle(parameters, type)`, called by the editor's
`BasicNodeType.labelForNode` (its electron spec's 11 cases pass under jest against it) and by `describe.ts`, whose data flow
now reads `Variable "screenWidth" [v].value` and whose tree / logic rows carry `title`. The catalog (from the export),
the enriched catalog and the kit overlay carry `usePortAsLabel` / `portLabelTruncationMode`. R25: `replacedBy` on the
node definition (`@noodl/types` options and metadata, the register, `createNodeFromReactComponent`, the export), set on
the 16 deprecated types with a clear successor (the 10 that share a display name with a current type, plus DbModel →
Record, DbCollection → Query Records, Options → Dropdown, Range → Slider, Label → Text, and REST2 → HTTP Request, which
NDA-011 names). `catalog:generate` throws if a successor is missing or itself deprecated. The validator's
`deprecated-node` warns with a `suggestion`, and `get_node_type` / `list_node_types` show `replacedBy`. The 14 left with
none: Animation, Field Set, Form, Globals, Gyroscope, Number Blend, Script Downloader, Signal To Index, String Selector,
Transition, and the four user-email nodes ("Use cloud functions", no single node).

**What the new rule found at once.** Two published examples taught retired nodes: `data-websocket-agent-chat` (old Text
Input and Button, now the current controls; the same `onTextChanged` / `onClick` wiring) and `code-rest-list`, which
*is* REST2's documentation (its enrichment's only example). The examples gate now lets an example carry
`deprecated-node` only for the node whose enrichment lists it, and its description now opens by saying REST is retired.

### 6.5 s93 (2026-10-12, Opus) — R24 and R25 seen where a person and the agent see them; the next §3.2 rows measured

**R24 and R25, driven.** The agent: `explain_component` (the data flow) over stdio on a copy of Rocket School with one
Variable's label removed reads `Variable "hangarTab" [hsTab].value` and the row carries `"title": "hangarTab"`; the labelled
Expression beside it still reads `face [hsFirstTab].result` (the control). `get_component` is the raw graph and never named
a node, so the handoff's "call `get_component`" was the wrong tool. The handoff's project, Erleah-2-react19, is a legacy
`project.json`, which the agent server refuses (exit 2, "Migrate it to the v2 format"). `validate_project` on a copy of
fld-012 warns `deprecated-node` 3 times, once per retired node on `/Pages/Deprecated`, and 0 on the two pages built from
their successors. The editor (one launch, `dev:debug`, a renamed copy of Erleah-2-react19, the source's SHA unchanged):
**over 7,326 nodes the card title under R24's `portTitle` equals the pre-R24 rule run in the page on every node** (2,324
titled by a port); a control that drops the truncation differs on 35, so the zero can see. The unlabelled `screenWidth`
Variables read "screenWidth". The Problems panel lists 8 `deprecated-node` rows, every one naming HTTP Request, equal to
the file's 8 REST2. Each row also ended "— did you mean “net.noodl.HTTP”?": **P107-S93-DIDYOUMEAN**, fixed (`e1f847269`):
2,457 of 2,677 suggested rows on that project repeated a name their sentence had given. The 220 left (an instruction, not
a name, in "did you mean") are **P107-S93-NOTANAME** (open, owes words).

**`deprecated-node` over the projects.** 370 project directories today (the s89 recipe; 357 on s90). The rule, run by
`npm run validate:project -- <370> --only deprecated-node --json`: **55 warnings in 21 projects**, equal project by project
and type by type to a file scan of both formats. s90's 52 was the export's flag over 357; the 3 more are not attributed (no
s90 per-project list was kept).

**Units and enum labels** (census §5). The catalog copies a port's `type` from the runtime export (`sanitize`), so they
should agree by construction; measured, not assumed: the runtime export (`generateNodeLibrary` over both runtimes, a
scratch bundle by the s89 recipe) against `noodl-mcp/dist/node-catalog.json`, 180 types, 1,481 typed ports: **units and
default unit differ on 0 of 596; enums, values and labels, differ on 0 of 365**; no port's enums are computed by a function.
A planted label and a planted unit are both caught (2 of 2). What stays owed is the spec format's: it has neither, which
matters only to an editor that reads ports from the spec (P112).

**Singleton** (census §5): measured, ruled (R34, "Warn on the second one, in both") and built. The bug's proposed fix would
have put an error on 1,477 single Pages and cloud Requests (`hasNodesWithType` counts the node asking); 0 components over
370 projects hold two. Built: `@nodegx/project-contract/singleton` (`extraSingletons`: every node after the first of its
singleton type, in tree order); the editor's `node-singleton` reads the runtime's `singleton` through it, at `warning`;
the checker's new `duplicate-singleton` warns on the same nodes. Graded: the contract test and
`tests-unit/nsp-021/duplicateSingleton.test.ts` (4 and 4), red under `hasNodesWithType`'s meaning (3 and 2). Driven in the
editor on a copy of fld-012: 0 `node-singleton` with one Page per page; a second Page added to `/Pages/Controls` carries
it and the first does not; removed, 0. The agent server gets the rule when `packages/noodl-mcp` is next built (`dist/` not
rebuilt this session: it would bundle peers' open edits).
