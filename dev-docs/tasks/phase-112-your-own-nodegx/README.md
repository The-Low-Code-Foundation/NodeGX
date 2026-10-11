# Phase 112 — Your own NodeGX

**Scoped:** 2026-10-02, at HEAD `3bb2e084e`, from a conversation with Richard that started as a question about what
phase 107 makes possible and ended with a working prototype: a NodeGX graph running in a browser page on the node
specs, drawn as the editor's canvas, lifted into 3D, and editable (add a node, drag a wire, set a property), with
missions a copy of the graph checks. The prototype is kept in [`prototype/`](prototype/README.md); a second, better one, Under the Lid (2026-10-03), in [`prototype-under-the-lid/`](prototype-under-the-lid/README.md) (reading 12).
**Status: 🟡 IN PROGRESS — s9 (2026-10-11, Opus): OWN-011 built and driven from packed tarballs — `npm create nodegx` (one file, the folder's `.mcp.json`), the agent's `create_project`, day two's `list_projects`, `validate_project` 0 errors, the installed preview drawing the page in Chrome; found and fixed P112-S9-NPXDEPS, -NPXREG, -NORUNTIME, -DAYTWO; the packages renamed to `@nodegx/mcp` / `@nodegx/preview` (R8); OWN-010's ledger half committed nine days after it was built, with the R6 `gate`. Publishing waits for Richard's `npm login` (R11) and the GPL-3.0 licence fields. s8 (2026-10-11, Fable): OWN-003 built — steps 2–4: the real engine with a way in, in a page (`@noodl/preview`'s `noodl-graph-target.js`: the runtime test helper bundled, not ported; `graphTarget()`, `spec`), **85 / 85 graph scenarios in headless Chrome with traces equal to the Node recordings**, the two-frames control red, the census re-run on the engine (todo-list 19 of 531 → **382 of 883** headless, 398 more through the real app); found and fixed P112-S8-SESSIONLEAK (the helper installed the play's storage by assignment, which a page ignores). OWN-006 finished — the graph half: an adapter's own runner graded on the 85 scenarios through two doors, `graphTarget()` (fresh per scenario) or `playGraph(scenario)` (the editor plays it; a page needs this, a step proxy over CDP reads one scenario a frame early); the prototype page passes files and graphs in 11.4 s; found P112-S8-SHAREDTARGET (open: a shared engine answers 10 scenarios differently from a fresh one). s7 (2026-10-10, Opus): OWN-006 AC3 met — the Electron editor is the suite's third adapter (an editor `tests/` spec in `test:ci`, through the model calls the picker, Layers drag, property panel and canvas make, saved by `ProjectStructureService`) and passes small, todo-list and planning, so NSP-021's round trip is built; its first run found P112-S7-LOGICTYPE (the editor's save turned a `logic` component `visual`; fixed) and P112-S7-TEXTDEFAULTS (a picker Text carries defaults the editor's validator calls 2 errors; open), and taught the format that a child has no position. s6 (2026-10-10, Opus): OWN-004 slice 3 built — `prototype/real/orbit.html` is the whole prototype on the real app (Graph, Lift and Orbit; picker from the runtime's library, drag-a-wire, the Node panel, delete; three missions checked on a copy in a second real app), every edit through `V2ProjectStore`; AC3 met; the superseded `page.html` and its build removed on Richard's ruling. All five open rulings asked with the page open and answered: R1 the real engine opened up, R2 publish at 0.x, R3 a skill in a public repo (any AI coder), R5 the look ships optional, R6 an open blocker stops a publish. OWN-006 AC2 met: the page edits any component and the structure, and passes the editor suite on small, todo-list and planning through `real/suite-adapter.mjs`; its first run found P112-S6-SUITEIDS (the suite gave a minting editor the script's ids; fixed). s5 (2026-10-10, Fable): OWN-001 slice 2 built (the MCP's `ProjectStore` writes through the package's `V2ProjectStore`; `editor-deps.ts` imports the format from the package; AC1 met; P112-S2-NEWLINE fixed on both writers); OWN-006 first half built (`@nodegx/project-contract/editor-suite`: adapter, eight edits, reference, comparison, runner, command, fixtures; AC1, AC4 met; the MCP is its first adapter and the suite's first run found and fixed P112-S5-REPARENTINDEX). s4 (2026-10-10): OWN-004 slice 2 built (Orbit as v2 files run by the real engine, its graph in 3D around the real app or beside it in a window, one switch; AC2 met; `preview.elementsOf`; P112-S4-TRACEARM fixed); R4 ruled *teach both equally* → OWN-012 added; R7 (Orbit) ruled *keep both*. s3 (2026-10-10): OWN-004 slice 1, AC1 met. s2 (2026-10-09): OWN-001 slice 1 built (the format in `@nodegx/project-contract/format`: schemas, validator, types, a store with the MCP's rules over memory or disk; AC2–AC4 met, AC1 waits on slice 2); every task file has a Model line (§0.2). s1 (2026-10-03): OWN-000 built (NEEDS.md, CENSUS.md, the second prototype kept); OWN-002 built (the browser entry, the build, the size); OWN-005 built (`@nodegx/canvas-look`, generated, gated; the prototype reads it); OWN-003 step 1 measured (the runtime loads in a page: 807 KB, 80 types, 65 ms; R1 to ask); OWN-010's ledger half built 2026-10-02. Rulings: all seven answered (R1, R2, R3, R5, R6 in s6; §8).** **Prefix: `OWN`.**
Task files: [OWN-000](OWN-000-THE-PROTOTYPE-MEASURED.md) … [OWN-012](OWN-012-THE-SCREEN-FROM-THE-DESCRIPTIONS.md). The board is §6.

> "Would someone who wants to view their NodeGX project as some crazy 3D mapping they've invented … would 107 open up
> the path a bit more easily for their Claude Code to mock them up something … completely independently of NodeGX
> editor?" — Richard, 2026-10-02, the opening question

> "I just want it to show off the node concept as something that's actually worth considering." — Richard, 2026-10-02

> "Can we write this up into a phase? … not a template … a new NodeGX? Not the exact thing you've made but the method
> via which you can get Claude Code to make you your own NodeGX editor basically." — Richard, 2026-10-02

## 0. The idea in one paragraph

A NodeGX project is files, a vocabulary of nodes and a contract for how they behave. The editor is one way to look at
and change those files, and phase 107 ruled that it should be replaceable (P107 R6). This phase makes that true for a
person, not only for the architecture: **someone with Claude Code asks for the NodeGX editor they want, a 3D map, a
big-block editor for children, a table with one row per node, and their agent builds it in an afternoon from a kit,
opens their real project in it, and knows it is finished because a suite says so.** The kit is mostly things NodeGX
already has but keeps inside its own editor: the project format, the node specs, a way to run a graph, the real app's
preview, the canvas look. The method is the brief their agent reads. The proof is three agents who have never seen
this repo each building a different editor from the kit alone, and Richard building his own.

## 0.1 The direction, 2026-10-05

Richard set NodeGX's direction on 2026-10-05 in [DIRECTION.md](../../DIRECTION.md). NodeGX is a framework installed from
npm, and the editor is optional. This phase builds one of its four reasons, do it yourself, and the packages people
install. Four things follow.

- **R2's recommendation is now the direction.** The kit is published at 0.x. R6 (an open blocker stops a release) still
  needs its ruling.
- **The one install command is [OWN-011](OWN-011-ONE-INSTALL.md)** (DIRECTION.md D1, ruled 2026-10-06). It sets up a
  project, the MCP server and the preview with no editor.
- **OWN-006's fixtures include projects an agent wrote through the MCP.** "The editor at any time" is a promise. The
  editor suite is what grades it.
- **Any editor is a client, a vendor's included.** A polished editor for vibe-coded apps will come from a large vendor.
  The kit aims to be a format that editor could open, not its rival.

## 0.2 Which model, Opus or Fable (Richard, 2026-10-09)

Richard asked that every session tell him whether he is on the right model for the work, at the start and during.

- **Fable 5.1** (`claude-fable-5-1`) is the most capable model, for hard reasoning and long autonomous work. It costs
  2.5 times as much as Opus ($10 / $50 per million tokens in / out, against $4 / $20), and its turns are slower. It is worth
  that where a wrong design is expensive to undo: moving the format across three consumers, a runner graded against 76
  scenarios, the shape of the suite.
- **Opus 5.5** (`claude-opus-5-5`) is the default. It is right when the task file already says what to build and a gate says
  when it is done: a slice with a fixed shape, docs, a census re-run, packaging, the handoff.

**The rule.** Each task file has a **Model** line. A session's first message names the model it is running on (its
system prompt says which), the model the task's line recommends, and, if they differ, one line on why to switch. That
comes before the first build step. Mid-session, if the work turns into the other kind (an Opus slice reaches a design
question the task file did not settle, or a Fable session is down to doc edits), say so once, at that point. Richard
switches with `/model` and the session carries on. Never stop and wait for the answer.

## 1. What was measured before scoping

Read on 2026-10-02 from the working tree at `3bb2e084e` and from the prototype, which ran in headless Chrome.

| # | fact | consequence |
|---|---|---|
| 1 | **The prototype** (`prototype/`): one page, 1,546 lines plus a 139-line graph runner, built in five versions between 21:33 and 23:08 in one conversation. It runs a focus timer of **18 specced nodes and 24 wires**, beside **8 visual nodes and 11 wires the page has to stand in for**. It edits: add from a picker, drag a wire, set properties, delete. Its three missions check a fresh copy of the graph on the specs in about a millisecond; `#selftest` fails all three on the untouched graph, `#demo` passes all three after building them. | 🔴 **An agent can build a working NodeGX editor in an evening.** What it cannot do yet is build one that opens a real project, because of readings 3, 4 and 6. |
| 2 | **What the prototype reused unchanged:** `@nodegx/node-spec`'s interpreter and all of its specs (76 when the prototype was built, 78 at scoping: a peer is adding the user nodes), port names, types and descriptions through one `describe()` call. It bundled from `src/interpreter` and `src/nodes`, because **the package root is not browser-safe**: `index.ts` re-exports `graph.ts` (imports `fs`, `path`) and `world.ts` imports Node's `crypto` for the Hash node. The bundle is 418 KB minified, `fast-xml-parser` included. | The vocabulary half of an editor exists and works in a page. It needs a browser entry and a build (OWN-002). **Built s1 (2026-10-03):** `@nodegx/node-spec` is browser-safe (520 KB minified / 148 KB gzipped at 86 specs, no `node_modules` input), `/node` carries the files; the prototype builds from it with no alias or stub. |
| 3 | **What the prototype invented, part one: a graph runner.** `graph.ts`'s header says the package has no graph interpreter on purpose: *"it would be a second runtime; a stranger may build one, NSP-006"*. So the prototype wrote one: wave-at-a-time, one `World` per node, **never graded** against the package's **76 graph scenarios** (C1–C11, S1–S10, T1–T12), and known to differ from the runtime on C7 (lockstep). | 🔴 Every home-made editor will write its own and each will differ. The scenarios to grade one already exist (OWN-003, R1). |
| 4 | **What the prototype invented, part two: the project.** It used its own graph shape, because **the v2 project format lives inside the Electron editor's source**: eight JSON Schemas and the validator in `noodl-editor/src/editor/src/schemas/` (1,465 lines), the semantic validation beside them (11,710 lines in `validation/`). The MCP server reaches in by relative path through `editor-deps.ts` (735 lines). Every file's `$schema` names `opennoodl.dev`; no document in `dev-docs/reference` describes the format. The format itself is small: a component is a folder of `component.json`, `nodes.json` (`{id, type, label, parameters, children, parent, x, y}`) and `connections.json` (`{fromId, fromProperty, toId, toProperty}`). | 🔴 Nothing outside this repo can depend on the format. P107 NSP-021 already names the home: `@nodegx/project-contract`, *"do not grow a second one"* (OWN-001). |
| 5 | **What the prototype invented, part three: the screen.** **0 of 19 visual nodes has a spec** (NSP-016 not started: research and a ruling before any build). The prototype drew the screen itself from the values the visual nodes' wires carried, and said so on the page. Meanwhile **`@noodl/preview` already renders a v2 project in a browser with no editor process** and reloads when the files change, and `nodegx-observe` reads a running app's values over a socket from a session dictionary that ships topology. | A home-made editor does not have to wait for NSP-016: the real app can sit beside it (OWN-004, R4). |
| 6 | **How much of a real app a page can run today.** Scoped from a rough count; **measured on 2026-10-03 by `scripts/own/census.js` with the P107 census rule** ([CENSUS.md](CENSUS.md)): of the todo template's **531 nodes, 19 run in a page** on the clock, randomness and time zone alone; 92 are specced but need a registry, a backend, a router, a popup or a viewport (across every template the registry alone is 950 of the 1,133 such nodes); 199 are visual; 53 are escape hatches (Function, Expression, CSS Definition); 71 are component instances; 2 are `Page`, outside the picker population; 95 are in the population with no spec, and 95 of those 95 are `Component Inputs` and `Component Outputs`. Planning: 972 nodes, 16 / 141 / 521 / 93 / 67 / 2 / 132. The rough count's three cells that moved (visual 201, script 52, other 96) were the two `Page` nodes counted as visual and `CSS Definition` counted as other. Over all 13 templates: 9,164 nodes, 313 page, 1,133 world, 3,560 visual, 1,299 script, 1,270 component instances, 360 outside the population (196 of them `Translation`, 66 `Page`, the rest kit nodes), 1,229 unspecced (1,071 of them Component Inputs / Outputs). | 🔴 **On a real project a home-made editor runs almost nothing by itself.** The levers, now ranked by the count: one shared `World` per graph (the registry: 950 nodes), the real runtime for the rest (R1), and NSP-015's Component Inputs / Outputs spec landing in the package (1,071 nodes). |
| 7 | **What the prototype invented, part four: the look.** Version 1 drew its own space-themed world; Richard: *"I can't show this to anyone, it looks insane."* Version 2 copied the editor's canvas (150 px cards, the `default` and `visual` category schemes, green value and cyan signal wires, the white pulse, the STRUCTURE lane) by reading `CanvasTheme.ts`, `NodeGraphEditorNode.ts` and `structureLane.ts`, and from then on the reactions were *"very cool"*, *"getting cool"*. The editor already keeps a second copy of its palette in `nodelibraryexport.ts`, held honest only by `CanvasThemeNodeSchemes.test.ts`; the prototype is a third, held honest by nothing. | Recognisable first, then surprising. The look is part of the kit, and it must be generated, not copied (OWN-005, R5). |
| 8 | **Nothing is installable from outside the repo.** `npm view` on 2026-10-02: `@nodegx/node-spec` 404, `@noodl/preview` 404, `@nodegx/project-contract` is `private`. Only `@nodegx/core` is published (0.1.0). `@nodegx/node-spec`'s `main` is its TypeScript source; it has no build. | 🔴 "Your own NodeGX" today means "a checkout of this repo". R2. |
| 9 | **The editor with no screen already exists.** `noodl-mcp` creates components, connects ports, validates and renders reports over a wire (NSP-021 §2), and its `ProjectStore` refuses a write when the files changed since it read them (optimistic revisions, temp file and atomic rename). | The rules a home-made editor needs to write safely are already written. They move into the format package with the format. |
| 10 | **The method for "an agent builds it from a spec alone" exists.** NSP-006 handed three strangers the spec and the suite, nothing else; all three were green on the first run, and their 15 questions became sentences in the format files. | OWN-008 is NSP-006 for editors: the brief is the kit's documentation, graded by strangers. |
| 11 | P107's editor tasks: **NSP-020** (ports from the spec for the 50 nodes whose ports exist only once a viewer runs) and **NSP-021** (the second editor: a census of everything the editor knows about a node, and the MCP ↔ Electron round trip) are **not started**. | This phase depends on both and duplicates neither (§5). |
| 12 | **The second prototype** ([`prototype-under-the-lid/`](prototype-under-the-lid/README.md), 2026-10-03, artifact `9tAKJ2QcxSqPJadkj7ssfR`): one 2,513-line page, no build, no WebGL. The same potter's site as three layers in 3D (JSON → node objects → HTML), run live, slowed or stepped with every step narrated, a journey that follows one Counter from the editor to the screen, and an inspector with a small conformance check. Richard: *"much better than the first prototype."* It imported nothing: the project is hand-written in the **deployed** shape (`sourceId` / `sourcePort`, which the runtime reads) rather than the editor's v2 files; Counter is ported by hand from its spec; 41 port names, 16 signal ports, 8 spec statuses and the P107 progress table are typed, and the table was stale within a day. [NEEDS.md](NEEDS.md) §2 has the 17 rows. | 🔴 **Two shapes of "the format" exist and nothing names them** (OWN-001 must carry the transform). 🔴 **Nothing machine-readable says which nodes conform** (a conformance ledger: NEEDS §3). The explainer's one sentence, *"JSON never turns into HTML; JSON turns into JavaScript objects, some of which keep a piece of HTML up to date"*, is the brief's opening (OWN-007). |

## 2. The person sentences

> **Ask for it:** "I tell my agent what kind of NodeGX editor I want, a 3D map, a big-block one for the kids, a table,
> and that afternoon it opens my real project in it."

> **Same files:** "Whatever editor I use, my project is the same files. The official editor opens what mine saved,
> and nothing changed that I did not change."

> **Same behaviour:** "A node does the same thing in my editor as in my app, because both run its spec, and the app
> itself is right there beside my editor."

> **Done means done:** "My agent knows the editor is finished because a suite says so, not because the screen looks
> right."

## 3. What an editor is, in NodeGX terms

The prototype answered six questions. Each row says where its answer came from and where it comes from after this
phase.

| part | the question | the prototype | after this phase |
|---|---|---|---|
| **Format** | what is in the project, and how do I save a change? | invented its own graph | `@nodegx/project-contract` reads, validates and writes v2, in a page or in Node, with the MCP's write rules (OWN-001) |
| **Vocabulary** | which nodes exist, what are their ports, what do they say they do? | `describe()` on the spec, plus the catalog for names | the same, from a browser entry with a build (OWN-002); ports for every node when NSP-020 lands |
| **Logic** | what does the graph do when this changes? | a 139-line wave runner, ungraded, one world per node | one graph runner, graded by the 76 scenarios, one shared world per graph, or the real runtime headless (OWN-003, R1) |
| **Screen** | what does the app look like right now? | drawn by hand | the real app beside the editor through `@noodl/preview`, live values through the observe protocol (OWN-004) |
| **Look** | does it look like NodeGX? | copied by reading three files | an optional package generated from `CanvasTheme` (OWN-005) |
| **Done** | is it right? | three hand-written missions | the editor suite: open, edit, save, round trip against the reference writer, the validator, and the graph scenarios on the editor's own runner (OWN-006) |

And the seventh, which is the method: **the brief** an agent reads before it starts (OWN-007).

## 4. The design, in brief

**The kit is three packages, one suite and one brief.** Almost none of it is new code; it is code that already exists
inside the editor or the repo, moved to where an outsider can use it.

1. **The format leaves the editor** (OWN-001). The v2 types, the eight schemas, the structural validator, `loadV2Project`
   and `ProjectStore`'s read/write rules move into `@nodegx/project-contract`, which the editor and the MCP then import
   instead of reaching across. Two file backends: Node's file system and an in-memory set of files (a page, a test, a
   zip the person dropped in). The semantic validator stays in the editor for now; the suite runs it.
2. **The spec runs in a page** (OWN-002). A browser entry for `@nodegx/node-spec` with no `fs`, `path` or Node `crypto`
   (Web Crypto for the Hash node), an ESM build with types, and a size number.
3. **One way to run a graph** (OWN-003). Ruled by R1: either a graph runner in `@nodegx/node-spec` that implements the
   package's own `GraphTarget` and passes the 76 scenarios, with one shared `World` per graph so stores and records run,
   or the real runtime mounted headless in a page if OWN-003's first measurement says it can be.
4. **The real app beside it** (OWN-004). `@noodl/preview` as a library a page can embed, pointed at the in-memory files
   the editor is changing, plus the observe protocol for the last value on every wire from the real runtime.
5. **The look** (OWN-005). `@nodegx/canvas-look`: the category schemes, card metrics, wire colours and structure lane
   constants, generated from `CanvasTheme` by a script with a parity gate, so it is a projection and not a third palette.
6. **The editor suite** (OWN-006). An editor implements a small adapter (`open(files)`, `apply(edit)`, `save()`, and
   optionally `graphTarget()`). The suite opens fixture projects, applies a scripted list of edits through the editor's
   own code path, and compares the saved files with the same edits applied through the reference writer. Ids are
   matched, layout is free, everything else must be equal; the validator must report nothing new; the official editor's
   loader must open the result.
7. **The brief** (OWN-007). What an editor is in NodeGX terms (§3), the packages, the adapter, the suite, and every
   trap the prototype and the strangers hit, written as sentences. Served where R3 rules.

## 5. Depends on

| On | Why | State at scoping |
|---|---|---|
| P107 NSP-020 | ports from the spec for the 50 nodes whose ports appear only once a viewer runs; until then the kit's port lists come from the catalog and say so | 📋 not started |
| P107 NSP-021 | its §3.1 census of what the editor knows about a node is OWN-000's second half, and its round trip (MCP ↔ Electron) is OWN-006's first fixture. **Build each once:** the census lives in P107's folder and both phases cite it | 📋 not started; **the round trip is built** (P112 s7: the MCP, the prototype and the Electron editor are three adapters on one reference, OWN-006 §6.3) |
| P107 NSP-016 | visual nodes with specs, and (its AC4) a layout model graded against a browser. R4 ruled *teach both*: the real app (OWN-004) does not wait for it; **OWN-012**, the screen drawn from the descriptions, is built on it | 🟡 18 / 19 visual specs (2026-10-09); the layout model in `packages/nodegx-node-spec/src/layout.ts` + `layout-map.ts`, fixtures in `layout-fixtures/` |
| P107 NSP-008 | the graph scenarios OWN-003 is graded by (76 at scoping, 85 by s8) | ✅ built; **OWN-003's page runner passes all 85 (s8)** |
| P111 SEE-002 | the text form. A home-made editor may write the text form instead of JSON once it exists; nothing here needs it | 📋 not started |
| P111 SEE-001 | the honesty number. A home-made editor shows it if it exists; nothing here needs it | 📋 not started |
| P93 TVW-006 | the structure lane OWN-005 projects | 🟢 built |

**OWN-000, OWN-001 and OWN-002 need none of these to start.**

## 6. Tasks

| id | task | side | needs |
|---|---|---|---|
| [OWN-000](OWN-000-THE-PROTOTYPE-MEASURED.md) | **The prototype, measured.** Every question the prototype answered and every file it reached into, as a table; the runnable census redone with the P107 census rule for every template; the editor-knowledge census done once with NSP-021. | tooling | — |
| [OWN-001](OWN-001-THE-FORMAT-LEAVES-THE-EDITOR.md) | **The format leaves the editor.** v2 types, schemas, structural validator, loader and the MCP's write rules in `@nodegx/project-contract`; the editor and the MCP import them; a page can read and write a project held in memory. | format + editor + MCP | — |
| [OWN-002](OWN-002-THE-SPEC-IN-A-PAGE.md) | **The spec in a page.** A browser entry and an ESM build for `@nodegx/node-spec`; Web Crypto for Hash; the scenario loader moved to a Node-only entry; a size budget. | spec | — |
| [OWN-003](OWN-003-ONE-WAY-TO-RUN-A-GRAPH.md) | **One way to run a graph.** First measure whether the runtime mounts headless in a page. Then, as R1 rules, the graded runner (76 / 76 scenarios or each divergence named) with one shared world per graph. | spec or runtime | OWN-002, R1 |
| [OWN-004](OWN-004-THE-REAL-APP-BESIDE-IT.md) | **The real app beside it.** `@noodl/preview` embeddable and fed from memory; live wire values from the observe protocol; the prototype's hand-drawn screen replaced by the real one. | preview + observe | OWN-001 |
| [OWN-005](OWN-005-THE-LOOK-AS-A-PROJECTION.md) | **The look, as a projection.** `@nodegx/canvas-look` generated from `CanvasTheme`, with a parity gate; the prototype reads it instead of its copy. | editor + tooling | — |
| [OWN-006](OWN-006-THE-EDITOR-SUITE.md) | **The editor suite.** The adapter, the edit vocabulary, the fixtures, the reference writer, the round trip, the validator and the graph scenarios as one command that says PASS or names what differs. | tooling | OWN-001, OWN-003 |
| [OWN-007](OWN-007-THE-BRIEF.md) | **The brief.** The method as one document an agent reads first, served where R3 rules, every sentence earned by a trap someone hit. | docs + MCP | OWN-001…006 |
| [OWN-008](OWN-008-THREE-STRANGERS.md) | **Three strangers.** Three fresh agents, the kit and a one-line wish each (a 3D map, a children's block editor, a table); each must pass the suite on the todo template. Their questions become sentences in the brief. | proof | OWN-007 |
| [OWN-009](OWN-009-RICHARDS-OWN.md) | **Richard's own.** Richard asks his own Claude Code for the editor he wants and uses it on a real project. The phase closes on his words. | Richard | OWN-008 |
| [OWN-011](OWN-011-ONE-INSTALL.md) | **One install.** `npm create nodegx` sets a folder up (R9, R10); the person's agent makes the app through `create_project`; the preview runs from npm. 🟡 **s9: built and driven from packed tarballs** (four defects found and fixed on the way; §7); the publish (R11), the editor-open check and the stranger's run are owed. | packages + MCP | R2, OWN-001, OWN-002, OWN-004 |
| [OWN-012](OWN-012-THE-SCREEN-FROM-THE-DESCRIPTIONS.md) | **The screen from the descriptions.** R4 ruled *teach both equally*: a reference drawing of a project's screen made only from the visual specs and their layout model, in a page, graded box by box against the real app it sits beside (`preview.elementsOf`), so the brief can teach it as fairly as the real app. Added 2026-10-10. | spec + preview | OWN-004, P107 NSP-016 AC4 |
| [OWN-010](OWN-010-EVERY-BUG-TEACHES-THE-KIT.md) | **Every bug teaches the kit.** A ledger bug about a node, the format or the kit names its package (`kit:`) and, once fixed, the regression that ships in that package's suite (`regression:`); bugs about specced nodes are played through the spec before they are filed; each release's changelog is generated from the ledger and the spec `changes` entries; an open blocker stops a release. The ledger half is built. | ledger + release | the ledger, NSP-010, R2 |

**Order:** OWN-000 → OWN-001, OWN-002 and OWN-005 in parallel → OWN-003 (after R1) → OWN-004 → OWN-012 (once NSP-016's layout model grades) → OWN-006 → OWN-007 →
OWN-008 → OWN-009. **OWN-010 runs alongside all of them**: its ledger half is built, the backlog is tagged as each package is touched, and its changelog and release gate land with each package's first release.

## 7. Acceptance criteria for the phase

1. Three agents that have never seen this repo each build a different editor from the kit alone; each passes the
   suite on the todo template; the official editor opens what each saved with zero new validator diagnostics and no
   difference in the files beyond ids and layout (OWN-008).
2. The kit is a list of packages and one brief. A stranger reads nothing outside them, which is NSP-021 AC4's
   sentence graded by people who could not cheat (OWN-008).
3. A graph runs outside the app in one way, graded: 76 / 76 graph scenarios, or every divergence named in the runner's
   own words (OWN-003).
4. The format no longer lives in the editor: `editor-deps.ts` loses every import the format accounted for, and the
   editor and the MCP read and write projects through `@nodegx/project-contract` (OWN-001).
5. The kit's look cannot drift from the editor's: it is generated, and a gate fails when they differ (OWN-005).
6. Richard has asked for his own editor, used it on a real project, and given his verdict (OWN-009).
7. Every fixed bug about a kit package names a regression that ships in that package's suite and fails on the code
   before the fix, and each package's first changelog is generated from the ledger (OWN-010).

## 8. Rulings to ask (plain words)

| # | Question | Recommendation |
|---|---|---|
| R1 | **When a home-made editor wants to show values moving through a graph, what runs the graph?** The spec package runs one node at a time. My prototype wrote its own 139-line loop to connect them; it was never tested and differs from the real app in one known way. Three choices: ship one tested runner in the spec package, so every editor gets the same answer (costs a second way to run graphs, which P107 deliberately avoided); or let editors run the real app's engine in the page (it already runs every node, specced or not, but nobody has measured whether it works outside the app); or let each editor write its own and have the suite test it. | **Measure the real engine first** (OWN-003 step 1: does it run in a page, and how big is it?). If it does, it is the runner: it is already the reference everything is graded against, and it runs every node type whether or not it has a spec (the todo app has about 220 non-visual nodes without one, §1 reading 6). If it does not, ship the tested runner. Either way, the suite tests any editor that writes its own. *Since (s4, measured):* the prototype's own loop hid a real bug in Orbit — Skip more than five minutes into Focus bounced straight back in the real app and not in the loop (OWN-003 §6) — and the real engine already runs whole in a page through the preview (OWN-004). ✅ **Ruled 2026-10-10 (s6): the real engine, opened up** — a small way in (set an input, send a signal, read a port) so every editor runs what the app runs. Asked with the new Orbit page open and running: *"the real app's engine already runs whole inside a page … the missions are now checked that way. What it cannot do yet is let an editor poke one input, send one signal and read one output from outside."* → OWN-003 steps 2–4. |
| R2 | **Should the kit be installable by people who do not have this repo?** Today nobody outside can install the node specs, the project format or the preview: none is on npm, only `@nodegx/core` is. "Your own NodeGX" means a person with Claude Code and an empty folder. Publishing means version numbers, a release step, and not breaking these packages without saying so. | **Publish, at 0.x,** so breaking changes stay allowed while the phase runs, and say so in each README. Measured since: each package uses something it does not declare, which a stranger's install would not have — node-spec `@noodl/backend-contract` (s1); project-contract `ajv`, `ajv-formats` (s2); the preview's in-page build `buffer`, `@nodegx/project-contract`, `@nodegx/module-inject` (s3). Publishing declares them. ✅ **Ruled 2026-10-10 (s6): publish at 0.x** — declare what each package uses first (node-spec → `@noodl/backend-contract`; project-contract → `ajv`, `ajv-formats`; the preview's page build → three more), then publish, each README saying it can still change. → OWN-011. |
| R3 | **Where does an agent find the method?** Three places: the `nodegx` MCP server that people already install (it works with no project open); a Claude Code skill in a public repository; a page on nodegx.io. | **The MCP server first**, served as a document the agent reads rather than another tool (the tool list has a strict token budget), and the same text on nodegx.io. OWN-007 measures whether the server can serve it that way. ✅ **Ruled 2026-10-10 (s6), Richard's own answer: *"A skill in a public repo, recommended for Claude but can be used with any AI coder."*** Not the MCP server. The method is written as a skill in a public repository, for Claude first and readable by any coding agent. → OWN-007. |
| R4 | **How does a home-made editor show the app's screen?** *As scoped:* no visual node had a spec, and the preview package already drew the real app from the files. *Since (re-ask with these):* 18 of the 19 visual nodes now have specs that match the app (NSP-016, 2026-10-09), so an editor could draw a screen itself; and OWN-004 slice 1 (2026-10-10) runs the real app in a page from files held in memory, every template, with live values on the wires. A screen drawn from specs still leaves the app behind it unrun: of the todo app's 883 nodes today (census 2026-10-10), 146 are component inputs/outputs, which have no spec of their own, and 116 more need a store, a backend or a router. The real app runs all of it. | ✅ **Ruled 2026-10-10 (s4): teach both equally.** Asked with the live Orbit page (`prototype/real/orbit.html`) as: *"How should a home-made NodeGX editor show the app it is editing? The page runs the real app from the project's files … each change rebuilds it in about 0.15 s and it starts again from the top. The other way: the editor draws the screen itself from the node descriptions (18 of 19 screen nodes have one) … but then nothing runs the rest of the app (146 of the todo template's 883 nodes are component inputs and outputs, 116 more need a database, a server or navigation)."* Choices offered: show the real app (recommended) · draw from the descriptions · **teach both equally** (chosen). So the method shows both ways and lets each person pick: OWN-004 is the first, **OWN-012** the second. |
| R5 | **Should the kit give home-made editors NodeGX's look?** Version 1 of the prototype looked like nothing in NodeGX and could not be shown; version 2 copied the editor's canvas and was recognised at once. The look today lives in the editor's code and one extra copy. | **Yes, as an optional package generated from the editor's theme,** so a home-made editor can look like NodeGX without being a fourth copy that drifts. Editors that want their own look ignore it. ✅ **Ruled 2026-10-10 (s6): yes, optional** — `@nodegx/canvas-look` (OWN-005, generated from the editor's theme) ships with the kit; an editor that wants its own look does not install it. → OWN-011's publish list. |
| R6 | **Should a known serious bug stop a package from being published?** Once the specs and the kit are on npm, a bug this repo finds in them reaches every outside user until a new version ships. The ledger can already say which package a bug belongs to. Choices: a package cannot publish while one of its bugs is marked blocker and still open; or it publishes anyway and lists its open bugs as known issues. | **Block on an open blocker; publish with everything less serious listed as known issues.** A blocker is defined in the ledger as freezes, crashes, loses data or blocks a release, so it is rare, and shipping one knowingly to strangers is the outcome to avoid. ✅ **Ruled 2026-10-10 (s6): block on an open blocker** — a kit package cannot publish while one of its `kit:` bugs is an open blocker; anything less serious is listed in the release as a known issue. Measured when asked: `node scripts/bugs.js --severity blocker` lists 0 open blockers, none on any kit package. → OWN-011, OWN-010. |
| R7 | **Where does Orbit keep the real app: inside the 3D scene, or in a flat window beside it?** (OWN-004 §6.2 item 1, before AC3.) | ✅ **Ruled 2026-10-10 (s4): keep both, with the switch** — start in the scene, one press flattens it into a window. Asked with both built and running in `prototype/real/orbit.html`: *"'In the scene' turns with the graph, cards can pass in front of it, its text is at an angle. 'In a window' stays flat, sharp and still at the side."* |
| R8 | **What are the kit's packages called on npm?** The `@noodl` scope there belongs to the original Noodl team (`@noodl/noodl-sdk`, 2022); Richard's account owns `@nodegx`. | ✅ **Ruled 2026-10-11 (s9): rename to `@nodegx/mcp` and `@nodegx/preview`, in the repo and on npm**; the bins keep their names. Done (`749bd0a38`, whose message calls it R7). |
| R9 | **What does the one command do?** Set the folder up and leave the app to the agent, or make a blank project itself? | ✅ **Ruled 2026-10-11 (s9): set up; the agent makes the app.** It writes one file, the folder's `.mcp.json`; `create_project` stays the one writer and the scoping conversation is never skipped (OWN-011 §7). |
| R10 | **What do people type?** | ✅ **Ruled 2026-10-11 (s9): `npm create nodegx`** (package `create-nodegx`). |
| R11 | **Who publishes?** This Mac's npm token answers 401. | ✅ **Ruled 2026-10-11 (s9): Richard runs `npm login`; a later session publishes after asking him once more just before it goes out.** |
| R12 | **Push the branch to GitHub before publishing?** The MCP server and the preview are GPL-3.0 (they contain the editor's code), so whoever downloads them must be able to get the source; their npm pages link to GitHub, whose `cline-dev` was 1,020 commits behind (22 September) and had no `create-nodegx`. Pushing makes those commits public. | ✅ **Ruled 2026-10-11 (s10): push, then publish.** Pushed `6b3910215`; every tarball is packed from a clean worktree at that commit, never from the shared checkout (OWN-011 §8: the MCP bundle packed there inlined six of a peer's uncommitted files). |
| R13 | **Do the three packages a home-made editor builds on (`@nodegx/node-spec`, `@nodegx/project-contract`, `@nodegx/canvas-look`) go in the same release?** The one install does not need them; two had no build and the format package did not declare what it uses. | ✅ **Ruled 2026-10-11 (s10): yes, include them.** Built the same session (`6b3910215`): canvas-look builds to `dist`; project-contract publishes from `dist/publish` (its own manifest stays private); node-spec packs a fresh build. |
| R14 | **`create-nodegx` is new code that writes one file: MIT or GPL-3.0?** | ✅ **Ruled 2026-10-11 (s10): GPL-3.0-only, like the other two.** node-spec and canvas-look keep the MIT they already declared (not asked). |

## 9. Not this phase

- **Replacing the official editor.** P92 and P93 own its chrome (P111 §9 says the same). This phase makes other
  editors possible; it does not make one of them the product.
- **A new file format.** v2 stays the file. P111 R1 decides whether the text form ever becomes one.
- **Specs for the visual nodes.** NSP-016 owns them (R4).
- **A gallery of home-made editors.** Sharing editors is a later question; this phase proves people can have them.
- **The prototype as a product.** It stays in `prototype/` as evidence and as OWN-004's and OWN-005's first customer.

## 10. Risks

- **Home-made editors fork the format.** An editor writes something the official editor half-reads. The suite's round
  trip is the guard, and the format package is the only writer the kit offers.
- **A home-made editor damages a real project.** The format package carries the MCP's rule (refuse a write when the
  files changed since they were read), and the brief tells agents to start on a copy, as memory says of every drive.
- **The 19-of-531 trap.** On a real app a home-made editor that runs only specced nodes runs almost nothing (reading 6),
  and the person concludes it does not work. R1's measurement and OWN-004's preview are the answers; the brief says it
  plainly; OWN-008 runs on the todo template precisely so this cannot be hidden.
- **The vocabulary moves under the kit.** The spec count went from 76 to 78 during this scoping. The kit pins package
  versions; the suite reads the vocabulary from the installed package, never from a list in the brief.
- **A demo is not a tool.** The prototype looks finished. Memory's *correct and usable were never the same criterion*
  applies: OWN-009 is Richard using his own editor on his own project, not watching one.
