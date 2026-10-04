# ISL-016 — The door writes the project settings and the home page

**Status: ✅ CLOSED s15 (2026-10-04) — AC5 (FLD-009's guard: the door's home write refused or kept, never lost) and AC6's editor reading met; AC8 met — four of the seven other generators (tpl001, tpl003, tpl005, tpl006) set their home through the door, each template one pinned `modified` line; tpl007/008/010 (peer-dirty) still call the helper, which stays. Built s13 — AC2, AC3, AC4, AC7 met; AC6's agent half met (editor reading owed); AC5 open. Ruled s13: "Replace, say what changed"; ruling 2 (b); "home" = the editor's "Make home" (README §8 round 3). Scoped 2026-10-01 at `27d891bf3`.** **Source:** [AUDIT F23](AUDIT-2026-10-01.md) · the
home-page half is P78 register [D9](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) ("a generated project can ship
with no HOME node"), fixed then in the generator, never in the door · **Side:** product (MCP door, `noodl-mcp`)

Every one of the ten template generators writes `nodegx.project.json` by hand before it opens the door, and eight of them
reach back into it afterwards to set `rootNodeId`. An agent working through the MCP tools cannot do either: no tool sets
the title, the URL style or the name of a bound project, and no tool says which node is the app's home.

## 1. The person sentence

**An agent that builds an app into a project it did not create, or rebuilds the shell of one it did, can name the app, give
the page its title and make its new `App` the home, through the tools, and `get_project_info` tells it which node is home.**

## 2. What was measured

All rows **re-read by me at HEAD `27d891bf3` on 2026-10-01**, from source or from the shipped artefact with `node`. Nothing
was run through the door.

| reading | where |
|---|---|
| The garden's generator writes the whole project file itself: `$schema`, `name`, `version: '4'`, a hand-typed `nodegxVersion: '1.1.0'`, `settings: { htmlTitle, navigationPathType: 'path' }`, `structure`; then an empty `_registry.json` with the epoch | `packages/noodl-mcp/tests/cg003Template.ts:58-83` |
| It has to: the server will not bind a directory that has neither `nodegx.project.json` nor `components/_registry.json` (`not-a-v2-project`) | `packages/noodl-mcp/src/project/ProjectStore.ts:115-133` |
| After the plan is applied, `pinRootNode` reads `App/nodes.json`, takes the node with no parent and writes its id as `rootNodeId` | `tests/templatePins.ts:109-120`, called at `cg003Template.ts:207` |
| `writeSkeleton` exists in 10 generator files, `pinRootNode` in 8 besides its definition (`grep -l` over `packages/noodl-mcp/tests/*.ts`) | census, this session |
| `create_project` is the only door that writes `rootNodeId` or `settings`: a new directory, `settings: { htmlTitle: name, navigationPathType: 'path', bodyScroll: true }`, `rootNodeId` = its own Router node, and an `App` registered as type `root` | `src/tools/createProject.ts:154-202` |
| `create_project` makes a project *somewhere else*. It writes a Router, a Home page and a Text the garden does not want, with random ids and wall-clock times, so the generator cannot use it as its skeleton without changing the artefact | `createProject.ts:154-160`, `:170-202` |
| The plan door writes one setting, `bodyScroll`, through `writeProjectSettings`, which **never overwrites** a value the project already has | `src/tools/planTools.ts:1069-1073`; `ProjectStore.ts:179-221` |
| `create_component` cannot make a root component: the authored `type` enum is `page | visual | logic | cloud`, and an `App` path infers `visual` | `src/vocabulary.ts:189`; `noodl-editor/src/editor/src/io/ProjectExporter.ts:190-198` |
| `get_project_info` reports `rootComponent` only from a registry row typed `root`. The shipped garden has **no such row** (121 `visual`, 6 `page`; `App` is `visual`) although its file says `rootNodeId: "app_root"`, so the tool answers `rootComponent: undefined` for it | `src/tools/read.ts:141`, `:154`; `templates/bot-garden/components/_registry.json`, `nodegx.project.json`, read with `node` |
| Page registration already treats `rootNodeId` as the way to find the home router, with `settings.rootComponent` as fallback | `src/project/pageRegistration.ts:85-110` |
| No validator rule names a missing home: `grep -n -i "home\|rootNode"` over `noodl-mcp/src/validate.ts` finds one comment, and `diagnostics.ts` has no such code | this session |
| D9's measurement, as the register records it (not re-run): without `rootNodeId` the editor previews "ERROR — No HOME component selected", and 45 headless specs plus a 41-spec byte gate passed over it, because the drives serve pages by URL | register D9, lines 472-547 |

## 3. Where it bites

- **An agent building into an existing folder.** It can write every page and register every route, and the app still has
  no home in the editor (D9), and nothing the agent can call says so. `get_project_info` cannot tell it either.
- **An agent rebuilding the shell.** A new `App` with a Router is `visual`, never `root`, so even the registry's notion of
  the home disagrees with the file.
- **Every template generator**: a hand-typed `nodegxVersion` that drifts from the package's, and eight copies of the same
  raw write after the door has closed.

## 4. Related work and collisions

- **P78 D9** (fixed in the generator, `pinRootNode`): this task moves that fix into the product. D9's own lesson stands:
  byte-identity is a drift check and cannot see a field both runs omit.
- **P84 [FLD-009](../phase-84-the-defects-the-field-report-found/FLD-009-THE-EDITOR-DOES-NOT-OVERWRITE-WHAT-AN-AGENT-WROTE.md)**
  (built, `fa227028`): the editor used to drop an agent's project-level write silently when it then changed `rootNodeId`
  itself (its arms B and C). Its guard now refuses that. A new tool writing `rootNodeId` while a person has the project open
  is exactly FLD-009's population: AC5 runs against that guard.
- **P88 [GAM-021](../phase-88-the-defects-the-games-found/GAM-021-A-PLAN-IS-NOT-WARNED-ABOUT-THE-SCROLL-SETTING-IT-IS-ABOUT-TO-APPLY.md)**:
  `projectSettingsAfterWrite` is the one merge for plan settings. A settings tool must use it, or a second merge drifts.
- **P66 FIX-008** (`open_project`, bootstrap mode) and **P55's surface budget**: see §5's budget constraint.
- **ISL-019** owns the `modified` timestamp this tool will write; **ISL-017** owns the other half of the skeleton problem
  (modules before authoring).
- Owner grep: `grep -rlai "set_project_settings\|set_home_page\|set_root\|rootNodeId" dev-docs/tasks --include='*.md'` →
  P77 SBR-002, P78 TPL-003 and the register, P84 FLD-009, and older phase notes. **No task owns a settings or home tool.**

## 5. Design — 🔒 rulings first

1. 🔒 **Does an explicit settings call overwrite?** The plan door never overwrites a setting (GAM-021, AAQ-005), because a
   plan states what a *new* app needs. A tool call naming `htmlTitle` is a direct request. (a) It overwrites and reports
   `{name, was, now}` for each key. (b) It follows the plan rule and reports what it skipped. **Recommendation: (a).** A
   request that silently does nothing is the failure this project keeps meeting; the plan rule stays as it is.
2. 🔒 **How a generator gets a bindable directory without writing one.** (a) A `create_project` option for an empty
   project (no Router, no Home, no Text), so a generator starts the way an agent does. (b) Keep the minimal skeleton write
   (`$schema`, `name`, `version`, `nodegxVersion`, `structure`) as the one raw write a generator owns, and move only the
   settings and the home into the door. **Recommendation: (b) now, (a) when ISL-019 makes `create_project` reproducible.**
   (a) changes the artefact (an `id`, `runtimeVersion`, `created`), so it cannot pass a byte gate until ISL-019 lands.
3. **Not a ruling, a recommendation:** the home is named by component, not node: `home: "App"`. The door resolves the
   component's single parentless visual root exactly as `pinRootNode` does, refuses if there is none or more than one, and
   writes `rootNodeId`. It also re-types that component's registry row as `root` (and the previous root's back), so
   `get_project_info.rootComponent` and the file agree.

Constraints:

- 🔴 **The resident tool surface is full.** The budget is `SURFACE_TOKEN_BUDGET = 8280` (`tests/toolDisclosure.test.ts:83`),
  and the last measurement recorded in the manifest is **8,275, 5 tokens of headroom** (`src/toolGroups.ts:425-430`,
  FLD-010). A new resident tool, or a new parameter on a resident tool (`get_project_info` is resident), cannot be paid
  for. **Place `set_project_settings` in the deferred `project` group** (`toolGroups.ts:357-467`), appended to its tool
  list: measured three times there, appending costs **0** resident tokens, because the only resident trace of a deferred
  group is `find_tools`' "(N tools)". Add `settings`, `title`, `home`, `rename` to its `keywords` (sent never, cost 0).
- The new field `home` on `get_project_info`'s **response** costs nothing resident; its description must not grow.
- A new tool owes: registration in `src/tools/` under `--allow-writes`, its name in `WRITE_ONLY_TOOLS`, a home in
  `TOOL_GROUPS` (the guard at `toolDisclosure.test.ts:141`), a row in `packages/noodl-mcp/README.md` §Tools, and a spec
  that reaches it through `find_tools` by keyword, as `kitTools.test.ts` does for `create_node_kit`.
- Settings are validated against `project-v2.schema.json`'s `settings` properties; an unknown key is refused by name.
- Writes go through `ProjectStore` (atomic, and inside FLD-009's guard), never a second `writeFileSync`.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec binds the server to a copy of the garden's skeleton, authors `App` through `create_component`, then asks `find_tools` for "settings", "home page" and "title": no tool is named. `get_project_info` on the shipped `templates/bot-garden` returns `rootComponent: undefined` while the file holds `rootNodeId: "app_root"`. **Known-firing control beside it:** the same `get_project_info` on a project made by `create_project` returns `rootComponent: { path: "App" }`. |
| AC2 | After: `set_project_settings({ htmlTitle, navigationPathType, name })` writes them and reports was/now for each; an unknown key is refused by name and nothing is written. |
| AC3 | `set_project_settings({ home: "App" })` writes the id `pinRootNode` would write, re-types the registry rows, and `get_project_info` returns the home by component and node id. A component with no visual root, or two, is refused by name. |
| AC4 | 🔴 **Reverted arm:** make `home` write the first node instead of the parentless visual root, and AC3 goes red on a fixture whose `App` lists a logic node first. |
| AC5 | **With the editor open:** FLD-009's guard spec gains one arm, the tool's `rootNodeId` write against an editor whose own copy has moved. The write is refused or kept, never silently lost. |
| AC6 | **The person's door, over the real protocol.** An agent (Claude Code with the stdio server from `packages/noodl-mcp/dist/noodl-mcp.cjs`, registered with a project-local `--mcp-config`, or `scripts/devtools/mcp-model-driver.js`) is told only: "this folder has pages and no home; make the app open on Profiles and call it Olive's Island". Its transcript holds the `set_project_settings` call, and the project then opens in the editor on its home with the title set (a drive reading, not only the file). |
| AC7 | **The generator drops its raw step, byte-identical.** `cg003Template.ts` stops calling `pinRootNode` and calls the tool through its in-process client at the point `pinRootNode` ran (after `apply_plan`). Its two hand-typed settings move to the tool too. `CG-003 AC2` (`cg003Template.test.ts:281-294`) passes: two builds agree and equal the checked-in tree, **0 files differ**. Run it once with the tool call removed: the tree differs in `nodegx.project.json` only. |
| AC8 | The other seven generators that call `pinRootNode` are listed with whether each now uses the tool, and the helper is deleted only when none calls it. |

## 7. Traps

- 🔴 **Key order is bytes.** `nodegx.project.json` keeps keys in the order writes added them: the garden's ends
  `…metadata, modified, rootNodeId`, because tokens came first, `apply_plan`'s settings write appended `modified`, and
  `pinRootNode` appended `rootNodeId`. A tool called earlier in the sequence moves a key and breaks AC7 with no change in
  meaning. Call it where the old step ran, or the byte gate is grading call order.
- 🔴 `pinRootNode` writes without a trailing newline and `pinProjectModified` rewrites the file with one. Whichever write
  is last decides the final byte; the tool's writer must match `writeJsonAtomic`'s.
- ⚠️ D9's lesson: a byte gate compares two runs of the same generator and cannot see a field both omit. AC6 is the door a
  person uses; AC7 alone would grade nothing about the home.
- ⚠️ Opening a project in the editor writes `.mcp.json`, `CLAUDE.md` and a `.gitignore` block (FIX-008 B). AC6's readings
  are about the home and the title, not "the folder is unchanged".
- ⚠️ Registering the stdio server with `claude mcp add` writes the real `~/.claude.json`. Use a project-local config file.

## 8. Record

### Session 13 (2026-10-04) — ruled and built; AC2, AC3, AC4, AC7 met

**Ruled** (README §8 round 3): *"Replace, say what changed"*, with Richard's correction that the home is the editor's
"Make home" — the component the project starts from (App, holding the Router), not a page. Asked after a census:
8 generators call `pinRootNode`, 10 call `writeSkeleton`; of the 13 template folders, 12 carry `rootNodeId` and
**Nightbook does not** (its generator `tpl011Template.ts` neither pins nor names a `rootComponent`) → filed
[`P109-S13-NIGHTBOOKHOME`](../../bugs/p109-s13-nightbookhome-the-nightbook-template-has-no-home.md).

**Built:** `set_project_settings({ name?, settings?, home? })` (`src/tools/projectSettingsTools.ts`), deferred in the
`project` group, keywords `settings`, `title`, `home`, `make home`, `root`, `rename`, `app name`. Resident surface
**8,261 before and after** (`toolDisclosure.test.ts`). `ProjectStore.writeProjectFields` is the one write: every key
keeps its place, a new `rootNodeId` lands last after `modified` (where `pinRootNode` put it), and a request that
changes nothing writes nothing. `get_project_info.rootComponent` now reads the home from `rootNodeId` (the editor's
field) **only**, and says `{ missing: true, fix }` when there is none or no component holds it. 🔴 The first cut kept
the registry `root` row as a fallback; reading the editor's load (`projectmodel.ts:267` reads `rootNodeId`, then a
legacy template-only `rootComponent`; the v2 importer carries nothing else, `ProjectImporter.ts:374`) showed the row is
never read, so the fallback answered "App" for the `demo-app` fixture — App typed `root`, no `rootNodeId` — a project
the editor opens with "No HOME component selected". HEAD had the same lie, and `tools.test.ts:101` pinned it; that
assertion now reads `missing`.

**Two departures from §5, both measured:**

1. **No registry re-type** (§5.3 proposed typing the home's row `root`). The editor never does that for a component a
   person makes home: `inferComponentType` (`ProjectExporter.ts:189`) gives `root` only to a legacy `%rootcomponent`
   name. A door that re-typed would write what the editor does not save (ISL-018's sentence). AC3's "re-types the
   registry rows" is replaced by `get_project_info` reading `rootNodeId`.
2. **The home node is resolved as the editor resolves it**, not "refuse when two": `makeComponentHome` /
   `findExportRootNode` (`useComponentActions.ts`) take the FIRST top-level node whose type may be an export root
   (every visual type but `Page`, `allowAsExportRoot: false`). The result reports `candidates` so a caller sees when
   there was a choice.

| AC | reading |
|---|---|
| AC1 | Red at HEAD **by source and census, not re-run as a spec at HEAD**: no tool in `src` wrote `rootNodeId` or `settings` but `create_project` (grep); `get_project_info` read the home only from a registry `root` row, and the garden has 0 such rows (census above), so it answered `undefined`. After: `find_tools` reveals `set_project_settings` for "settings", "home", "title", "make home", each on a fresh server. On a copy of `templates/bot-garden` over the in-process protocol: `rootComponent: {"path":"App","nodeId":"app_root"}`. |
| AC2 | ✅ `isl016ProjectSettings.test.ts`: name, title, path style, scroll overwritten with `was`/`now` rows; `homePage`, `navigationPathType: "hashbang"`, `bodyScroll: "yes"` each refused by name, project file byte-identical after. 🔴 Mutant (the plan door's skip-if-set rule in `writeProjectFields`): AC2 red by name. |
| AC3 | ✅ `home: "App"` writes `app_group`, appended after `modified`; `get_project_info` → `{ path: "App", nodeId: "app_group" }`; a logic-only component and an unknown one refused by name, nothing written. The garden's shape (rootNodeId, App typed `visual`) read correctly; a `rootNodeId` no component holds → `missing: true`. On the garden copy, `home: "App"` resolves to `app_root`, the id `pinRootNode` wrote → `unchanged: true`, file byte-identical. |
| AC4 | ✅ 🔴 Reverted arm (any parentless node, as `pinRootNode` took): AC4 red (it pointed at the Expression) and the no-visual refusal red. Restored. |
| AC5 | ⬜ FLD-009's editor guard arm — not run. |
| AC6 | 🟡 **Agent half ✅, editor reading ⬜.** Claude Code 2.1.251 (`claude -p`, sonnet, `--strict-mcp-config`, a project-local `--mcp-config`; the stdio server from the worktree's `dist/noodl-mcp.cjs` built at `de9a3a5c4`; `--disallowedTools Bash Edit Write NotebookEdit` — the init listed none of the four, so it could not hand-edit) on a git-tracked copy of `demo-app` (pages, no `rootNodeId`). Told only: *"When I open this NodeGX project the preview says "No HOME component selected". Please fix that, and call the app Olive's Island — that should be the title in the browser tab too. Use the nodegx tools."* 18 turns, $0.55. Transcript: `get_project_info` (→ `rootComponent: { missing, fix }`), `list_components`, `get_component App`, `find_tools({ query: "project settings home title" })` → **nothing** (filed [`P109-S13-FINDTOOLSPHRASE`](../../bugs/p109-s13-findtoolsphrase-a-multi-word-find-tools-query-reveals-nothing.md)), `find_tools({ group: "project" })`, then **`set_project_settings({ home: "App", name: "Olive's Island", settings: { htmlTitle: "Olive's Island" } })`**. It then rendered (blank: the fixture's Router lists no pages — a known fixture gap), registered Home on the Router through `update_component`, and rendered DONE. `git diff nodegx.project.json`: name and title changed, `modified` + `rootNodeId: "app_group"` appended. Owed: the editor opening that copy on its home with the title (a drive, not the file) — not run: two peer Electron stacks were live on the machine. |
| AC7 | ✅ `cg003Template.ts` drops `pinRootNode` and calls `set_project_settings({ home })` through its in-process client right after `apply_plan`. `cg003Template.test.ts` **150/150** (CG-003 AC2: two builds agree and equal the checked-in tree). Control (the call removed): AC2 red, the diff names **`nodegx.project.json` only**. The two hand-typed settings stay in `writeSkeleton`: moving them reorders keys (§7's first trap), and ruling 2 is (b). |
| AC8 | The other seven: `tpl001`, `tpl003`, `tpl005`, `tpl006`, `tpl007` (clean at HEAD) still call `pinRootNode`; `tpl008` and `tpl010` are peer-dirty and were not touched. `templatePins.pinRootNode` stays until none calls it. |

### Session 14 (2026-10-04) — AC8 measured: not a mechanical swap

- `tpl007Template.ts` is clean, but its components, curriculum and gate (`tpl007Components.ts`, `tpl007Curriculum.ts`,
  `tpl007Template.test.ts`) are **peer-dirty** today, so a regeneration would bake a peer's work in progress into
  `templates/rocket-school`. Left, with `tpl008`/`tpl010`.
- The other four (`tpl001` members-area, `tpl003` landing-pages, `tpl005` pixel-game, `tpl006` story-engine) call
  `pinRootNode(output, APP_COMPONENT)` on the COPIED artefact after the server closed, and run **without** ISL-019's
  reproducible mode. Their shipped `nodegx.project.json` has **no `modified` key** (all four, read s14). The door's
  `writeProjectFields` stamps `modified: this.now()` on any change, so the swap would add a wall-clock key and the
  two-builds-agree gate would go red.
- **The door is right, the templates are not:** the editor's own save always writes `modified`
  (`buildProjectV2File`, `ProjectExporter.ts:424-431`), so a template without it is not what the editor saves
  (ISL-018's sentence). Not leaving the key out, then.
- **The build, for a session of its own:** each of the four calls `set_project_settings({ home })` inside its session,
  and its pin step pins the project file's `modified` to `TEMPLATE_EPOCH` as `pinComponentFiles` does the
  components' — one added line per template, then regenerate and re-baseline each, gate by gate (four `template:*`
  runs, four gates). Or move each generator to reproducible mode (ISL-019), which re-derives every id: larger.

### Session 15 (2026-10-04) — AC8: four generators through the door

The s14 plan, as written: each generator calls `set_project_settings({ home: "App" })` at the end of its own MCP
session (after `find_tools { group: "project" }`), and its pin step pins the project file's `modified` to its
`TEMPLATE_EPOCH` with a new `templatePins.pinProjectModified` (key order and file ending kept; a file without the key is
left alone). Regenerated **one at a time** — `template:landing`, `:members`, `:pixel`, `:story`, each exit 0 — and each
template changed by **exactly one line**, `"modified": "<its epoch>"`, as predicted; file counts unchanged (the shelf
script's expected counts hold); the editor's embedded landing-pages copy did not move. `tpl001`'s private copy of
`pinRootNode` deleted (`9ae63929d`, `f21c62870`).

| AC | reading |
|---|---|
| AC8 | ✅ **Listed:** tpl001 ✅, tpl003 ✅, tpl005 ✅, tpl006 ✅ use the tool; **tpl007, tpl008, tpl010 still call `templatePins.pinRootNode`** — each has peer-dirty files today (14 in all), so a regeneration would bake a peer's pile into its template. The helper stays until none calls it, as the AC says. Gates: `tpl003Template` + `isl016ProjectSettings` 59/59; `tpl001` + `tpl005` + `tpl006` 202/202. 🔴 Reverted arms: tpl003 with the door call removed, and with the pin removed — each reddens its byte gate ("regenerating … reproduces every committed byte"), 49/50; tpl001's door call removed — red, 81/82. `tsc --noEmit -p packages/noodl-mcp` 8 = the floor. |

**Later s15 — AC5 and AC6's editor reading; ✅ CLOSED.**

| AC | reading |
|---|---|
| AC5 | ✅ (`b5fd6d744`) Three arms in FLD-009's `tests/services/ProjectStructure/projectLevelGuard.test.ts`, the door's write simulated as `ProjectStore.writeProjectFields` does it (read, merge, `modified`, `rootNodeId`, write), the editor's own project-level change a retitle: the editor's save is **refused** and `rootNodeId` stays the door's; 🔴 **reverted arm** (the guard off): the save writes the editor's copy, which has no home — **the door's `rootNodeId` is gone**; once the editor **adopts** the write, its retitle saves and the home survives. Graded under plain jest with the editor's real `ProjectStructureService` over `MemFs` (`jest --testMatch` on the one file): **16/16**. ⚠️ The file's home runner is the Electron `test:ci` suite — not run this session. |
| AC6 | ✅ **Editor reading.** The s13 agent's copy no longer exists, so its exact call was replayed in-process on a fresh copy of `demo-app` (`find_tools { group: "project" }` → `set_project_settings({ home: "App", name: "Olive's Island", settings: { htmlTitle: "Olive's Island" } })` → the same three changes the agent's `git diff` showed). `npm run dev:debug` on a throwaway profile (`NOODL_USER_DATA_DIR` in the scratchpad; the 9222 listener's `--user-data-dir` checked before driving), opened through `LocalProjectsModel.openProjectFromFolder`: the editor's `ProjectModel` holds **home `app_group` (a Group in `/App`), title "Olive's Island"**. Control, the same fixture without the call: **home `null`, title "Demo App"**. ⚠️ "No HOME" in the editor's text read false in BOTH arms — that message is the preview's, which was not open — so it graded nothing and is not the reading. Stack stopped with `dev:stop` (26 processes); the 7 MCP servers survived. |

