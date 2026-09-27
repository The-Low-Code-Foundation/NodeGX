# GAM-024 — The deploy census reports only real drops

**Status: ✅ built s18 with GAM-023, committed `624b054f2` (s19). AC1–AC4, AC6, AC7 met; AC5 closed by ruling R21 (s19): unchecked is enough.** **Source:** [P78 D44 (remaining)](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) and [P78 D52](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by TPL-005 (2026-09-11) and TPL-006 AC7 (2026-09-12) · **Side:** tooling (`scripts/devtools/deploy-from-disk`), used as a publication gate

The `deploy-from-disk` census says TPL-005 dropped 4 wires and TPL-006 dropped 3. Neither did: the shipped deploy carries
them and the pages play. The census is what TPL-005 and TPL-006 were told to check before publishing, so a phantom drop
blocks a release or teaches people to ignore the census.

## 1. The person sentence

**When the deploy census says a wire was dropped, that wire really is broken, and the census names it.**

## 2. What was measured

Re-read at HEAD `eb12ebe99` on 2026-09-14 unless marked otherwise.

| reading | where |
|---|---|
| `registerRuntimeDiscoveredPorts` builds a probe `NoodlRuntime`, patches its `editorConnection` to record `sendDynamicPorts`, registers the viewer nodes, and emits `nodeAdded.<type>` for each editor node whose type has a `nodeAdded.` listener at that moment | `scripts/devtools/deploy-from-disk.entry.ts:186-317` |
| The list of lazy types is read from the probe's listener maps **once, straight after `registerViewerNodes`**, and no event is emitted before that | `:240-251` |
| The emitted node is `{ id, type, parameters, component: { name }, on, off }`. The probe's `graphModel` is never given the project's components | `:291-299` |
| 🔴 **Gate 1:** `For Each` subscribes to `nodeAdded.For Each` only inside `graphModel.on('editorImportComplete', …)`. The probe never emits that event, so `For Each` is never in the lazy-type list | `noodl-viewer-react/src/nodes/std-library/data/foreach.tsx:1099-1106` |
| 🔴 **Gate 2:** `_collectPortsInTemplateComponent` reads `graphModel.components[templateComponentName]` and gets nothing on the probe. `_trackComponentOutputs` reads the same map | `foreach.tsx:1020-1025`, `:1078` |
| The three phantom drops on TPL-006, all from `/Pages/Read`'s one `For Each`: `itemOutput-gives → rdCarry.in-gift`, `itemOutputSignal-picked → rdCarry.run`, `itemOutput-goto → rdSetAt.value`. The shipped CLI deployed 84/84 and the browser drive showed them working | as recorded 2026-09-12, D52; TPL-006 lines 367-384, 441-445 |
| The instrument was alive in both arms: `--sabotage` dropped its planted wire (`/Story/Source` 8→7), and the clean arm dropped exactly those 3 | as recorded 2026-09-12, D52 |
| The remaining 4 on TPL-005: `keyboard-shortcuts.KeyboardShortcut.pressed → Game/Move.go`. That is a **module** type. `bootstrapNodeLibrary` loads built-ins only, so the output port cannot resolve | as recorded 2026-09-11, D44 correction; module at `library/modules/keyboard-shortcuts`, copied into `templates/pixel-game/noodl_modules/keyboard-shortcuts` |
| The kit reader that already exists: `noodl-mcp/src/kitExtract/extract.ts` spawns `entry.js` (`dist/kit-extract.cjs`) per project directory and keeps "no modules", "none registered" and "could not run" apart | `kitExtract/extract.ts:1-50` |
| The census prints counts per component, not the wires. TPL-006 had to diff bundles to name the three | `deploy-from-disk.entry.ts:470-484`, `:531`; TPL-006 line 375 |

## 3. Where it bites a person

Whoever publishes a template or demo page and uses this census as the gate, which TPL-005 AC7 and TPL-006 AC7 both do
(*"do not publish a build whose own census says it dropped wires"*). Almost every template has a `For Each`, and module
nodes are how kits work. The likeliest wrong reading is that the product drops the wires that make a repeated row
clickable. Once GAM-023 moves the port pass into `nodegx deploy`, the same phantoms become **real deleted wires in shipped
builds**.

## 4. Related work and collisions

- P88 [GAM-023](GAM-023-A-DEPLOY-REFUSES-A-BROKEN-WIRE-AND-KEEPS-EVERY-GOOD-ONE.md) depends on this. If GAM-023's design moves
  `registerRuntimeDiscoveredPorts` into `noodl-preview`, build **this** task's fix there, once. Doing it in the devtool first
  and moving it afterwards is a merge nobody will perform.
- P78 [TPL-005](../phase-78-the-templates/TPL-005-THE-PIXEL-GAME.md) AC7 (line 244-251, still marked BLOCKED on D44) and
  [TPL-006](../phase-78-the-templates/TPL-006-THE-STORY-ENGINE.md) AC7: the two consumers of the census as a gate.
- P77 [SBR-008](../phase-77-the-site-builder-rescue/SBR-008-THE-DEPLOY-KEEPS-THE-PANELS-WIRES.md) ✅ and P77 SBR-007 s25: where
  the devtool and its `--sabotage` arm come from.
- P80 [DEF-035](../phase-80-the-defects-the-templates-found/DEF-035-THE-PORTS-DEPEND-ON-WHEN-YOU-LOOKED.md) ✅: ports that depend
  on when you looked (`prop-` from a cached schema). A different family, with the same "the census only knows what was minted" shape.
- Grep run: `grep -rlan "registerRuntimeDiscoveredPorts\|deploy-from-disk" dev-docs/tasks` found P77 (SBR-007, SBR-008,
  TASKS, register, s47 drive notes), P78 TPL-005/TPL-006 and REL-011. **None owns the For Each or module gaps.**

## 5. Design

- **Name the wires first.** The census reports each dropped connection as `from.port → to.port` per component. It is cheap,
  and it is what lets the other two fixes be graded.
- **For Each: both gates, or it reads as fixed and changes nothing** (D52). Populate the probe's `graphModel.components` with
  the project's components, in the shape `_collectPortsInTemplateComponent` reads. Emit `editorImportComplete` before
  reading the lazy-type list. Pass a node whose `parameters.template` resolves.
- **Module types:** register the project's `noodl_modules` kits into the node library used by the headless export, reusing
  `kitExtract`'s containment rather than `require`ing kit code in-process.
  🔒 **Ruling, only if the extractor cannot be reused:** run kit `index.js` in the deploy process (fast, but a throwing kit
  kills the deploy), or leave module types unfiltered and label them in the census as not checked.
- **An "unchecked" line beside every count.** Wires whose endpoint type the probe could not judge are reported as a separate
  number. They are not counted as kept or as dropped.
- **Do not** add `For Each` to a hand-written type list. The census reads the listener map so that a family gaining or losing
  a lazy `setup()` shows up in the census (`:242-251`).

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8:** `deploy-from-disk templates/story-engine` reports 3 dropped. `templates/pixel-game` reports 4. `--sabotage` on each drops its planted wire, which shows the filter can fire. |
| AC2 | The census names every dropped wire. On AC1's runs the names match D52's three and D44's four. |
| AC3 | After the `For Each` fix: story-engine reports **0** dropped, and `--sabotage` still drops exactly its planted wire. |
| AC4 | 🔴 **Two reverted arms:** skip the `editorImportComplete` emit and the 3 come back. Skip the components map and the 3 come back. Each gate is graded alone. |
| AC5 | After the module fix: pixel-game reports **0** dropped, with `--sabotage` alive. A reverted arm (no kit registration) brings back the 4. |
| AC6 | Census over every template in `templates/`: dropped, with names, and unchecked, per template. Every non-zero dropped count is read and classified as real or phantom. |
| AC7 | **The person's door:** for each template, the census's dropped set equals the set of wires missing from the `nodegx deploy` artefact once GAM-023's filter is on, which shows the two instruments agree. Until GAM-023 lands, record this AC as blocked on it, not as met. |

## 7. Traps

- 🔴 **"No such family subscribed" and "that family found nothing" print the same.** The lazy-type list is the only witness.
  Assert `For Each` is in it.
- 🔴 **`EventSender.emit` is async.** An un-awaited emit reports a confident `0`.
- ⚠️ `graphModel.components` on the probe is a runtime model, not the editor's `ComponentModel`. Read what `foreach.tsx`
  reads before building it.
- ⚠️ A clean count on a template with no `For Each` grades nothing. Use story-engine for AC3.

## 8. Record

### Session 18 (2026-09-17, over `67e1c7639`) — built in product code once, with GAM-023

The port pass lives in `noodl-preview/src/wireHealth.ts` (`registerRuntimeDiscoveredPorts`, `readWireHealth`), and the devtool imports
it with `leaveFilterOn: true`. Readings from `deploy-from-disk` bundles built into scratch (the checked-in `.cjs` is stale and gitignored).

| AC | reading |
|---|---|
| AC1 | HEAD devtool: story-engine **3** dropped (`/Pages/Read`), pixel-game **4** (`/Pages/Play`); `--sabotage` drops its planted wire on each (`/Story/Source` 8→7, `/Game/Cell` 5→4). `For Each` absent from HEAD's lazy-type list. ✅ RED |
| AC2 | `droppedWires` names each: story-engine's `rdChoices.itemOutput-gives → rdCarry.in-gift`, `rdChoices.itemOutputSignal-picked → rdCarry.run`, `rdChoices.itemOutput-goto → rdSetAt.value` (D52's three); pixel-game's `plKey{Up,Down,Left,Right}.pressed → plMove*.go` (D44's four). ✅ |
| AC3 | Fix: story-engine **0** dropped; `--sabotage` drops exactly `srStory.items → srPick.thisPortDoesNotExist_SBR007`. `For Each` in the types that minted ports. ✅ |
| AC4 | `--arm-skip-import-complete`: **exactly D52's three** come back. `--arm-skip-import` (the components-map gate): **19** come back on story-engine and **46** on pixel-game, which is D44's recorded 46. ⚠️ The task predicted "the 3" for both gates. The import also feeds `nodeAdded` to every non-lazy family, so skipping it loses more than For Each. ✅ Each gate graded alone |
| AC5 | ✅ **Closed by R21 (Richard, s19, 2026-09-17): "unchecked is enough".** No kit loading at deploy time. Kit wires are now counted **unchecked**, not dropped-as-broken, and named per wire in the devtool. pixel-game reads broken 0, unchecked 4. Checking them needs kit types in the headless library (R21: reuse `kitExtract`, or not). The devtool still DROPS unchecked wires (it filters on health), so its bundle is not what ships |
| AC6 | Census, all 7 templates: see GAM-023 §8 s18. HEAD 11/33/4/76/3/24/18 dropped → fix 0 broken on all but rocket-school (1, a type-rule verdict) with 4 and 75 unchecked kit wires |
| AC7 | Devtool drop set == `nodegx deploy` broken+unchecked set on **7/7** templates ✅ |

**Where the task file was wrong:**
- 🔴 §5 said populate `graphModel.components` by hand and emit the event. **The runtime already has the whole sequence:** `importEditorData`
  then `editorImportComplete` (`noodl-runtime.ts` `exportDataFull`). Ten families gate on that event, not one. Running it replaced the
  hand-built node entirely.
- 🔴 **The runtime is not the only port source.** `NodeTypeAdapters` (editor side) mint `RouterNavigate`'s `pm-` and `CloudFunction2`'s
  `in-`/`out-` ports. members-area read 25 phantoms until the adapters ran. No task file named them.
