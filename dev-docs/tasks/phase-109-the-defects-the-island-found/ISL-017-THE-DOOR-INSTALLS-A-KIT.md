# ISL-017 — The door installs a kit, and a project need not carry a copy

**Status: ⬜ not started — scoped 2026-10-01 at `27d891bf3`.** **Source:** [AUDIT F24 and F19](AUDIT-2026-10-01.md) ·
P108 s2 lane B and every merge note since (the built kit copies conflicted on each merge) · **Side:** product (MCP door,
`noodl-mcp`; module install; template packaging)

The garden's generator copies four module folders into the project with `fs.cpSync` before it opens the door, because the
door only knows a kit's nodes once they are on disk. A door that installs modules exists, `install_prefab`, and the
generator does not use it. And each kit then lives in four places in the repository, so a one-line kit fix is a rebuild,
a regeneration and a merge conflict on two generated files.

## 1. The person sentence

**An agent building a game asks the door for the kits and the fonts it needs and gets them installed, recorded and
usable in the same conversation; and fixing a kit means changing it in one place.**

## 2. What was measured

All rows **re-read by me at HEAD `27d891bf3` on 2026-10-01**, from source, from `git ls-files`, or with `node`/`stat`.
Nothing was run through the door.

| reading | where |
|---|---|
| `installModules` copies `library/modules/<name>/project/noodl_modules/*` for `garden-kit`, `game-kit`, `garden-3d-kit`, then every folder of the template's own `cg007Assets/noodl_modules` (`bot-garden-fonts`), all with `fs.cpSync`, **before** `createServer` | `packages/noodl-mcp/tests/cg003Template.ts:86-101`, `:128`; `REQUIRED_MODULES` at `cg003Components.ts:3316` |
| The header gives the reason: "the door only knows a module's nodes once it is in `noodl_modules/`" | `cg003Template.ts:8-10` |
| `installModules` exists in 4 generator files (`cg003`, `tpl005`, `tpl007`, `tpl011`); `fs.cpSync` in 5 generator files | `grep -l` over `packages/noodl-mcp/tests/*.ts`, this session |
| `install_prefab({ slug, type: 'module' })` copies an entry's `project/noodl_modules/*`, records provenance, and refreshes the kit overlay so the node types "arrive in the catalog immediately". It never overwrites | `src/tools/libraryTools.ts:299-313`, `:395-438` |
| It refuses any entry without a legacy `project/project.json`. All three garden kits have one (0 components each), so the refusal does not apply; **whether the install then succeeds on them is not measured** | `libraryTools.ts:318-327`; `library/modules/{garden-kit,game-kit,garden-3d-kit}/project/project.json`, read with `node` |
| The provenance it writes is `{ module, origin: 'imported', fromProject: <absolute entry path>, importedAt: <now> }` into `noodl_modules/kit-provenance.json`. The shipped garden has **no** such file | `libraryTools.ts:410-421`; `noodl-editor/src/shared/utils/projectmodules.ts:603`, `:678-700`; `ls -a templates/bot-garden/noodl_modules` |
| `install_prefab` sits in the deferred `explore` group, which an agent reaches through `find_tools` | `src/toolGroups.ts:293-329` |
| `bot-garden-fonts` (Fredoka woff2 ×2, `styles.css`, `manifest.json`, OFL licence) is not a library entry: it lives beside the generator, and no tool can install it. The preset's own font module (`preset-font-nunito`) **is** written by the door, by `set_style_preset` | `packages/noodl-mcp/tests/cg007Assets/noodl_modules/bot-garden-fonts/`; `templates/bot-garden/noodl_modules/` |
| The four copies of a kit: `library/modules/garden-kit/src/{kit,blocks}.js` → `build.mjs` → the committed `library/modules/garden-kit/project/noodl_modules/garden-kit/index.js` (254,543 B) → the committed `templates/bot-garden/noodl_modules/garden-kit/index.js`. Eight committed files in each of the last two | `git ls-files library/modules/garden-kit templates/bot-garden/noodl_modules`; `wc -c` |
| `game-kit`'s built `index.js` (501,261 B) is committed three times: the library, `templates/bot-garden`, `templates/rocket-school` | `git ls-files templates \| grep noodl_modules/[^/]*/index.js` |
| A gate pins the template's copy equal to the library's, byte for byte | `cg003Template.test.ts:296-301` |

## 3. Where it bites

- **An agent through the MCP** cannot install a template's own font or asset at all, and has no way to know `install_prefab`
  installs code modules too: its `purpose` line says "browse the example library".
- **Whoever fixes a kit** changes `src`, rebuilds, regenerates the template, and commits two generated files that conflict
  with every other lane's regeneration. The audit counts this on every merge of the push.
- **A person who takes the template** gets a project that works offline, which is the point of the copy. Any change here must
  keep that.

## 4. Related work and collisions

- **ISL-014** (D83): with `dist/kit-extract.cjs` unbuilt, the door says a kit is "not installed". An install tool that
  refreshes the overlay meets that sentence first; land ISL-014's wording before AC6.
- **ISL-013** (kits share code): if kits reference each other rather than copy, the number of copies here changes.
- **ISL-019**: provenance carries a wall-clock time and an absolute path; reproducible bytes need both settled.
- **P65 the library** and **P69 CN-006/CN-017** (`create_node_kit`, kit provenance): provenance's origin vocabulary
  (`imported`, `scaffolded`) is theirs. A library install is a new origin, not a re-use of `imported`.
- **P88 GAM-018** (a kit registers the same whatever is installed beside it): an install order must not change what
  registers. AC3 installs in two orders.
- Owner grep: `grep -rlai "install_kit\|install_module\|install_font\|add_asset\|upload_asset" dev-docs/tasks --include='*.md'`
  → **no hits**. `install_prefab` is P65's; nothing owns template-only modules or the copy count.

## 5. Design — 🔒 rulings first

1. 🔒 **Where a template's own module comes from.** (a) It becomes a library entry (`library/modules/bot-garden-fonts`),
   so `install_prefab` installs it and every project can use Fredoka. (b) `install_prefab` takes a local folder
   (`from_dir`) as well as a slug. (c) A font-only tool that writes a font module the way `set_style_preset` does.
   **Recommendation: (a).** No new tool, no new parameter, 0 resident tokens, and a path argument is a door to any folder
   on the machine, which (b) would have to fence.
2. 🔒 **Does a project carry a copy of a library kit?** (a) Yes, as now: a project is self-contained and works offline;
   the copy is installed, not committed by hand. (b) A project references `garden-kit@1.0.0` by name and the editor,
   preview and deploy resolve it from the library. That removes the template's copy, but a project then needs the library
   to open, and a person's project leaves the machine without its kit. (c) The **repository's** template stores the
   reference, and the copy is made when a person installs or publishes the template (the embedded and curated providers
   run the install). **Recommendation: (c).** People keep self-contained projects; the repository loses the committed
   duplicate and its merge conflicts. It needs both template providers changed, so it is measured in AC7 before it is built.
3. **Provenance for a library install** records `origin: 'library'`, the slug and the entry's version, and no absolute
   path. With ISL-019's reproducible mode it records no time either.

Constraints:

- 🔴 **The resident surface is full**: `SURFACE_TOKEN_BUDGET = 8280` (`tests/toolDisclosure.test.ts:83`), last recorded at
  8,275, **5 tokens of headroom** (`src/toolGroups.ts:425-430`). Ruling 1(a) adds no tool. If (b) or (c) is chosen, the new
  tool or parameter goes on a **deferred** tool in the `explore` group, appended (0 resident tokens). `install_prefab`'s
  description may change only inside the deferred schema. Widen the group's `keywords` with `kit`, `module`, `font`,
  `install` (keywords are matched server-side and never sent).
- A new tool owes registration under `--allow-writes`, `WRITE_ONLY_TOOLS`, a `TOOL_GROUPS` home (guard at
  `toolDisclosure.test.ts:141`), a README §Tools row, and a spec that reaches it through `find_tools`.
- The install must leave a kit's node types in `get_node_type` in the same session (the overlay refresh), and report a kit
  that loads but registers nothing (`kitsReport`, GAM-018 AC6).

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec binds a server to the garden's skeleton and calls `install_prefab` for `garden-kit`, `game-kit` and `garden-3d-kit`, then for `bot-garden-fonts`. It records, for each, installed or refused and the sentence; `get_node_type("garden-kit.Garden")` after; and the tree diff against `installModules`' copy. Predicted: the fonts refused `not-found`, and a `kit-provenance.json` the shipped tree does not have. **Known-firing control:** `install_prefab({ slug: "keyboard-shortcuts" })` installs and its node type resolves. |
| AC2 | After ruling 1: the fonts install through the door, and the page renders Fredoka (a computed-style reading in a render, not the file's presence). |
| AC3 | The three kits installed in two orders give the same catalog (GAM-018's rule) and the same files. |
| AC4 | Provenance after a library install names the slug and version, holds no absolute path, and is byte-stable across two runs in ISL-019's reproducible mode. 🔴 **Reverted arm:** restore `fromProject: entry.entryDir`, and the two-machine comparison (two different checkout paths) goes red. |
| AC5 | **The person's door, over the real protocol.** An agent (Claude Code with the stdio server from `dist/noodl-mcp.cjs` under a project-local `--mcp-config`, or `mcp-model-driver.js`) is told "this game needs the garden kits and the Fredoka title font". Its transcript holds the installs through `find_tools` → `install_prefab`, and its next `create_component` with a `garden-kit.Garden` node is accepted in the same session. |
| AC6 | **The generator drops its raw step, byte-identical.** `installModules`' `cpSync` is replaced by `install_prefab` calls through the in-process client. `CG-003 AC2` (`cg003Template.test.ts:281-294`): two builds agree and equal the checked-in tree, **0 files differ**. Run it once with one install removed: the authoring step refuses the kit's first node by name. |
| AC7 | Ruling 2 measured before it is built: list every path that reads a project's `noodl_modules` (editor load, `noodl-preview` `loader.ts` and `deploy.ts`, `nodegx-kit-catalog`, the export) and every template provider install path, with what each would need. If (c) is built, `templates/bot-garden` commits no built kit and `git ls-files templates \| grep -c "noodl_modules/.*/index.js"` falls by the number recorded here. |

## 7. Traps

- 🔴 **"Installed" is not "registered".** A copied folder with an unbuilt `dist/kit-extract.cjs` reads as not installed
  (D83). AC1 reads `get_node_type`, not the folder.
- 🔴 `install_prefab` never overwrites, so a regeneration into a directory that already holds the kits reports `skipped` and
  keeps the old build. The generator starts from an empty directory; a test that reuses one grades the old kit.
- ⚠️ `install_prefab` also merges the entry's styles and copies its assets. A kit entry's `project.json` with styles would
  change `nodegx.styles.json`. AC1's tree diff is what shows it.
- ⚠️ `kit-provenance.json` is new in the artefact even when everything else matches; it is the expected first diff of AC6,
  and it is ruled by §5 item 3, not deleted by the generator.
- ⚠️ The template-copy gate (`cg003Template.test.ts:296-301`) compares to the library's build. If ruling 2(c) lands, that
  gate's population becomes empty; rewrite it, or it passes over nothing.

## 8. Record

None yet.
