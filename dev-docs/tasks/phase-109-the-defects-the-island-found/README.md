# Phase 109 — The defects the island found

**Scoped:** 2026-10-01, at HEAD `27d891bf3`, from [the island audit](AUDIT-2026-10-01.md). The audit read P105, P106 and
P108 (Olive's Island, [TPL-012](../phase-78-the-templates/TPL-012-THE-CODING-GARDEN.md)): their task files, 225 commits, 57
session and lane transcripts, the generator, both kits, the desktop shell and the shipped template.
**Status: 🟡 OPEN — session 1 (2026-10-01): ISL-001's fix landed (`3df5adb82`; AC1–AC4, AC8; AC5–AC7 owed as drives) and ISL-014's (`aab96a056`; AC1–AC4; AC5 on a ruling, AC6 owed), 0 of 25 closed.** Two rulings asked (ISL-001 §5, ISL-014 §5, below). **Prefix: `ISL`.** Start with [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md).

> "Phase 108 has been a beast. I forgot to tell the model to record learnings about NodeGX during the push. I'm sure
> there must be a tonne of stuff we can fix and improve in NodeGX and the way the MCP works. Can you do an audit and start
> an improvement phase like we did with the other templates?" — Richard, 2026-10-01

> "We're making templates to surface bugs and issues with the whole NodeGX concept as well." — Richard, 2026-08-28

This is the third phase of its kind, after [P80](../phase-80-the-defects-the-templates-found/README.md) and
[P88](../phase-88-the-defects-the-games-found/README.md). It differs from both in one way: **the push it comes from filed
nothing.** [P78's register](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) ends at D85, three days before Olive's
Island began, and in 210 commits the push changed no product code at all. Every defect it met was worked around inside the
template and written down, if anywhere, in a task file's traps list. **This phase fixes the product, so the next person does
not need the workaround, and §7 makes sure the next push files as it goes.**

## 0. The five readings that frame it

From [AUDIT §0](AUDIT-2026-10-01.md#0-five-readings-that-frame-everything-else):

1. **The game is JavaScript, and the graph is its wiring.** 83 Function nodes hold 2.39 MB of script. 1.75 MB of that is
   **17 copies of one engine**, because a Function cannot share code. Two thirds of the components are a Function in a
   wrapper. The graph keeps layout, wiring and sequencing, and 9 of its 11 Timers are guessed waits rather than clocks.
2. **It went through the MCP door, never the MCP conversation.** The generator is an in-process MCP client (`create_plan` →
   `stage_plan_operation` → `apply_plan`), and all ten template generators work the same way. Around the door it still writes
   files by hand: the project skeleton, the home page, module copies, id and timestamp pins, and a run-on-change settle. No
   agent built a single node of the island through the MCP tools a person's agent uses.
3. **Three defects bit more than once and still have no owner:** the For Each that draws two row sets (D85, three times), a
   kit reader that is missing but reported as a missing module (D83, every worktree lane of three phases), and the wrapped-row
   warning that cried wolf until it was right.
4. **A stale memory cost real work.** The `Repeat` node existed ten days before the garden started. The garden hand-built
   both of its loops from Timers anyway, because the orchestrator's memory said "no ticker". The memory is corrected.
5. **The desktop shell is a fork, not a product.** Six of the findings belong to [P91](../phase-91-the-app-in-your-dock/README.md),
   which owns the product desktop app and has not started. They are handed over in §5, not duplicated.

## 1. The person sentences

**Track A — a value and a row arrive the way the graph says.** These draw a wrong screen with no error.

> **A list drawn twice shows its rows once, a `false` arrives as `false`, and two lists never share a row by accident.**

**Track B — a program can live in the graph.** Each gap pushed the island out of the graph and into script or DOM access.

> **A game's rules are written once, in the project, and the words, the layout and the test hooks are nodes rather than
> scripts.**

**Track C — building a kit is a product, not a minefield.** Two renderers and a vendored Blockly found these.

> **A kit author ships a modern library and shares code between kits, and the product names their mistake before a
> drive does.**

**Track D — the MCP is the whole authoring path.** An agent through the MCP tools can do everything the generator does.

> **An agent builds, installs, settles and checks a whole app through the MCP door, and the same plan writes the same
> bytes, with no file written behind the door's back.**

**Track E — the template's own tooling tells the truth.**

> **A typo in a generator is caught at the line that has it, and a template lives where a person looks for it.**

🔴 **Track A outranks the others in every ordering decision.** A silent wrong screen is worse than a missing convenience,
as in P88. Within a track, tasks are ranked by **who each defect bites**, not by how cheap the fix is. **Track D is the one
Richard asked for by name** ("the way the MCP works"), so it takes the second slot in every session, not the last.

## 2. What is in, and what is not

**In:** every audit finding owned by an `ISL` task in [AUDIT §1](AUDIT-2026-10-01.md#1-the-findings) (F01–F37), and two
register rows that never had an owner and are taken here: **D85** (ISL-001) and **D83** (ISL-014).

**Out:**
- **F38–F45, the desktop shell.** They go to P91's DSK tasks (§5).
- **F07, F21, F22, F30, F31.** These are already owned, ruled or correct, as the audit's owner column records. ISL-025
  re-reads F22's gate.
- **F14, a block-program node and a tile-world node.** A kit is the right home for both. ISL-015 makes building one cheaper.
- Game design, mission content, prices and look items. P108 owns them.

## 3. What the audit corrected

[AUDIT §2](AUDIT-2026-10-01.md#2-corrections-this-audit-made-to-its-own-sources) has the full list. Two corrections change
the work:

- **"The deploy exits 0 when it refuses" is not a product defect.** It is the *internal* bundle's documented contract
  (`noodl-preview/src/deploy-cli.ts:10-13`). The product command `nodegx deploy` exits 11 on that refusal. The island's drives
  called the wrong entry point, and ISL-025 moves them.
- **"The door checks parameters, not connections" is stale.** GAM-019 refuses a wire to a port that does not exist, and that
  refusal is what made a lane wait for a kit lane in s2. Nothing is owed here.

## 4. The board

| task | sentence | from | side | 🔒 |
|---|---|---|---|---|
| **Track A** | | | | |
| [ISL-001](ISL-001-A-LIST-GIVEN-TWICE-DRAWS-ONE-SET-OF-ROWS.md) | A list given twice while it is building draws one set of rows — **🟡 s1: fix landed; AC5–AC7 owed** | F01, F06, **D85** | runtime | §5 after AC2 |
| [ISL-002](ISL-002-A-FALSE-FROM-A-STATES-NODE-REACHES-ITS-WIRE.md) | A `false` from a States node's first state reaches its wire (it leaves as `0`: `states.ts:592`, and the exporter too) | F02 | runtime, export | ✓ |
| [ISL-003](ISL-003-TWO-LISTS-WITH-THE-SAME-ROW-IDS-KEEP-THEIR-OWN-ROWS.md) | Two lists that reuse row ids keep their own rows | F03 | runtime | ✓ |
| [ISL-004](ISL-004-A-COMPONENT-KEEPS-ITS-OWN-STATE.md) | A page you come back to can be as you left it (instances already have their own store; leaving a page destroys it) | F04, F05 | runtime | ✓ |
| **Track B** | | | | |
| [ISL-005](ISL-005-TWO-FUNCTIONS-SHARE-ONE-PIECE-OF-CODE.md) | Two Functions share one piece of code | F08 | runtime | ✓ |
| [ISL-006](ISL-006-A-FUNCTION-SAYS-WHAT-ITS-PORTS-ARE.md) | A Function says what its ports are | F09 | runtime | ✓ |
| [ISL-007](ISL-007-AN-APP-SPEAKS-TWO-LANGUAGES-WITHOUT-A-SCRIPT.md) | An app speaks two languages without a script | F10 | node library | ✓ |
| [ISL-008](ISL-008-A-STYLESHEET-CAN-PLACE-A-GROUP.md) | A stylesheet can place a Group | F11 | runtime styling | ✓ |
| [ISL-009](ISL-009-A-NODE-CAN-BE-NAMED-FOR-A-TEST-AND-SCROLLED-TO.md) | A node can be named for a test and scrolled to | F12 | node library | ✓ |
| [ISL-010](ISL-010-A-RUNNING-APP-CAN-ASK-A-LOCAL-MODEL.md) | A running app can ask a local model | F13 | cloud nodes | ✓ |
| **Track C** | | | | |
| [ISL-011](ISL-011-A-KIT-NODE-KEEPS-ITS-OWN-DISPLAY.md) | A kit node keeps its own display (`defaultCss` lands inline, undocumented; the export ignores it) | F15 | kit bridge, docs, export | — |
| [ISL-012](ISL-012-A-KIT-CAN-SHIP-A-MODERN-LIBRARY.md) | A kit can ship a modern library | F16 | kit loader, extractor | ✓ |
| [ISL-013](ISL-013-TWO-KITS-SHARE-CODE-WITHOUT-A-COPY.md) | Two kits share code without a copy | F17 | kit system | ✓ |
| [ISL-014](ISL-014-A-MISSING-KIT-READER-IS-NAMED-AS-ONE.md) | A missing kit reader is named as one — **🟡 s1: the refusal names it (route a); build-on-demand on a ruling, AC6 owed** | F18, **D83** | MCP door | §5 for AC5 |
| [ISL-015](ISL-015-A-KIT-AUTHOR-READS-THE-TRAPS-BEFORE-MEETING-THEM.md) | A kit author reads the traps before meeting them | F20, F14 | docs, gate | — |
| **Track D** | | | | |
| [ISL-016](ISL-016-THE-DOOR-WRITES-THE-PROJECT-SETTINGS-AND-THE-HOME-PAGE.md) | The door writes the project settings and the home page | F23 | MCP | ✓ |
| [ISL-017](ISL-017-THE-DOOR-INSTALLS-A-KIT.md) | The door installs a kit, and a project need not carry a copy | F24, F19 | MCP, modules | ✓ |
| [ISL-018](ISL-018-WHAT-THE-DOOR-WRITES-IS-WHAT-THE-EDITOR-SAVES.md) | What the door writes is what the editor saves | F25 | MCP | after AC2 |
| [ISL-019](ISL-019-THE-SAME-PLAN-WRITES-THE-SAME-BYTES.md) | The same plan writes the same bytes | F26 | MCP | ✓ |
| [ISL-020](ISL-020-AN-AGENT-CHANGES-ONE-LINE-OF-A-BIG-SCRIPT.md) | An agent changes one line of a big script | F27 | MCP | ✓ |
| [ISL-021](ISL-021-AN-AGENT-CAN-PRESS-AND-TYPE-ON-A-RENDERED-PAGE.md) | An agent can press and type on a rendered page | F28 | MCP, render | ✓ |
| [ISL-022](ISL-022-THE-WRAPPED-ROW-WARNING-MEANS-A-ROW-WILL-OVERFLOW.md) | The wrapped-row warning means a row will overflow | F29 | validator | ✓ |
| **Track E** | | | | |
| [ISL-023](ISL-023-THE-GENERATOR-GATES-CATCH-A-TYPE-ERROR-AND-A-STRAY-BACKTICK.md) | The generator's gates catch a type error and a stray backtick | F32, F33 | tooling | — |
| [ISL-024](ISL-024-A-TEMPLATE-LIVES-IN-ITS-OWN-FOLDER.md) | A template lives in its own folder | F34 | repo | ✓ |
| [ISL-025](ISL-025-THE-ISLAND-DROPS-THE-WORKAROUNDS.md) | The island drops the workarounds (closing task) | every WA | template | per row |

🔒 = the task asks Richard something before it builds. "after AC1" = the ruling waits on a measurement.

## 5. Handed to P91

P91 is an index with no task files yet. Its rule is that each task re-reads its row at HEAD when the phase opens, so these
are written here for that session to read. **Nothing here edits P91's README**, because it carries another session's
uncommitted edit on 2026-10-01. The P91 session opens with this table.

| finding | P91 row it is evidence for | what P91's AC should say |
|---|---|---|
| F38 the shell is a per-template fork under `dev-docs/` | DSK-008, DSK-011 (P10: script-built first) | one product shell, parameterised by name and icon, used by Nightbook and the garden |
| F39 a rename moves `userData` and empties the app | DSK-011 ("rebuilding it keeps the data") | a renamed rebuild opens with the old saves (the garden's `pinUserData()` is the reference) |
| F40 the backup copies an empty SQLite while the state lives in localStorage | DSK-010 ("quitting never loses a change") | the backup holds the persisted Global store, or the store lives in a file |
| F41 no policy means `devOpen: true` and `signup: 'public'` | DSK-010, P11 | a packaged app with no policy ships closed |
| F42 no Mac Edit menu: no paste, no Cmd+Q | DSK-009 | Edit and app menus by role, checked by hand (CDP cannot press accelerators) |
| F43 a Mac-made lockfile drops other platforms' prebuilts | DSK-013 | Windows and Linux builds take a prebuilt binary, or say they compiled |
| F44 `build.files` dropped a native module's payload | DSK-011 | a packaged-app smoke test loads every native module |
| F45 the AppKit reopen prompt; `ELECTRON_RUN_AS_NODE` in agent shells | P91 §"Drive the real app" | the drive harness clears both |

## 6. Template follow-ups (P108's, not this phase's)

These are faults in the island's own code or drives, so they go to [P108](../phase-108-the-island-works/README.md)'s next
session:

- **F36:** Garden 3D's "Too Slow" fallback is persisted per profile, so a slow moment pins a real device to 2D for good.
  A product question for the template: should Too Slow expire?
- **F37:** `Draw world` whitelists fields, so every new kind of thing is dropped silently. A gate that each engine
  kind reaches the drawn world would catch the next one.
- A Blockly `when` block shows "…" until an event is picked, and the engine reads it as `meow`.
- The desktop shell keeps a byte-identical copy of the save packer (`copies.js`), so every save version must be mirrored.

## 7. The rule this phase adds: a finding gets a row the day it is met

The push filed nothing, though its first README asked it to (F46). Asking was not enough, because no step in any brief,
lane prompt or handoff did the filing. So, from this phase on:

1. **Any template session's handoff (`NEXT-SESSION-PROMPT.md`) has a "Product findings" section.** It names each NodeGX
   defect, gap or trap met that session, with its evidence, and either the register row it was filed as or "none met".
   An empty section is a reading, not a skipped step.
2. **A lane brief says it too.** A lane's handback lists the product findings it met beside its workarounds, and the
   orchestrator files them in the merge commit's session.
3. **The register is the place to file, and a phase's own traps list is not.** A trap written only in a task file is
   lost to the next template, which is how D85 was met three times.

This rule is also saved as a feedback memory for the model, because a README is read only by the session that opens it.

## 8. 🔒 Rulings

**Asked after session 1 (2026-10-01):** ISL-001 §5 — *"The Repeater no longer needs the 120 ms wait in front of a list it is given twice. Should Olive's Island drop its three waits (pad, crew, My robots)?"* Recommended: yes, as ISL-025 W3.

**Asked after session 1 (2026-10-01):** ISL-014 §5 — *"When the kit reader is missing from a checkout, should the door only say so and name the command (done), or also build it on demand the first time, so a fresh worktree never shares the primary's bundle?"* Recommended: say so now (done), build on demand next; never commit the bundle.

Each task's §5 has the full question, the options and the trade-offs. Ask in plain words, one decision
per question, and only when the task is next to build. This table is the index, with the recommendation in brackets.

| task | the question | recommended |
|---|---|---|
| ISL-002 | Should the first state send the typed value, skip unset values, or only be documented? Should the export change in the same commit? | typed value; yes |
| ISL-003 | Should each list keep its own rows, or should rows stay shared with a warning when one id arrives with different data? | shared, plus a warning with GAM-005's "shared on purpose" escape |
| ISL-004 | Should a page you come back to be as you left it? What is a component's own state? Should the product stop a stale write? | an opt-in "keep this page"; promote Component Object; not now |
| ISL-005 | Where does shared code live, and how does a Function say it uses it? Does it run in server render and cloud functions? | a project script file and a "Uses" list on the node |
| ISL-006 | Should the declared port list be authoritative per node? Can ports come from data? | yes, opt-in; not now |
| ISL-007 | Build P47's first slice, adopt `i18next-translation`, or build a new node? Which placeholder syntax? | P47's slice; `{name}` |
| ISL-008 | Should a node write inline only what the author set, with defaults in a low-priority class? | yes, after a census of which stylesheet rules start applying |
| ISL-009 | Where do `data-*` attributes go? Should every visual node get Scroll Into View? | inside ACC-006's accessibility group; yes |
| ISL-010 | Does the backend or the page make the model call? Is a key optional for loopback? | backend, in the cloud node; optional for loopback only |
| ISL-011 | Keep `defaultCss` inline and document it, or make it the lowest layer? Take P40's export half? | inline and documented; yes |
| ISL-012 | ES-module dependencies, or a documented global-bundle recipe? Should the catalog reader load dependencies? | the recipe; yes |
| ISL-013 | A manifest `requires` field, a shared node-less module, or document `__noodl_modules`? | `requires`, refusing when the kit is missing |
| ISL-014 | For a missing reader: say so, build it on demand, or commit the bundle? | say so now, build on demand next, never commit |
| ISL-015 | Where does the trap list live? | the docs page plus the scaffold README |
| ISL-016 | Does an explicit settings call overwrite existing values? Does a generator keep its skeleton write? | yes, reporting was/now; yes for now |
| ISL-017 | Where does a template-only module come from? Does the repo's template copy a library kit or reference it? | a library entry; a reference, copied on install or publish |
| ISL-018 | Only if AC2 finds the editor leaves the key absent: a project-level marker the migration reads | measure first |
| ISL-019 | How is reproducible output asked for? Do all sessions get stable component ids? | a server option (namespace + epoch); yes for ids |
| ISL-020 | What shape does a text edit take, and how is big text read? | a find-and-replace tool with an expected count; long values shortened in `get_component` |
| ISL-021 | What kind of interaction door, which verbs, and where does it sit? | one call taking a step list; eleven verbs from the 18 drives; in the `explore` group |
| ISL-022 | Should the warning still fire on items with a pixel width? This reverses GAM-022's choice | only when a row is wider than a phone |
| ISL-024 | Where does a template's source live, what moves, and when? | `packages/nodegx-templates/<slug>/`; not the kits or shells yet; the garden first, after P108 s5 |
| ISL-025 | Per workaround, when its fix lands: drop it, or keep it with a comment? | per row, P88 R28's form |

🔴 **Every new MCP tool has 5 tokens of resident headroom** (8,275 of 8,280). Track D's tasks each append to an
existing deferred group, which costs 0 resident tokens. None adds a parameter to a resident tool.

## 9. Order of work

**Slice 0 needs no ruling, and the first session should start here:**

1. **ISL-025's two "available now" rows.** The island's two hand-built loops move to the existing `Repeat` node, and its
   drives move to `nodegx deploy` with real exit codes. Both cost nothing in product code, and they prove the closing task's
   method.
2. **ISL-001 (D85).** It is the worst open defect: three surfaces, a silent wrong screen, and a latch in every template that
   meets it.
3. **ISL-014 (D83)** and **ISL-011**. Each is small, builds its recommended route without a ruling (each file keeps its
   🔒 questions so the riskier options are never taken in passing), and removes a workaround.
4. **ISL-002's AC1, ISL-018's AC2 and ISL-022's AC1.** Each is a measurement that decides a ruling, so do these before
   asking. ISL-002's cause is already visible in source (`states.ts:592`).

**Then the rulings for Tracks B and D**, asked together because ISL-005 (shared code) changes the size of ISL-020's
problem, and ISL-016/017/019 decide whether a generator can drop its raw writes.

🔴 **One heavy job at a time.** Peer sessions share this machine. A drive, a packaged build or a full `test:ci` is one heavy
job each.

## 10. Status

| track | built | of |
|---|---|---|
| A | 0 (ISL-001 🟡 fix landed) | 4 |
| B | 0 | 6 |
| C | 0 (ISL-014 🟡 fix landed) | 5 |
| D | 0 | 7 |
| E | 0 | 3 |
