# EXP-008 — The export coverage ledger and its gate

**Status:** Built (2026-08-27, session 8) · **picker ratchet added 2026-08-28, session 32** ·
**per-parameter check added 2026-10-15, P18 session 110** (§ *The per-parameter check* at the end)
**Artifacts:** `packages/nodegx-export/coverage-ledger.json` · `scripts/export-ledger/check.js`
(`export-ledger:check`) · `scripts/export-ledger/picker-coverage.js` (`export-ledger:picker`) —
both in the PR workflow's `node-catalog` job · `packages/nodegx-export/parameter-ledger.json` +
`tests/parameter-coverage.test.ts` (in the export jest suite)

---

## 🔴 Read this first: the gate was not enough, and the audit below is not the metric

This task shipped a gate that forces every catalog node to be **classified**. It works, and it has
never let an unclassified node through. But `deferred` + a one-sentence exemption is a valid
classification, so the gate permits unlimited drift as long as each step is written down — and
that is exactly what happened. **101 of 175 types are `deferred`, and 96 of them carry the same
auto-generated sentence: *"pre-gate backlog — classified by the 2026-08-27 coverage audit"*.**
A gate whose escape hatch is used 96 times is recording drift, not preventing it.

Worse, the audit in §"The audit that sized it" below is a **corpus instance-coverage** number, and
sessions 20–31 used it to choose what to build. It is not fit for that (README §*What went
wrong*): it is weighted by ~40 old drive fixtures, 83% of its remaining complaints are one
unplaced third-party Noodl prefab, and it cannot see a node those projects never used.

**The metric is now picker coverage**, ratcheted:

```
npm run export-ledger:picker      # CI: fails on a fall, and on a rise that does not raise the floor
node scripts/export-ledger/picker-coverage.js
```

> **51 of 127 placeable nodes export (40.2%)** — 2026-08-28

`pickerCoverageFloor` in the ledger is the ratchet. The corpus audit stays as a **regression
detector** and is genuinely good at that; the historical numbers below are kept as a record of
what was measured when, not as a target.

## What this is

Every node type in the catalog carries a classification for code export, and CI refuses a
catalog that contains an unclassified type. The point is contributor-facing: the catalog is
already CI-enforced (`catalog:check` regenerates it from the live node registries), so **a new
frontend node cannot reach the editor's picker without either a deterministic translation in
`packages/nodegx-export` or an explicit exemption sentence in the ledger** — and the exemption
lands in the PR diff, in front of review. Silent export gaps are the one thing the gate forbids.

Statuses:

| status | meaning | requires |
|---|---|---|
| `translated` | `packages/nodegx-export` emits real code for it | `note` saying what it becomes |
| `stubbed` | emitted as a typed stub by design (the backend seam) | `exemption` |
| `deferred` | no translation yet | `exemption` — one sentence saying why shipping without one is acceptable |
| `backend-only` | catalog `availableIn` is exactly `['cloud']` | nothing; enforced both directions |

The check also fails on: a ledger entry naming no catalog type (renames/removals), duplicate
entries, a browser-capable node filed `backend-only`, and a `catalogFormatVersion` mismatch.
The gate was verified the way phase-67 taught (`build-the-caller`): known-good passes, and four
hand-made mutants — new unclassified browser node, deleted exemption, misfiled backend-only,
removed catalog node — each fail with the intended message.

## The audit that sized it (2026-08-27)

Method: run `parseProject` + `planProject` over the real project corpus (42 projects on this
machine, 29 distinct graphs after deduping drive-copies, 2,826 nodes) and tally dispositions
per node type. Script preserved in the session scratchpad (`coverage-audit.ts`).

**66% of nodes translated at the session-8 audit.** Range 43%–100%; Puppy test 3 83%, ecommerce
example 93%, the Cheer fixture 100%. Catalog-level then: 28 types translated, 1 stubbed
(DbCollection2), 15 backend-only, 131 deferred. Roughly half of all deferred *nodes* were
collateral — ordinary Text/Group/Button inside a component that failed to plan for one of the
reasons below.

**Re-measured 2026-08-27 (session 9), after the visual-generator wave
(EXP-002-VISUALS-TARGET-OUTPUT.md): 82% of nodes translate — 2,194 of 2,689 across 28 distinct
graphs.** Columns and Icon leave the gap list entirely (they were #1 with their collateral);
the icon/columns-heavy UIs that read 43% now read 64–65%, the ecommerce example 98%, Puppy
test 3 83%→83% (its gap is Component Outputs). Catalog-level now: 41 translated, 118 deferred.
The residual control deferrals are wire-fed state (`checked`/`value` over wires — 15 nodes),
which is the component-state slice's territory, not a visual gap.

The ranked gap list (deferred node counts from the corpus, direct + collateral where large):

1. ~~**Missing visual generators**~~ — **done, session 9**: `net.noodl.visual.columns`,
   `net.noodl.visual.icon`, `net.noodl.controls.range`, `net.noodl.controls.checkbox`,
   `Options`, `Radio Button` (+ Group), `Video`, `Circle` all translate;
   see EXP-002-VISUALS-TARGET-OUTPUT.md for what defers (wire-fed structure, masonry,
   inline icons, custom marks).
2. **Component Outputs** (69, plus ~60 deferred component instances downstream) — the other
   half of the component interface.
3. **Popups** — `NavigationShowPopup`/`ClosePopup` (64 + collateral). Needs a design decision
   on paper first (modal state), like Switch.
4. **The JS-code nodes** — `JavaScriptFunction` (68), `Javascript2` (11), `Expression` (10):
   EXP-003's territory (AI translation + trace harness), in phase scope.
5. **Individual logic slices** — `RouterNavigate` from logic-signal triggers (32),
   `net.noodl.ComponentObject` (28), `Model2` (27, the named next slice), `Logic Builder` (14
   — its program is structured JSON, generable headlessly (P73), so a *deterministic*
   translation is feasible; it should not wait for EXP-003), `Static Data` (14), `Counter`
   (7), `Switch` (5, designed-on-paper slice), Condition-on-change (6), the `String`/`Color`
   variable nodes (6).
6. **The backend seam — by design, not a gap**: DbCollection2 → typed stub already;
   record CRUD, `net.noodl.user.*` session nodes → same stub treatment when they get entries.

Projection: items 1–3 plus the already-planned slices put the corpus around **90–95% of nodes
fully translated**, the remainder being backend-seam stubs the EXP-004 report will present as
the designed boundary.

## Scope rulings this file records

- **Backend export is deployment, not codegen** (phase README "Out of Scope", reaffirmed
  2026-08-27): the self-hostable backend is the Node + SQLite (`node:sqlite`) service in
  `packages/nodegx-backend`, running cloud-function graphs on the bundled interpreter. The
  Parse backend is **retired**; backends are `nodegx` (inbuilt) or `external` (Directus-style
  HTTP APIs). The frontend export talks to either over the same seam nodes.
- **Cloud function components never enter the frontend export**: `parseProject` skips
  `components/__cloud__/` and the skip surfaces as one report note
  (`tests/cloud-components.test.ts`; before session 8 they were walked as browser components).
- **Kit/prefab nodes are outside the gate**: the ledger covers the core catalog. An unknown
  kit type defers at plan time with a visible note — that is the designed behaviour, not a
  gate failure.

## Contributor workflow ("I added a node, CI is red")

1. `npm run catalog:check` failed first? Regenerate: `npm run catalog:generate`.
2. `export-ledger:check` now names your type. Add one entry to
   `packages/nodegx-export/coverage-ledger.json`:
   - Best: write the translation in `packages/nodegx-export` (with tests), mark `translated`
     with a `note` saying what it becomes.
   - Acceptable with review: `deferred` + an honest `exemption` sentence. Reviewers should
     treat a new *visual or interaction* node arriving as `deferred` as a smell — the
     announcement this phase is building toward is only as true as this file.
3. Backend-only node (`availableIn: ['cloud']`)? Mark `backend-only` and you're done.
4. CI red in `tests/parameter-coverage.test.ts` after you added or changed a **port** on a translated
   node? §A prints the port by name. Add it to `parameter-ledger.json`'s `silent` as `unexamined`
   (honest) or better, and copy the reaching count §A measured into `parameterCoverageFloor`.

## The per-parameter check (P18 session 110, 2026-10-15)

> **1,215 of 1,396 parameters of the 129 translated picker nodes reach the export (87.0%).**
> 69 change nothing, and each is adjudicated: **21 are real silent drops** (10 bug rows), 21 reach in a
> context the probe does not build, 23 matter only where the export refuses out loud, 2 are inert,
> 2 unexamined. 112 have a type the probe cannot vary (component, array, object, image, font…).

**Why.** The picker number counts nodes: 130 of 130. A node can translate while a parameter vanishes
— §67–§70 of EXP-011 were four sessions of exactly that behind a `translated` row, and §75.5 #3 said
not to quote 100% without this. It was the open question of this file.

**The instrument** (`tests/helpers/parameter-probe.ts`). For every translated picker type, every
non-signal input is set to a value other than the one it holds and `emitApp` re-run; if neither the
emitted files nor the notes move, it is retried with each boolean / enum sibling flipped, then with
every boolean of its panel group on (a shadow token waits for Shadow Enabled AND Source = token).
Contexts: the node placed alone on `cheer`'s Home (inside a Radio Button Group for a Radio Button,
with a child for a Drag); the same with every output and signal wired; then every placed instance in
the 57 fixtures. **A refusal sentence counts as reaching** — what the gate forbids is silence.

🔴 **Three traps in the instrument, found by reading its silences against the runtime** (each would
have filed a false defect): `indexPageStacks` caches per IR object, so re-emitting a mutated IR read
a stale index (Page Stack's Name and Use Routes) — the probe now emits a fresh shallow copy each time;
a Drag with no child is never drawn; a Router added after parsing never enters `ir.project.routers`
(the corpus grades Routers instead). And a silence is a measurement, not a verdict:
`treatUnchangedAs` is silent because the only graph where it matters is refused by name.

**The gate** (`tests/parameter-coverage.test.ts`, 9 specs, ~40 s). §A: the silent set and the
unprobed set are exactly `parameter-ledger.json`'s, by name in both directions; the reaching count is
`parameterCoverageFloor` and the total `parameterCoverageTotal`, exactly (a rise must raise the floor
in the same commit, like the picker). §B: every class is one of five and every `gap` names a bug row
that exists. §C: a mutant emitter that drops one parameter turns Text's Font Size silent and nothing
else (the control); a gated port names its sibling; Page Stack's Name reaches past the cache.

**The gaps** (`parameter-ledger.json` `"class": "gap"`): P18-S110-ROUTERSELF (a Router's own
background, clip, class, style, Mounted and URL Path — six ports), -RUNONCHANGE (Run On Value Change
boxes on Object, Record, Array Filter and Variable that their twins honour — seven), -NEWTAB
(Navigate's Open In New Tab), -EVALATLOAD, -DYNAMICTEMPLATE (For Each), -ONLYIFUNCHANGED (Set Record
Properties), -UPSERTON (Create Record), -TASKERROR (Run Tasks), -NOWRAP (Text), -PLACEHOLDEROPACITY
(Dropdown). Found beside them: -STORENOTES (a store plan's notes never reach the report),
-BREAKPOINTS (Columns), -VALUECHANGED (a wrong refusal sentence).

**What 100% would now mean.** The node number can be quoted as "every placeable node exports"; the
parameter number cannot be quoted as complete until the 21 gaps close or are refused by name. The 112
unprobed ports are the next measurement (a probe value per structured type).

### Session 111 (2026-10-15): the first ten closed, cheapest first — **1,225 of 1,396 (87.8%)**

Ten ports left `silent`, and the floor rose by exactly ten. Five rows, each closed by the smallest honest change:

| row | ports | how |
|---|---|---|
| P18-S110-RUNONCHANGE | Object Id + Object properties; Record Id; Array Filter Items + Array changes; Variable changes (6) | **Refused by name** where the box is unticked, each twin's rule: `objectNodeGate`; the Record Id effect (Fetch unwired only — with Fetch wired the export already reads only on Fetch, as the runtime does); `filterReadOf`; both Variable read sites (`VARIABLE_FROZEN`) |
| P18-S110-NEWTAB | Navigate Open In New Tab | **Carried.** The `navigate` action gains `newTab`; the emitter prints the runtime's own bare `window.open(url, '_blank')` on the page's BrowserRouter path, and a file with no in-place navigate stops importing `useNavigate`. A wired box is refused by name |
| P18-S110-UPSERTON | Create Record Upsert On | **Refused by name** (the setter's own emptiness: trimmed). Carrying it is an `X-NodeGX-Upsert` header on `create` in the exported client, which changes every connected fixture's `client.ts` and needs the backend's upsert answer measured first |
| P18-S110-ONLYIFUNCHANGED | Set Record Properties Only If Unchanged | **Refused by name** (split on commas, then trimmed). The precondition is what the record held when read, and the export holds no read copy of a record to take it from |
| P18-S110-STORENOTES | Global Store storageKey (+ the channel itself) | **Routed.** `StorePlan.notes` became `StoreNote { componentPath, nodeId, text }` and `emitApp` puts each one in the app notes and the report's project section. Not through component notes, because a declarer in a component with no file has none to carry them |

**Split out:** `DbModel2.runOnChange-record` stays a gap under a new row, **P18-S111-RECORDLIVE**. Unticking the box is
what the export already does, so the probe's variation could never move it. The gap is on the *ticked* side, the
default: the runtime's Record re-reads when anything in the app writes its record, and the exported row is component
state that only its own fetch writes. That is a shared record cache in the exported client, not a refusal.

**Graded:** `tests/silent-parameters-closed.test.ts` (14), each case being the sentence with the parameter varied, beside its
absence on the same fixture unvaried. Plus the setters' empty values (spaces, bare commas) refusing nothing, and
Navigate's emitted line. Mutant control: weaken the Variable refusal and the new-tab emission, and exactly those two
cases go red (12 / 14). `parameter-coverage` at HEAD's catalog: silent 59, floor 1,225.

**Two more, same session (no change to the floor, by construction).** P18-S110-DYNAMICTEMPLATE: a For Each with
Template Type dynamic (or wired) is refused by name in `roleOf`. P18-S110-TASKERROR: a Run Tasks whose template
declares the node's error output gets a per-node note that the value is dropped. Neither moves the reaching count. The
probe varies Template Script *under* dynamic, where both sides now refuse identically, and no fixture's template
declares an error output. So the two ports are reclassified, **`gap` → `refused-with`** and **`gap` → `gated`**, with
the spec (`tests/silent-parameters-closed.test.ts`, renamed from `the-silent-ten`, now 18 cases) building the
context the probe does not. **10 gap ports remain:** P18-S110-ROUTERSELF (6), -EVALATLOAD, -NOWRAP, -PLACEHOLDEROPACITY,
P18-S111-RECORDLIVE. The last two Text/Dropdown rows were found **wider on the default side**: an exported Text has
no `white-space` in any arm, and a placeholder's default opacity is 0.5. Both are written into their rows, and neither is a cheap close.

### Session 112 (2026-10-15): Evaluate At Load, carried — **1,226 of 1,396**

P18-S110-EVALATLOAD closed by **carrying** the box rather than refusing it. The rule is GAM-001's
(`expression.ts` `_scheduleEvaluateExpression`): the box matters only when no referenced input has arrived by the
load's evaluation. A literal on any input is set at load, so it always arrives, and the box is inert there. The
export's own model: an input has arrived once its wire-fed value is not `undefined`, because the runtime never
delivers `undefined` over a wire. `JsFunctionPlan.loadGate` records which inputs are wire-fed and the box, and the
wrapper prints:

- **unticked** (`wait`): `if (<every wire-fed input> === undefined) return null;`: nothing until an input arrives;
- **ticked** (`evaluate`, the default): the load evaluation keeps `null` for a throw or a NaN where an arrival's
  answers `0` and `NaN`. This is a gap on the **default side** that the probe could not see: an exported
  `months + drift` with `months` unset rendered "NaN" where the editor renders nothing.

**The refusal the row's side note named is gone.** "None of its inputs is ever delivered — the expression never
evaluates" was the rule from before GAM-001. Ticked, an Expression nothing feeds is now translated as the load
evaluation over its unset inputs; unticked, it is still refused, with the box named in the sentence.

**Graded:** `tests/the-evaluate-at-load.test.ts` (117). §A runs the runtime's own Expression node in a
`NodeContext` against the emitted wrapper (transpiled and called): 7 bodies × the box × 8 arrivals (nothing, then
`'Ada'`, `''`, `0`, `false`, `true`, `null` and an object), 112 rows with 0 differences, plus a reach control
(the box moves `name !== false` from `true` to `null` on both sides). §A2: a literal makes the box inert on both
sides. §B: the mutants. Removing the unticked guard turns exactly the 7 unticked/nothing rows red; removing the load
evaluation's null turns exactly the 3 ticked NaN/throw/nothing rows red. HLS-001: 2 paths moved (budget-desk's
Gauge, cheer's Home), golden regenerated, diff 2 out / 2 in. `jsfun` gained three cases and re-pinned two. `stores-events`' hand-written cheer Home target and HLS-004 AC4 were re-pinned to the guard.
**9 gap ports remain:** P18-S110-ROUTERSELF (6), -NOWRAP, -PLACEHOLDEROPACITY, P18-S111-RECORDLIVE.

**Not modelled, recorded:** before anything arrives, Result is `null` on both sides, but the export's `isTrue` /
`asNumber` folds still compute from it where the runtime's getters abstain (`plan.ts`'s jsfun-out comment). Once an
input arrives and its source goes back to `undefined`, the runtime holds the last value and the export reads
`undefined` again. That is the general wire-hold gap, not this box's.
