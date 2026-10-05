# Phase 109 — The defects the island found

**Scoped:** 2026-10-01, at HEAD `27d891bf3`, from [the island audit](AUDIT-2026-10-01.md). The audit read P105, P106 and
P108 (Olive's Island, [TPL-012](../phase-78-the-templates/TPL-012-THE-CODING-GARDEN.md)): their task files, 225 commits, 57
session and lane transcripts, the generator, both kits, the desktop shell and the shipped template.
**Status: 🟡 OPEN — s15 (2026-10-04): 11 of 25 closed — ISL-021 ✅, ISL-016 ✅ and ISL-017 ✅ (AC3 ruled "build the cheap 9, drop 8" and built: console/network/other-origin reads and `reduced_motion`); ISL-017 ruling 2 built (the garden commits its kits' record, not the kits; AC2 + AC7 met); ISL-016 AC8 (four generators through the door). s14: 8 of 25 closed; ISL-021 all eleven verbs, AC6 + AC7 met (AC3's bar not met: 17 named clauses); ISL-017 ruling 2's record + resolver; `find_tools` reads a sentence's words; `render_report` names `drive_page`. s13: ISL-019 ✅; ISL-016/017/021 built. s12 (2026-10-03): 7 of 25 closed — ISL-015 ✅ (AC5: the stranger round, run twice: the first found two MCP door defects, both fixed, and a docs gap; the second deployed and drove 5/5 with sabotage arms red by name); ISL-019 AC7 ✅ (the garden drops its pins, 407 files re-baselined by their newline, 0 differ), AC6 run twice (the update route holds; agents rebuild by delete + create: a ruling). s11: 6 of 25 closed; four rulings in one round (ISL-007 AC6 "Warn if app translates"; ISL-015's three, as recommended), both BUILT: ISL-015 (the kit traps on the docs page and in the scaffold README, gated, the reload trap's sample run; AC5's stranger round owed) and ISL-007 AC6 (the `typed-word-not-translated` warning); ISL-019 AC7's newline byte measured (no ruling needed). s10: ISL-023 ✅. s9 (2026-10-03): 5 of 25 closed — ISL-003 ✅ ruled "Each list keeps its rows", built (Repeater + Static Data; doctrine) and driven deployed (6/6, control 3/3); ISL-007 AC7's catalog half ✅ (the add-on's nodes say what they do). Session 7 (2026-10-03): 4 of 25 closed (ISL-001, ISL-002, ISL-011, ISL-014); ISL-009's two rulings built and driven, and s7's AC7: the island's plot card scrolls itself and the owl row has names; only the export half is open (P18's pile); ISL-007 AC1 read (288 of 334 texts switch, 0 braces); **s8: ISL-007 built (the i18next add-on 1.1.0), AC2/AC3/AC5 driven; Array Filter "Is one of" built (a "Native nodes first" gap); the island rebuild scoped as P108 IW-010;** DEF038 attributed (not ISL-018; the gate's control arm fixed); ISL-019 built (AC6, AC7 open); ISL-005 researched and ruled "Native nodes first"; ISL-022 built (AC6 open); ISL-018 built (one case open); ISL-025 W1–W3, W13, W21 removed (§8).** **Prefix: `ISL`.** Start with [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md).

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
| [ISL-003](ISL-003-TWO-LISTS-WITH-THE-SAME-ROW-IDS-KEEP-THEIR-OWN-ROWS.md) | Two lists that reuse row ids keep their own rows — **🟢 s9: ruled "Each list keeps its rows", built in the form that changes least (a list keeps its own records only for ids another live list holds; Repeater and Static Data opt in); ✅ s9: CLOSED — AC5 deployed: treatment 6/6, control 3/3 (card 3's lines ×3)** | F03 | runtime | ✓ ruled |
| [ISL-004](ISL-004-A-COMPONENT-KEEPS-ITS-OWN-STATE.md) | A page you come back to can be as you left it (instances already have their own store; leaving a page destroys it) | F04, F05 | runtime | ✓ |
| **Track B** | | | | |
| [ISL-005](ISL-005-TWO-FUNCTIONS-SHARE-ONE-PIECE-OF-CODE.md) | Two Functions share one piece of code — **🔬 s5: census done ([report](ISL-005-CENSUS-2026-10-02.md)): of 88 Functions, 26 could be native nodes, 33 fit a logic component, 29 are genuine script (15 need shared code mid-logic); re-ask with the numbers** | F08 | runtime | ✓ |
| [ISL-006](ISL-006-A-FUNCTION-SAYS-WHAT-ITS-PORTS-ARE.md) | A Function says what its ports are | F09 | runtime | ✓ |
| [ISL-007](ISL-007-AN-APP-SPEAKS-TWO-LANGUAGES-WITHOUT-A-SCRIPT.md) | An app speaks two languages without a script — **🟡 s8: BUILT — the add-on 1.1.0 rebuilt from its recovered sources: text as typed, missing words/variables named, `<html lang>` follows; AC2/AC3/AC5 ✅ (spec 5/5 vs 1/5 as imported; deployed drive 16/16, control 5/5); AC8 in P47. Open: AC4 (moved to IW-010). s9: AC7's catalog half ✅. s11: AC6 ✅ ruled "Warn if app translates" and built — `typed-word-not-translated` (Tailr 149, hsseq 0, DBT 11 page titles filed), spec 16/16, mutant 3 red, through the door** (s7: AC1 288 of 334, 0 braces) | F10 | node library | ✓ |
| [ISL-008](ISL-008-A-STYLESHEET-CAN-PLACE-A-GROUP.md) | A stylesheet can place a Group | F11 | runtime styling | ✓ |
| [ISL-009](ISL-009-A-NODE-CAN-BE-NAMED-FOR-A-TEST-AND-SCROLLED-TO.md) | A node can be named for a test and scrolled to — **🟢 s6: a `data-*` list on every visual node but Drag (each name an input, typed or wired; `onclick` refused by the door with the rule); the deployed drive selects every element by `[data-testid]` only, 4/4 at 1024 and 390 with its control. s5: Scroll Into View on all 27. s7: ✅ AC7 (the plot card scrolls itself; control at −999 px without the wire). ⬜ export only (P18 s101's pile in `component.ts`)** | F12 | node library | ✓ ruled (2 of 3) |
| [ISL-010](ISL-010-A-RUNNING-APP-CAN-ASK-A-LOCAL-MODEL.md) | A running app can ask a local model | F13 | cloud nodes | ✓ |
| **Track C** | | | | |
| [ISL-011](ISL-011-A-KIT-NODE-KEEPS-ITS-OWN-DISPLAY.md) | A kit node keeps its own display — **✅ s4: closed — AC6 on W13's ruling (the force removed, a person's display sticks; page drive 50/50)** | F15 | kit bridge, docs, export | — |
| [ISL-012](ISL-012-A-KIT-CAN-SHIP-A-MODERN-LIBRARY.md) | A kit can ship a modern library | F16 | kit loader, extractor | ✓ |
| [ISL-013](ISL-013-TWO-KITS-SHARE-CODE-WITHOUT-A-COPY.md) | Two kits share code without a copy | F17 | kit system | ✓ |
| [ISL-014](ISL-014-A-MISSING-KIT-READER-IS-NAMED-AS-ONE.md) | A missing kit reader is named as one — **✅ s4: closed — AC6: an agent in a checkout with no reader was told it was built (304 ms) and placed the kit node; the deployed page draws it** | F18, **D83** | MCP door | ✓ ruled |
| [ISL-015](ISL-015-A-KIT-AUTHOR-READS-THE-TRAPS-BEFORE-MEETING-THEM.md) | A kit author reads the traps before meeting them — **✅ s12: closed — AC5: a stranger agent wrapped a library from the docs page alone; deployed and driven 5/5 (token pixel, edit through 3 re-renders, CSS kept inside, no wrapper), sabotage arms red by name; its first round found `P109-S12-KITONDISK` + `-SETROOTSOP` (fixed). s11: ruled (three, as recommended) and BUILT: "Wrapping a library" (T3 with a run sample, T4, T5) + T1 on the docs page, "Traps you will meet" in the scaffold README, `create_node_kit` points at it; gate 21/21, two sabotage arms red by name; T6/T7 pending ISL-013/012. ✅ AC5 s12** | F20, F14 | docs, gate | ✓ ruled |
| **Track D** | | | | |
| [ISL-016](ISL-016-THE-DOOR-WRITES-THE-PROJECT-SETTINGS-AND-THE-HOME-PAGE.md) | The door writes the project settings and the home page — **✅ s15: CLOSED — AC5 (FLD-009's guard keeps or refuses the door's home write; reverted arm loses it), AC6's editor reading (home `app_group` + title vs the control's none), AC8 (tpl001/003/005/006 through the door; tpl007/008/010 peer-dirty, the helper stays). 🟢 s13: ruled "Replace, say what changed" and BUILT `set_project_settings`; AC2/3/4/7 ✅, AC6 agent half ✅. s14: AC8 measured — the four clean generators' templates carry no `modified` (the editor's save always writes it), so each swap re-baselines its template; `tpl007` is peer-dirty; `P109-S13-FINDTOOLSPHRASE` fixed. Open: AC5, AC6's editor reading, AC8** | F23 | MCP | ✓ |
| [ISL-017](ISL-017-THE-DOOR-INSTALLS-A-KIT.md) | The door installs a kit, and a project need not carry a copy — **✅ s15: CLOSED — AC3 (two orders, same catalog and files) and AC5 (an agent installed kits + font through the door and placed `garden-kit.Garden`, 46 turns, $1.13). Ruling 2 BUILT — the garden commits its kits' record, not the kits (438 → 414); every reader that copies it resolves from `library/` (39 readers, not 6; `assemble` is the seam); the shelf publish stages and resolves (inert today: the garden is not on the shelf); AC2 (Fredoka loaded vs none) and AC7 ✅. 🟢 s14: ruling 2 first half — the record names its entry as data (`entry`/`entryVersion`), `scripts/library/resolve-template-kits.js` round-trips the garden byte for byte (4 folders identical to the library); the publish hook waits (the script carries a peer's uncommitted P78 edit); then the six readers, then drop the folders. s13: Fredoka a library entry, the garden installs through `install_prefab`; AC1/4/6 ✅** | F24, F19 | MCP, modules | ✓ |
| [ISL-018](ISL-018-WHAT-THE-DOOR-WRITES-IS-WHAT-THE-EDITOR-SAVES.md) | What the door writes is what the editor saves — **🟡 s3: AC2 measured (the editor's own save was rewritten on reopen); ruled "format step 4→5"; built `b2ba0320a` and driven — the box survives a reopen; ⚠️ older editors refuse a format-5 project. s7: AC7 — def038 reads the same 3 rows before and after `b2ba0320a`; one is the DBT demo, a live example of the open case** | F25 | MCP | after AC2 |
| [ISL-019](ISL-019-THE-SAME-PLAN-WRITES-THE-SAME-BYTES.md) | The same plan writes the same bytes — **✅ s13: CLOSED — AC6 ruled "Accept it" (met by the edit route). 🟢 s5: built on "Keep the same id": ids derived from the project and the path, one clock, `--reproducible <ns>@<epoch>`, a no-change update writes nothing; AC1–AC5, AC8 met. ✅ AC7 s12 (the garden starts the door reproducible, the three pins gone, 407 files re-baselined by their newline, 0 differ, wall-clock control 407 red). 🟡 AC6 s12: the update route answers `unchanged` over the real protocol, but 2/2 agents rebuild by delete + create (`P109-S12-REBUILDSTAMPS`, a ruling)** | F26 | MCP | ✓ ruled |
| [ISL-020](ISL-020-AN-AGENT-CHANGES-ONE-LINE-OF-A-BIG-SCRIPT.md) | An agent changes one line of a big script | F27 | MCP | ✓ |
| [ISL-021](ISL-021-AN-AGENT-CAN-PRESS-AND-TYPE-ON-A-RENDERED-PAGE.md) | An agent can press and type on a rendered page — **✅ s15: CLOSED — AC3 ruled "build the cheap 9, drop 8" and built: `read` takes `console_errors`, `network_errors`, `other_origins` (lists so far), and `reduced_motion` is the twelfth verb; count 97/42/10 (drag 2 + the 8 ruled out). 🟢 s14: ALL ELEVEN VERBS — `stub_route` built (before-boot stubs; leading 1 / later 0); seeds re-written at the next load (the island's own save ate them, 3 of 4 arms); a tap waits for a still target; AC7 ✅ (SHORT/BUY as step lists = the deployed CDP drive's verdict per clause, EN+FR, Buy-wire sabotage red on BUY); AC6 ✅ round 2 (an agent built a form and proved it with `drive_page`, $1.47 — round 1 never found it: `render_report` now names it); AC3 counted 88/42/19 — 17 non-drag/touch "not": the bar is not met** | F28 | MCP, render | ✓ |
| [ISL-022](ISL-022-THE-WRAPPED-ROW-WARNING-MEANS-A-ROW-WILL-OVERFLOW.md) | The wrapped-row warning means a row will overflow — **🟢 s4: built on "Yes, both": the three false alarms silent, `row-cannot-wrap` names `brTabs`; census 22 → 14 + 7 new; four pins moved, landing-pages fixed at source. ⬜ AC6 (Claude Code over the door)** | F29 | validator | ✓ |
| **Track E** | | | | |
| [ISL-023](ISL-023-THE-GENERATOR-GATES-CATCH-A-TYPE-ERROR-AND-A-STRAY-BACKTICK.md) | The generator's gates catch a type error and a stray backtick — **✅ s10: CLOSED (`5ff15228b`): `scripts/template-gate.js` runs before every `template:*` (types of the generator's own files + a source scan for a stray backtick and a `${…}` in a produced comment, by file and line; 9 generators, 1,219 literals in 2.9 s); garden + rocket arms red with nothing written; the old gates measured blind (a backtick pair left 2 of 3 green)** | F32, F33 | tooling | — |
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

**Session 9 (2026-10-03):**

- **ISL-003 — ✅ Ruled: "Each list keeps its rows"** (the recommendation, after a census of 236 projects). Asked as
  *"Olive's Island had five lesson cards, each with its own little list of lines numbered l0, l1, l2. All five cards
  showed the same card's lines. … The exported React app does NOT do this … What should happen when two lists use the
  same row ids?"* Options: each list keeps its rows / keep shared, warn / keep shared, document it. Built so a single
  list behaves as before (ISL-003 §8 s9 says why), which drops the quoted cost (the Table prefab) to zero.

**Session 4 (2026-10-02), round 1 of the Track B/D questions** — each checked first for an existing mechanism:

- **ISL-007 — ✅ Ruled: "Adopt the add-on"** (against the recommendation, which was phase 47's built-in slice).
  Asked as *"Olive's Island speaks French and English and built its own word-swapping script, because NodeGX has no
  standard way. Two answers exist already: the i18next translation add-on (works, nightbook uses 22 of its nodes, but
  needs a JSON file and {{name}} blanks), and a planned built-in translation feature (phase 47) that was never
  started. Which should bilingual apps use?"*
- **ISL-007 AC6 — ✅ Ruled (s11, 2026-10-03): "Warn if app translates"** (recommended). Asked with Tailr's 162 typed
  words and the two hsseq copies that install the add-on and translate nothing.
- **ISL-015 — ✅ Ruled (s11, 2026-10-03), all three as recommended:** "Grow existing pages", "Advice + exception",
  "Phrase check + 1 sample".
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

**Session 5 (2026-10-02), round 2 — two questions, both ruled on the recommendation:**

- **ISL-005 — ✅ Ruled: "Native nodes first."** Asked with the census's numbers ([report](ISL-005-CENSUS-2026-10-02.md)):
  *"…26 could be ordinary NodeGX nodes today… 33 fit your idea exactly: a logic component… 29 are real code… only 15
  of those need shared code partway through a script. Doing the first two groups would cut the copied code from 3.0 MB
  to about 1.2 MB with no new feature. What should happen next?"* Options: native nodes first (recommended) / build the
  shared script file / one engine component only. → The island is rebuilt toward native nodes and logic components as
  **its own template task**, the four product gaps that blocked it are fixed (translation via ISL-007's add-on, String
  Format's repeated placeholder, an "in list" filter, rows shared app-wide by id), and the shared script file is decided
  afterwards for what is left. ISL-005 itself does not build its §5 now.
  ⚠️ **One premise was wrong:** String Format *does* fill a placeholder used twice (a peer measured it the same night;
  `P109-S5-STRINGFORMAT` withdrawn as a duplicate of P107-D2, which owns the wrong comment and description). The gaps are
  three, not four. Not re-asked: it does not change which way the choice points; say so when the island task is scoped.
- **ISL-009 ruling 1 — ✅ Ruled: "A data-* list."** Asked as *"…tests and AI agents find things on screen by their CSS
  class names, because a node cannot carry a name just for tests… Should every visual node be able to carry data-*
  attributes (e.g. data-testid="plot-card") that no stylesheet needs?"* Options: a data-* list (recommended) / one Test
  ID field / not now. → §5 ruling 1 (b): name/value rows, `data-*` names only, values wirable, in the server-rendered HTML.

**Session 13 (2026-10-04), round 3 — four questions in one round, populations measured first, all ruled on the
recommendation:**

- **ISL-021 — ✅ Ruled: "One call, a step list."** Asked as *"Claude can build a page and look at its first picture
  (the render report), but it can't press a button or type into a field. So proving that a game or a form actually
  works needs a separate browser script, written by hand: the repo has 114 of these (45,773 lines), 22 of them for
  Olive's Island. How should Claude get to press and type?"* Options: one call, a step list (recommended) / a browser
  that stays open / reuse the observe server / not now. §5 rulings 2 (the eleven verbs, from the corpus) and 3
  (appended to `explore`, 0 resident tokens) are taken as the engineering defaults the ruling implies.
- **ISL-017 ruling 2 — ✅ Ruled: "Copy on install."** Asked with the census: 8 committed kit copies in `templates/`,
  2.0 MB; 7 byte-identical to the library; the 8th, the DBT template's translation add-on, is September's build without
  ISL-007's Oct 3 fixes. *"Should templates in the repo stop carrying the copy?"* Options: copy on install
  (recommended) / keep the copies / reference by name. AC7's reader census comes before any build. Ruling 1 (a
  template's own module becomes a library entry) is taken as the engineering default: no tool, no parameter.
- **ISL-016 ruling 1 — ✅ Ruled: "Replace, say what changed"**, with a correction from Richard that changes the
  wording, not the design: *"remember the project's 'No home set' warning is when the 'App' component hasn't been set,
  I don't think it's about what page it opens on. … in the editor we can right click any component and click 'Set as
  home' or something, and it turns it into the 'App' component, which I guess is the root where the main page router is
  expected to be?"* He is right: the editor's "Make home" (`makeComponentHome`, `useComponentActions.ts`) points
  `rootNodeId` at the component's first top-level node whose type may be an export root — the App with its Router —
  not at a page. The question had called the home "the page it opens on". The tool mirrors "Make home". Ruling 2 (b):
  generators keep the minimal skeleton write — `create_project` still mints a random id and a wall-clock time
  (`createProject.ts:127`, `:157`), so (a) cannot pass a byte gate yet.
- **ISL-019 AC6 — ✅ Ruled: "Accept it."** Asked as *"…when I asked an agent to 'rebuild the Home page exactly as it
  is', it deleted the page and created it again, twice. The content came back the same, but the dates were new and the
  keys reordered, so git shows Home (and App) as changed. Does this need fixing?"* Options: accept it (recommended) /
  put the old file back / a hint in the delete tool's text (measured: 13 of the 19 free resident tokens). AC6 is met by
  the edit route; `P109-S12-REBUILDSTAMPS` closed as ruled.

**Session 15 (2026-10-04), round 4 — ISL-021 AC3, one question:**

- **ISL-021 AC3 — ✅ Ruled: "Build the cheap 9, drop 8."** Asked as *"…Counted: 88 can be written plainly, 42 only by
  reading the app's internals with a JS expression, 19 can't. 2 of the 19 are drag. The other 17: 'no network request
  failed' (3) and 'nothing was fetched from Google Fonts' (1) …; 'no console errors yet' at a given step (3) …; 'under
  reduced motion nothing animates' (2) …; and 8 where the fake server answer has to change from call to call, wait
  before replying, or depend on what the app sent. What should I do?"* Options: build the cheap 9, drop 8
  (recommended) / build all 17 / accept the count as is. Built the same session; ISL-021 closed (§8 s15).

**Session 15 (2026-10-04/05), round 4 — five questions, populations measured first (read-only agents; numbers in each task's §8 s15):**

- **ISL-008 — ✅ Ruled: "Stylesheet beats defaults", plus a request.** Asked as *"When you give a box (a Group) a CSS class and
  write ordinary CSS for it — say "centre everything" or "display: grid" — nothing happens. Every box quietly writes its own
  starting layout onto itself …, and those built-in starting values always beat a class; today the only way through is
  `!important`. Measured across 478 projects …: 217 `!important`s exist only to beat a built-in starting value. If a stylesheet
  beat the starting values, 44 rules in about 7 projects would start working … — and one old Noodl project's `.animated
  { opacity: 0 }` would hide its elements. What should win?"* Options: stylesheet beats defaults (recommended; the panel still
  beats the stylesheet) / a per-box switch / keep it, teach `!important`. **Richard: "Stylesheet beats defaults, but maybe we
  can make a way to warn someone visually in the node props when a style value is being overridden by a stylesheet and where
  it lives if it's a custom CSS node or some custom CSS in a visual node?"** → a new AC (ISL-008 §8 s15).
- **ISL-010 ruling 1 — ✅ Ruled: "From the app's backend."** Asked as *"…To make this a normal thing any app can do, where
  should the question be sent from? (A NodeGX app's 'backend' is its server side, where cloud functions run; a desktop app
  already runs its backend on the same computer.) The existing 'Model Request' cloud node only talks to Anthropic today; no
  template uses it yet."* Options: from the app's backend (recommended) / straight from the page / both, backend first.
- **ISL-010 ruling 2 — ✅ Ruled: "Only for other computers."** Asked as *"…When a model request points at this computer,
  should it still require a key?"* Options: only for other computers (recommended; a look-alike address is not local) /
  always / never.
- **ISL-020 — 🔁 Not ruled as asked: Richard re-scoped it.** Asked as *"…To change one line in it, an agent today must read
  the whole script and send the whole script back. In our templates, 73 scripts are over 20,000 characters; the biggest (the
  island's world) is 183,000 — about 45,000 tokens to read and the same again to write, for a one-line change. What should
  the agent get?"* Options: find-and-replace + short reads (recommended) / find-and-replace only / leave it. **Richard: "This
  needs its own fix task. It's a shame that Function and Script nodes are just one big monstrous JS doc. In theory the fix
  would be to use multiple Function or Script nodes chained together, but you can't declare variables inside the function that
  are shared between the nodes like if they were one script or could 'import' from each other. We need a better way. Think
  about how a regular coded project would handle this kind of problem. … a sort of core JS file that calls the other JS files
  in child folders into action when needed, so a 20K character JS file would be split up into separate bits that talk to each
  other. … maybe a custom logic component where the Function and Script nodes can 'import' each other with new connector
  types?? Maybe a sort of 'global function' bit in the app settings where you can write functions and scripts in a place where
  they can reference each other, then add them as kind of template Function nodes on the node canvas where if you edit one of
  the Function nodes it edits all of them? Maybe place the functions and scripts for this kind of code at the 'App' level so
  they always run on app load? Maybe a whole new system of visually building JS systems with multiple functions and code files
  that I haven't even thought of yet? Let's think about it."** → a design task, not a tool (ISL-020 §8 s15; it is ISL-005's
  open half, "shared code", grown).
- **P109-S8-ARRAYFILTERPATH — ✅ Ruled: "Yes, exact name first."** Asked as *"…Of the 320 Array Filters in 55 projects on this
  machine, none uses a field name with a dot in it, and none of the Static Data rows has one; 4 scripts in 3 apps do this kind
  of nested lookup by hand. Should `owner.id` in the filter list mean 'the id inside owner'?"* Options: yes, exact name first
  (recommended) / yes, always the inner field / leave it.
- **Not asked: ISL-018's open case.** Measured (s15): 239 of 242 folder-format projects are still format 4 (all 13 templates);
  20 would be changed by the one-time clean-up, all created after the checkbox shipped — the site-builder theme page would stop
  loading its theme until Save. The drafted recommendation (the door runs the clean-up itself first) would apply the same wrong
  guess earlier, so it is not a fix for that case; re-derive the options before asking (ISL-018 §8 s15).

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
| A | **3** (ISL-001 ✅ s3, ISL-002 ✅ s3, ISL-003 ✅ s9) | 4 |
| B | 0 (ISL-009 🟢 scroll half built s5; ISL-005 ruled "Native nodes first" s5) | 6 |
| C | **3** (ISL-011 ✅ s4, ISL-014 ✅ s4, ISL-015 ✅ s12) | 5 |
| D | **4** (ISL-016 ✅ s15, ISL-017 ✅ s15, ISL-019 ✅ s13, ISL-021 ✅ s15; ISL-022 🟢 built, AC6 run once — inconclusive; ISL-018 🟡 built, one case open) | 7 |
| E | **1** (ISL-023 ✅ s10; ISL-025 🟡 W1–W3, W13, W21 removed) | 3 |
