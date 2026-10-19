# SEE-000 — The census: what the templates are made of, and what they cost to build

**Opened 2026-10-01.** **Depends on nothing.**
**Status: 🟡 built in part (s1, 2026-10-19, branch `l7-honesty`).** AC1, AC2, AC4 ✅; AC5 ✅ for the two measured templates
(the list is generated for all sixteen); AC3 (the cost table) and §3.4 (the code app's row) ⬜ deferred. The phase's
baseline; every later ratchet reads it.

## 1. The person sentence

> **Anyone can run one command and read, for every template and both training apps, how much of the app is nodes
> whose behaviour is known, how much is script, and what it cost an agent to build through the MCP.**

## 2. What was measured by hand at scoping (README §1)

| app | graph JSON bytes | component files | nodes | connections | Functions | script lines |
|---|---|---|---|---|---|---|
| `templates/digital-bricks-training` | 1,600,184 | 247 | 1,037 | 1,390 | 147 | 7,796 |
| `templates/todo-list` | 614,462 | 163 | 585 | 1,087 | 52 | 2,620 |
| Olive's Island (P109 reading 1) | — | — | — | — | 83 | 2.39 MB, 17 copies of one engine |

The hand script counted a node as any object with `type` and `id`, so it over-counts by the `visual` wrapper entries
(52 in the todo). The task's script must count what the runtime instantiates, the way `scripts/node-spec/census.js`
counts picker nodes, and say which rule it used.

## 3. What to build

1. **`scripts/see/census.js`** over every project under `templates/` and any directory passed on the command line.
   Per project and per component: node count by type, connections, Function / Script / Expression nodes with their
   script line counts, kit nodes (a `noodl_modules` type with no P107 spec), and the **honesty number as SEE-001 will
   define it**, computed here first by hand so SEE-001 has a reference to agree with. Output: `census.json` beside this
   file and a Markdown table in `CENSUS.md`.
2. **The cost side.** For each template whose build has a transcript or a generator (P109 reading 2: every generator is an
   in-process MCP client), count MCP tool calls by name and, where a transcript records them, tokens. Where there is no
   record, say "no record" in the cell. Do not estimate.
3. **A gate**: `tests/see-census.test.ts` fails if any template's node count, Function count or script line count moves
   without `census.json` being regenerated in the same commit, the picker-coverage ratchet's shape.
4. **The code training app** (`vscode_projects/digital-bricks-training`, outside this repo): one row, by hand, naming the
   slice Richard rebuilt in NodeGX (R7) and its file and line counts, so SEE-010 has its control.

## 4. Acceptance criteria

1. `node scripts/see/census.js` prints the §2 table with the runtime's counting rule, and the numbers for the two
   templates agree with §2 within the wrapper over-count, explained.
2. Each template's honesty number is in `census.json` with the rule written beside it; a Function counts as script (R3).
3. The cost table has a row per template; every cell is a number or "no record".
4. The gate goes red when a Function is added to the todo template by hand and green once the census is regenerated.
5. `CENSUS.md` names, for each template, the three largest Functions by lines, with one line each on what they do. That
   list is SEE-004's starting point.

## 5. Watch for

- Memory: *a count gate reddens ⇒ count the artefact, never bump the literal.* The census is the constant.
- Memory: *a project scan must read both project formats.* The templates are v2; a passed directory may not be.
- The MCP generators write some files by hand around the door (P109 reading 2). A tool-call count is the door's share,
  not the whole build. Say so in the column heading.

## 6. Session 1 — 2026-10-19 (lane 7, worktree `l7-honesty`, from `e7e3e77db`)

Built what SEE-001 needs; deferred the two parts it does not.

**Built.** `scripts/see/census.js` (reader shared with the ratchet in `scripts/see/read-project.js`: v2 by component
folder, legacy `project.json` by `graph.roots`), writing `census.json` and `CENSUS.md` beside this file;
`packages/nodegx-node-spec/tests/see-census.test.ts`, the gate (`census.js --check`), which runs in the PR workflow with
the node-spec package suite.

**AC1 ✅ — the §2 table reproduced, and the over-count is one record per component.** The scoping count took "any
object with `type` and `id`"; that also counts each component's own record in `component.json`
(`{ id, type: "visual" | "page" | "logic" | "cloud" | "root" }`). Run over `templates/digital-bricks-training` at the
scoping commit `22303a534` (`git archive`): **1,600,184 bytes, 247 files, 1,390 connections, 147 Functions, 7,796 lines
— every §2 figure exactly**, and 1,037 = **955 nodes + 82 component records**. The todo row in §2 (585 / 1,087 / 52 /
2,620) is not the committed tree at `22303a534` (361 nodes, 32 Functions): it is the tree committed on 2026-10-05 as
`9b9d1e90c` (163 component files, 1,087 connections, 52 Functions, 2,626 lines; 585 = 531 nodes + 54 records), so
scoping read primary's working tree with that work still uncommitted. The 6-line gap (2,620 against 2,626) is not
explained. The gate asserts `handObjects − nodes = components` on every template.

Today (`e7e3e77db`): training **944 nodes** in 82 components, 1,390 connections, **136 Functions, 7,672 lines** (11
Functions fewer than at scoping); todo **888 nodes** in 80 components, 2,042 connections, **95 Functions, 6,359 lines**.
All sixteen templates are in `CENSUS.md`.

**AC2 ✅ — the honesty number by hand, rule beside it.** `census.json` `rules` says each class; the census computes it
on its own from phase 107's files (registry specs that are not contracts, the graph scenarios' claims, `tiers.json` T6,
`exemptions.json`, the shipped catalog), not from SEE-001's `honesty.ts`, so the two are two readings. A Function is
script (R3).

| template | known | script (kit nodes in it) | unspecced | instances | **honesty** | by lines |
|---|---|---|---|---|---|---|
| `digital-bricks-training` | 578 | 285 (148) | 20 | 60 | **67.0%** | 6.9% |
| `todo-list` | 690 | 95 (0) | 2 | 100 | **87.9%** | 9.8% |

The training template's script is 136 Functions, 1 Expression and **148 kit nodes, 131 of them `Translation`** (the
i18next kit): with no spec, a kit node is script (SEE-001 §3). Without the kit nodes the number would be 80.8%. The
unspecced are `Page` (11) and `Variable` (9).

**AC3 ⬜ — the cost table: deferred.** Not needed by SEE-001. A tool-call count needs each generator run or a transcript
read; neither was done this session, so no cell is filled.

**AC4 ✅ — armed.** On a copy of the todo template, a hand-added Function reads `todo-list: functions is 96, census.json
says 95` (and `nodes is 889`, `script is 96`), exit 1; regenerated, exit 0. Mutant: `GATED` reduced to `connections`
turns the AC4 test red.

**AC5 ✅ for the two measured templates** (`CENSUS.md` generates the three for every template):

| template | Function | lines | what it does |
|---|---|---|---|
| training | `Logic/Standing` · Count, pace, trajectory | 611 | Ported from the code app's `standing.ts`, `pace.ts`, `trajectory.ts`: the learner's counts, their pace against par, and the rating trajectory, from one list of entries. |
| training | `#__cloud__/shared/Programme` · Rows → the programme | 540 | A cloud helper that assembles one learner's programme from 25 record queries in three rounds. |
| training | `#__cloud__/saveLessonDraft` · Save a lesson … as a DRAFT | 368 | A cloud function: checks a lesson against the product's gate and saves it as a draft no learner sees. |
| todo | `Logic/Projects` · Work out what the tab draws | 708 | Turns the project and task rows into what the Projects tab draws. |
| todo | `Logic/Projects` · Work out the money popup's three lists | 451 | Builds the money popup's three lists from the same rows. |
| todo | `Projects/Mark money` · Write it | 421 | Writes a money change back to the records. |

**§3.4 ⬜ — the code training app's row: deferred** (SEE-010 needs it, SEE-001 does not; it is outside this repo and
needs R7's slice named).

**Found:** the training template's registry lists 49 of its 82 components; its 33 cloud functions are on disk but
unregistered, so the MCP reads a smaller app than the census (bug `P111-SEE001-DBTCLOUDUNREGISTERED`). The census reads
the folders, on purpose.

**For the template lanes:** a template commit that changes a count now needs `node scripts/see/census.js` (and, if the
number moved, `node scripts/see/honesty-ledger.js --write`) in the same commit, or the node-spec suite is red.

