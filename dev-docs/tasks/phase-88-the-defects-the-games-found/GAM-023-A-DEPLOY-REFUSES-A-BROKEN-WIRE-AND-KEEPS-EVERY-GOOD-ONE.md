# GAM-023 — A deploy refuses a broken wire and keeps every good one

**Status: ⬜ not started.** **Source:** [P78 D48](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md), with the [D44 correction](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by TPL-005's deploy control, 2026-09-11 · **Side:** product (`nodegx deploy`, `noodl-preview`)

The shipped `nodegx deploy` never runs its connection filter. It kept all 139 of TPL-005's wires only because it checks
none of them. A wire into a port that does not exist ships just as happily, with `ok: true`.

## 1. The person sentence

**`nodegx deploy` publishes every wire that works and refuses to publish one that cannot, and it names the one it refused.**

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

🔒 **Ruling for Richard: what does a deploy do when the honest filter drops a wire?**
- **(a) Refuse:** non-zero exit, nothing written. The same shape as EXP-017's `DevelopmentEngineError`, with a flag to deploy
  anyway.
- **(b) Deploy and warn:** exit 0, with each dropped wire in `warnings`.
- **(c) Deploy unfiltered and warn:** keep every wire, and list the ones health calls broken.
D44 already offered a guard (*"fail the deploy when the filter drops anything"*). The trade-off: (a) stops a broken page and
also stops a deploy over one phantom; (c) never deletes a good wire the port pass missed.

**Do not** give `bootstrapNodeLibrary`'s runtime an editor connection. D44 records that it populates `NodeLibrary` for every
headless consumer, the MCP render path included.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8:** `nodegx deploy` on a copy of `templates/pixel-game` with one wire sabotaged to `thisPortDoesNotExist` exits 0, and the sabotaged wire is present in the deployed bundle. Beside it, the same copy through `deploy-from-disk --sabotage` drops that wire, which shows the filter can fire. |
| AC2 | With ports moved and the filter on: all four shipped game and landing templates deploy with **0** drops of good wires (TPL-005 139→139, TPL-006 84→84). The sabotaged wire is dropped, or refused per the ruling, and named in the outcome. |
| AC3 | 🔴 **Two reverted arms:** filter on without the port pass, and TPL-005 loses the D44 family (the count is recorded, not assumed). Ports without the filter, and the sabotage ships again. |
| AC4 | The census across every shipped template records, per template: wires authored, deployed, and dropped with names. Read every dropped wire before landing. |
| AC5 | **The person's door:** a browser drive of the deployed TPL-005 plays (player, coins and walls drawn, room readout `1 / 5`), and the sabotaged deploy's output names the refused wire in the form a person reads. |
| AC6 | `deploy-from-disk` and `nodegx deploy` report the same drop set on the same project, which shows there is one port pass. |

## 7. Traps

- 🔴 **`84 → 84` is not health.** The shipped CLI's zero drops is an inert filter (D52 §"And the shipped CLI's…"). Only the
  sabotage arm makes a zero readable.
- 🔴 **`NoodlRuntime` ignores `args.editorConnection`.** Patch the object the runtime created. `EventSender.emit` is async, so
  await it. Both were recorded costs in D44.
- ⚠️ Counting `evaluateHealth` calls does not count evaluations. Read the guard each component took, as the devtool does
  (`deploy-from-disk.entry.ts:385-399`).

## 8. Record

Not started.
