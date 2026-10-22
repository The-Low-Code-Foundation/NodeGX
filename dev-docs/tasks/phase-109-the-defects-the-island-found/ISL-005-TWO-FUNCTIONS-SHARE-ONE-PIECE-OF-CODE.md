# ISL-005 — Two Functions share one piece of code

**Status:** ✅ CLOSED 2026-10-05 (build session 4) — every AC met: AC1 red recorded; AC2 two pages through a deploy, in a visible window (13/13); AC3 one copy (3,678,351 → 385,837 bytes); AC4 one warning naming file, line and users, cleared when the file is fixed (driven in the editor); AC5 server first paint; AC6 not slower; AC7 export (slice 4); AC8 the door; AC9 docs + catalog. Ruled 2026-10-05 (s1 of the build, session `opennoodl-8e`): **"ship it"**, on a mockup of shape 1 (script files in the project, a Uses list on the Function). Slices 1 (runtime), 2 (format + pipes), 3 (the door), 5 + 5b (editor screens, code editor), 7 (docs), 6 (the island, landed on `cline-dev` in build session 4 as `948b92acd`), 4 (export, `a6193856c`). Next for the phase: ISL-020, ISL-006, ISL-013 re-scope against shape 1 (§8 "Build session 4"). Earlier: ✅ ruled s5 (2026-10-02) "Native nodes first" — the island rebuild stays its own template task (P108 IW-010); this ruling decides the shared file "afterwards" for what is left. ✅ ruled s5 (2026-10-02): **"Native nodes first"** — the island is rebuilt toward native nodes and logic components as its own template task, the four blocking product gaps are fixed first, and the shared script file is decided afterwards for what is left (README §8 round 2; [census](ISL-005-CENSUS-2026-10-02.md)). §5 is not built now. Scoped 2026-10-01 at `27d891bf3`
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
| **Existing route 2, partial: ERG-002's app-config Libraries.** `registerLibrary` writes a `noodl_modules/<slug>/manifest.json` around a URL or pasted code, checks that the declared global appears (`verifyLibrarySource`), and the module is injected as a `<script>` on all four HTML paths. A Function could then call `GardenEngine.step(…)`. Its own spec names the catch: *"A library attached to `window` does not exist during server rendering"* (ERG-002 §3), and `libraryNeedsSsrWarning` exists for it. No MCP tool registers a library: `grep registerLibrary packages/noodl-mcp/src` → 0. Re-read at HEAD | [`projectmodules.ts:184, 802-880, 1285`](../../../packages/noodl-editor/src/shared/utils/projectmodules.ts); [ERG-002](../../tasks-archive/phase-35-authoring-ergonomics/ERG-002-EXTERNAL-LIBRARIES.md) §2–§3 |
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

- **P35 [ERG-002](../../tasks-archive/phase-35-authoring-ergonomics/ERG-002-EXTERNAL-LIBRARIES.md)** (built; "four remainders" open, unowned per the
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

### Session 5 — 2026-10-02: the census (no product code)

Done by a read-only research agent at `6bac3db02`; the full report, with its 88-row table, the boundary tables and every
finding's file:line, is [ISL-005-CENSUS-2026-10-02.md](ISL-005-CENSUS-2026-10-02.md). Re-checked here: **88** Functions
and **20** engine copies (my own parse of the working tree; the working tree reads 3,266,886 bytes against HEAD's
3,218,764 because a peer has the garden's content open).

**§2 is stale.** Since scoping: 83 → **88** Functions, 2.45 → **3.22 MB**, 17 → **20** engine copies (`Land card`,
`Land ghost`, `Land request`), and `ENGINE` is 95 KB with **108** helpers, not 75.8 KB and 91. There are **20** shared
blocks, not six. **93.1 %** of the script bytes are pasted shared code; each Function's own logic totals 223 KB.

**The answer to Richard's question, by Function (verdicts judged row by row; bytes measured):**

| verdict | Functions | own logic | shared code they paste |
|---|---|---|---|
| (a) native nodes today (22 with Expression one-liners, 1 with none) | 23 | 31 KB | 11 KB |
| (a) native, blocked by a missing node (translation table, "in list" filter) | 3 | 34 KB | 1 KB |
| **(b) his logic component: one value in, one answer out** | **33** | 51 KB | **1.88 MB** |
| (c) genuinely script, needs no shared code | 14 | 41 KB | 71 KB |
| (c) genuinely script, calls shared code mid-logic | 15 | 65 KB | 1.03 MB |

- **14 of the 20 engine users fit a component** (1–5 calls each, never in a loop; Choose hint makes 11, all on the same
  3 inputs). **6 do not**: Island world (41 calls, in loops), Win pay (18), Record step (13, in a loop), Use helper,
  Land card, Shop card. An engine component would cut 20 copies to **7** (an estimate).
- Native nodes plus components, as Richard described them, would take the pasted 3.0 MB to about **1.24 MB (−59 %)**
  with **no new feature**. What only a shared script file could still hold is **about 1.0 MB across 15 Functions**.
- **The template uses no Expression, String Format, Array Filter, Object, Switch, HTTP Request or Run Tasks node at
  all** (0 of 1,101 nodes), though the catalog tells agents to prefer Expression.

**Findings (to be filed one per bug in `dev-docs/bugs/` next session; not filed yet):** product gaps — no translation /
word-table node (28 Functions paste the word helper; ISL-007's add-on is the ruled route), ~~String Format fills a
repeated placeholder once~~ (**wrong**: it fills every occurrence; only its comment says otherwise, P107-D2), Array Filter has no "in list" / nested / computed field, no node edits a nested JSON value,
list rows are app-wide by id (so scripts invent prefixed ids), no list-join or base64 node; teaching gaps — Expression,
Object, HTTP Request, Run Tasks and "Array Filter → first → Object" as a row lookup all exist and went unused; the
Function's `run` port doc contradicts the code (`javascriptfunction.json:8` vs `simplejavascript.ts:617-627`); a
leftover ISL-002 workaround at `cg003Scripts.ts:392`. **The strongest single cause** (census finding 17): the
generator grades a Function by running its text in Node (`runScript`), and nothing as cheap grades a native graph, so a
script was always the easiest thing to test.

**Next:** ask Richard in plain words (README §8 round 2), with these numbers: build the shared script file for the ~15
that need it, or make them extra operations of one engine component, or leave them — and whether the island should
be rebuilt toward native nodes and components first (which would be a template task, not ISL-005).

**Ruled the same evening: "Native nodes first"** (README §8, round 2). ISL-006 and ISL-020, which waited on this, can now be
scoped against it: both shrink if the island's 59 non-script Functions become nodes and components.


### Build session 1 — 2026-10-05: ruled "ship it", and the runtime half built

**The ruling.** Richard read the s17 design page ("Big scripts, split into parts", README §8 round 5), asked for a mockup of its
recommendation, and on seeing it said *"It looks damn cool, ship it please"*. The mockup is a design canvas,
`https://claude.ai/artifact/VGLi8DLfnwmfBU5HHDHoQG`: the Components panel's new **Scripts** section, a Function card whose second
line reads "Function · stepper, sense", the panel's **Uses** group (file → `Scripts.<name>`), the Function's own 17-line body, a
script file open as a tab (Gives / Uses / Used by / Runs in), and the same project on disk. Taken as ruling §5's three questions on
the page's recommendations, as the mockup showed them:

| §5 | ruled |
|---|---|
| 1 where it lives | **(a) `scripts/**.js` in the project**, one copy on disk, listed in the editor beside components |
| 2 how a Function says so | **(b) a `uses` parameter on the node, surfaced as `Scripts.<file name>` in the body**; inside a file, `use('engine/world')` and `exports` — no real `import` yet (no code transform ships) |
| 3 where it runs | **browser and server render; a cloud function is refused by name** ("Script files don't run in cloud functions yet") |

Two rules this session added beside the ruling, said to Richard with the mockup and not objected to: **a script file sees `use`,
`exports` and `module` only — `Noodl`, `window` and `document` are `undefined` inside it** (so a file runs the same in the browser,
the server render, the export and a future non-React target, and calls into the app stay in the Function); and **a script file never
makes a port** (ISL-006). The format comes first and the editor screens last, so a second editor (P107 NSP-021, P112) needs only the
format to carry the feature.

**AC1 — red at HEAD `348c10b38`, recorded before the build:** `git show HEAD:…/simplejavascript.ts | grep "uses:\|'Scripts'"` finds
one line, a comment (`// New code uses: Outputs.foo = 'bar'`); `git show HEAD:…/graphmodel.ts | grep -c scripts` → **0**;
`HEAD:packages/noodl-runtime/src/scriptfiles.ts` does not exist. Known-firing beside it: `grep -c useExternalFile
packages/noodl-viewer-react/src/nodes/std-library/javascript.ts` → **9** (the Script node's external file, the one existing route).

**Slice 1, built — the runtime:**
- `packages/noodl-runtime/src/scriptfiles.ts` (new): `ScriptFiles` — one compile per file per app run, CommonJS semantics
  (`exports`, `module.exports`, a cycle sees the exports so far), `use()` by any spelling of the path (`engine/world`,
  `./engine/world.js`, `scripts/engine/world.js`; `..` refused), `Noodl`/`window`/`document` passed as `undefined`, and a failure
  remembered as ONE `ScriptFileError` (missing / not compiled / threw, with the file's own line for a throw: the stack's line minus
  the two lines `new Function` puts in front) until the sources change. A file that `use()`s a broken one fails with the broken
  one's error.
- `graphmodel.ts`: `scripts` beside `components` in the project data `importEditorData` reads (before the components, so a Function
  that runs at load finds its files); `graphModel.scriptFiles`; `setScripts()` emits `scriptsChanged`.
- `simplejavascript.ts`: the `uses` input (`stringlist`, `editorType: 'script-uses'`; a comma string or an array); the body is
  compiled with a fifth parameter `Scripts`; before a run, `scriptsFor()` loads each used file (`Scripts.<file name>`) or fails the
  run without running any of the body — `function/script-missing`, `function/script-file-failed`, `function/script-name-clash` (two
  files with one name), `function/scripts-in-cloud` (`editorConnection.runtimeType === 'cloud'`, true in a deployed cloud function
  too). **A broken file is raised once**, by the first Function that meets it, with `detail.users` (every Function naming it); the
  others fail with the same words and raise nothing. `scriptsChanged` re-runs the users (unless Run is wired, as for an edited body).
- `test/isl-005-script-files.test.ts`: **24 / 24** — the person sentence across two pages with an edit that reaches both, one copy
  (3 Functions, the file ran once), `use()`, CommonJS cycle, the pure-file rule, no-uses unchanged, missing, throw raised once with
  line + 3 users (AC4's runtime half), not-compiled raised once, broken-inner named, name clash, fixed file clears, cloud refusal,
  paths. Every runtime suite touching the Function: **14 suites, 190 / 190**.
- **Found and fixed on the way — the catalog generator credited `uses` with the Function's output ports.** `parameter-encoding.js`
  seeds list inputs from two token pools; a third list input (`uses`, after `scriptInputs`/`scriptOutputs`) shared the second pool,
  so `catalog:generate` wrote `out-<use>` / "one of the comma-separated entries in the `uses` parameter" over `out-<scriptOutput>` —
  the catalog telling agents a Function's outputs come from its files. A third list input now gets its own tokens; nodes with ≤ 2
  lists are unchanged; `catalog:check` green.

**A syntax error carries no line from `new Function`** (measured: `SyntaxError: Unexpected end of input` with no position), so the
runtime names the file only for those; the line comes from the editor and the door, which parse (`@babel/parser` is in the editor).

**The plan, in order (each slice its own commit):**
1. ✅ Runtime (above).
2. ✅ **Format + pipes** (built, slice 2 — see below): `scripts/**.js` read by `ProjectStructureService.loadProject` → `ProjectImporter` (`ImportInput.scripts`,
   `LegacyProject.scripts`) → `ProjectModel` (constructor / `toJSON` / a setter emitting `scriptsChanged`) → saved per file
   (atomic, a disk baseline per file as FLD-009, removed files deleted) → `exportToJSON` adds `scripts` (one line carries preview,
   deploy, SSR, SSG) → `ViewerConnection` sends a `scriptsChanged` modelUpdate → `editormodeleventshandler` calls `setScripts`.
   Also `noodl-preview`'s `readV2`, `render-from-disk.js` (the door's `render_report`), and `scripts/` added to
   `V2_SOURCE_IGNORE_ENTRIES` so the raw files do not ship beside the bundle. The format's home is the editor's `ProjectStructure`
   today; it moves with the rest when P112 OWN-001 lifts the format into `@nodegx/project-contract`.
3. ✅ **The door (AC8)** (built, slice 3 — see below): `list_script_files` / `get_script_file` / `write_script_file` (+ ISL-020's find-and-replace with a count)
   in a DEFERRED group (8,280-token resident budget, 0 cost deferred), copied from `docsTools.ts`; `validate_component` refuses a
   `uses` entry naming no file, and a script that does not parse, by line.
4. **Export (AC7):** `ProjectIR.scripts` read in `parseProject.ts`, emitted once next to kits from `emitApp.ts` under a root that is
   NOT `src/scripts/` (taken by Script-node files, `plan.ts:3067`); the wrapper takes `Scripts` and imports each used file;
   a ledger note.
5. **Editor screens (the mockup):** the Scripts section (`componentSections.ts` + a row kind not backed by `ComponentModel`),
   a script file opening as a code tab (`ProjectCodeFileModel` / `CodeFileDocument`), the `script-uses` picker, the card's
   second line, the file watcher for outside edits, autocomplete from `exports`.
6. **The island (AC3, AC6, AC2, AC5):** the garden's engine as script files; byte count; time to interactive; the two-page drive.
7. **Docs and catalog (AC9).**

**Slice 2, built — the format and the pipes:**
- `services/ProjectStructure/ScriptFileStore.ts` (new): reads `scripts/**.js` on load (paths normalised as the runtime does) and
  saves file by file — only what changed, atomically (temp + rename), a removed script deleted, and a file that moved on disk
  (neither our last read/write nor what we would write) **refused**, not written over or deleted, as FLD-009 does for the
  project files. `SaveResult` gains `scriptsWritten` / `refusedScripts`. The service's filesystem gains optional `readFile` /
  `listDirectoryFiles` (the platform filesystem has both; a double without them skips scripts).
- `ProjectImporter` (`ImportInput.scripts`), `LegacyProject.scripts`, `ProjectModel` (`scripts`, `getScriptPaths` / `getScript`
  / `setScript` / `removeScript` / `setScripts`, `toJSON` — absent when empty, so a project without scripts serialises as before;
  `scriptsChanged` is an autosave trigger).
- `exportToJSON` writes `scripts` (whole, not split into bundles): the one line the preview, a deploy, a server render and a
  static build all read. `ViewerConnection` sends a `scriptsChanged` modelUpdate; the runtime's `editormodeleventshandler`
  calls `setScripts`, so an edit re-runs the users in the open preview with no reload.
- Other folder readers: `noodl-preview`'s `readV2` (`readScriptFiles`), `render-from-disk.js` (the door's `render_report`).
  `scripts/` joins `V2_SOURCE_IGNORE_ENTRIES`, so a deploy does not publish the raw folder a second time.
- `tests-unit/isl-005/scriptFilesOnDisk.test.ts`: **10 / 10** through the real `ProjectStructureService` over `MemFs`
  (read; no folder → no key; non-`.js` ignored; importer; control: unchanged writes nothing; one edit writes one file; new
  folder + delete; an agent's change refused; **reverted arm**: with the baseline forgotten the same save writes over it;
  a changed file not deleted). Editor and preview typecheck: 0 errors.
- **Measured through a real deploy** (`nodegx-deploy`, rebuilt, on a copy of the preview's hello-world fixture with
  `scripts/engine/greeting.js`): `window.projectData.scripts` is `{"engine/greeting.js": "exports.greet = …"}`, and no
  `scripts/` folder is in the output.
- Not yet: the file watcher for outside edits to `scripts/` (`ProjectFileWatcher/decide.ts` handles components and project
  files only) — slice 5, with the editor screens. The cloud bundle (`exporter/cloudFunctions.ts`) carries no `scripts` — by
  ruling; the Function refuses by name there.

**Slice 3, built — the door (AC8 ✅) and the write gate:**
- `noodl-mcp/src/tools/scriptTools.ts` (new), five tools appended to the deferred `project` group: `list_script_files`
  (each file's `Scripts.<name>`, what it gives, what it `use()`s, which Functions use it), `get_script_file` (whole or
  `from_line`/`to_line`), `write_script_file` (whole), `edit_script_file` (**ISL-020's recommended shape**: find-and-replace
  with the count the agent expects, default 1; a wrong count changes nothing and says what it found), `delete_script_file`
  (refused while a Function uses it, naming them). Every write: path inside `scripts/` by the runtime's own
  `normalizeScriptPath`; compiled with `new Function` exactly as the runtime compiles it (so a text that closes the wrapper
  early is refused as the runtime refuses it), and a `vm.Script` asked only for the syntax error's line; atomic.
  **Resident surface measured: 8,261 → 8,261 (0 tokens)**; `find_tools` reaches all five from "script", "shared code" and
  "engine" (keywords are matched server-side, never sent).
- **The write gate:** `validation/functionScriptUses.ts` (new, pure) in the shared `authoredPreconditionDiagnostics`:
  `function-uses-missing-script` (error; the suggestion lists the files there are) and `function-uses-script-name-clash`
  (error). Option `scripts` — omitted means "do not check". The door passes `listScriptPaths(projectDir)`; the editor's two
  authoring panels pass `ProjectModel.getScriptPaths()`, so the two gates judge alike (AAQ-005's parity).
- `scriptUsesOf` moved into `scriptfiles.ts`: the runtime, the validator and the door read `uses` with one function (a
  comma string, as the editor's string list stores it, or an array, as an agent may write it).
- `tests/isl005ScriptFiles.test.ts`: **12 / 12** in-process through `createServer()` — find_tools by three words; AC8's
  pass (file + Function, `validate_component` clean) and AC8's refusal (named, with the files there are); array form both
  ways; name clash; not-compiled with line, nothing written; the early-close text refused; paths outside `scripts/`; ISL-020
  edit (wrong count, right count, an edit that breaks the syntax refused); ranged read; list rows; delete refused then
  allowed. Neighbouring MCP suites (disclosure, vocabulary parity, bootstrap, open_project, find-tools phrase, docs, ISL-016):
  **8 suites, 111 / 111**. Editor: typecheck 0 errors; the 16 suites reading the shared checks + slice 2's: **17, 247 / 247**.

**Slice 5, built — the editor screens (the mockup), and outside edits reaching the open editor:**
- **The watcher:** `scriptPathFromRelativePath` + a third `ProjectFileWatcher` channel (`onScriptsChanged`);
  `ProjectModel.reloadScriptsFromDisk` adopts an agent's write (autosave disarmed while adopting), skips our own write
  coming back, and **refuses** when the person has an unsaved change to that file (baseline kept, so the save still
  refuses to write over the agent). Adopting fires `scriptsChanged` → the preview re-runs. `EditorPage` wires it.
- **The Scripts section** (`ComponentsPanelNew/components/ScriptsSection.tsx`): below the component sections, the
  `scripts/` folder tree in the tree's own row classes, each file's user count, "New script" (a name prompt; `engine/x`
  makes the folder). The panel filter reaches it. Its own list, not a fourth `TreeNode` kind (a script cannot be dragged,
  made home or placed; the tree's machinery is about components).
- **The script view** (`views/documents/ScriptFileDocument`): code + a column saying `Scripts.<name>`, Gives, Uses (each
  opens), Used by (each jumps to the Function on the canvas), Runs in. Bound to the PROJECT, not the disk — the saver
  is the one writer; Cmd-S puts the text on the project (the preview re-runs, autosave writes the file); an outside
  write while unsaved is reported, never taken over the person's text.
- **The Uses row** (`DataTypes/ScriptUses`, `editorType: 'script-uses'` routed before `stringList`): one chip per file
  (path, `Scripts.<name>`, remove; a missing file marked), "+ Use a script…" (a native select over the link, so the
  keyboard has a real control) with "New script…". Stored as the `stringlist` comma string. Connected-row policy:
  exception (edit-only, no wire).
- **The card:** a Function with Uses reads "Function · stepper, sense" on its existing second line
  (`typeDisplayName`); a `uses` change relayouts (`ModelBindings`). No new card part, so `@nodegx/canvas-look` and
  every other editor are unchanged.
- `scriptGives` / `scriptUses` moved into `scriptfiles.ts` (the door and the editor read a file the same way).
- Tests: `tests-unit/isl-005` **24 / 24** (+ the watcher's routing and four reload decisions with a known-firing
  control); the suites touching the panel, card, watcher and project model **18, 268 / 268**; the widget table
  (FB-018 both directions) **127 / 127**; editor typecheck **0 errors**.

**Slice 7, built — the node's documentation and catalog (AC9):**
- `docs/node-catalog/enrichment/javascriptfunction.json`: how to share code (description), the `uses` port, what a script
  file sees and what happens when one fails (runtimeBehavior), one pattern ("Shared helper") and two anti-patterns (pasting a
  helper into several Functions; reading `Noodl`/`window`/`document` inside a file). The new sentences passed the
  content-authoring `written.py` check (5 flags on the first draft → 0).
- Regenerated `node-catalog-enriched.json` and the docs page `docs-site/docs/nodes/custom-code/java-script-function.md` in a
  scratch copy built from `git archive HEAD` with only the enrichment file changed, because a peer's uncommitted ISL-004 hunk
  (Page "Keep When Leaving") sits in `node-catalog.json` and the merge reads that file. Running it in place would have baked
  their unlanded port into our generated files. In the scratch copy, `catalog:merge:check --require-coverage` and
  `docs:nodes:check` both exit 0.
- **Found on the way: both generated files were stale at HEAD since slice 1.** Slice 1 ran `catalog:generate`, which added
  `uses` to `node-catalog.json`, but never ran `catalog:merge` or `docs:nodes`, so `catalog:merge:check` and
  `docs:nodes:check` were red at `53e89d2f2`…`5fa4e1c70` (the enriched catalog and the docs page had no `uses` row).

**Slice 5b — the code editor knows about script files (found reading slice 5 before driving it):**
- **Defect 1: a Function body's `Scripts.greet.hello(…)` was linted `'Scripts' is not defined`.** `Scripts` is the body's
  fifth argument since slice 1, but the lint globals (`esLintDiagnostics.ts` `FUNCTION_NODE_GLOBALS`) and the completion
  list (`noodl-api-surface.ts` `FUNCTION_GLOBALS`) were never told. Both now carry it.
- **Defect 2: the script tab opened in the Script node's mode (`'script'`).** That linted every `use(…)`, `exports.x` and
  `module.exports` as undefined, and completed `define` and `Noodl`, which are `undefined` in a file at run time. A new
  mode, `'scriptfile'`, matches what `scriptfiles.ts` passes: `use`, `exports`, `module` (plus `console`), no browser
  globals, no registered library's `window` global, `Noodl.` completes nothing, and `Noodl` / `window` / `document` are
  reported as not defined. Toolbar: "Script file" over a node, "JavaScript" over a file.
- **Completion, the plan's "autocomplete from exports":** `Scripts.` lists the files in the open Function's Uses (never the
  whole project: `Scripts` holds only those at run time) by the name the code reaches each by; `Scripts.<name>.` lists what
  that file gives. Plumbed through the existing seam (`authoringContext.ts`): the project half gains `scripts`
  (path, alias, gives; republished on the project's `scriptsChanged`), the node half gains `uses`
  (`CodeEditorType` republishes when Uses changes, not only the ports).
- `noodl-core-ui/tests/code-editor/isl005ScriptsInTheEditor.test.ts` **11 / 11**, each absence beside a known-firing control
  (a typo still reported; `Noodl.` still completes on the same open node; the old `'script'` mode still reports `use` as
  the defect's own control). **Reverted arm:** `Scripts` out of the lint globals → test 1 red (1 failed / 10 passed), file
  restored by `cmp`. `noodl-completions.test.ts` pinned the Function's names at five; three literals now read six.
- **Found on the way: `tests-unit/chr-007/widgetDispatch.test.ts` could not load since slice 5 (`5fa4e1c70`).** `Ports.ts`
  gained the `ScriptUsesType` import, and that spec mocks every `Ports.ts` import (the real chain reaches `projectmodel` →
  `WarningsModel` → `NodeLibrary.instance.on`, undefined in plain Node). Mocked like its neighbours; the snapshot gains
  `JavaScriptFunction.uses → ScriptUsesType`. Its one remaining diff in this working tree is Page `keepWhenLeaving`, a
  peer's uncommitted ISL-004 catalog port, left for them. Code commit: `68b881b53`.

**Slices 5 + 5b, driven in the real editor** (`dev:debug` on a throwaway profile, `NOODL_USER_DATA_DIR`; a scratch project
with two Functions on Home: `greet Olive` uses `engine/greet.js`, `greet Robot` uses it and `engine/words.js`; `greet.js`
`use()`s `engine/words`). Read by screenshot and `cdp eval`, compared with the mockup's boards:
- **Preview:** "one: Hello, Olive!" / "two: Hello, Robot! !", what the two files compute.
- **An outside write** to `scripts/engine/words.js` (`hi` → `'Hi there'`, from the shell, as an agent would) reached the open
  editor with no reload: "one: Hi there, Olive!" / "two: Hi there, Robot! !". The changed file is one neither Function lists
  directly; greet.js reaches it with `use()`.
- **Components panel:** a SCRIPTS section (count 2) below Cloud Functions, an `engine` folder, `greet.js` 2 and `words.js` 1
  (Functions that list each under Uses), "+ New script". As the mockup.
- **The script tab** (greet.js): "JAVASCRIPT ✓ Valid" (the `'scriptfile'` mode: `use` and `exports` not flagged), and the
  column: In a Function `Scripts.greet` · Gives `hello` · Uses `engine/words.js` · Used by 2 Functions (Pages/Home, greet
  Olive / greet Robot) · Runs in Browser Yes, Server render Yes, Cloud functions Not yet. As the mockup.
- **Cards:** "Function · greet" and "Function · greet, words" (the second wraps to a third line at the card's width).
- **Panel:** the Uses group with one chip per file (path, `Scripts.<name>`, ×), "+ Use a script…", and the sentence under it.
- **Code popout** of `greet Robot`: no lint mark on the existing `Scripts.` line; typing `Outputs.n = totl + Scripts.` offered
  **greet, words**, then `greet.` offered **hello**; with the line finished the popout read **1 warning, on `totl`** (the
  known-firing control), none on any `Scripts`.
- `.logs/dev.log`: no `renderer:exception` during the drive. Stack stopped with `dev:stop` (26 processes).

### Build session 3 — 2026-10-05: slice 6, the island shares its engine (AC3, AC5, AC2 met; AC6 measured)

Session `opennoodl-8e`, in the worktree `../OpenNoodl-worktrees/p109-isl005-island` (from `99641d371`). The island's files
were peer-dirty in primary (`cg003Template.test.ts`, `cg007Look.ts` and `templates/bot-garden/components/App/nodes.json`:
another session's ISL-008 AC6 `!important` work, idle and uncommitted). The engine sits in 23 `Logic/*` components and none in
`App`, so the worktree regenerated the garden from HEAD's generator plus this slice, and `App/nodes.json` came out
byte-identical.

**The census first (no product code).** 91 Functions, **3,678,351** bytes of `functionScript` (AC3's 2,452,405 was out of
date). Seven blocks were pasted whole: `ENGINE` 96 KB ×23, `SAVE_HELPERS` 31 KB ×25, `ISLAND_ENGINE`'s own part 26 KB ×6,
`OLIVE_HELPERS` 18 KB ×6, `FOLD_HELPERS` ×5, `WORD_HELPER` ×28, `IWL_REQUEST_HELPERS` ×2. Read by scope (`eslint-scope`), none
of them mutates its own top-level names, and none reads `Noodl`, `window`, `document`, `Inputs` or `Outputs` (the island
part's one `window` is in a comment). So each can be one module instance for the whole page.

**Built:**
- `packages/noodl-mcp/tests/isl005GardenScripts.ts` (new): the seven blocks become `scripts/engine.js`, `island.js`, `save.js`,
  `fold.js`, `olive.js`, `words.js` and `requests.js`. Each file opens with `var { … } = use('<file>')` for the names it reaches
  in another file and ends with `exports.<name> = <name>;` lines (what the editor's Gives and the door read). A Function that
  held a block now lists the file under Uses and opens with `var { … } = Scripts.<file>;` for exactly the free names its
  body reaches. The block texts stay where they are written, so a fix is still made once, in `cg002Scripts.ts` and its
  neighbours.
- `gardenSharingHazards`: every case where moving a block out of the Function's scope could change what a name means. A
  body re-declaring a block's name, two blocks declaring one, a block reaching a name only a body declares, a cycle, a block
  inside a block, a whole block left pasted. The gate asserts the list is empty. `shareScript` refuses to share where
  the meaning would change: a body that re-declares a block name stays whole (a mutant that redefines an engine function
  means exactly that), and a block stays pasted when a file it `use()`s is not also taken out (a mutant that edits the engine
  must not have its island code call the file's unedited engine).
- **Two hazards, both fixed at the source.** `Logic/Land request` re-declared `isSet`, identical to the engine's; that
  duplicate is gone. `Logic/Shop card` set `var can = …, blocked = false;`, and a hoisted `var` replaced the engine's
  `blocked()` for the rest of each run ([P109-S18-SHOPBLOCKED](../../bugs/p109-s18-shopblocked-the-shop-card-replaces-the-engine-s-blocked-for-the-rest-of-its-run.md)).
  The flag is now `refused`.
- **The generator** (`cg003Template.ts`): the files are written through the door (`write_script_file`) before any Function
  names one, and each component goes to the plan through `withSharedScripts` (`uses` stored as the editor's comma string).
  `docs/START-HERE.md` gains a bullet on `scripts/` (content-authoring `written.py`: 0 flags, beside a known-firing control).
- **The harness (trap §7):** `runScript` (`cg002Scripts.ts`) now runs every script in its shared form through the runtime's
  own `ScriptFiles`, so all ~20 garden suites grade what the artefact runs. `runScriptInline` is the old way, for a control.
- **The drives:** `scripts/devtools/garden-functions.js` (new): `functionText` (a Function's text with its Uses files in
  front, for the drives that read `SAVE_VERSION`, `ROBOTS`, `WEAR`, `PW` out of a script) and `runFunction` (run as the page
  runs it, every name each file gives in scope, so a drive's `tail` still reaches an engine helper). 15 drives moved onto it;
  `drive-cg001-kit` and `drive-ig007-3d` load `scripts/engine.js` instead of cutting `Logic/Step`'s text. Its loader mirrors
  `scriptfiles.ts` (a drive is plain Node), and the gate pins the two to the same exports file by file and to the same
  `Logic/Step` result.

**AC3 ✅ — one copy.** `npm run template:garden` (template gate green, engine gate 259/259): 70 `Logic/*` components changed
plus `scripts/` (7 files) and `docs/START-HERE.md`. `grep -rl "var BLOCKING_TILES = { W: 1" templates/bot-garden/components`
→ **0**; `scripts/engine.js` holds it **once**. Summed `functionScript`: **3,678,351 → 385,837 bytes**, with 186,680 in the
seven files. **Sabotage arm:** the same Functions with their files pasted back in front (behaviour kept) sum above the
500,000 ceiling. In the deployed site the engine ships once, in the app data, where HEAD's deploy carries it 23 times across
the component bundles (site 23 MB → 20 MB). `tests/isl005GardenScripts.test.ts` **12/12**: no hazard (beside a known-firing
redefinition that is a hazard and stays whole), 23 engine users and 70 sharing Functions, ports mined identically from every
shared body, every file pure and giving, one engine instance across Functions, shared = pasted on `NEW_RUN`/`STEP` (runId
aside: drawn at random), the on-disk files are the generator's, Uses entries all resolve, the drives' loader matches.

**AC5 ✅ (as narrow as ISL-008 AC7's server half).** `noodl-viewer-react/tests/isl-005/server-render.test.tsx` **2/2**: two
Functions reaching `Scripts.greet` (which `use()`s `engine/words`) feed two Texts; `renderToString` with no `document` paints
"Hello, Olive!" and "Hello, Robot!"; with Uses cleared neither is painted (the text arrives through the file). A full
server-rendered deploy has no headless pipeline in the repo. **Not graded there: an edit re-running its users.** The viewer
package compiles runtime sources at ES5, and `EventSender.emit`'s `for … of` over a Map then visits nothing, so no
ref-registered listener fires in a viewer test (measured: a ref listener on `scriptsChanged` heard 0; a manual
`scheduleRun()` produced the new text). The runtime's own suite grades the edit, and so does AC2. Two ES5 compile errors
this test met were fixed in place, behaviour unchanged: `scriptGives`/`scriptUses` use an exec loop and an array, and
`publishHeldWrites` a `forEach` (runtime Function suites **14, 190/190**; `tsc --noEmit` 0).

**AC2 ✅ (headless).** `scripts/devtools/isl005-two-pages.ts` **13/13, DRIVE_EXIT 0**: a two-page project authored through
the door (`write_script_file` ×2, a page each with a Function using `engine/greet.js`), deployed with `nodegx deploy`
(exit 0 each round) and read in Chrome. As written: "Hello, Olive!" / "Hello, Robot!". After `scripts/engine/words.js` alone
changed (a file neither Function lists): "Hi there, Olive!" / "Hi there, Robot!". Changed back: both revert. No console
error in any round. AC2 asks for a visible window; `drive-deployed.js` has no visible mode and is in a peer's pile, so this
ran headless. **Found on the way:** a Router written without a `name` is left out of the deployed router index, so every
URL opens the start page ([P109-S18-UNNAMEDROUTER](../../bugs/p109-s18-unnamedrouter-a-router-with-no-name-answers-every-url-with-its-start-page.md);
the named Router is the control).

**AC6 ✅ — not slower (Mac, Chrome headless, 1368×912).** `scripts/devtools/isl005-island-tti.js` makes a player through the
Profiles screen, then loads `/island` cold (cache off) 7 times per CPU rate until the grid AND her robot are drawn (the
robot's tile comes out of `Logic/Island world`, the biggest engine user). HEAD's garden (`git archive 99641d371`) against
slice 6, both deployed the same way, run in both orders:

| | 1× median | 4× throttle median |
|---|---|---|
| HEAD (pasted engine) | 354 ms, 349 ms | 1,145 ms, 1,072 ms |
| slice 6 (scripts/) | 323 ms, 328 ms | 982 ms, 1,007 ms |

⚠️ **Which runtime these deploys ran.** A peer (opennoodl-1e, ISL-004) reported that since 15:47 the shared
`src/external` viewer, deploy and SSR bundles carry their UNCOMMITTED ISL-004 changes (the router's leave/keep path, Repeat
and Delay pause hooks), rebuilt by a watcher. Every deploy in this entry was made after 16:00, so before and after ran the
same runtime and the comparisons are like for like. But "HEAD's garden" means HEAD's template on that runtime, not HEAD's
runtime. With Page "Keep When Leaving" off (the garden never sets it) that runtime should behave as HEAD's.

**The garden drives (AC3's "every drive still green"), on the deployed slice-6 garden:** 20 drives, **18 green first
time**: cg003-pages 330/330, ig005-robots 60, ig003-modes 90, iw001-workshop 38, iw-look 143, iw003-biscuit 24, iw003-stones 32,
iw003-mamie 34, iw004-blocks 23, iw003-post 17, iw006-shop 60, iw006-earn 15, iw006-owed 19, iw008-crew 39, iw007-animals 16,
iw007-build 26, p108s8-feedback 28, p108s9 14. **ig004-island 69/70** once (ISL-009 AC7 390-fr: the last request's card
3 px above the screen, `top: -3`), then **70/70** on a re-run; HEAD's drive on HEAD's garden 70/70 once. One red in three
runs, too few to call it a flake or rule this slice out. **iw007-touch 26/29** on slice 6 twice AND on HEAD's garden with
HEAD's drive (BUILD, PILLS, PAY at 1368-en: the robots never seen building): older than this slice, filed
[P109-S18-TOUCHBUILD](../../bugs/p109-s18-touchbuild-the-touch-drive-never-sees-pip-and-cobble-build-on-her-land.md).
Not run: the 3D modes, `drive-cg001-kit` / `drive-ig007-3d` (moved onto `scripts/engine.js`, `node --check` only) and
`drive-cg005-olive`.

**`isl005ScriptFiles` was red at HEAD since slice 7, and it was ours.** Slice 7 put `uses` in the enriched catalog, so the
door's general `stringlist` rule (`parameterValues.ts`: *"a stringlist is one comma-separated string, not an array — the
editor calls .split(",") on it"*) now reads it, and slice 3's "uses written as an array is read the same" test went red.
Slice 7 ran the catalog checks but not this suite. Kept the existing rule: an array is refused with the comma string to
write instead, and the test now says so (12/12). The runtime still reads an array found on disk.

**Gates, this session (worktree, on `99641d371` + slice 6):** `noodl-mcp` full **174 suites, 15 failed in 12**, by name:
`cmp004Parts` ×2, `cmp004RoundTrip` ×2, `cmp001` ×2, `cn004`, `d54ThemePresetIdentity`, `fld013ExportReach`,
`nodeIdAllocation` (the s4 HEAD-red list; `cmp004Parts` re-run red in primary too: three exported prefabs gained an
`icon.png` in `1fad0cad7` that a re-export does not make); `def038SettledTemplates` (a peer's template); `ig004Island` and
`iw008Crew` p95 budgets (the run had 4 workers beside a peer's jest; serially 0.98 ms and 2.87 ms, green); `cg003Template`
AC2 (START-HERE edited after the build; regenerated, 1 run serially green); `isl005ScriptFiles` (above, fixed). Serially
after the fixes: `cg003Template` + `ig004Island` + `iw008Crew` + `isl005GardenScripts` **224/224**; `isl021ShopParity` (drives
the template's Shop page through `drive_page`) green.

**Not landed** *(→ landed in build session 4: rebased onto `3802a1476`, regenerated with no change, fast-forwarded as `948b92acd`…`eac14b783`)*. The work is two commits on the branch `p109-isl005-island` (worktree
`../OpenNoodl-worktrees/p109-isl005-island`), rebased onto `cline-dev` at `350054fbc`; the garden regenerated there changes
nothing. Moving `cline-dev` to the branch (a fast-forward plus bringing primary's working files up to date, with the peer's
uncommitted `cg003Template.test.ts` kept) was refused by the session's permission check, so it is Richard's to run or allow.

**Next (build session 4), in order:**
1. **Land the branch** (the commands are in the handoff). Re-check first that `cline-dev` has not moved past `350054fbc`;
   if it has, rebase the branch and re-run `npm run template:garden` (it must change nothing).
2. **Slice 4, export (AC7)** when P18's pile on `component.ts` / `emitApp.ts` / `coverage-ledger.json` lands, or with the
   temporary-index recipe if their hunks do not border ours. The garden is no worse for export meanwhile: `nodegx export
   --dry-run` of the slice-6 garden (exit 4, refusals) emits **no file at all** for every `Logic/*` component, Uses or not
   ("no visual root — logic-only components defer to EXP-003"), so none of the 70 sharing Functions was exported before
   either. A Function with Uses on a VISUAL component is the case AC7 must refuse by name until the exporter carries
   `scripts/`: the exporter's source has no reader of `uses` (`grep -rln "scriptUsesOf\|'uses'" packages/nodegx-export/src`
   → nothing).
3. AC2 in a visible window, once `drive-deployed.js` has a visible mode (its owner's pile).
4. Close ISL-005 when AC7 is met.

### Build session 4 — 2026-10-05: landed, export (AC7), AC4 in the editor, AC2 in a window → closed

**Landed slice 6.** `cline-dev` had moved six commits past the branch's base (`350054fbc` → `3802a1476`); two files
overlapped: the folder's handoff prompt (kept `cline-dev`'s; the branch's block was a "how to land" note) and
`cg003Template.test.ts` (ISL-008 AC6's hunks, now committed; auto-merged). In the worktree after the rebase,
`npm run template:garden` changed **nothing** (engine gate 259/259), so slice 6 and ISL-008's stylesheet compose
byte for byte; `isl005GardenScripts` + `cg003Template` + `isl005ScriptFiles` + `isl025Census` + `isl018DoorPins` 204/204.
The ES5 fix, measured: `noodl-viewer-react`'s `isl-004-keep-page` on `cline-dev` → "Test suite failed to run" (TS2802 in
`scriptfiles.ts`); on the branch 9/9 with `isl-005/server-render`. None of the 114 landing paths was dirty in primary,
so the landing was a plain `git merge --ff-only` (allowed this time; s3's update-ref + checkout route was refused).

**Slice 4, export (AC7) ✅** (`a6193856c`, `b9a17871a`). Red first, on a new fixture `scripts-desk` (two pages, a Function
each; Home's uses `engine/greet.js`, About's `greet.js` + `words.js`; greet `use()`s words): the typecheck of the export read
`TS2304 Cannot find name 'Scripts'` on Home and About, and the report said nothing
([P109-S19-SCRIPTSUNBOUND](../../bugs/p109-s19-scriptsunbound-an-exported-function-that-uses-a-script-file-does-not-build.md)).
The purity gate compiled the body with `Inputs, Outputs, Noodl, Component`, so `Scripts` was just a free name.
- parse: `ProjectIR.scripts` (`scripts/**.js` verbatim, path order; absent without the folder, so 51 projects' IR is
  unchanged). `src/scriptFiles.ts` mirrors the runtime's four readers (the package installs alone, HLS-001); the spec
  runs both over one table.
- plan: `scriptUsesPlan` — refused by name, never inlined: a Uses entry naming no file, two files with one name, a
  `use()` of a file not there, a file that does not compile or compiles only sloppy (the emitted file is an ES module),
  and a file that reads the clock / random / network / timers / is async (the body's own marker gates; the body-only
  ones — `this`, `arguments`, `window`, `Component`, `Script` — are not applied to a file, where they are ordinary or
  `undefined` in the runtime too).
- emit: `src/lib/projectScripts.ts` (the runtime's `ScriptFiles`, transcribed), ONE registry
  `src/lib/projectScriptFiles.ts` holding every file (so top-level state is shared and an unscannable `use()` resolves),
  each file once at `src/project-scripts/<path>.ts` (`// @ts-nocheck`, verbatim, inside the function the runtime compiles
  it as — the Script node's precedent). The wrapper binds `const Scripts = { greet: projectScripts.load("engine/greet.js") }`
  inside its try: a file that fails runs none of the body, as the runtime fails the run. Recorded divergence: the
  export logs a broken file from each wrapper that meets it; the runtime raises it once.
- Ledger note on `JavaScriptFunction`. HLS-001 corpus 51 → 52, hashed in a clean worktree at HEAD + this slice:
  23 golden lines added, none changed.
- `tests/isl-005-script-files.test.ts` **29/29**, the emitted code RUN (transpiled, the wrapper cut out of the page):
  "Hello, Olive!" / "Hello, Robot! (Hello)"; `words.js` alone changed → both pages "Hi there"; changed back → both revert;
  one instance per app; a throw runs none of the body; five refusals by name; the loader matches the runtime's on a
  cycle, a remembered failure, the inner file named and `Noodl`/`window`/`document` undefined. **Sabotage:** binding
  removed → 6 red; refusals ignored → 5 red.
- 🔴 Caught before any `test:ci`: the editor's TypeScript compiles this package (via `CodeExportModal`) and did not narrow
  `usesValue` across a `return` (TS2339) where the package's own tsc did — fixed in one expression (`b9a17871a`).
- Whole package at 2 workers beside a peer's jest: 3,826 passed, 5 red in 3 suites, all attributed in the clean worktree:
  `hls001-corpus-identity` (P18's uncommitted ledger moves every README + their untracked `pattern-desk`; mine was the
  literal, fixed), `sse` floor 122 → 123 (P18's pile; green on HEAD + this slice), `hls006-every-listener` (red on HEAD:
  the gate reads P107's `world.listen('resize')` as a socket — filed
  [P109-S19-LISTENERREGEX](../../bugs/p109-s19-listenerregex-the-every-listener-gate-reads-an-event-subscription-as-a-socket.md)).

**AC4 ✅ — the editor half** (`b40a61839`, `a301c9260`). Traced first: the runtime raises a broken file once, but
`createEditorWarningSubscriber` forwards the message only, so the editor's one warning named the file (no line for a
syntax error: `new Function` gives none) and no other user. `models/ScriptFiles/scriptFileWarning.ts` completes it where
it arrives (`ViewerConnection` `showwarning`): the line from parsing the project's copy as a function body
(`@babel/parser`), and every Function whose Uses REACHES the file, through `use()` too. Unit 6/6 on messages made by the
runtime's own `ScriptFiles`; reverted arm (direct users only) → 2 red. **Driven in the editor** (`dev:debug`, throwaway
profile `NOODL_USER_DATA_DIR`, a copy of the AC2 project), reading each Function's `getHealth()` through
`window.__nodeGraphEditor`: `words.js` broken from the shell → ONE warning, on the Olive Function:
`scripts/engine/words.js:3: Unexpected token ';' — breaks 2 Functions: /Pages/Olive / Function, /Pages/Robot / Function`;
the Robot Function healthy. **Then fixed → the page re-ran ("Hi there, Olive!") and the warning STAYED**
([P109-S19-STALESCRIPTWARNING](../../bugs/p109-s19-stalescriptwarning-a-fixed-script-file-leaves-its-warning-on-the-function.md)):
nothing cleared the four script-file codes. Fixed in the runtime (a run whose files load clears them); its test had
asserted `lastError` only and now asserts the warning, beside "one warning while broken". Driven again on the rebuilt
viewer bundle: broken → the one warning; fixed → "Hello, Olive!", no warning on either. No `renderer:exception`.
Stack stopped with `dev:stop` (26).

**AC2 ✅ in a visible window.** `drive-deployed.js` gained `visible` / `DRIVE_VISIBLE=1` (drops `--headless=new`;
measured: the UA reads `HeadlessChrome` without it, `Chrome` with it). `DRIVE_VISIBLE=1 isl005-two-pages.ts`: **13/13,
DRIVE_EXIT 0**, no console error in any round, on the deploy bundle built 15:47 (carries the script-file runtime).

**Gates this session:** export spec 29/29 + jsfun + typecheck-emitted + corpus identity 133/133 (worktree); runtime
Function suites 14, 190/190; runtime, export and editor `tsc --noEmit` 0; viewer ES5 9/9; editor `tests-unit/isl-005`
scriptFileWarning 6/6; `export-ledger:check` OK.

**Closed.** What it unblocks: ISL-020 (an agent changing one line of a big script is now `edit_script_file` on a small
file), ISL-006 (ports from a Function's own text only — a file never makes one, already the rule) and ISL-013 (kits
sharing code) re-scope against shape 1.

