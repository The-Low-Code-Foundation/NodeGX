# ISL-019 — The same plan writes the same bytes

**Status: 🟢 built s5 (2026-10-02) on "Keep the same id" — AC1–AC5 and AC8 met; ⬜ AC6 (Claude Code over the door), ⬜ AC7 (the garden drops its pins: blocked on a peer's live garden edits, and on two byte traps, §8 s5). Scoped 2026-10-01 at `27d891bf3`.** **Source:** [AUDIT F26](AUDIT-2026-10-01.md) · the merge
recipe of P105, P106 and P108, which depends on byte-identical regeneration · **Side:** product (MCP door, `noodl-mcp`)

Run the same plan through the door twice and the two projects differ in every `component.json`, in `_registry.json` and in
`nodegx.project.json`: component ids are random UUIDs and every write stamps the wall clock. The generators make their
output reproducible after the door has closed, with three test-side pins. A person whose agent rebuilds a page gets a git
diff on files whose content did not change.

## 1. The person sentence

**An agent that applies the same plan to the same project twice leaves the same bytes on disk, so a regeneration, a merge
or a git diff shows only what really changed.**

## 2. What was measured

All rows **re-read by me at HEAD `27d891bf3` on 2026-10-01**, from source and from the shipped garden with `grep`/`node`.
The door was not run.

| reading | where |
|---|---|
| A new component gets `id: crypto.randomUUID()` and `created`/`modified: new Date().toISOString()` | `packages/noodl-mcp/src/tools/author.ts:235-245` |
| The same for an operation batch that creates a component with no id, and for every `update_component` (`modified`) | `author.ts:397`, `:315`, `:695` |
| `ProjectStore.writeComponent` stamps the registry row (`modified`, and `created` when new) and the registry's `lastUpdated` with the wall clock | `src/project/ProjectStore.ts:515-528`, `:555` |
| `writeProjectSettings` and the token write stamp `nodegx.project.json`'s `modified` | `ProjectStore.ts:193`, `:264` |
| Page registration stamps the router component's `modified` | `src/project/pageRegistration.ts:173`, `:261` |
| `install_prefab` stamps provenance with `importedAt: now` and an absolute path (ISL-017) | `src/tools/libraryTools.ts:410-421` |
| **Node ids are already stable**: the door keeps the caller's ids and, on a collision, reallocates `title` → `title-2` deterministically; a UUID only for a node sent with no id | `src/project/nodeIds.ts:115-132`; `author.ts:139`, `:384` |
| The plan id is random, but it is returned, not written to disk | `src/tools/planTools.ts:718` |
| The generators repair it afterwards: `pinComponentFiles` rewrites `component.json`'s `id`/`created`/`modified` to a UUIDv5-shaped SHA-1 of `<namespace>:<path>` and the epoch, and the same id into `nodes.json` and `connections.json`'s `componentId`; `pinRegistry` rewrites every row and `lastUpdated`; `pinProjectModified` the project file | `packages/noodl-mcp/tests/templatePins.ts:41-91`; `cg003Template.ts:195-196`, `:208`, `:211-216` |
| In the shipped garden the epoch `2026-09-27T00:00:00.000Z` appears in all 127 `component.json`, `_registry.json` and `nodegx.project.json`: 255 `modified`, 254 `created`, 1 `lastUpdated` | `grep -rhoE` over `templates/bot-garden` |
| The pins are in 8 generator files (`pinComponentFiles`, `pinRegistry`), `pinProjectModified` in 4 | `grep -l` census, this session |
| The schemas do not require the timestamps: `component.json` requires `id`, `name`, `type`; a registry row requires `path`, `type`; the project requires `name`, `version`, `nodegxVersion` | `noodl-editor/src/editor/src/schemas/{component,registry,project-v2}.schema.json`, read with `node` |
| The garden's byte gate builds twice, pins both, and compares with the checked-in tree | `cg003Template.test.ts:281-294` |

## 3. Where it bites

- **A person versioning their project in git**: every agent rebuild of a component changes its id and three timestamps,
  so a one-node edit reads as a file rewrite, and a merge of two branches that both rebuilt it conflicts on metadata.
- **Every template generator**: 8 copies of the pins, and the pins only work because the namespace and epoch are typed
  into each generator.
- **The island's merge recipe**: four lanes regenerated in parallel and merged by comparing trees; that only worked because
  of the pins.

## 4. Related work and collisions

- **ISL-016, ISL-017** each add a project-level write (`modified`, provenance); both must take their time from the same
  source this task introduces.
- **P80 DEF-038** and `tpl001Template.ts`'s own private copy of the pins (`templatePins.ts:16-20` says it was kept
  deliberately): retiring the pins retires both copies.
- **P84 FLD-009**: the editor decides "changed externally" by content hashes (its three-hash decide), not timestamps; a stable
  `modified` must not hide a real change from that guard. AC5 checks it.
- **P93 TVW** (three views): if a view diffs projects by `modified`, it changes meaning here. Read before landing.
- Owner grep: `grep -rlai "TEMPLATE_EPOCH\|deterministic id\|stableComponentId\|byte-identical\|byte for byte" dev-docs/tasks --include='*.md'`
  → P23 visual-refresh notes, release-0.2.0, P93 TVW-005/008, P101 INS-001, P77 SBR-006/009/011: each uses byte-identity
  as a gate on its own output. **None owns the door's ids or clock.**

## 5. Design — 🔒 rulings first

1. 🔒 **Who asks for reproducible output, and how.** (a) A **server option**: `createServer({ reproducible: { namespace,
   epoch } })` and a CLI flag `--reproducible <namespace>@<epoch>`, chosen by whoever starts the server (a generator, CI).
   The model never sees it. (b) A **parameter on `apply_plan`** (and on `create_component`, `update_component`). (c)
   **Content-derived always**: component ids become a hash of the project and the path for everyone, and timestamps come
   from a clock the server holds. **Recommendation: (a)**, and (c)'s id rule as its implementation. (b) is ruled out by the
   budget below; and a model choosing reproducibility per call is a choice nobody wants it to make.
2. 🔒 **Should an ordinary agent session also get stable component ids by default?** Yes means a git user's rebuilt
   component keeps its id; the cost is that a component deleted and recreated at the same path gets its old id back, which
   any tool that remembers ids (undo history, the editor's selection) may treat as the old component. **Recommendation: yes
   for ids**, derived from the project's own `id` (or its name when it has none) and the path, and **wall-clock timestamps
   kept** outside reproducible mode, because a person reads them.

Constraints:

- 🔴 **The resident surface is full.** `SURFACE_TOKEN_BUDGET = 8280` (`tests/toolDisclosure.test.ts:83`), last recorded at
  8,275, **5 tokens of headroom** (`src/toolGroups.ts:425-430`). `apply_plan`, `create_component` and `update_component` are
  all resident (`toolGroups.ts:171-180`), so any new parameter on them is paid on every turn of every session. Ruling (a)
  costs **0** resident tokens: it changes no schema and no description.
- **One clock.** Every `new Date()` and `randomUUID()` in the write path (the rows in §2) goes through one injected source.
  A second source left behind is the failure; AC1's census is how it is found.
- **The pin's formula exactly.** For the garden's bytes to survive, reproducible mode must produce `stableComponentId(
  namespace, path)` (`templatePins.ts:41-45`) and the epoch, in the same three files, with `created` kept on update as the
  store already does (`ProjectStore.ts:522`).
- Content-derived ids must stay unique within a project; a path is unique by the registry's key, so the hash of
  `(namespace, path)` is too, up to SHA-1.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec applies one small plan (two components, a page) to two fresh copies of the same skeleton through the in-process door and diffs the trees: it lists every differing file and field. Predicted: each `component.json` (`id`, `created`, `modified`), `nodes.json`/`connections.json` (`componentId`), `_registry.json`, `nodegx.project.json` (`modified`). **Known-firing control beside it:** the node ids in `nodes.json` are equal in both runs (the door's deterministic reallocation), so a diff that reports "everything differs" is caught as a broken instrument. |
| AC2 | After: with the server started in reproducible mode, AC1's two trees are byte-identical. Without it, ids are stable (if ruling 2 says so) and timestamps differ. |
| AC3 | 🔴 **Reverted arm:** leave one stamping site on the wall clock (`pageRegistration.ts:173`), and AC2 goes red naming the router component's `modified` only. |
| AC4 | `update_component` in reproducible mode keeps `created`, sets `modified` to the epoch, and keeps the id; deleting and recreating a path gives the id ruling 2 chose, asserted. |
| AC5 | FLD-009's guard still sees a real external change: in the guard's own spec, a reproducible write that changes a node's parameter (same `modified`) is still detected as changed. |
| AC6 | **The person's door, over the real protocol.** Claude Code (stdio server from `dist/noodl-mcp.cjs` under a project-local `--mcp-config`, git-tracked copy of a test project) is asked to rebuild one component exactly as it is. `git status` afterwards shows **no change** to that component's `component.json` under ruling 2's "yes", and the transcript is kept. |
| AC7 | **The generator drops its raw steps, byte-identical.** The garden's generator starts its in-process server in reproducible mode with `('cg003', TEMPLATE_EPOCH)` and stops calling `pinComponentFiles`, `pinRegistry` and `pinProjectModified`. `CG-003 AC2` (`cg003Template.test.ts:281-294`) passes, **0 files differ** from the checked-in tree. Run it once without the server option: the gate goes red on `component.json` files, as it should. |
| AC8 | The other generators that pin are listed with the namespace each passes, and `templatePins.ts`'s pin functions (and `tpl001Template.ts`'s private copy) are deleted only when none calls them. |

## 7. Traps

- 🔴 **Byte-identity is a drift check.** Two runs that both omit a field agree (register D9). AC7 proves the pins are no
  longer needed; it says nothing about whether the output is right.
- 🔴 The pins run **after** `copyTree` and other edits in a fixed order (`cg003Template.ts:193-209`). A reproducible door
  writes `modified` at write time, so a later raw write that still stamps the clock (ISL-016's `rootNodeId`, ISL-017's
  provenance) re-breaks the gate. Land those through the same clock or in the same change.
- ⚠️ JSON key order and the trailing newline are bytes. `writeJsonAtomic` and the pins' `JSON.stringify(doc, null, 2)\n`
  must agree, or AC7 fails on whitespace with no change in meaning.
- ⚠️ `componentId` is written in three files. Changing the id rule in `component.json` alone leaves two files pointing at a
  component that does not exist (`templatePins.ts:10-14` records that this was found once already).

## 8. Record

### Session 5 — 2026-10-02: built on "Keep the same id"

**The rule, as built.** One source of time and component ids, hung on the store
([`writeClock.ts`](../../../packages/noodl-mcp/src/project/writeClock.ts), `ProjectStore.clock` / `.now()` /
`.componentIdFor()`):

- **A component's id is always derived**: `stableComponentId(namespace, legacyName)`, the pins' formula moved into `src`
  (`templatePins.ts` now re-exports it, so the two cannot disagree). The namespace is the project's own `id` (its name,
  then its folder, when it has none). `create_component`, a plan's create, `backfillIds` (both update doors and
  `assembleSetFiles`), the prefab install's id-less components and `create_project`'s skeleton (`/App`, `/Pages/Home`
  from the new project's id) all take it. A component deleted and recreated at the same path gets its old id back:
  the cost the ruling accepted, asserted.
- **Timestamps stay on the wall clock** unless the server was started reproducible: `createServer({ reproducible:
  { namespace, epoch } })` or `--reproducible <namespace>@<epoch>` (also `=`). Then every stamp the door writes is the
  epoch: `component.json`'s `created`/`modified`, the registry's rows and `lastUpdated`, `nodegx.project.json`'s
  `modified` (settings, cloud binding), the router's `modified` on a page registration, the prefab install's
  `importedAt`/styles `modified`, a kit's provenance `createdAt`. No tool schema changed: 0 resident tokens.
- **An update that changes nothing writes nothing** (`ProjectStore.writeComponent`): if the three files equal what is on
  disk, `modified`/`modifiedBy` aside and key order ignored, no file is written, the registry included, and
  `update_component` answers `unchanged: true`. Not in §6's list, but AC6's sentence ("rebuild one component exactly as
  it is → no change to its `component.json`") cannot hold on the wall clock without it, since the rebuild stamps
  `modified`. The editor's own guard draws the same line: `hashComponent` leaves out `modified` and `$schema`
  (`ComponentSaver.ts:107-114`).

**Census of what still mints on its own (AC1's "second source"):** node ids for a node sent with no id
(`author.ts:139`, `:389`; `nodeIds.ts:131` is the unreachable fallback). The ruling is about component ids, and every
generator sends node ids. Also `create_project`'s skeleton stamps and the project's own `id` (it runs before any store
exists), and the plan id (returned, never written). Every other `new Date()`/`randomUUID()` in `src/` is outside the
project write path (backend records, timing, `docsTools` reading mtimes).

| AC | reading |
|---|---|
| AC1 | The diff instrument is [`isl019SameBytes.test.ts`](../../../packages/noodl-mcp/tests/isl019SameBytes.test.ts): one plan (a section, a page the door registers in the router, an update) on two fixture copies, diffed per JSON leaf. Its known-firing control: on the wall clock it reports `Sections/Badge/component.json → modified` and `App/component.json → modified`; node ids are equal. **RED at HEAD shown by mutant, not by checking HEAD out:** put HEAD's `randomUUID()` back into `componentIdFor` and the two ordinary-session cases and AC2 go red. |
| AC2 | ✅ Reproducible: the two trees are byte-identical (`[]`). The id is `stableComponentId('isl019', '/Sections/Badge')`, all stamps the epoch, the router's included. Ordinary session: only `created`/`modified`/`lastUpdated` leaves differ, never an id. |
| AC3 | ✅ **Reverted arm run:** `pageRegistration.ts`'s first stamping site put back on `new Date()` → AC2 red naming exactly `components/App/component.json → modified`, nothing else. Restored from a `cp`. |
| AC4 | ✅ Update in reproducible mode keeps `id` and `created`, sets `modified` to the epoch; delete + recreate gives the same id (asserted in the ordinary session, the same function in both). |
| AC5 | ✅ **By reading, no new spec:** FLD-009's three-hash decide hashes `hashComponent`, which drops `modified` before hashing, so the guard never read the field a stable stamp holds still. Its spec's "changes when node content changes" covers the content side. A new case there needs the editor's Electron runner (`tests/` is jasmine under `test:ci`), and was not run. |
| AC6 | ⬜ Not run. Needs `dist/noodl-mcp.cjs` rebuilt from this commit. |
| AC7 | ⬜ **Not attempted, three reasons measured.** (1) A peer has the garden's content open: `cg002Content.ts`/`cg003Content.ts` modified at 22:49 and 22:56, and `cg003Template.test.ts` is 9 red against them. Its AC2 diff lists six `nodes.json` and both kits' `index.js`, **no `component.json`, `_registry.json` or project file**, so this change moved none of the pinned bytes. (2) ⚠️ The door's `writeJsonAtomic` writes no trailing newline; the pins write `\n`. Dropping the pins changes every file by one byte unless the door adopts the newline (which then changes every project an agent writes). (3) `pinComponentFiles` pins every component under `components/`, including any the generator's skeleton wrote raw. Those need the door, or a stamp of their own. |
| AC8 | ✅ Listed. `pinComponentFiles`/`pinRegistry` callers and their namespaces: `cg003` (cg003Template.ts:195), `tpl003`, `tpl005`, `tpl006`, `tpl007`, `tpl008` + `tpl008-demo`, `tpl010` + `tpl010-demo`. `pinProjectModified` private copies in cg003, tpl007, tpl008, tpl010. `tpl001Template.ts` keeps its own copy of the formula under `tpl001` (line 328). All still call the pins, so none are deleted. |

**Gates (2026-10-02, over `6bac3db02` + this change):** the spec 12/12 (three mutants: AC3's, random ids,
no-op check off — each red, each restored). Forty write-path specs (`grep` for stamps/ids/`update_component`/
`install_prefab`/`create_project`, the generators excluded), `--maxWorkers=2`: 37 suites pass, **5 failed in 3
suites = s4's HEAD-reds** (`cmp004Parts` ×2 and `cmp004RoundTrip` ×2: a text style and an `icon.png`;
`nodeIdAllocation`: *"Text has no output named text"*, printed). `isl025Census` green. The full `noodl-mcp`
suite was not run: a peer's `node-spec` suite held the machine.

