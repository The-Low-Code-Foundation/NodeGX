# Phase 112 — next session

**Written 2026-10-11 at the end of session 8** (Fable 5.1). Session 8 built OWN-003 steps 2–4 (the real engine with a
way in, in a page: the runtime test helper bundled, 85 / 85 graph scenarios in headless Chrome) and finished OWN-006
(the graph half: an adapter's runner graded through two doors; the prototype page passes files and graphs). Earlier
handoffs are in this file's git history (`git log -p -- NEXT-SESSION-PROMPT.md`); what still holds is under "Standing
findings".

## The board (re-derived from the task files, 2026-10-11)

| task | built | driven / gated | Model |
|---|---|---|---|
| OWN-000 the prototypes, measured | 🟢 | census re-run s8 (engine section) | — |
| OWN-001 the format leaves the editor | 🟢 AC1–AC4 | s5 readings (§6.2) | — |
| OWN-002 the spec in a page | 🟢 | §6 | — |
| OWN-003 one way to run a graph | 🟢 **s8: steps 2–4** — `@noodl/preview` `dist/browser/noodl-graph-target.js` | `graph-target-check` **85 / 85**, mutant 6 / 85 red; census todo-list 19 of 531 → 382 of 883 | — |
| OWN-004 the real app beside it | 🟢 slices 1–3 | `real/check.mjs` PASS (s6); `in-page-check --all` 13 / 13 (s3) | §6.3 items 2–5 **Opus** |
| OWN-005 the look | 🟢 | §6 | — |
| OWN-006 the editor suite | 🟢 **s8: the graph half** (two doors) | prototype through the suite: **PASS, files + 85 / 85 graphs, 11.4 s**; project-contract 263 / 263; node-spec graph test 128 / 128; the runtime arm: see "Unverified" | — |
| OWN-007 the brief | 📋 (R3: a skill in a public repo, for any AI coder) | — | see its file |
| OWN-008 three strangers | 📋 | — | see its file |
| OWN-009 Richard's own | 📋 | — | see its file |
| OWN-010 every bug teaches the kit | 🟡 ledger half (R6: an open blocker stops a publish) | `bugs.js kits` | see its file |
| OWN-011 one install | 📋 unblocked (R2: publish at 0.x) | — | **Opus** |
| OWN-012 the screen, from the descriptions | 📋 | — | step 1 **Opus**, 2–3 **Fable** |

**Built but undriven: 0** (one reading pending, below). **ACs closed this session: OWN-003 AC2, AC3 (its real-engine
form), AC4; OWN-006's graph half.**

## Read this before trusting a red (the state of the shared files at 10:29 on 2026-10-11)

`packages/noodl-runtime/test/node-spec/editor-suite-graph.test.ts` (six arms) ran directly at the end of s8: **4 passed,
2 failed** — the two PASS arms (each door on the real engine) listed five scenarios red: s07 ×4 (Record's `prop-<field>`
outputs not recorded) and t11 (States' `reached-B` not pulsed). **At the same minute the Node reference itself,
`graph.test.ts`, was red on exactly those five** (91 / 96), green three times earlier in the session. A P107 peer (s82,
derived ports: `rederive`, `playOutputs`) had edited the helper at 10:19 and node-spec's `ports.ts` / `interpreter.ts` /
`spec.ts` at 10:12–10:15, all uncommitted. The five are that work in flight. This session's helper hunks (`installUser`
by descriptor; `withViewerNodes` split) touch neither derived ports nor the five; they were committed through a
temporary index on HEAD without the peer's hunks. **Run first:**

```
cd packages/noodl-runtime && npx jest test/node-spec/graph.test.ts test/node-spec/editor-suite-graph.test.ts
```

Expected once the peer has landed or withdrawn their edit: 96 / 96 and 6 / 6. If `graph.test.ts` is green and the suite
test is not, the suite test is the thing to read. The same background run (`npx jest test/node-spec`, 25 min) had
`conformance.test.ts` red on Drag, Radio Button Group and DbModel2 — the same area and time; not this work either.

## Session 8 in brief

- **OWN-003 §6.1.** The kit's page runner is the runtime test helper (`noodl-runtime/test/helpers/node-spec-target.ts`,
  `runtimeTarget()`) **bundled, not ported** — it is what recorded the reference traces, so a port would have been a
  second copy of the definition. `packages/noodl-preview/src/inPage/graphTarget.ts` → `dist/browser/noodl-graph-target.js`
  (2,881 KB, global `NodegxGraphTarget`: `graphTarget()` a fresh engine with 130 types, `spec` the spec package's
  browser entry). build.mjs's THE GRAPH TARGET section names the four replacements (`async_hooks`, `buffer`'s `File`,
  `jsdom`, the `/node` entry) and generates the viewer-node module from the helper's own four lists.
- **Three helper edits, platform-free:** `withViewerNodes` → Node loader + `registerViewerModules(target, modules)`;
  `ensureAppGlobals()` (the `Noodl` global a visual module reads at load; the first page run died there);
  `installUser` installs the play's storage **by descriptor** (**P112-S8-SESSIONLEAK**, fixed: `globalThis.localStorage =
  {}` is a no-op in a page — five of 85 read the previous play's login).
- **The gate:** `npm --prefix packages/noodl-preview run graph-target-check` (85 / 85 in 1.2 s; `--mutant two-frames`
  6 / 85 red; `--types <file>` for the census; `--only`).
- **AC4:** `scripts/own/census.js` reads `engine-types.json` → CENSUS.md "On the real engine": todo-list 382 of 883
  headless + 398 visual; all templates 4,154 / 4,049 / 158 unregistered (cloud-function nodes 146, CSS Definition 12).
  `templates/nightbook` is a peer's untracked folder and is in the count.
- **OWN-006 §6.4, the graph half.** `suite.ts`: `graphTarget()` (fresh per scenario) **or** `playGraph(scenario, file)`
  (the editor plays it, hands the trace back); `SuiteOptions.graph` grader; a runner with no grader is not a pass.
  `editor-suite-node.ts` `graphGraderFromNodeSpec()` (the sibling import named in P116's gate, which now also catches a
  relative import leaving the package). node-spec `runner/graph.ts`: `gradeGraphScenario`, `playGraphForGrading`,
  `graphResultsConform` extracted; `runGraphScenarios` unchanged in behaviour (128 / 128).
- **Why two doors (a design fact for OWN-007):** a step-by-step `GraphTarget` proxy over CDP reached 84 / 85 — nested
  popups (t12) a frame early, because each round trip is an event-loop turn between steps the reference recorded as
  one synchronous run; batching the steps did not help (the turn between one `settle` resolving and the next starting
  remains). A page editor plays the whole scenario itself.
- **P112-S8-SHAREDTARGET (open, low):** one helper engine playing the 85 in a row differs from a fresh one on 10
  (nine `$array` / `transactionId` ids from the world's stream after a once-per-engine draw; t12's `Closed`). The suite
  sidesteps it (fresh per scenario); a P107 reader of "a target plays many scenarios" should know.
- **Peer state seen:** three node-spec files (`interpreter.ts`, `ports.ts`, `spec.ts`) and five hunks of the runtime
  helper were a peer's OPEN edits all session (P107 s81, presumably); the editor-tests typecheck (`tsc -p
  packages/noodl-editor/tsconfig.tests.json`) was red on `interpreter.ts` / `ports.ts` for that reason, not this work.
  This session's helper hunks were committed through a temporary index so the peer's stayed in the working tree.

## What to do next, in order

**First, in your first message: say which model you are running on and whether the task's Model line says Richard
should switch** (README §0.2). Say it again if the work changes kind. Do not wait for an answer.

0. Run the unverified test above.
1. **OWN-011 (Opus), R2 / R5 / R6 ruled:** declare what each package uses (node-spec → `@noodl/backend-contract`;
   project-contract → `ajv`, `ajv-formats`, and now `@nodegx/node-spec` for `editor-suite-node`; the preview's page
   builds → `buffer`, `@nodegx/project-contract`, `@nodegx/module-inject`, and the graph target's source in
   `noodl-runtime/test/helpers` — decide whether the kit ships the built script or the helper moves under `src/`), the
   0.x publish with `@nodegx/canvas-look` in it, and the blocker gate (`bugs.js --kit <k> --severity blocker` must
   list none).
2. **OWN-012 step 1 (Opus):** draw Orbit's nine visual nodes from the specs + NSP-016's layout model, graded box by box
   against `elementsOf`.
3. **OWN-007 (see its file), R3 ruled:** the brief as a skill in a public repository. It now has two facts to carry
   from s8: a page editor offers `playGraph`, not a proxy; a runner is fresh per scenario (`NodegxGraphTarget.graphTarget()`
   is both).
4. OWN-004 §6.3 items 2–5 (keep the app's state across an edit; diagnostics to the page; assets; the trace pump on
   planning-demo).

**Not this phase's to fix, but owed:** P112-S7-TEXTDEFAULTS (open) — measure what the runtime does with a Text
`width` of `"auto"` first. P112-S8-SHAREDTARGET (open) — a test that plays s07–s09, t03 and t12 twice on one
`runtimeTarget()` would pin it; the once-per-engine draw is the T13 family.

**Human decisions:** none pending. Still worth asking Richard when it next matters (not blocking): *should a node an
agent adds wear the same look as one a person drops from the picker?* (OWN-006 §6.3; standing finding 16).

## Standing findings (still true)

1. **Undeclared dependencies for R2** (now ruled; OWN-011 declares them): see item 1 above.
2. **Keep ES2019 syntax in node-spec `src/`** (sibling packages compile it below ES2020).
3. **The registry is the lever** for a spec runner; the unspecced bucket is the component interface. **s8: the engine
   registers 130 types in a page; what it does not is the cloud runtime's nodes and `CSS Definition`.**
4. **No conformance ledger** exists (NEEDS.md §3; P107 / OWN-010).
5. **Kits ship as library entries, not in template folders.**
6. **Not measured:** `nodegx deploy` writes `*` for a component port wired to a kit node (OWN-004 §6.1); the engine's
   frame cost on the todo template's biggest logic component in a page (OWN-003 step 1's open item).
7. **Headless software WebGL starves the app's frames**; a WebGL-page check waits for the screen it expects.
8. **A number wired into `width` of a child of a row is a share, not a percent** (FLD-004).
9. **The editor's `tests/` folder is outside its jest config**; `test:ci` is where they run.
10. **The MCP's reference and the kit's reference differ by design on format < 5 projects** (run-on-value-change pins).
11. **A background `until ! pgrep -f "<text>"` matches its own shell line** — use `pgrep -f "[.]bin/jest"`.
12. **s6: a page cannot ask the running app for a node's dynamic ports**; the spec's `derived` ports minus the
    generator's universe are the page's answer (`portsFor`).
13. **s6: a gate that presses a DOM control must scroll it into view and assert the press took effect.**
14. **s6: the editor suite's command needs `npx ts-node`.** s8: the prototype adapter's `playGraph` needs nothing of
    node-spec in Node (the page revives the raw scenario); the step-proxy attempt needed `canonical.ts` under ts-node's
    require hook — gone with the proxy.
15. **s7: the official editor saves no position for a child** (`normalizeComponentForV2`).
16. **s7: the editor's add-node door adds STYLE-002's look**; the MCP adds none; an agent's node's look is an open
    question.
17. **s7: `NodeGraphModel` cannot load outside Electron**; typecheck the editor's tests first (`tsc -p
    packages/noodl-editor/tsconfig.tests.json`, 20 s) — **and read whether a red there is a peer's open edit before
    believing it** (s8: it was).
18. **s7: a peer's jest can sit idle at 0% CPU for 20+ minutes**; check `%cpu` of the WORKERS (`ps … | awk '$2==<pid>'`)
    before waiting on a run — s8: the parent sat at 0 % while one worker ran conformance at 90 %.
19. **s8: a global installed by assignment in Node is a no-op in a page** when the window owns it as a getter-only
    accessor (`localStorage`, `location`…): install by descriptor, as `installWorld` does; a scenario that reads another
    scenario's state is a shadowing failure first (memory `a-global-set-by-assignment-is-ignored-in-a-page`).
20. **s8: ESM evaluates every imported module before the importer's first statement** — a global a module reads at load
    must be set by an EARLIER import (`nodegx-viewer-globals` first), never by code in the importer.
21. **s8: a remote step-by-step driver cannot reproduce traces recorded by a synchronous one**; grade a remote runner on
    whole plays it performs itself (`playGraph`).
22. **s8: the reference's recordings are per fresh engine**; a shared engine answers 10 of 85 differently
    (P112-S8-SHAREDTARGET). A grader makes a fresh runner per scenario.
23. **s8: parallel Bash calls share one shell cwd** — a `cd` in one breaks relative paths in the others and a jest run
    reads `Tests: 0`; use absolute paths, or `(cd … && …)` subshells.

## To see or run things

- The page: `prototype/real/build.sh`, `node prototype/real/serve.mjs 47812`, open `http://127.0.0.1:47812/orbit.html`
  (open it for Richard with `open <url>`; links in chat do nothing for him). `?stage=graph|lift|orbit`,
  `?pose=scene|window`, `?demo`.
- The prototype's gate: `node prototype/real/check.mjs` (about 80 s).
- **The kit's page runner:** `npm --prefix packages/noodl-preview run build` (three bundles), then
  `npm --prefix packages/noodl-preview run graph-target-check` (85 scenarios in headless Chrome, ~5 s with Chrome's
  start; `-- --mutant two-frames` for the control; `-- --types <file>`; `-- --only <text>`).
- **The editor suite with the graph half** (any adapter): `npx ts-node packages/nodegx-project-contract/editor-suite-node.ts
  <adapter> <project-dir> <edits.json>` — the prototype:
  `dev-docs/tasks/phase-112-your-own-nodegx/prototype/real/suite-adapter.mjs packages/nodegx-project-contract/tests/fixtures/editor-suite/small …/small.edits.json`
  (PASS in ~11 s, files + 85 graphs; needs the deploy runtime, the preview build, `./build.sh`, Chrome, the network for
  Three.js).
- The census: `node scripts/own/census.js` (reads `engine-types.json` beside it; `--check` for staleness).
- The Electron editor through the suite: `npm --prefix packages/noodl-editor run test:ci`, then `grep '\[own-006\]'`.
- The Node reference: `cd packages/noodl-runtime && npx jest test/node-spec/graph.test.ts` (96 / 96, 4 s).
