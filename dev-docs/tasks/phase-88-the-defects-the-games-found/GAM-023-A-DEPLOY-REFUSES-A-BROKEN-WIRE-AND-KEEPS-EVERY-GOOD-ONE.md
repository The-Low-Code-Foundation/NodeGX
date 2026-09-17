# GAM-023 — A deploy publishes every wire and names the broken ones

*(Filename kept for links. Titled "refuses a broken wire" until R20 ruled (c).)*

**Status: 🟢 built s18, committed `624b054f2` (s19). ✅ R20 ruled 2026-09-16 (s17): publish all, warn. ✅ s19 ruling: an enum is a string, built.** **Source:** [P78 D48](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md), with the [D44 correction](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by TPL-005's deploy control, 2026-09-11 · **Side:** product (`nodegx deploy`, `noodl-preview`)

The shipped `nodegx deploy` never ran its connection filter. ⚠️ **Corrected s18:** its validation gate already refused a
wire into a port a built-in's *declaration* lacks, and a wire to a missing node. What shipped silently, with `ok: true`, was
every wire into a port that only exists once something runs (a component's inputs and outputs, `Set Variable`, `Function`,
a `For Each` item port, a kit port): 6 of 10 sabotage kinds (§8 s18).

## 1. The person sentence

**`nodegx deploy` publishes every wire, and names each one that cannot work, so a person can find it.** A working wire is
never named, and a wire it could not check (a kit node the deploy does not load) is counted as unchecked, not called broken.

*(Before R20: "publishes every wire that works and refuses to publish one that cannot".)*

## 2. What was measured

Re-read at HEAD `eb12ebe99` on 2026-09-14 unless marked otherwise.

| reading | where |
|---|---|
| `exportComponent` calls `comp.graph.flushEvaluateHealth()` before it filters on `getConnectionHealth` | `noodl-editor/src/editor/src/utils/exporter/util.ts:61-81` |
| `evaluateHealth()` returns silently unless `NodeLibrary.instance.isModuleRegistered(this.owner.owner)` | `models/nodegraphmodel/NodeGraphModel.ts:895-901` |
| 🔴 **D48 holds at HEAD.** `noodl-preview/src` has **0** hits for `registerModule`, `evaluateHealth` or `editorConnection`. `deployProject` goes `bootstrapNodeLibrary()` → `readProjectForDeploy` → `deployToFolder` with nothing registered | `noodl-preview/src/deploy.ts:213-233`; `grep -rna "registerModule\|evaluateHealth\|editorConnection" packages/noodl-preview/src` |
| The deploy changed on 2026-09-11 in `4e4fe967a` (EXP-017). It added a check on the viewer engine (`readDeployEngine`, `DevelopmentEngineError`, `deploy.ts:127-207`) and duplicate-asset warnings. **It did not touch health or ports.** `nodegx-export/src/cli/deploy.ts` spawns this engine | `git show --stat 4e4fe967a` |
| DEF-028 made the flush unconditional and **named this hole**: *"It inherits `evaluateHealth`'s guards. With … the component's module unregistered it is a no-op … Named because a future session should not read the fix as stronger than it is."* | [DEF-028 §3](../phase-80-the-defects-the-templates-found/DEF-028-A-BUILD-DEPENDS-ON-WHEN-IT-WAS-TAKEN.md) |
| The devtool registers the module to make the filter honest, and must mint the runtime ports first or the filter deletes good wires | `scripts/devtools/deploy-from-disk.entry.ts:375-383` |
| With the filter on and **no** port pass, the devtool deleted 46 of 139 correct TPL-005 wires (D44). With the port pass it deleted 4, all phantoms (see GAM-024). The shipped CLI deleted 0 because it deletes nothing | as recorded 2026-09-11, D44 correction table |
| Four built-in families mint ports only inside a `setup()` guarded on `editorConnection.isRunningLocally()`: `Expression`, `Set Variable`, `String Format`, `States`. Text Input's setup is guarded the same way but only narrows declared ports | `setvariablenode.ts:229`, `stringformat.ts:159` (as recorded 2026-09-11); `text-input.ts:478-491` re-read |
| Warning-level connection keys (`con-target-port-gated`, `con-type-unconverted`) no longer make a wire unhealthy | [DEF-034](../phase-80-the-defects-the-templates-found/DEF-034-A-QUESTIONABLE-WIRE-IS-DELETED-LIKE-A-BROKEN-ONE.md) ✅ |

## 3. Where it bites a person

Everyone who deploys with `nodegx deploy`, which is every deploy off the editor seat since HLS-015 shipped it. A mistyped or
orphaned wire deploys, the page loads with zero console errors apart from the viewer's own `Invalid connection` line, and
the feature it carried does nothing. The author is told `ok: true`.

## 4. Related work and collisions

- P77 D13 → P80 [DEF-028](../phase-80-the-defects-the-templates-found/DEF-028-A-BUILD-DEPENDS-ON-WHEN-IT-WAS-TAKEN.md) ✅
  (closed s30): "nothing forces `evaluateHealth` before an export". **DEF-028 fixed the editor half and explicitly left the
  unregistered-module half, which is this task.** ⚠️ The [P77 register's D13 row](../phase-77-the-site-builder-rescue/DEFECTS-THE-SITE-BUILDER-FOUND.md)
  (lines 248-300) still reads owner `NONE` and does not point at DEF-028. That is stale, for the lead to fix.
- P77 [SBR-007](../phase-77-the-site-builder-rescue/SBR-007-THE-PAGE-EDITOR.md) s25, recorded in P77
  [TASKS.md](../phase-77-the-site-builder-rescue/TASKS.md) lines 487-491: *"A headless export's health filter is inert, and it
  fails OPEN"*. Found and fixed **in the devtool only**. The earliest record of D48's mechanism.
- P77 register D56 / D56b (lines 3317-3360), owner `NONE`: a door-built project with no `rootNodeId`, and 69 wires dropped
  on a never-opened project, *"plausible and NOT measured"*. When this filter turns on in the CLI, D56b's population will be
  among its first readings.
- P76 [SB-017](../phase-76-the-site-builder/SB-017-THE-DEPLOY-DROPS-HALF-THE-GRAPH.md) ✅: the editor deploy dropping `prop-`
  wires, fixed on the port side (SBR-008). The same "ports first" lesson, on the cloud path.
- P83 [HLS-015](../phase-83-behind-a-click/HLS-015-NODEGX-DEPLOY.md) ✅ and HLS-013-WHAT-WAS-BUILT lines 113-119: the CLI, and
  the headless port preparation for cloud adapters.
- P88 [GAM-024](GAM-024-THE-DEPLOY-CENSUS-REPORTS-ONLY-REAL-DROPS.md): the port pass this task depends on.
- ⚠️ **[GAM-014](GAM-014-A-KIT-NODE-DRAWS-WHEN-IT-IS-THE-WHOLE-COMPONENT.md) §8 s15 (2026-09-16):** `bootstrapNodeLibrary` never loads a project's `noodl_modules`, so every kit type is an `UnknownNodeType` in the deploy. Once this filter is on, a wire to or from a kit node meets that placeholder. Arm a kit-wired component before trusting the filter's census.
- Grep run: `grep -rlan "evaluateHealth\|isModuleRegistered\|registerModule" dev-docs/tasks`. **No open task owns turning the
  filter on in `noodl-preview`.**

## 5. Design

**Order, from D48: ports first, filter second, in one change. Either half alone is worse than the defect.**

1. **Ports.** `nodegx deploy` needs the runtime-minted ports in the process that exports. The only measured mechanism is the
   devtool's `registerRuntimeDiscoveredPorts`: a probe runtime whose own `editorConnection` is patched to record
   `sendDynamicPorts`.
   - **Move it into `noodl-preview`** (product code) and have the devtool import it. Two copies would drift apart.
   - This makes GAM-024's completion a prerequisite in product code, not only in the devtool.
   - ⚠️ It `require`s `noodl-viewer-react/src/register-nodes` into the deploy bundle. Whether that builds in the deploy bundle
     has not been measured, so it is AC2's first reading.
2. **Filter.** Register the project module before export, then report what the filter dropped, by wire, in `DeployOutcome`.

✅ **R20, ruled 2026-09-16 (s17), asked in plain words with the kit-wire catch: "Publish all, warn" — option (c).** Every wire ships; the ones health calls broken are listed in the outcome. ⚠️ So the title's and §1's "refuses", AC2's "dropped, or refused" and AC3's "the sabotage ships again" arm need rewording to (c) before building: the graded consequence becomes *the broken wire is named*, and a good wire is never removed.

~~Ruling for Richard: what does a deploy do when the honest filter drops a wire?~~
- **(a) Refuse:** non-zero exit, nothing written. The same shape as EXP-017's `DevelopmentEngineError`, with a flag to deploy
  anyway.
- **(b) Deploy and warn:** exit 0, with each dropped wire in `warnings`.
- **(c) Deploy unfiltered and warn:** keep every wire, and list the ones health calls broken.
D44 already offered a guard (*"fail the deploy when the filter drops anything"*). The trade-off: (a) stops a broken page and
also stops a deploy over one phantom; (c) never deletes a good wire the port pass missed.

**Do not** give `bootstrapNodeLibrary`'s runtime an editor connection. D44 records that it populates `NodeLibrary` for every
headless consumer, the MCP render path included.

## 6. Acceptance criteria

Reworded to R20 (c) in s18. The graded consequence is **the broken wire is named and still published**.

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8:** `nodegx deploy` on a copy of `templates/pixel-game` with a wire sabotaged into a port that does not exist exits 0 and says nothing, with the wire in the deployed bundle. Beside it, `deploy-from-disk` drops the wire, which shows the filter can fire. ✅ s18, **reshaped:** a built-in-declaration sabotage is REFUSED by the validation gate at HEAD, so the RED is the 6 kinds the gate cannot judge |
| AC2 | With ports moved and health read: all shipped templates deploy with **0** good wires named broken, and every good wire still published. The sabotaged wire is **named** in the outcome and still published. ✅ s18 |
| AC3 | 🔴 **Reverted arms:** no import / no `editorImportComplete` / no adapters, and good wires are named broken; filter left on, and the sabotage stops shipping; the naming removed from `warnings`, and the person reads nothing. The counts are recorded, not assumed. ✅ s18, 7 mutants |
| AC4 | The census across every shipped template records, per template: wires broken (named) and unchecked. Read every named wire before landing. ✅ s18 |
| AC5 | **The person's door:** the sabotaged deploy's output names the wire in the form a person reads, and a clean deploy publishes the same artefact as before. ✅ s18 (terminal read; the export is **byte-identical** to HEAD on all 7 templates, so the page plays as P78's drives recorded, and no browser drive was added) |
| AC6 | `deploy-from-disk` and `nodegx deploy` report the same set on the same project, which shows there is one port pass. ✅ s18, 7/7 |

## 7. Traps

- 🔴 **`84 → 84` is not health.** The shipped CLI's zero drops is an inert filter (D52 §"And the shipped CLI's…"). Only the
  sabotage arm makes a zero readable.
- 🔴 **`NoodlRuntime` ignores `args.editorConnection`.** Patch the object the runtime created. `EventSender.emit` is async, so
  await it. Both were recorded costs in D44.
- ⚠️ Counting `evaluateHealth` calls does not count evaluations. Read the guard each component took, as the devtool does
  (`deploy-from-disk.entry.ts:385-399`).

## 8. Record

### Session 18 (2026-09-17, over `67e1c7639`; HEAD at write `a2f5ce210`, P92 commits only)

**AC1 at HEAD, a matrix of 10 sabotage kinds on copies of pixel-game** (scratch `…/5cf6c7fd…/scratchpad/gam023/matrix.js`):

| kind | shipped `nodegx-deploy` | `deploy-from-disk` (filter on) |
|---|---|---|
| A target port missing on a built-in (`Text`) | **refused**: `Text has no input named "thisPortDoesNotExist"` | dropped |
| B source port missing on a built-in (`Group`) | **refused** | dropped |
| I wire from a node that does not exist | **refused**: `references a missing node` | dropped |
| J source port missing on `Counter` | **refused** | dropped |
| C a component instance's missing input | `ok: true`, silent, wire in bundle | dropped |
| D a component instance's missing output | `ok: true`, silent, wire in bundle | dropped |
| E `Set Variable` missing input | `ok: true`, silent, wire in bundle | dropped |
| F `Function` missing input | `ok: true`, silent, wire in bundle | dropped |
| G kit node missing output | `ok: true`, silent, wire in bundle | dropped |
| H `For Each` item port missing | `ok: true`, silent, wire in bundle | dropped |

🔴 **§2 and the header were wrong about the population.** The deploy's validation gate (`loader.ts` `readProjectForDeploy`, SUB-006)
already refused the built-in-declaration kind this task's AC1 named. The live defect was the 6 kinds only a running graph can judge.

**Built** (`noodl-preview/src/wireHealth.ts`, new; `deploy.ts`; `scripts/devtools/deploy-from-disk.entry.ts` now imports it):
1. **Editor adapters** (`RouterNavigate`, `PageInputs`, `CloudFunction2`, `NamedPorts`), driven with `projectLoaded` the way
   `cloudDeployEnvironment.ts` drives them. **Found by the census, not by the task file:** members-area's 25 remaining phantoms were
   `pm-` and `CloudFunction2` `in-`/`out-` ports, which come from `NodeTypeAdapters`, not from the runtime.
2. **The runtime pass, as the viewer does it:** `graphModel.importEditorData(export)` then `emit('editorImportComplete')` on a probe
   runtime with a patched connection. It replaces the devtool's one-fake-node-per-type emit (GAM-024's fix).
3. **Health** on the registered project; a broken wire with an end on a missing type is **unchecked**, not broken. Then unregistered,
   which clears every warning.
4. 🔴 **On a second model read from the same files.** Run on the exported model, the pass changed what every site ships (component
   input types `*` → `string` with `default: ""`, Function nodes gaining `runOnChange-in-*`, pixel-game's 2 bundles → 1). That may be
   what the editor ships, but R20 did not rule on it. With the copy, **all 7 templates' deploys are byte-identical to HEAD's engine**.
5. `readWireHealth` **refuses** a project that is not `_isReadOnly` (see the trap below).

**What a person reads** (`nodegx deploy`, story-engine copy with a `titel` typo, exit 0):
`! /Pages/Read: the wire rdFind.out-title → rdPassage.titel cannot work (Target port doesn't exist.). It was published as it is.`

**Census, every template** (devtool HEAD dropped → fix devtool dropped; fix CLI broken/unchecked; same set CLI vs devtool):

| template | HEAD devtool dropped | fix: broken | fix: unchecked | same set |
|---|---|---|---|---|
| landing-pages | 11 | 0 | 0 | ✅ |
| members-area | 33 | 0 | 0 | ✅ |
| pixel-game | 4 | 0 | 4 (`keyboard-shortcuts.KeyboardShortcut`) | ✅ |
| rocket-school (peer's, dirty tree) | 76 | **1** | 75 (6 `game-kit` types + keyboard) | ✅ |
| story-engine | 3 | 0 | 0 | ✅ |
| todo-list | 24 | 0 | 0 | ✅ |
| todo-list-demo | 18 | 0 | 0 | ✅ |

The one named wire: `/Game/Keyboard: kbPick.value → kbOut.picked`, *"Target port of type string cannot be connected to a source port
of type enum"*. An Options `value` into a Component Outputs port typed `string`: the editor's own type rule, not a missing port. Whether
that rule is too strict is not this task's to rule. 🔒 For Rocket School's peer / Richard.

**Spec** `noodl-preview/tests/gam-023-a-deploy-publishes-every-wire-and-names-the-broken-ones.test.ts`, grading `dist/nodegx-deploy.cjs`
(refuses a stale bundle): 6/6. **Mutants** (source edited, bundle rebuilt, spec run, source restored from a `cp` snapshot, sha-checked):

| mutant | red |
|---|---|
| M1 adapters not run | 1: members-area |
| M2 no `editorImportComplete` | 3: sabotage, story-engine, members-area |
| M3 no import | 4: all but "deployed" and export shape |
| M4b project left registered | 1: export shape (the copy leaks into type resolution). ⚠️ The first M4 (skip the whole restore) failed all 6 on unparseable stdout, a save-skipped line after the report: graded nothing, replaced |
| M5 kit ends not separated | 1: pixel-game |
| M6 not in `warnings` | 2: sabotage, pixel-game |
| M7 health on the exported model | 1: export shape |

**Gates:** `noodl-preview` suite 53/53 (6 suites), `tsc --noEmit` 0 (both files listed); `nodegx-export` hls014/hls015/exp017 80/80.
Deploy time about 1.2 s → 2.3 s per template. **Not run:** editor `test:ci` / `test:main` (no editor file touched).

🔴 **Trap, hit and cleaned:** making the project `ProjectModel.instance` armed the editor autosave. The devtool, which never set
`_isReadOnly`, wrote a legacy `project.json` (0.1–2 MB) into **all 7 `templates/` folders** during one census (untracked, born
07:49–07:50, deleted; nothing else written, checked with `find -newer`). Now refused in `readWireHealth`; the devtool sets the flag.

**Left:** kit wires are unchecked, not checked (GAM-024 AC5, R21); the installed app's engine still carries the old deploy (a release).

### Session 19 (2026-09-17, over `f25a643b2`) — committed, and Richard's ruling on the one wire it named

s18's work committed as `624b054f2` (code) and `06591185c` (docs), on Richard's yes.

**Ruling (Richard, 2026-09-17, asked in plain words):** Rocket School's `/Game/Keyboard: kbPick.value → kbOut.picked` was
named broken by the editor's type rule (an Options `value`, type `enum`, into a Component Outputs port typed `string`). *"The rule
is too strict"*: an enum is a string. Built as one row of the cast table: `enum` → `['string']`. **Only** `string`: an enum into
`number` stays refused, which is also the known-firing half of the spec's arm.

**Where the table lives, and its copies:** `noodl-runtime/src/nodelibraryexport.ts` (the source, which the editor and the headless
deploy both read); `packages/noodl-types/src/node-catalog.json` + `node-catalog-enriched.json` (regenerated, `catalog:check` and
`catalog:merge:check` up to date); `docs/node-catalog/compatibility.json` (`merge.js` refused the regen until its `verifiedPairs`
moved enum→string from rejected to permitted, with enum→number the new rejected row and a `castSemantics` sentence); the editor's
`cloud-node-library.json` (**hand-edited, one row**: `cloud-library:generate --check` was already stale at HEAD, so a regen would
have swept unrelated changes in); `tests-unit/property-editor/portTypes.test.ts`'s "verbatim" copy.

| reading | result |
|---|---|
| story-engine + an Options node wired into `rdFoot.text` and `rdFoot.opacity`, engine before the change | both named broken ✅ RED |
| same, fix engine | only `opacity` named (enum → number) |
| GAM-023 spec (new arm `story-enum`, runtime source added to the staleness guard) | 7/7 |
| mutant: the enum row alone back to `[]` (python exact replace; sha-restored) | 1 red, exactly the enum → text wire. ⚠️ The first mutant was a `sed` that also reverted date/color/object/textStyle → string: discarded |
| deployed files, reverted engine vs fix engine, 7 templates (bundles copied into `dist/` so they find the viewer runtime) | **0 differing files** on 7/7, all `ok: true`; rocket-school broken **1 → 0**, unchecked 75 both |
| editor `tests-unit` portTypes + fix-025 + cn-015 + lib-006 | 175/175 in 15 suites |
| `noodl-preview` `tsc --noEmit` (includes `tests/`) | 0 |
| editor `test:ci`, `test:main`, `noodl-mcp` whole suite | **not run** |

⚠️ **Not measured:** the value arriving on screen in a browser (the enum value is the option's string, so nothing converts it, read
from source), and `findCompatiblePortType`'s inference for a component port fed by mixed types (it now resolves `string` where it
resolved nothing). The 7-template export diff saw no port type change. The installed app and `src/external` still carry the old table
until rebuilt.

⚠️ **First deploy diff graded nothing:** bundles copied to scratch fail at stage `runtime` (they find the viewer runtime relative to
themselves), and "0 differing files" was two empty folders. Read `ok` before the diff.
