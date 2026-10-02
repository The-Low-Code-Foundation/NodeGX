# ISL-018 — What the door writes is what the editor saves

**Status: 🟡 s3 (2026-10-02): AC2 measured — the editor's own save leaves the key absent, and the next open rewrites it to `false`; §5's 🔒 ruling is now needed. Scoped 2026-10-01 at `27d891bf3`.** **Source:** [AUDIT F25](AUDIT-2026-10-01.md) · P80
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

