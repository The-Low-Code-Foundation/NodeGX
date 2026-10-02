# ISL-005 — Two Functions share one piece of code

**Status:** 🔬 s4 (2026-10-02): not ruled — Richard asked for research first (components and native nodes before scripts; README §8, §8 s4 below). Scoped 2026-10-01 at `27d891bf3`
**Source:** [audit F08](AUDIT-2026-10-01.md) (R-c as well) · first planned in [P105 CG-002 line 136](../phase-105-the-coding-garden/CG-002-THE-ENGINE.md) ("`ENGINE` is inlined into five scripts … Owner: NONE") · grown by every P106 and P108 lane since
**Side:** product (runtime `Function` node, the editor's project files, the MCP door, `@nodegx/export`)

Olive's Island has one robot engine: about 76 KB of plain JavaScript (the tile rules, the stepper, the sensors). Seventeen
`Function` nodes need it, and a Function can only hold its own text, so the template carries seventeen copies. An engine fix
is a seventeen-place edit. In practice the real source moved out of the project into a TypeScript file in the generator, and
the project became a build output.

## 1. The person sentence

**An author writes a helper once (say, "can the robot step onto this tile?"), and two Functions on two different pages both
use it. They fix the helper in one place, and both pages behave the new way.**

## 2. What was measured

HEAD `27d891bf3`, 2026-10-01. Every row was re-read by this task's author at HEAD unless it says otherwise.

| reading | where |
|---|---|
| `grep -rl "var BLOCKING_TILES = { W: 1" templates/bot-garden/components \| wc -l` → **17**. The 17 are all `Logic/*` components (Step, New run, Apply delta, Sense, Goal met, Predict end, Choose hint, Island tick, Island world, Use helper, Pad answer, Record step, Teach again, Teach start, Win pay, Shop card, Job card). Re-run at HEAD | `templates/bot-garden/components/Logic/*/nodes.json` |
| A parse of every `functionScript` in the template: **83 Function nodes, 2,452,405 bytes of script**. The 17 that hold the engine carry **1,793,628 bytes** (smallest 91,355, largest 146,146). The audit's 2.39 MB and 1.75 MB are the same counts in a different unit. Re-run at HEAD | Python parse of `templates/bot-garden/components/**/nodes.json` |
| The engine itself is `export const ENGINE` at `cg002Scripts.ts:239`, closing at `:1342`: about **75.8 KB** of text. Scripts are made by template-literal interpolation: `${ENGINE}` appears 12 times in the generator source, and five more shared blocks are pasted the same way: `${SAVE_HELPERS}` 16×, `${OLIVE_HELPERS}` 6×, `${FOLD_HELPERS}` 5×, `${SEED_HELPERS}` 2×, `${IWL_REQUEST_HELPERS}` 2×. So the engine is not the only copied code. Re-read at HEAD | [`cg002Scripts.ts:1400-1452`](../../../packages/noodl-mcp/tests/cg002Scripts.ts); `grep -o '\${\(ENGINE\|[A-Z_]*HELPERS\)}'` over `cg0*/ig0*/iw0*.ts` |
| There is placeholder logic in two places as well: `fill(text, vars)` at `cg003Scripts.ts:90` and `fillIn(t, vars)` at `:1029`, which are the same function under two names. Re-read at HEAD | [`cg003Scripts.ts:90`](../../../packages/noodl-mcp/tests/cg003Scripts.ts), `:1029` |
| The Function node compiles its own text: `new AsyncFunction('Inputs','Outputs','Noodl','Component', prefix + script)`. Its only outside reach is the `Noodl` global (`window.Noodl` in a browser). There is no import, no require, and no parameter that names other code. Re-read at HEAD | [`simplejavascript.ts:646-668`](../../../packages/noodl-runtime/src/nodes/std-library/simplejavascript.ts); [`javascriptnodeparser.js:492-501`](../../../packages/noodl-runtime/src/javascriptnodeparser.js) |
| **Existing route 1, partial: the Script node (`Javascript2`) can load its code from a project file** (`Use External File` = Yes, `File Path` of type `source`, loaded with an XHR by `createFromURL`). It applies to the Script node only, whose `define()` API is not the Function's `Inputs`/`Outputs`. Each node still loads and runs its own copy, and the exporter refuses it: *"its code is loaded from a URL at runtime (Use External File)"*. Re-read at HEAD | [`javascript.ts:262-345`](../../../packages/noodl-viewer-react/src/nodes/std-library/javascript.ts); [`javascriptnodeparser.js:260-290`](../../../packages/noodl-runtime/src/javascriptnodeparser.js); [`plan.ts:12930-12932`](../../../packages/nodegx-export/src/analyze/plan.ts) |
| **Existing route 2, partial: ERG-002's app-config Libraries.** `registerLibrary` writes a `noodl_modules/<slug>/manifest.json` around a URL or pasted code, checks that the declared global appears (`verifyLibrarySource`), and the module is injected as a `<script>` on all four HTML paths. A Function could then call `GardenEngine.step(…)`. Its own spec names the catch: *"A library attached to `window` does not exist during server rendering"* (ERG-002 §3), and `libraryNeedsSsrWarning` exists for it. No MCP tool registers a library: `grep registerLibrary packages/noodl-mcp/src` → 0. Re-read at HEAD | [`projectmodules.ts:184, 802-880, 1285`](../../../packages/noodl-editor/src/shared/utils/projectmodules.ts); [ERG-002](../phase-35-authoring-ergonomics/ERG-002-EXTERNAL-LIBRARIES.md) §2–§3 |
| The kits reach each other the same way: `garden-3d-kit` reads `garden-kit` through `window.__noodl_modules` in manifest load order. That is F17, owned by ISL-013. As recorded by the audit; not re-read here | `kit3d.js:86, 329-335` |
| **Export copies the text too.** A Function body is *re-hosted* verbatim inside a wrapper per node (EXP-003 §4), so an exported Olive's Island would carry the 17 copies into `src/`. `JavaScriptFunction` is `translated` in the ledger. Re-read at HEAD | [`component.ts:6009-6020`](../../../packages/nodegx-export/src/emit/component.ts); [`jsfun.ts:1-50`](../../../packages/nodegx-export/src/analyze/jsfun.ts); `coverage-ledger.json:242` |
| The Function node is `ssr: partial`: it runs on the server, and code that touches `window` fails there with the error logged. So a shared engine that lives on `window` is absent at server render. Re-read at HEAD | `simplejavascript.ts:144-147` |

## 3. Where it bites a person

- Any app with real logic: a game's rules, a pricing calculation used on the basket and the invoice, a validation used by two
  forms. Today the author pastes it, and the copies drift. The garden's 17 copies were kept equal only because a generator
  wrote them all.
- An agent editing through the door re-sends every copy in full (`update_component` replaces a whole parameter, F27 / ISL-020).
  One engine fix is about 1.8 MB of tool traffic.
- A syntax error in the shared part shows up as 17 broken Functions, each naming its own line number inside a 100 KB body.

## 4. Related work and collisions

- **P35 [ERG-002](../phase-35-authoring-ergonomics/ERG-002-EXTERNAL-LIBRARIES.md)** (built; "four remainders" open, unowned per the
  P35 README line 135). It is the nearest product mechanism: one file, loaded once, as a global. Any design here must say
  whether it extends ERG-002 or replaces it for *project* code (as opposed to third-party libraries).
- **ISL-013** (F17, kits sharing code) is the same question one layer down. Rule them together, or at least not in opposite
  directions.
- **ISL-020** (F27, whole-parameter writes) and **ISL-023** (F33, backticks in template literals): both shrink by most of
  their size once the engine is one file. Neither is a substitute for this task.
- **ISL-006** (F09, ports mined from text): a shared module must not mint ports. `Inputs.x` inside a shared file means nothing.
- **P18 EXP-003 §4** (the re-host wrapper) and **EXP-010** (`parseModules.ts`): the export half lands there.
- **P45 / P96 cloud functions:** cloud functions cannot `require()` (`kitModules.ts:111-118`). Whether a shared module is
  reachable from a cloud Function is a ruling (§5 ruling 3), not an assumption.
- Owner grep: `grep -rn -i "shared script\|share code\|script library\|project script\|script module\|Noodl\.require" dev-docs/tasks --include='*.md'`
  → no owner. The only hits are unrelated "shared helper" refactors (P23, P30, P42bis). CG-002 line 136 says "Owner: NONE".

## 5. Design — 🔒 rulings first

These are product decisions, not coding questions. Richard decides; each has a recommendation.

1. 🔒 **Where does shared code live?**
   (a) **A project script file:** `scripts/<name>.js` in the project, listed in the editor beside components, one copy on disk.
   (b) **A "Shared Script" node:** a node placed once (in App, say) that holds the code; other Functions reach it by name.
   (c) **A kit:** `noodl_modules/<name>/index.js`. This exists today, but a kit is for node types, and kits cannot share code
   with each other either (F17).
   (d) **ERG-002's Libraries, as they are:** a registered local file exposing a global.
   *Recommendation: (a).* It is visible, diffable and mergeable as one file, and it is what a person who knows JavaScript
   expects. (b) hides code in a graph and puts the one-copy promise on a node that can be deleted. (d) works today, but it
   is a `window` global with no server render, and it is invisible to the door.
2. 🔒 **How does a Function say it uses one?**
   (a) a global namespace (`Noodl.Scripts.engine.step(…)`);
   (b) a declared **Uses** list on the Function (a parameter), drawn on the node, so the dependency is visible on the canvas,
   to the door and to the exporter;
   (c) a real `import { step } from 'engine'` in the body.
   *Recommendation: (b), surfaced as (a) inside the body.* The canvas then shows what depends on what, and the exporter gets
   a declared edge, not a text scan. (c) changes the Function's compile model (`new AsyncFunction` cannot `import`).
3. 🔒 **Where does it run?** In the browser, and during server render (as the Function does today, `partial`)? And in cloud
   Functions? *Recommendation: browser and server render from day one; cloud Functions named as a refusal* ("this cloud
   function uses `engine`, which is a browser script") until a cloud task takes it.

Constraints, after the rulings:
- **One compile per page load,** not one per Function instance. Read the cost first (§6 AC6): the garden compiles about 100 KB
  per Function instance today, and nobody has measured it.
- **An error is named once,** by file and line, with the list of Functions that use it. It is not reported 17 times.
- **Editing the file re-runs its users** in the editor preview, as editing a Function's own text does.
- **Load order is declared, not incidental.** No `window.__noodl_modules` ordering (the F17 trap).
- **The export emits one module** (`src/lib/scripts/<name>.ts` or similar), imported by each re-hosted wrapper. It does not
  paste the module into each wrapper.
- The door gets a way to write and read the file (a tool, or an extension to an existing write), validated like any other write.

## 6. Acceptance criteria (apply after the rulings are recorded in §8)

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec builds a two-Function project where both call `canStep(tile)` defined once, and looks for any Function parameter or project file the runtime would load as shared code for a Function. It finds none. Known-firing beside it: the same search finds the Script node's `useExternalFile` / `externalFile` pair. |
| AC2 | **The person sentence, in a browser.** A project with two pages, a Function on each using one shared helper. Change the helper's file only, deploy, and drive both pages: both show the new behaviour. Then change it back: both revert. Run in a visible window; record `DRIVE_EXIT` and the console. |
| AC3 | **One copy.** Regenerate `templates/bot-garden` with the engine as one shared file. `grep -rl "var BLOCKING_TILES = { W: 1" templates/bot-garden/components \| wc -l` reads **0**, the shared file holds it **once**, and the summed `functionScript` bytes drop from 2,452,405 to the number recorded. Every existing garden gate and drive is still green. **Sabotage arm:** a "fix" that pastes the file into each Function at save time keeps the drive green and fails the byte count. |
| AC4 | **The error is named once.** A syntax error put into the shared file yields one diagnostic naming the file and line, listing its users. The Functions do not raise 17 separate parse warnings. Reverted arm: route the error through each Function and the count goes red. |
| AC5 | **Server render.** Under ruling 3, a server render of AC2's project gives the same first-paint text as the browser. Or, if ruled browser-only, the refusal says so by name. |
| AC6 | **Cost, measured, not assumed.** Time to first interactive on the garden's island page, before and after AC3, on the Mac and with 4× CPU throttle. Record both. A fix that is slower is not done. |
| AC7 | **Export.** `coverage-ledger.json` gains a row (or a note on `JavaScriptFunction`) for shared scripts. AC2's project exports with the helper emitted once and imported by both wrappers, and it typechecks. A Function using a shared script the exporter cannot carry is refused by name, never silently inlined. |
| AC8 | **The door.** Through `createServer()` in-process, an agent writes the shared file and a Function that uses it, and `validate_component` passes. A Function naming a script that does not exist is refused with the name. |
| AC9 | **The node's documentation and catalog.** `javascriptfunction.json` enrichment, the docs page and the catalog say how to share code, and `catalog:check` is green. |

## 7. Traps

- **A copy at save time is not sharing.** The fake fix that inlines the file into every Function on save passes AC2 and fails AC3.
  That is why AC3 counts bytes, not behaviour.
- **`window` is not the server.** ERG-002 §3 already measured this for libraries. A shared engine that works in the browser and
  is `undefined` in server render is the NDA-004 class of defect: it reads as working until somebody deploys with SSR.
- **The generator's tests compile the scripts with `new Function('Inputs','Outputs', script)`** (`cg002Scripts.ts:2370-2380`).
  A shared-module design breaks that harness. Give the harness the same loader the runtime uses, or it will grade a different
  thing.
- **Seventeen components are not seventeen instances.** Count how many times the engine is compiled on one page before claiming
  a speed-up (AC6).
- **Six shared blocks, not one.** The engine is the largest, but `SAVE_HELPERS` is pasted 16 times. The design must carry all
  six, or the template keeps a generator for the rest.

## 8. Session log

### Session 4 — 2026-10-02: the question asked, and research ordered instead of a ruling

Richard's answers are quoted in README §8. In short: before building any shared-code feature, find out how much of
what the island does in Function scripts could be **components and native NodeGX nodes**, because *"Claude Code just
ends up creating a bunch of function nodes and custom UI components instead of using NodeGX nodes"* is the community's
criticism of the whole concept, and the island is evidence for it.

**What s4 established (read, not yet researched):** the 17 copies are not 17 identical boxes. They are 17 different
`Logic/*` Functions (Step, New run, Apply delta, Sense, Goal met, Predict end, Choose hint, Island tick, Island world,
Use helper, Pad answer, Record step, Teach again, Teach start, Win pay, Shop card, Job card), each pasting `ENGINE`
(`cg002Scripts.ts:239-1342`, 91 helper functions) in front of its own script and calling those helpers mid-script,
often in loops. A component instance is reached only through its ports, so it fits a shared job that is one value in
and one answer out, not a library called partway through a script.

**The research the next session owes (no product code):**
1. A census of the island's 83 Functions (2.45 MB): for each, what it does in one line, and whether that job is
   (a) expressible today with native nodes (Expression, Condition, States, Array/Object nodes, Repeat, For Each,
   Variables, Component Object…), (b) expressible as a component wrapping a smaller Function with one job in and one
   answer out, or (c) genuinely script (the interpreter, three.js, a loop over the grid). Name the native node that
   would replace it, or the missing one that stops it.
2. For the 17 engine users: could the engine's work be cut at a few component boundaries ("run one step", "sense
   the tile ahead", "is the goal met") so the scripts call wires instead of helpers? Count how many helper calls cross
   each proposed boundary.
3. What a person or agent hits when they try (a) or (b): missing nodes, missing ports, awkward patterns — each one a
   product finding, filed.
4. Then re-ask ISL-005 with the numbers: how much shared code is left that only a script can hold.

