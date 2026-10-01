# ISL-016 — The door writes the project settings and the home page

**Status: ⬜ not started — scoped 2026-10-01 at `27d891bf3`.** **Source:** [AUDIT F23](AUDIT-2026-10-01.md) · the
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

None yet.
