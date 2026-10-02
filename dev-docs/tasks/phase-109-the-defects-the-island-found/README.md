# Phase 109 — The defects the island found

**Scoped:** 2026-10-01, at HEAD `27d891bf3`, from [the island audit](AUDIT-2026-10-01.md). The audit read P105, P106 and
P108 (Olive's Island, [TPL-012](../phase-78-the-templates/TPL-012-THE-CODING-GARDEN.md)): their task files, 225 commits, 57
session and lane transcripts, the generator, both kits, the desktop shell and the shipped template.
**Status: 🟡 OPEN — session 4 (2026-10-02): 4 of 25 closed (ISL-001, ISL-002, ISL-011, ISL-014); ISL-022 built (AC6 open); ISL-018 built (one case open); ISL-025 W1–W3, W13, W21 removed; round 1 of Tracks B/D ruled (ISL-007, ISL-009, ISL-019), ISL-005 turned into research on Richard's direction (§8).** **Prefix: `ISL`.** Start with [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md).

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
| [ISL-001](ISL-001-A-LIST-GIVEN-TWICE-DRAWS-ONE-SET-OF-ROWS.md) | A list given twice while it is building draws one set of rows — **✅ CLOSED s3: fix (s1); AC6 (s2, 14→9 on the page); AC5 (80/80; the minimal page's control blind — said so); AC7 (8 modes runs 90/90, no lost press)** | F01, F06, **D85** | runtime | §5 after AC2 |
| [ISL-002](ISL-002-A-FALSE-FROM-A-STATES-NODE-REACHES-ITS-WIRE.md) | A `false` from a States node's first state reaches its wire (it leaves as `0`: `states.ts:633`, and the exporter too) — **✅ CLOSED s3: ruled and fixed (`06e65ab47`) in the runtime, the export and P107's spec; AC1–AC5 met (AC5 on a deployed page, `boolean:false` / `string:""` vs the control's `0`), AC6 written** | F02 | runtime, export | ✓ ruled |
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
| [ISL-011](ISL-011-A-KIT-NODE-KEEPS-ITS-OWN-DISPLAY.md) | A kit node keeps its own display — **✅ s4: closed — AC6 on W13's ruling (the force removed, a person's display sticks; page drive 50/50)** | F15 | kit bridge, docs, export | — |
| [ISL-012](ISL-012-A-KIT-CAN-SHIP-A-MODERN-LIBRARY.md) | A kit can ship a modern library | F16 | kit loader, extractor | ✓ |
| [ISL-013](ISL-013-TWO-KITS-SHARE-CODE-WITHOUT-A-COPY.md) | Two kits share code without a copy | F17 | kit system | ✓ |
| [ISL-014](ISL-014-A-MISSING-KIT-READER-IS-NAMED-AS-ONE.md) | A missing kit reader is named as one — **✅ s4: closed — AC6: an agent in a checkout with no reader was told it was built (304 ms) and placed the kit node; the deployed page draws it** | F18, **D83** | MCP door | ✓ ruled |
| [ISL-015](ISL-015-A-KIT-AUTHOR-READS-THE-TRAPS-BEFORE-MEETING-THEM.md) | A kit author reads the traps before meeting them | F20, F14 | docs, gate | — |
| **Track D** | | | | |
| [ISL-016](ISL-016-THE-DOOR-WRITES-THE-PROJECT-SETTINGS-AND-THE-HOME-PAGE.md) | The door writes the project settings and the home page | F23 | MCP | ✓ |
| [ISL-017](ISL-017-THE-DOOR-INSTALLS-A-KIT.md) | The door installs a kit, and a project need not carry a copy | F24, F19 | MCP, modules | ✓ |
| [ISL-018](ISL-018-WHAT-THE-DOOR-WRITES-IS-WHAT-THE-EDITOR-SAVES.md) | What the door writes is what the editor saves — **🟡 s3: AC2 measured (the editor's own save was rewritten on reopen); ruled "format step 4→5"; built `b2ba0320a` and driven — the box survives a reopen; ⚠️ older editors refuse a format-5 project** | F25 | MCP | after AC2 |
| [ISL-019](ISL-019-THE-SAME-PLAN-WRITES-THE-SAME-BYTES.md) | The same plan writes the same bytes — **🟢 s5: built on "Keep the same id": ids derived from the project and the path, one clock, `--reproducible <ns>@<epoch>`, a no-change update writes nothing; AC1–AC5, AC8 met. ⬜ AC6, ⬜ AC7 (the garden's pins: a peer's live edits, and the trailing-newline byte)** | F26 | MCP | ✓ ruled |
| [ISL-020](ISL-020-AN-AGENT-CHANGES-ONE-LINE-OF-A-BIG-SCRIPT.md) | An agent changes one line of a big script | F27 | MCP | ✓ |
| [ISL-021](ISL-021-AN-AGENT-CAN-PRESS-AND-TYPE-ON-A-RENDERED-PAGE.md) | An agent can press and type on a rendered page | F28 | MCP, render | ✓ |
| [ISL-022](ISL-022-THE-WRAPPED-ROW-WARNING-MEANS-A-ROW-WILL-OVERFLOW.md) | The wrapped-row warning means a row will overflow — **🟢 s4: built on "Yes, both": the three false alarms silent, `row-cannot-wrap` names `brTabs`; census 22 → 14 + 7 new; four pins moved, landing-pages fixed at source. ⬜ AC6 (Claude Code over the door)** | F29 | validator | ✓ |
| **Track E** | | | | |
| [ISL-023](ISL-023-THE-GENERATOR-GATES-CATCH-A-TYPE-ERROR-AND-A-STRAY-BACKTICK.md) | The generator's gates catch a type error and a stray backtick | F32, F33 | tooling | — |
| [ISL-024](ISL-024-A-TEMPLATE-LIVES-IN-ITS-OWN-FOLDER.md) | A template lives in its own folder | F34 | repo | ✓ |
| [ISL-025](ISL-025-THE-ISLAND-DROPS-THE-WORKAROUNDS.md) | The island drops the workarounds (closing task) — **🟡 s2: W1, W2 and W3 (ruling 1) landed and driven; the census spec pins 22 rows; s4: W13 ("Remove the force") and W21 (ISL-022) removed** | every WA | template | per row |

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
- **ISL-002 AC6 (2026-10-02):** since `06e65ab47` a States node's first state sends `false` as `false` (it was the number
  `0`). Olive's Island's `plMode.record` can go back to a boolean (`false` in Drive, `true` in Teach): its reader
  `Inputs.record !== false && String(Inputs.record) !== 'no'` (`cg003Scripts.ts:365`) then reads Drive as "do not record".
  It is ISL-025's row for the `'yes'`/`'no'` strings; change it only with a drive that presses Drive and counts zero blocks.

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
**✅ Ruled 2026-10-02 — Richard: "Sure."** Built as ISL-025 W3 in session 2 (all four copies of the wait: the pad, the crew, My robots, and her land's blueprints — the fourth was added by IW-007 after the question was written; same defect, same fix).

**ISL-014 §5, re-asked in plainer words (2026-10-02, the first wording got "Huh?"):** A *kit* is a pack of custom nodes a
project carries in its `noodl_modules` folder. For the MCP server to know a kit's node types it needs a small helper
program that is built from source (`npm run build` in `packages/noodl-mcp`). In a fresh checkout or a worktree nobody
has built it, so until session 1 the server blamed *the kit* ("ensure the module is installed"); now it says *"the helper
that reads kits is missing — run this command"*. **The question: is telling the person the command enough, or should the
server build the helper by itself the first time it finds it missing?** Recommended: telling is enough for now; build it
by itself later; never commit the 3.7 MB helper to git.
**✅ Ruled 2026-10-02 (session 3) — Richard: "Build it automatically"** (against the recommendation). Asked as: *"…The
server used to say "your kit is broken" when that happened. It now says "the helper is missing, run this command". Is
saying so enough, or should the server build the helper itself the first time it finds it missing (takes a minute or
so, once)?"* Options shown: saying so is enough (recommended) / build it automatically / commit the helper to git.
ISL-014 §5 option (b) — the server builds the reader when it runs from a checkout and the bundle is missing; never
committed.

**ISL-002 §5, re-asked in plainer words (2026-10-02, the first wording got "Huh?"):** A *States* node has named states
(say `off` and `on`) and, for each state, the values its outputs should send (for an output `visible`: `off → false`,
`on → true`; for a text output: `off → ""`, `on → "Hello"`). When the page loads, the node starts in its first state and
sends those values. **The bug: for the first state only, it sends the number `0` instead of `false`, and `0` instead of
the empty text.** Every later state change sends the right value. **Question A: should the first state send `false` and
`""`, like every later state does?** Recommended yes. **Question B: the "export to a React app" feature has its own copy
of the States logic with the same bug — fix it in the same commit?** Recommended yes.
**✅ Ruled 2026-10-02 (session 3) — Richard: "Fix both, one commit"** (the recommendation). Asked as: *"…For that first
state only, it sends the number 0 instead of false, and 0 instead of empty text. Every later state change sends the
right value. Should the first state send false / empty text like every later change does? The "export to a React app"
feature has its own copy with the same bug. Should both be fixed in one commit?"* Built in session 3 (`06e65ab47`).

**Asked after session 1 (2026-10-01):** ISL-014 §5 — *"When the kit reader is missing from a checkout, should the door only say so and name the command (done), or also build it on demand the first time, so a fresh worktree never shares the primary's bundle?"* Recommended: say so now (done), build on demand next; never commit the bundle.

**Asked in session 3 (2026-10-02), after their measurements, in plain words:**

- **ISL-018 §5 — ✅ Ruled: a format step, 4→5.** First asked as *"…wire something into a Function's Run port in the
  editor and save, and nothing records the box. Reopen the project and an old-project upgrade unticks it… Which fix?"*
  with (b) a project marker (recommended) / (a) always save the box → Richard: **"This sounds nuts, surely there must be
  a cleverer fix?"** Re-asked with the editor's own one-time upgrade chain (`ProjectModel.Upgraders`, 0→1→…→4): *"Make
  the old-project box fix the next step, 4→5. A project at 4 gets it once, is saved as 5, and is never touched again.
  Every project the editor or the MCP creates starts at 5… Caveat: …this stops it from happening again, it doesn't undo
  past ones."* → **"Yes, version step 4→5."** Neither option of §5 as written: no new field, no write-time settling.
- **ISL-022 §5 — ✅ Ruled: "Yes, both."** Asked as *"…Should the warning stop firing on small fixed-size items (only %
  widths, or items wider than a phone) and gain a new warning for the tab-row shape? This undoes GAM-022's choice to keep
  it firing on Rocket School's 132 px tiles and 150 px cards."* → §5 ruling 1 (b) plus the new code of §5 item 3.
- **ISL-011 AC6 / ISL-025 W13 — ✅ Ruled: "Remove the force."** Asked as *"…the kit forces 'display: grid' every time it
  draws. So if someone types 'display: flex' into that node's CSS Style box… it's undone on the next redraw… the force
  isn't needed for the grid any more. Remove it?"*

**Session 4 (2026-10-02), round 1 of the Track B/D questions** — each checked first for an existing mechanism:

- **ISL-007 — ✅ Ruled: "Adopt the add-on"** (against the recommendation, which was phase 47's built-in slice).
  Asked as *"Olive's Island speaks French and English and built its own word-swapping script, because NodeGX has no
  standard way. Two answers exist already: the i18next translation add-on (works, nightbook uses 22 of its nodes, but
  needs a JSON file and {{name}} blanks), and a planned built-in translation feature (phase 47) that was never
  started. Which should bilingual apps use?"*
- **ISL-019 — ✅ Ruled: "Keep the same id"** (recommended). Asked as *"Every component has a hidden id. When an agent
  rebuilds a component today it gets a brand-new id, so git shows the whole file changed even when nothing did. Should
  a component rebuilt in the same place keep its id? (The catch: a component deleted and recreated under the same name
  gets its old id back.)"* Ruling 1 (how reproducible output is asked for) is taken as the engineering default: a
  startup switch for the generators' timestamps.
- **ISL-009 — ✅ Ruled: "Signal on every node"** (recommended). Asked as *"…Groups have a 'Scroll To Element' action,
  but it's hidden unless the Group uses an older scrolling mode… Should every visual node get its own 'Scroll into
  view' signal that works anywhere, including on the page itself?"*
- **ISL-005 — 🔬 Not ruled: research first, on Richard's direction.** Asked where shared code should live (project
  script file recommended), Richard answered: *"in theory that would be a good case for a component node no?? You create
  a logic component, stick your robot engine code inside it with the component inputs and outputs, and then place that
  component with the function node inside it in 17 different places."* Told that the engine is ~90 helpers that 17
  different Functions call mid-script, and re-asked, he answered: *"I think this is an important point to research
  further, because one of the criticisms from the NodeGX community at the moment is 'So in reality Claude Code just ends
  up creating a bunch of function nodes and custom UI components instead of using NodeGX nodes? Thus proving that low
  code tools aren't good enough to build production apps'. I feel like we're taking the easy way out… using components
  and native NodeGX nodes where possible is validating the concept rather than just defaulting to scripts all the time.
  But I recognise that with the robot game you deffo needs scripts quite a bit, because of the complexity and three.js."*
  → ISL-005 §8 s4 scopes the research. ISL-020 (one line of a big script) and ISL-006 (a Function's ports) wait on it.

Each task's §5 has the full question, the options and the trade-offs. Ask in plain words, one decision
per question, and only when the task is next to build. This table is the index, with the recommendation in brackets.

| task | the question | recommended |
|---|---|---|
| ISL-002 | **Measured s1:** the first state sends the number `0` for a boolean `false` and for `''` (both transition settings); the return path sends `false`/`''`. Should the first state send the typed value, skip unset values, or only be documented? Should the export change in the same commit? | typed value; yes |
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
| A | **2** (ISL-001 ✅ s3, ISL-002 ✅ s3) | 4 |
| B | 0 | 6 |
| C | **2** (ISL-011 ✅ s4, ISL-014 ✅ s4) | 5 |
| D | 0 (ISL-022 🟢 built, AC6 run once — inconclusive; ISL-018 🟡 built, one case open) | 7 |
| E | 0 (ISL-025 🟡 W1–W3, W13, W21 removed) | 3 |
