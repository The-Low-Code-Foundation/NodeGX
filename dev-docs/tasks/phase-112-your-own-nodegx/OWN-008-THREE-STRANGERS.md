# OWN-008 — Three strangers

**Opened 2026-10-02.** **Depends on OWN-007** (and therefore on everything before it).
**Status: 🟡 AC1–AC3 ✅ (s2, 2026-10-18): three Opus 5.5 strangers built a table, a children's block editor and a 3D map from the npm kit and the brief alone, each PASS on the repo's todo script, each driven to a saved change with 0 new diagnostics; the brief folded, eight kit rows (NPXPREVIEW and FILESONLY fixed). AC4 waits on Richard's look.** The phase's thesis test.
**Model:** **Opus, on purpose, for the three strangers**: the test is whether the kit is enough for the model a person has by default. The session that runs them and reads their questions: Opus. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **Three agents that have never seen this repo each build a different NodeGX editor from the kit and the brief alone,
> and each opens the real todo app, changes it, and saves it so the official editor opens it unchanged.**

## 2. Why

README §7 criteria 1 and 2. A kit proven only by the people who wrote it is not a kit. NSP-006 is the method: a fresh
agent, a scratch directory, a brief, the suite, a list of what it may not read, and a timed report. Here the stranger
also gets a wish, because "your own" means each editor is different.

## 3. What to build

1. **A lab directory per stranger** holding only the published kit (or, if R2 rules against publishing, a copy of the
   kit's packages), the brief, the suite, and a copy of `templates/todo-list`. No repo, no `git`, no web search.
2. **Three wishes**, chosen so the editors share nothing but the kit:
   - *"Show my project as a 3D map I can fly through, and let me rewire it there."* (the prototype's direction)
   - *"A big-block editor my children can use: few nodes, huge targets, no jargon."* (Richard's daughters and P108's
     Coding Garden are the audience; memory: *kids, no clock*)
   - *"A table: one row per node, one column per port, edit cells to change the app."* (nothing visual at all)
3. **Each stranger reports**, as NSP-006's did: start and finish time, tokens if the harness reports them, every
   question they had to answer by guessing, and the suite's output.
4. **Fold back**: every guess becomes a sentence in the brief or a fix in a package, and the run is repeated for any
   stranger whose guess changed the result.

## 4. Acceptance criteria

1. All three pass the suite on the todo template; the official editor opens each saved project with zero new validator
   diagnostics.
2. No stranger read a file outside the lab (the lab's tree is hashed before and after, as NSP-006's was).
3. Each stranger's report is in this folder, with the time taken, and the brief's change log names what each one
   added.
4. Richard has looked at the three editors (a screenshot each is enough to start).

## 5. Watch for

- NSP-006 §5.4: the hole the pilot could not see was found by a stranger whose target read outputs only at settle. The
  strangers' editors will find holes in the suite. A stranger that passes with something obviously wrong is a suite
  defect, filed in OWN-006 §6, not a pass.
- Memory: *one heavy job*. Run the strangers one after another, not three at once, and tear each lab down after.

## 6. Built

### s1 (2026-10-16 evening, Opus): the lab, the graders, and a ruling to wait

**The lab is what a person has.** `npm create nodegx@0.2.2 base` from the registry writes `.mcp.json` (the `nodegx`
server, `@nodegx/mcp@0.2.2`), `CLAUDE.md`, `AGENTS.md`, `.vibe/`, `opencode.json` and the brief
(`.claude/skills/nodegx-your-own-editor/SKILL.md`, the same file as the repo's). Each stranger gets a copy of it plus
`templates/todo-list`. The kit it installs is what npm serves: `@nodegx/project-contract`, `node-spec` and
`canvas-look` at 0.1.0, `preview` at 0.2.2. Its three open `kit: project-contract` rows (ESMSUBPATH, NOFIXTURES,
CONTRACTREADME) aren't fixed first. None of them blocks an AC, and the brief names all three, so whether the strangers
trip on them is a reading. The scripts and how to run them are in [`own-008/`](own-008/README.md).

**AC1 is graded on a script the stranger never saw.** The stranger's own `edits.json` is graded too. But the PASS
that counts is its adapter on the repo's `todo-list.edits.json` (11 edits, all eight kinds). The run uses the
stranger's own installed command, beside a control that must FAIL: the same adapter saving one number as a string.
"The official editor opens it with zero new diagnostics" is graded with the editor's own validator
(`npm run validate:project`, 2.5 s). Its output for the saved folder is diffed against the untouched template's (0
errors, 0 warnings, 1 info). Then `validate_project` runs through the published server. The grader was proved on four
arms: the kit's `referenceAdapter` → `PASS … (56 ms)`; the control → `FAIL … "parameters.paddingTop" is "8"; the
official editor saves 8.`; a clean saved copy → 0 new; a copy with one dangling wire → `error dangling-connection
/Commands/Add action`, and `validate_project` errors 1.

**AC2 is graded on what the stranger did, not only on hashes.** The round hashes the lab's todo copy and the repo's
template before and after. The grader also lists every absolute path any tool call named outside the lab, every
`../` climb, and every refused call. The round also denies reads of `/Users/**`, web tools and git, and moves the
`nodegx` server's HOME into the lab, so `list_projects` can't show this machine's projects.

**One minute of the first stranger ran, then was stopped (R47).** The table stranger started at 22:47. **Its first
tool call was `Skill nodegx-your-own-editor`**: it found the brief unprompted, as OWN-007 AC2 measured on Sonnet. It
then hashed the todo copy into `/tmp/todo-list-before.sha256` and `/tmp/todo-list-baseline`, outside its lab. That's
a write, not a read of anything that isn't its own. The isolation scan named both paths. The stream's first event
said the seven-day allowance was at **92%**, resetting Saturday 17 October at 23:00. The run was stopped at 1.2
minutes and set aside (`aborted-1/`, not graded).

**R47 (Richard, 2026-10-16, one AskUserQuestion):** *"All three after reset."* (Offered: one now and two after, which
was recommended; all three now; all three on Sonnet.) Nothing ran after the ruling. The round now guards itself: it
stops when the week reaches 90%, or when the round alone has used 15% of it. On exit it kills every process that
has its working directory in the lab. Both were proved on a stub `claude` that only prints quota lines (stopped at
0.30 → 0.46; the `sleep` it left behind was killed by its working directory). The model is pinned to
`claude-opus-5-5`, because the `opus` alias resolved to `claude-opus-5` in this CLI (2.1.251).

**Noticed, for the fold-back:** the folder's `CLAUDE.md` says *"Don't write a separate web server or hand-written
HTML and JavaScript instead"* before it says an editor request goes to the skill. A stranger building a web-page
editor reads the first sentence first. Whether it slows one down is a reading for the runs.

### s2 (2026-10-18 morning, Opus): the three strangers, graded

**Run** after the weekly reset (R47) at 09:02. The first launch, on Saturday at 23:06, refused all three in their
first request: Opus 5.5 needs Claude Code ≥ 2.1.280, and the terminal's `claude` was 2.1.251. Richard updated the VS
Code extension, and the rounds ran on its CLI (2.1.301, `CLAUDE_BIN`). One after another, each on
`claude-opus-5-5`, with the week at 1–2% throughout. Every stranger's first tool call was `Skill
nodegx-your-own-editor`. None tripped on the folder's "don't write a separate web server" sentence. All three
built a server and a page.

| stranger | built | time | turns | cost (API-equivalent) | repo script (never seen) | control | own script | drive through its page | new official-validator diagnostics | `validate_project` |
|---|---|---|---|---|---|---|---|---|---|---|
| **table** | one row per node, one column per port, cells typed by port type | 19 min | 116 | $5.83 | `PASS (68 ms)` | `FAIL`, 1 sentence | PASS (22 edits) | header "Todo list" → "My week" in its cell, Save: one value + registry times | 0 | 0 errors |
| **blocks** | *Big Blocks*: four block kinds, plain words, the real app beside, a ring from `elementsOf`, flashes from `onTrace` | 23 min | 127 | $6.86 | `PASS (74 ms)` | `FAIL`, 1 sentence | PASS (21 edits) | the same title, tapped and typed as a child would: one value, plus its own `modifiedBy` | 0 | 0 errors |
| **map** | three.js: a plate per component, cards at file x/y in canvas-look colours, arcs, beads from the running app | 24 min | 166 | $8.53 | `PASS (69 ms)` | `FAIL`, 1 sentence | PASS (17 edits) | flown to Header by name, the Log button's press cut from `pickLog` and wired to `pickToday` with clicks on the canvas and its panel: one wire changed | 0 | 0 errors |

"Repo script" is `packages/nodegx-project-contract/tests/fixtures/editor-suite/todo-list.edits.json` (11 edits, all
eight kinds), run with each stranger's own installed command on a fresh copy of `templates/todo-list`. The control
is `own-008/control-adapter.cjs`. Each drive (`own-008/drive-{table,blocks,map}.mjs`) is real presses and keys over
CDP on the stranger's own page. A press lands only where `elementFromPoint` agrees. On the map's canvas, the page's
own `window.__map` was read only to find where a card is drawn.

**AC1 ✅, with one part graded by the validator rather than a window.** All three pass the suite on the todo
template, and each saved project has 0 new diagnostics from the official editor's own validator (`npm run
validate:project`, the editor's `SemanticValidator`, diffed against the untouched template's 0 / 0 / 1 info). None
of the saved copies was opened in the Electron editor's window. That needs a drive of its own, and it isn't owed by
any reading so far.

**AC2 ✅ for reads, with writes outside the lab named.** Each stranger's todo copy and the repo's template hash the
same after its round. No tool call read a file outside its lab except listings of `/Applications` (table, blocks),
made to find Chrome for their page tests. Each also made one attempt at a cache folder in the home directory,
refused by the round's `Read(//Users/**)` deny. Writes outside the lab:
- **table:** an attempted `../_scratch` copy (refused).
- **blocks:** three helper scripts in `own008/work/`, next to its lab, written with the Write tool and run over its
  own files (kept in `own-008/blocks/escaped-work/`). And `~/.cache/puppeteer`, 590 MB, from `npm install
  puppeteer` (removed after the series).
- **map:** `/tmp/nodegx-map-copies/` (its test copies and screenshots; three kept in `own-008/map/its-own-shots/`,
  the rest removed) and `/tmp/types.mjs`.

The lab had a hole: the three labs shared one root, so a later stranger could have read an earlier one's editor.
After the blocks round, the finished labs were moved out of the map stranger's tree, and its log shows no look at
them. The round now keeps Puppeteer's cache in the lab. A next series should give each lab its own root.

**AC3 ✅.** `own-008/{table,blocks,map}/` hold each report (`REPORT.md`, with time and the stranger's own suite
output), `grade.json`, the prompt, the screenshots and the editor without `node_modules`. The change log is below.

**AC4 waits on Richard:** the screenshots are `own-008/table/table-1-saved.png`, `own-008/blocks/blocks-0-changed.png`
and `own-008/map/map-1-rewired.png`, plus the map's own `its-own-shots/`.

**Fold-back (§3.4).** The three reports asked 43 questions. Each was checked against the source or the registry
before it became a sentence or a row.

| what changed | from | where |
|---|---|---|
| "Visual nodes have no spec" was false: node-spec 0.1.0 specs Group, Text, Image, Button, Text Input; the runtime's library covers the rest; an instance's ports are its component's Component Inputs/Outputs `ports` | all three | brief |
| Write the version you read; format 4 is common; the run-on-value-change hazard, what the server does, and why the brief says to write no key until the suite matches | all three (table ticked, blocks and map didn't) | brief + **P112-OWN008-FORMAT4PIN** (medium, open) |
| Keep a position you find, write none for a child you add (389 of 389 children in the todo template carry x/y) | blocks, map | brief |
| A parentless visual node outside `visualRoots` is never drawn | map | brief + **P112-OWN008-EDITGAPS** |
| The in-page preview's update status, trace batch, dictionary and `nodeLibrary` shapes, from `src/inPage/index.ts`; `elementsOf` styling is wiped, draw an overlay; start page only; shared origin | blocks, map, table | brief + **P112-OWN008-LIBRARYFIRST**, **-PREVIEWPAGE** |
| `npx @nodegx/preview` fails since 0.2.0 | map | **P112-OWN008-NPXPREVIEW** (high, fixed in `dffbeee00`, ships on the next publish) |
| A PASS with no runner now says "files only" | blocks, map | **P112-OWN008-FILESONLY** (fixed: `formatReport` + spec, mutant red) + brief |
| `validateStructure`; `validate_project`'s warnings and `get_style_vocabulary`; drive your page in the installed Chrome, not a downloaded one | blocks | brief |
| Function ports: `functionScriptPortNames` + `in-`/`out-` | table | brief |
| node-spec's browser entry imports `fast-xml-parser` by bare name | blocks | **P112-OWN008-NODESPECBARE** |
| No node type → colour category in canvas-look | map | **P112-OWN008-CATEGORY** |
| Six `npm audit` advisories through the kit (re-measured: 3 moderate, 3 high) | blocks | **P112-OWN008-AUDIT** |

Left as questions, with no ruling or fix yet: whether a third-party editor signs `modifiedBy` (blocks does);
how the official editor stores a number typed into a `*` port; which context `drawnPorts` needs for
`with-project` types (the repo's `port-context.ts` `portContextFor` answers it, but isn't in project-contract 0.1.0);
evaluating the runtime's `dynamicports`; `prop-*` ports without a backend schema; a binary asset in the suite's
text-file read.

**No stranger runs again.** §3.4 asks for a re-run where a guess changed the result. None did: the one guess the
strangers split on (format-4 pinning) gave PASS on the repo script both ways, because that script wires no Run.
