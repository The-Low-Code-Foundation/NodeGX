# NSP-021 — The second editor

**Opened 2026-09-30 (s1), from Richard's ruling that the editor is a target (README §1, R6).**
**Depends on NSP-018, NSP-020.** The phase's last thesis test, beside NSP-006.
**Status: 🟡 s87 — AC1 written (the census's §5 "source after"); §3.2 begun: Navigate and Cloud Function draw their ports
from the spec, graded by their editor adapters (oracle (c)).**
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
