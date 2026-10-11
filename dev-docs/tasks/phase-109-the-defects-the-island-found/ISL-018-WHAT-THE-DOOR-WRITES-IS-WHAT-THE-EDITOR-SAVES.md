# ISL-018 — What the door writes is what the editor saves

**Status: ✅ CLOSED s46 (2026-10-11) — AC6 built `38957238e` (the garden and members-area generators drop the raw settle: it wrote 0 of 187 / 0 of 108; byte-identical; members graded by switching the door's ticking off, 57 `true`s lost in 18 files; the garden by AC6's mutant, one deleted `false` comes back `true`) and AC7 read (`def038SettledTemplates` 29/29 over every committed artefact in a clean worktree, each artefact's "unsettle one parameter" arm red-capable). Was: 🟢 s36 (2026-10-09): AC5 met over the real protocol — an agent's Run-driven Function in a format-4 project, the editor's clean-up 0 writes (control: 2 written and logged), the rows drawn in the preview; the door now says which boxes it ticked (`ticked`, P109-S36-PINUNREPORTED); the people's door (`dist/noodl-mcp.cjs`) predates the pin (P109-S36-STALEMCPDIST). Owed: AC7 on the DBT demo (its owner's). Was: 🟢 s17 (2026-10-05): the open case ruled ("Agent writes 'ticked'") and built — the door pins its own nodes, 12 test projects settled, the `noodl-mcp` suite read and attributed (§8 s17); owed: AC5 (an agent round, then the editor's clean-up log), AC7 on the DBT demo (its owner's, `P109-S6-DEF038`); three repo projects left with their owners.** Was: 🟡 s3 (2026-10-02): AC2 measured, ruled ("a format step, 4→5" — neither of §5's options) and built (`b2ba0320a`); driven in the editor. `test:ci` 2,998 / 0 failures at `9a2972ec2`. Owed: the door writing into a project still at 4 (below). Scoped 2026-10-01 at `27d891bf3`.** **Source:** [AUDIT F25](AUDIT-2026-10-01.md) · P80
[DEF-038](../phase-80-the-defects-the-templates-found/DEF-038-THE-OTHER-GENERATOR-DISAGREES.md) (✅ built 2026-09-03, in
the generators only) · **Side:** product (MCP door, `noodl-mcp`; the load-time migration in `@nodegx/project-contract`)

The editor runs NDA-017's run-on-value-change migration on every open. Its only evidence that a graph predates NDA-017 §2
is a **missing** `runOnChange-<input>` key, so it writes `false` into graphs nobody wrote before §2, and a node that used
to run when a value arrived goes quiet. DEF-038 fixed this for the template generators by settling their output from test
code (`pinRunOnValueChangeDefaultsInDirectory`). The door itself was never fixed, so **every project an agent builds through
the MCP tools is still rewritten the first time a person opens it.**

🔴 **Re-shaped at HEAD: the garden is the wrong population for this task.** Its artefact holds **211 `runOnChange-*: false`
and 0 `true`** (the pin only ever writes `true`), so the pin wrote nothing to it: the garden's authors answered every governed
input by hand. Dropping the pin from the garden's generator would pass a byte gate trivially, 0 → 0, and grade nothing. The
population where the pin has work is the other generators' artefacts, and every agent-built project.

## 1. The person sentence

**A person opens a project their agent built through the MCP door, and the editor changes nothing in it: a page that fetched
its rows on load still fetches them.**

## 2. What was measured

All rows **re-read by me at HEAD `27d891bf3` on 2026-10-01**, from source or by counting keys in the shipped artefacts with
`grep -o`. The migration was not run.

| reading | where |
|---|---|
| The migration's evidence of a pre-§2 author is absence of the key "and nothing else"; there is no version guard, "because the format has nowhere to carry one" | `packages/nodegx-project-contract/run-on-value-change-migration.ts:16-30`, `:83-84`, `:455-465` |
| `pinRunOnValueChangeDefaults` writes `true` on exactly the inputs the migration would write `false` to; a present key is never touched, so a settled graph makes the load-time pass a no-op. "⚠️ Not for user projects… this belongs to template generation, where the answer is known because the generator is the author" | `run-on-value-change-migration.ts:466-494` |
| The v2-directory wrapper reads the project through the editor's own `ProjectImporter`, plans, and writes `true` by node id, throwing on an id found in 0 or 2 files | `packages/noodl-mcp/tests/templateArtefact.ts:70-168` |
| It is called by 8 generator files, the garden's at `prepareGardenArtefact` before the id pins | `cg003Template.ts:194`; `grep -l` census this session |
| **No file in `packages/noodl-mcp/src` mentions `runOnChange` or `runOnValueChange`**: the door writes what the caller sent and settles nothing | `grep -rln` over `packages/noodl-mcp/src`, this session |
| `true` / `false` keys per shipped template: `bot-garden` 0 / 211, `nightbook` 0 / 215, `members-area` **60** / 81, `planning` **38** / 254, `planning-demo` **14** / 492, `digital-bricks-training` **13** / 21, `todo-list` **12** / 105, `rocket-school` **1** / 144 | `grep -o '"runOnChange-[^"]*": *true'` over each `templates/*/components/**/nodes.json` |
| DEF-038's measurement (2026-09-03, not re-run): `members-area` 57 writes before settling, 0 after; the site-builder control 0; both with `familyNodes > 0` | DEF-038 "The measurement" |
| DEF-038's gate sweeps every committed artefact (`def038SettledTemplates.test.ts`), not what the door writes for an agent | DEF-038 "The gate" |
| **Not measured:** what the editor itself saves when a person wires `Run` on a Function in the editor. If it leaves the key absent, the editor's own post-§2 graphs are rewritten on the next open too | open question, AC2 |

## 3. Where it bites

- **A person who built with an agent** (Claude Code over the MCP, the editor's own agent panel through the door) and then
  opens the project: every governed node with its control signal wired gets `false` written, silently. DEF-038's measured
  bite was a load-time fetch silenced; P77 D5/D11 measured two `DbCollection2` fetches and a root URL that drew nothing.
- **Every template generator** carries a test-side settle that a product should not need.
- The migration logs a plan and stamps nothing, so the person has no way to know it ran.

## 4. Related work and collisions

- **P80 DEF-038** and **P77 DEF-007 §3.2**: the generator-side fix and its gate. This task moves the settle to the door and
  must keep `def038SettledTemplates.test.ts` green over every artefact.
- **NDA-017 §2/§3** (the checkbox, the migration, its key-order rule): the owner of the migration's contract. The open
  question it recorded, a marker for "authored after §2", is ruling 1 below.
- **HLS-003** moved the migration into `@nodegx/project-contract` so the editor, the merge driver, generation and the export
  share one copy. Do not add a second copy in the door; import it.
- **P84 FLD-009**: a door write to a component while the editor is open is guarded; nothing here changes that.
- Memory "D71 / 211 `runOnChange-…=false` params" (AUDIT F07): the garden's own `false`s are authored answers, out of scope.
- Owner grep: `grep -rlai "pinRunOnValueChange\|runOnValueChange.*door\|DEF-038" dev-docs/tasks --include='*.md'` → P80,
  P77 and the P78 register. **No task owns the door's half.**

## 5. Design — 🔒 one ruling, asked after AC2's measurement

README §4 marks this task "—". The measurement in AC2 decides whether a ruling is needed:

- **If the editor writes the key when a person wires `Run`**, the door should save what the editor saves: it settles every
  candidate it writes (`create_component`, `update_component`, `stage_plan_operation`) with the contract's own
  `pinRunOnValueChangeDefaults`, inside the write, never overwriting a key the caller sent. No ruling.
- 🔒 **If the editor leaves the key absent**, the editor's own graphs are bitten and settling only the door fixes one writer
  of two. Then: (a) settle at write time in both the door and the editor's save, or (b) a project-level marker in
  `nodegx.project.json` `metadata` (the schema allows `metadata`) that says "authored after NDA-017 §2", which the migration
  reads and skips on, written by `create_project`, by the door's first write, and by the editor on save. **Recommendation:
  (b)** if it comes to that: one field, read in one place, ends the guessing for every writer at once.

Constraints:

- 🔴 **Settle on every write, not only on create.** An `update_component` that adds a wire into `Run` makes a node governed
  that was not before. Settling only new nodes leaves that one for the migration.
- 🔴 **Key order is behaviour.** The settled keys go first in the parameter bag (queued inputs drain in key order); the
  contract's writer already does this. Do not re-implement it.
- **No resident-surface cost.** This changes no tool's schema or description. If a sentence is wanted, it belongs in the
  write response (`settled: n`), not in a description. Budget for reference: `SURFACE_TOKEN_BUDGET = 8280`,
  last recorded 8,275 (`src/toolGroups.ts:425-430`).
- Report it: each write's response says how many checkboxes it settled, so an agent can see the door changed its graph.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec writes, through the in-process door, one `Function` (`JavaScriptFunction`) with `Run` wired and a value input fed, and one `DbCollection2`-family node with its control wired, then reads the result with `readAsLegacyProject` and runs `planRunOnValueChangeMigration`: `writes > 0` and `familyNodes > 0` on the same reading. **Known-firing control beside it:** the same graph after `pinRunOnValueChangeDefaultsInDirectory` reads `writes: 0` with the same `familyNodes`. |
| AC2 | **The editor's own save, measured.** In the editor (`run-editor`), wire `Run` on a Function and save; read the saved `nodes.json`: the key is present (value recorded) or absent. §5 is applied as that reading says, and if the ruling is needed it is asked in plain words before AC3. |
| AC3 | After: AC1's spec reads `writes: 0` through the door alone. An explicit `runOnChange-x: false` sent by the caller is kept. An `update_component` that adds the `Run` wire to an existing node settles it in the same write. |
| AC4 | 🔴 **Reverted arm:** settle only on `create_component`, and AC3's update arm goes red while its create arm stays green. |
| AC5 | **The person's door, over the real protocol.** An agent (Claude Code with the stdio server from `dist/noodl-mcp.cjs` under a project-local `--mcp-config`, or `mcp-model-driver.js`) builds a page that loads rows on open. The project is opened in the editor (`run-editor`), and **the editor's migration log reports 0 writes**, and the page still shows its rows in the preview. Count migration writes, not changed files: opening also writes `.mcp.json`, `CLAUDE.md` and a `.gitignore` block. |
| AC6 | **The generators drop the raw step, byte-identical.** With the door settling, `pinRunOnValueChangeDefaultsInDirectory` is removed from `tpl001Template.ts` (members-area, 60 `true` today) and from the garden's `prepareGardenArtefact`. Each generator's byte gate passes: two builds agree and equal the checked-in tree, **0 files differ**. The members-area arm is the one that grades; the garden arm is recorded as 0 → 0 and graded by a mutant instead: delete one authored `false` from a `cg003Components.ts` Function and the door writes a `true` there, not nothing. |
| AC7 | `def038SettledTemplates.test.ts` stays green over every committed artefact, and its mutant arm still reddens. |

## 7. Traps

- 🔴 **0 → 0 grades nothing.** The garden has no `true` to lose. An AC6 measured on the garden alone would pass with the
  door doing nothing. Members-area is the population; the garden needs the mutant.
- 🔴 `familyNodes` must be non-zero on the same reading as `writes: 0`, or an instrument that stopped seeing the families
  reads exactly like a settled graph (DEF-038's own warning).
- ⚠️ "Not for user projects" (the contract's docblock) is about writing `true` into a graph whose author may predate §2.
  Everything the door writes is authored after §2 by construction, which is the argument; do not extend it to
  `install_prefab`, which converts **legacy** library graphs that may well predate it.
- ⚠️ `true` and absent mean the same to the runtime and opposite things to the migration. A test that reads behaviour in a
  runtime cannot see this defect; read the migration's plan.

## 8. Record

### Session 3 — 2026-10-02, P109 s3: AC2, the editor's own save

`npm run dev:debug` on a throwaway profile (`NOODL_USER_DATA_DIR` in the scratchpad; nothing written to Richard's), a
scratch copy of `isl002-first-state/` with a Button added and **every `runOnChange-…` key removed**, so `readFlag` (a
Function whose `flag` input is fed by the States node) starts as an editor-made Function would. Opened from its launcher
card.

| step | `readFlag`'s saved parameters (`nodes.json`) |
|---|---|
| before the editor opened it | `functionScript` only |
| after the open (the editor rewrote the file at 15:14; it added `runOnChange-in-flag` to `ports`, a port list, not a value) | `functionScript` only |
| **wire Button `onClick` → `readFlag.run`** through the graph model the canvas drag ends in (`window.__nodeGraphEditor` → `/Pages/Home` graph → `addConnection(…, { undo: true })`); the editor autosaved at 15:15:07, the wire on disk | **`functionScript` only — the key is ABSENT** |
| **reopen** (`cdp reload` → the launcher → the card) — the file rewritten at 15:15:45 | **`runOnChange-in-flag: false`** (and `false` in the live model) |

**So the editor is the second writer F25 bites, and the bite is the editor's own:** a Function a person wires `Run` on
today runs on every change of its fed input (the box defaults to ticked) until the project is reopened, and after that
it runs on `Run` only — with nothing on screen saying the box was unticked. The migration cannot tell this graph from a
pre-§2 one because the editor saves nothing that would say so.

⚠️ The wire was made through the model call, not a mouse drag; no code in `noodl-editor/src/editor/src` writes a
`runOnChange-` value on a new connection (`grep`, this session), so a drag would save the same.

**§5 now applies its 🔒 branch:** (a) settle at write time in the door and in the editor's save, or (b) one project-level
marker the migration reads. Recommended (b). Asked in plain words with session 3's other measured rulings.

### Session 3 — the ruling and the build (`b2ba0320a`)

**Ruling (README §8):** asked with §5's two options → *"This sounds nuts, surely there must be a cleverer fix?"* →
re-asked with the editor's own one-time upgrade chain → **"Yes, version step 4→5."**

| file | change |
|---|---|
| `nodegx-project-contract/run-on-value-change-migration.ts` | `RUN_ON_VALUE_CHANGE_FORMAT_VERSION = '5'`; `projectPredatesRunOnValueChange(version)` (missing, older or unreadable → predates) |
| `noodl-editor/…/ProjectPatches/applypatches.js` | migrates only a project that predates 5 |
| `noodl-editor/…/models/projectmodel.ts` | `Upgraders[4]`: `version = '5'` — the open's write-back saves it |
| `noodl-editor/…/models/projectmodel.editor.ts` | `supportedProjectVersion` follows the constant. 🔴 **Met in the drive:** at 4 the editor refused the project it had just saved (*"This project was saved with a newer version of Noodl"*) |
| `nodegx-export/src/parse/parseProject.ts` | settles only a pre-5 project, as the editor does |
| `noodl-mcp/src/tools/createProject.ts` | a new project is written at `'5'` |

**Readings:** `tests-unit/isl-018` 4 / 4 (known-firing: format 4 and no version still migrate; format 5 is left as
written; **sabotage** — the gate forced open — reddens the format-5 row); `hls003` 8 / 8 with a new row (format 4 settles
2, format 5 settles 0); `create_project` 8 / 8; the DEF-007 seam 10 / 10; contract and export `tsc` 0.

**`test:ci` (the Electron suite, where specs load projects through `fromJSON` and so meet the new upgrader):** 2,998
specs, **0 failures**, seed 86576, `gitHead` `9a2972ec2`, `test-results.json` written 21:39:47 (fresh) — under the floor of 8.

**Drive (dev editor, throwaway profile, the probe reset to format 4, key absent, no `Run` wire):** the open saved
`version: "5"`; `Run` wired through the graph model, autosaved, key absent; reopened (after the cap was raised) → **the
key is absent live and on disk, `Run` still wired, version 5**. At HEAD the same reopen wrote `false` (AC2 above).

⚠️ **What the step costs, said to Richard with the summary:** once the new editor saves a project at 5, **an older
editor — the installed 0.3.0 app included — refuses to open it** ("saved with a newer version"). That is what a format
step is; it is reversible until the commit ships.

**Still open:** the door writing into a project still at **4** that no editor has opened since (a template the
generator writes at `'4'`, or an old project): its new nodes would be migrated once on the next open. The shipped
templates are settled (DEF-038's gate), so their one-time step writes nothing; a hand-edited old project is the case.
Recorded, not built.

### Session 7 — 2026-10-03: AC7 measured (`4988a5948`)

`def038SettledTemplates` over the **committed** population only (a clean worktree, `scripts/devtools/make-worktree.sh`,
because the gate sweeps the working tree and three of its six reds were a peer's uncommitted `nightbook` / `planning` /
`planning-demo`): **the same 3 red at `b2ba0320a^` and at `b2ba0320a`**. This change did not redden it. Two of the
three were the gate's control arm deleting a key the planner never governs (`P109-S7-DEF038CONTROL`, fixed); the
mutant arm now reddens 14/14 under a planner that never writes. The third is real and older than this phase:
`digital-bricks-training-demo`, six unanswered Function inputs since its first commit (`P109-S6-DEF038`, handed to the
dbt-template workstream). **AC7: this change keeps the gate where it was; the gate reads 1 red, not this task's.**

🔴 That row is ISL-018's **open case** in the wild: a format-4 project nobody's editor has opened yet. Its first open
writes `false` on the six inputs once and saves it at 5. It belongs in the question to Richard below, as an example.

### Session 15 (2026-10-05) — the open case measured; the question NOT asked

(read-only census of 525 projects on this machine: 242 folder-format, 283 single-file.) The one-time clean-up
(`run-on-value-change-migration.ts:414-475`, called `applypatches.js:96-97`; the editor then marks format 5,
`projectmodel.ts:112-117`) writes `false` on every unanswered input of a node whose Run is wired. **239 of the 242
folder-format projects are still format 4, all 13 templates included**; **20 would change, all created after the checkbox
shipped (2026-08-01, `213cf3377`)**: `digital-bricks-training-demo` 6 Function inputs (invisible — each fed by the node that
sends Run), 3 repo fixtures (log-a-thing 4 database fetches, variable-dial 1, page-desk 2), 15 test projects (89 changes; 8
site-builder drive projects with 8 typed Function inputs each — 🔴 **the theme page stops loading its theme until Save is
pressed**, a regression), and the untracked nightbook (37). The 107 classic single-file projects (12,365 changes) predate the
checkbox: there the clean-up is the intended repair.
🔴 **Why not asked:** the drafted recommendation ("the door runs the clean-up on first write and marks format 5") applies the
same wrong guess, only earlier — it does not save the theme page. The options to put next: tell a post-checkbox format-4
project from an old one (a date it carries; templates have none until ISL-016 AC8's `modified`), save generated templates at
5 from now on, or accept the 20.

### Session 17 (2026-10-05) — the open case re-derived and ruled: "Agent writes 'ticked'"

Re-derived before asking: the editor's own post-§2 save leaves a ticked box as an ABSENT key
(`run-on-value-change-migration.ts:441-449`), so "the project carries some `runOnChange-*` key" cannot tell a post-checkbox
project from an old one — only a date or the author's own statement can. The door writes no key at all (`grep runOnChange
packages/noodl-mcp/src` → only a comment in `createProject.ts:180`). So the case splits in two: (1) the door's OWN nodes in a
pre-5 project, where the door is the author and knows the answer (DEF-007's reasoning for the generators,
`pinRunOnValueChangeDefaults`, `:517`); (2) s15's 20 existing post-checkbox format-4 projects, which no rule can tell apart.

**Ruled (README §8 round 5, verbatim there): "Agent writes 'ticked'"** — when the door writes into a project that predates
format 5 (`projectPredatesRunOnValueChange`), it pins `true` on the governed inputs of the nodes IT writes (pin, never the
migration's `false`; nodes it does not touch are left for the editor's one-time step, which still repairs the genuinely old
ones); and the 20 known projects are settled once by a script.

**Built (s17):**
- [`runOnChangePins.ts`](../../../packages/noodl-mcp/src/project/runOnChangePins.ts), called from
  `ProjectStore.writeComponent` — the ONE write every door tool goes through (create, update, plans, prefab install, page
  registration). When the project predates format 5 it runs the editor's own planner over the whole component and pins
  `true`, first in the bag, on the boxes of the nodes this write authors: new, different from disk, or with a different
  set of wires into them (a Run wire the agent adds makes a node signal-driven). It runs BEFORE the no-op check, so a
  rewrite that leaves the pinned key out is still `unchanged` (ISL-019).
- Spec [`isl018DoorPins.test.ts`](../../../packages/noodl-mcp/tests/isl018DoorPins.test.ts) 4/4: format 4 → the created
  Function carries `runOnChange-in-name: true` first and the planner over the disk copy writes nothing; **known-firing
  control** at format 5 → no key, and the planner names the box; a node the call did not write keeps no key (the clean-up
  still repairs it) while one the call wired to Run is pinned; the no-op rewrite. **Reverted arms** (each restored by `cp`,
  `cmp` clean): no hook → 2 red; every node counted as authored → the "did not write" row red. `noodl-mcp` `tsc --noEmit`:
  8 errors = the floor, none in these files.
- **The settle** — [`scripts/isl018-settle-format4.ts`](../../../scripts/isl018-settle-format4.ts) (dry run by default,
  `--write`, `--root`). Re-measured today: 231 folder-format projects under the repo, NodeGX test projects, Noodl projects
  and the two react19 apps; 225 below format 5; **16 would change (123 boxes), not s15's 20.** Settled with a backup in the
  scratchpad: **the 12 in `NodeGX test projects`** (the 8 SBR site-builder drives 8 each — the theme-page case —,
  exp011-variables 1, phase55-s8-kimi-k3-rerun 2, phase58-backend-deferred 6, tut003-log-a-thing-solution 4): 81 boxes,
  the planner now writes 0 in each; the version stays 4. **Not settled, each with its owner:** `templates/nightbook` (37,
  a peer's untracked template — its generator should pin, as DEF-038's do), `templates/digital-bricks-training-demo` (6,
  its row `P109-S6-DEF038` is the dbt workstream's), and the two `nodegx-export` fixtures `page-desk` 2 / `variable-dial` 1
  (never opened by an editor; P18's package).
- **The `noodl-mcp` suite, whole (`f01ad4f8f` + this checkout's peer files):** 3,775 / 3,790, 15 red in 10 suites, exit 1.
  **Attributed by a pair in a clean worktree at HEAD** (`make-worktree.sh`, absolute parent path — a relative one leaves
  every `@nodegx/*` link dangling and the suites fail to load): the 10 suites with the hook removed → 12 red; with it →
  14, the difference exactly **SB-006's two migration rows** (SBR-004 AC2 and §9.2). The other 12 are red without this
  change (CMP-001 ×2, CMP-004 ×4, CN-004, D54, DEF-038 on the DBT demo, FLD-013, ISL-005's array `uses`, node id
  allocation); DEF-038 on `templates/nightbook` is the 13th, red only where that untracked template exists.
- **SB-006 updated, not loosened:** its two rows used "the migration fires in bulk on this template" as the known-firing
  signal; the door now pins every node it writes, so the real artefact plans **no** write (`plan.writes` is `[]`, now
  asserted — it reddens if the hook goes). The known-firing signal moved to the same planner over a copy with every
  `runOnChange-*` key stripped (fires in bulk); the literal `true` on the nav link's and the slug resolver's boxes stays.
  67/67.
- The spec gained AC3's other clause: an explicit `runOnChange-in-name: false` from the caller is kept (the planner only
  answers absent boxes). 5/5.

### Session 36 (2026-10-09) — AC5 driven over the real protocol; the pin was not reported, and the people's door did not have it

**Set-up.** A scratch copy of `templates/landing-pages`, format 4. Before the agent, the clean-up planner
(`scripts/isl018-settle-format4.ts --root`) reads **0 writes**, so anything later is the agent's. The door was built
from today's `src` into a scratch-named bundle beside `dist/` and removed after.
🔴 **The checkout's `dist/noodl-mcp.cjs` (built 2026-10-02 22:19) has no pin.** `pinAuthoredRunOnChange` appears 0 times
in it and 3 times in the fresh bundle, and the dev editor's `.mcp.json` points every agent at that file. Filed
`P109-S36-STALEMCPDIST` (high). The agent was Claude Code (`claude -p`, Sonnet 5.5) with a project-local
`--mcp-config` and only the door's tools allowed, run from the project folder. The editor was `npm run dev:debug` on a
throwaway `NOODL_USER_DATA_DIR`. Each arm was opened from its own copy, because the open migrates and saves at 5.

| round | the person asked | what the agent built | boxes on the Run-driven node | planner |
|---|---|---|---|---|
| 1 | a Reading List page; when it opens, sort five books newest first and show them | Static Data → a sort Function (no Run wire) → For Each | none: **no governed node** | 0 |
| 2 | a button that flips the order | a Switch's state into the sort (still no Run) | none: **no governed node** | 0 |
| 3 | load once on open: did mount → Function's Run, "not worked out continuously" | `rlLoad`, Run from did mount, `books` fed, `howMany` 5 | `false` × 2, **sent by the agent** | 0 |
| 4 | the same, without "not continuously" | the same shape | `false` × 2, **sent by the agent** (it read the door's guidance on the box) | 0 |
| 5 | the same, "leave its run-on-value-change settings at their defaults" | the same shape; the agent sent **no** `runOnChange` key | **`true` × 2, first in the bag: the door's pin** | 0 |

- **Rounds 1 to 4 graded nothing of the door**, and that is a finding in its own right. Given the request in a
  person's words, an agent through this door builds value-driven graphs. When asked to wire Run, it answers the box
  itself (rounds 3 and 4). Only round 5 exercised the pin over stdio. Cost: $2.10, $1.82, $1.20, $1.15, $0.78.
- **Known-firing control (editor):** round 3's project with the agent's two answers stripped. The planner reads
  2 writes. On the open the editor logged `[NDA-017] migrated 2 value input(s) on 1 node(s) to passive …`, wrote
  `false` on both and saved format 5. So an absent line in this editor is a reading.
- **AC5 (round 5):** opened in the editor, **0 `[NDA-017]` lines**, `version: "5"`, both `true`s kept on disk. In the
  editor's preview (`--target=viewer`, `/reading-list`) **all five rows are drawn, newest first**. Screenshot
  looked at, the rows scrolled into view. Round 4 opened the same way: 0 lines, the agent's `false`s kept.
  ⚠️ The rows do not tell the arms apart here: round 4's `false` draws them too, because Static Data reaches the
  Function before did mount. The write count is the clause that grades.
- 🔴 **Found: the door said nothing.** Round 5's `update_component` response had no word of the two boxes it ticked
  (keys: `updated, revision, applied, validation, visualRoots, visualRootsDerived, done, notDone`). The agent told
  its person "I didn't touch these settings, so they stay at their defaults". §5's "Report it" had not been built.
  Filed and fixed: `P109-S36-PINUNREPORTED`.

**Built (s36):** `pinAuthoredRunOnChange` returns the boxes it ticked. `ProjectStore.writeComponent` returns them
as `ticked`, except on an unchanged write. `create_component`, `update_component` and `apply_plan` answer
`ticked: { boxes: [{ component?, node, parameter }], why }`, the `why` linted with `written.py` (0 flags). This adds
no tool schema or description, so the resident surface is unchanged. The spec (`isl018DoorPins.test.ts`, 6/6) has
the response read on every row: ticked on create and on the update that wires Run; none at format 5, on the
label-only update, on the no-op rewrite or on a caller's `false`; and a new apply_plan row naming the component.
**Reverted arms** (each restored by `cp`, `cmp` clean): no payload → the 3 ticking rows red; the payload on an
unchanged write → the ISL-019 row red.

### Session 46 (2026-10-11) — AC6 built, AC7 read: closed

🔴 **AC6 was never on the status line.** s36's status named only "AC7 on the DBT demo (its owner's)"; AC6 (the generators
drop the raw step) sat unbuilt in the AC table. Found by reading the ACs, not the status.

- **AC6, `38957238e`.** In a `make-worktree.sh` worktree at `e51bb99b4` (clean). Controls first: `template:members` and
  `template:garden` unchanged left `git status` empty. Probed the step's own return: members `{"writes":0,"familyNodes":108}`,
  garden `{"writes":0,"familyNodes":187}` (non-zero families on the same reading, the trap §7 names). Removed from
  `tpl001Template.ts` and `cg003Template.ts`; both regenerate byte-identical. **Members grades:** with the door's ticking
  switched off (`ProjectStore.ts:519`, worktree only) regenerating loses 57 `true`s across 18 files, which the old step
  would have silently put back. **The garden** (241 authored `false`, no `true`) by AC6's mutant: the first Function with
  signal-only inputs loses one authored `false`, and the regenerated `Logic/New run` reads `"runOnChange-in-lang": true`,
  written by the door. Gates: `tpl001Template` 82/82, `cg003Template` 150/150 (AC2: two builds agree byte for byte),
  `isl025Census` 25/25 with W18 now `removed` (control: `present` reds exactly W18).
- **AC7.** `def038SettledTemplates` 29/29 in the clean worktree, the training template's s46 re-wire included; s45's
  30/31 counted P78's untracked Nightbook (2 tests), which is not a committed artefact.
- The other six generators (`tpl003/005/006/007/008/010`) still call the step; AC6 named only these two. Each is the same
  no-op by the same argument, left for whoever next touches each one (ISL-024's rule: never as a sweep).
- Met on the way: a worktree could not run any generator (`@nodegx/node-spec`'s `dist/` unlinked): `832c05ca2`.
