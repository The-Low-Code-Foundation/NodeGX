# ISL-017 — The door installs a kit, and a project need not carry a copy

**Status: ✅ CLOSED s15 (2026-10-04) — AC3 (two install orders: same catalog, same files) and AC5 (an agent installed the kits and the font through the door and placed `garden-kit.Garden` in the same session) met; AC2 and AC7 met — `templates/bot-garden` commits its four kits' record and not the kits (438 → 414 files), every reader that copies it resolves them from `library/`, and the shelf publish stages and resolves. s13: AC1, AC4, AC6 met — the fonts are a library entry, provenance names the entry not the path, the garden installs through the door. Ruled s13: ruling 2 "Copy on install" (AC7's census next); ruling 1 (a) as the engineering default (README §8 round 3). Scoped 2026-10-01 at `27d891bf3`.** **Source:** [AUDIT F24 and F19](AUDIT-2026-10-01.md) ·
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

### Session 13 (2026-10-04) — ruled; ruling 1 and §5 item 3 built; AC1, AC4, AC6 met

**Ruled** (README §8 round 3): ruling 2 *"Copy on install"*, asked with the census — 8 committed kit copies under
`templates/`, 1,979,503 B of `index.js`; 7 byte-identical to the library build; the DBT template's
`i18next-noodl` is the Sep 20 build (58,445 B) against the library's Oct 3 1.1.0 (59,137 B) — the drift the ruling
removes. Ruling 1 (a) taken as the engineering default.

**AC1 (measured before building, in-process, a fresh skeleton, reproducible mode):** `install_prefab` installed
`garden-kit`, `game-kit`, `garden-3d-kit` (`modulesInstalled` each, no `kitLoadFailures`), and
`get_node_type("garden-kit.Garden")` answered with its ports in the same session; `bot-garden-fonts` was
**refused** (no such entry). `diff -rq` against `installModules`' hand copy: `bot-garden-fonts` only in the hand copy,
`noodl_modules/kit-provenance.json` only in the door's — and the provenance held **absolute paths into this checkout**
(`fromProject: "/Users/…/library/modules/garden-kit"`). No `nodegx.styles.json` change.

**Built:**

1. **Ruling 1 (a):** `library/modules/bot-garden-fonts` — the font module moved there with `git mv` from
   `packages/noodl-mcp/tests/cg007Assets/` (history kept; OFL licence beside it), a `library.json` (1.0.0), a
   0-component `project.json` as the kits have, a monogram icon. `library:check`: `OK modules/bot-garden-fonts`.
2. **§5 item 3, on the existing mechanism:** no new `origin: 'library'` arm. The editor's own local record carries
   no path (`moduleGate.ts`: `fromProject: 'a project on this computer'`), and its Kits panel prints `imported` as
   *"Copied in from {fromProject} on {date}"* (`describeKitOrigin`). So `install_prefab` keeps the `imported` arm and
   writes `fromProject: 'the NodeGX library entry "garden-kit" 1.0.0'`, `importedAt` = the store's clock (the epoch in
   reproducible mode). No editor change, no new vocabulary.
3. **AC6, the generator:** `cg003Template.ts` drops `installModules` (`fs.cpSync` before the server started) and
   installs `GARDEN_MODULE_ENTRIES` through `find_tools` → `install_prefab` on its in-process client, before the look.

| AC | reading |
|---|---|
| AC1 | ✅ above. |
| AC2 | 🟡 The fonts install through the door (the generator's `install_prefab bot-garden-fonts` → `modulesInstalled: ["bot-garden-fonts"]`; CG-003's font assertions green). The computed-style reading of Fredoka on a rendered page — not taken this session. |
| AC3 | ⬜ Two install orders — not run. |
| AC4 | ✅ `isl017LibraryProvenance.test.ts`: the record names the entry and version, holds no absolute path, and two copies of the shelf at two different paths write the same bytes. 🔴 Reverted arm (`fromProject: entry.entryDir`): both red. |
| AC5 | ⬜ The person's door (an agent asked for the kits and the font) — not run. |
| AC6 | ✅ `cg003Template.test.ts` with the door installs: 149/150, AC2 red naming **`noodl_modules/kit-provenance.json` only** — the expected first diff (§7) — then `npm run template:garden` (exit 0) added that one file to `templates/bot-garden` (four records, entry + version, the template epoch) and the gate read **150/150**. Control (garden-kit's install removed): the authoring refused `garden-kit.Divider` and `garden-kit.Garden` by name (`unknown-node-type`). |
| AC7 | 🔬 The census is taken (below); ruling 2 is not built. |

**Gates:** `libraryTools`, `isl025Census`, `cg001GardenKit`, `gam-018`, `iwLook` with `cg003Template`: 273/273.
`library:check` exit 1 on **`modules/nightbook-kit: missing library.json` only** — a peer's untracked pile in the
working tree, not this change (`OK modules/bot-garden-fonts`); `library:build` stops on the same folder.
`library:verify-origin` (a release gate) lists Bot Garden Fonts as unpublished at the origin beside Garden Kit and
Garden 3D Kit, which were already there at HEAD; the baseline was not updated (publishing is Richard's call).
**On the committed tree** (the worktree `../OpenNoodl-worktrees/p109-s12` at `79ed6ce0f`, no peer files):
`library:check` **exit 0, 82/82 clean**; `library:build` exit 0; `library:verify-dist` **exit 0** — modules 36
entries, 0 with problems (the editor's own install path walked against the built dist).

**AC7 — the reader census for ruling 2 (s13, read-only, an Explore agent; file:line in its report, condensed):**

- **No editor path copies `templates/` into a person's project.** `EmbeddedTemplateProvider` writes TypeScript
  objects (hello-world, site-builder, landing-pages — no kits); `PlatformTemplateProvider` unpacks a community-shelf
  bundle (`PlatformTemplateProvider.ts:181-235`). The repo's templates reach people only through
  `publish-templates-to-shelf.sh` (`:155-165`), which walks the working-tree folder, kits included (its expected file
  counts include them, `:103-113`). ⇒ **"Copy on install" is a PUBLISH-time step**: stage a copy, resolve the
  referenced kits from `library/`, publish that — no network, nothing in the editor changes. (At create time in the
  editor it would need a network fetch: the editor has no `library/` on disk, `modulelibrarymodel.ts:177`.)
- **The reference already exists in one template:** `templates/bot-garden/noodl_modules/kit-provenance.json`
  (this session). Its slug and version sit inside a sentence (`fromProject`), so a resolver would parse prose:
  add machine fields (`entry`, `entryVersion`) — the editor's per-arm check ignores extra fields
  (`isKitProvenance`). A folder name can differ from its entry (`i18next-noodl` ⊂ `i18next-translation`), so the
  record needs both.
- **Readers that need the kit on disk in the repo:** the generators while they author (the door refuses an unknown
  kit type — AC6's control), `cg003Template.test.ts:299-304` (copy equals library), `tpl007Template.test.ts:146-150`,
  `isl025Census.test.ts:131-139` (requires every census file to exist), `noodl-preview` GAM-023 (deploys a copy of
  `templates/pixel-game`), `nodegx-kit-scaffold` `types-copy.test.js:139-165`. Every one must be re-pointed or must
  resolve first, or it grades an empty population.
- **Not referenceable:** `dbt-lesson` has no library entry by design (`library/modules/dbt-lesson/build.mjs:38`
  builds straight into the template; `scripts/library/build.js:34-42` `TEMPLATE_KIT_SOURCES`). It stays copied.
- **Population:** 8 committed kit `index.js` (1,979,503 B): bot-garden ×3 and pixel-game ×1 identical to the
  library; rocket-school `game-kit` identical but its `types/node-kit.d.ts` stale (types-copy skips it on purpose);
  DBT `i18next-noodl` stale (Sep 20 vs Oct 3); DBT `dbt-lesson` unreferenceable. Font modules are committed too
  (`bot-garden-fonts`, `rocket-school-fonts`, `story-engine-fonts`, `preset-font-*`).
- Side readings: `pruneKitProvenance` has no caller (`projectmodules.ts:708`); `tpl005Template.test.ts:551` rewrites
  `templates/pixel-game` from inside a test; `templates/nightbook` and `library/modules/nightbook-kit` are wholly
  untracked (the latter has no `library.json` — it is what reds `library:check` in the working tree).

**Proposed build (next session):** the publish script stages each template, runs one resolver over its
`kit-provenance.json` records (`install_prefab`'s copy, by `entry`), checks the staged tree's counts, and publishes the
stage; the repo templates then drop their library-identical kit folders and commit the records only. The generators
keep installing through the door while they author, and write the reference instead of keeping the folder. The six
readers above move first.

### Session 14 (2026-10-04) — ruling 2, first half: the record names its entry as data; the resolver

**Built** (`db2ff78ae`):

1. **`entry` / `entryVersion` on the `imported` arm** (optional; `KitProvenance` in the editor's
   `projectmodules.ts`, whose per-arm check already ignored extra fields), written by `install_prefab` beside the
   `fromProject` sentence. `templates/bot-garden/noodl_modules/kit-provenance.json` regenerated
   (`npm run template:garden` exit 0; the one file moved); `cg003Template` + `libraryTools` **165/165**.
   `isl017LibraryProvenance` 2/2; 🔴 reverted arm (the two fields removed from the write): AC4's record test red.
2. **`scripts/library/resolve-template-kits.js <project> [--library] [--write]`** — per record with `entry`:
   `resolved` / `missing` / `identical` / `differs` (files named) / `unresolvable` (no entry, no folder, or the
   library holds another version — named both); records without `entry` (`dbt-lesson`, a kit made in the project)
   are `notReferenced` and never touched. Read-only without `--write`; exit 1 on unresolvable, or on missing without
   `--write`, so a publish that forgot to resolve stops. On `templates/bot-garden`: **all four `identical`**.
   `isl017ResolveKits` 4/4: the round trip (drop the four folders → `missing` ×4, nothing written → `--write` →
   the copy equals the template byte for byte), a drifted `game-kit/index.js` named in `differs`, a `0.9.0` record
   `unresolvable` and not copied, a record without `entry` left alone.

**Not built — and why:** the call in `publish-templates-to-shelf.sh`. That script carries a **peer's uncommitted
P78 edit** (Sep 23: counts, the planner → planning rename, `--unpublish`); a pathspec commit would take it. The hook
is one stage-then-resolve step; do it through a temporary index (memory "tmp-idx: CAS") or once the pile is
committed. Then the six readers (§8 s13), then drop the four library-identical folders from `templates/bot-garden`
and commit the record only.

### Session 15 (2026-10-04) — ruling 2 built: the publish hook, the readers, the folders dropped; AC2 and AC7 met

**1. The publish hook** (`45cf8bba0`). `publish-templates-to-shelf.sh` copies each template to a stage, runs
`resolve-template-kits.js --write` on it, refuses before the tunnel when a record names a kit the library cannot supply,
counts the STAGE's files and publishes the stage. Committed from HEAD's blob through a temporary index: the file still
carries the peer's uncommitted Sep 23 P78 edit, which stays in the working tree. 🔴 **Measured, not in the s14 plan:**
the script's six rows are planning, planner, rocket-school, pixel-dungeon, story-engine and todo-list — **the garden is
not on the shelf, and none of the six has a record**, so the hook is inert for every row it publishes today. Read with
the tunnel port held (the script stops before ssh): the five live rows stage at their old counts (story-engine's
35-for-30 refusal unchanged); a garden copy with its kits dropped (414) stages at **438**; control without the resolve
call refuses at 414; a record for `0.9.0` refuses by name; the source folder is never written.

**2. The readers** (`dfffeed99`). 🔴 **The s13 census said six; 39 files read `templates/bot-garden`.** It counted the
readers that check kit folders and missed every one that renders or deploys the garden. Of the 39, ~20 deploy drives
take a folder made by `drive-cg003-pages.js assemble` (also the P105/P108 `drive-pages.sh` / `drive-all.sh`), so
`assemble` is one seam; the rest read components only or copy the garden themselves. `resolve-template-kits.js` gained
`resolveTemplateCopy` (a reader puts the kits back, or throws naming what the library cannot supply) and
`dropReferencedKits` (the generator: drops a folder only when it is byte-identical to its entry; a differing or
unresolvable one is refused). Resolving now: `assemble`, the P105 desktop `build-app.js`, `isl021DrivePage`,
`isl021ShopParity`, `isl022WrappedRow`, `isl017ResolveKits`. `cg003Template` reads garden-3d-kit from the authoring
project and checks a resolved copy against the library; ISL-025 W13 names the library's two copies only.

**3. The folders dropped.** `prepareGardenArtefact` calls `dropReferencedKits`; `npm run template:garden` (exit 0)
deleted **exactly the 24 kit files** and changed nothing else. Peers (three OpenNoodl sessions) told in one line.

| AC | reading |
|---|---|
| AC2 | ✅ On a resolved, assembled copy, through `drive-steps.js`: the Profiles page's `H1 "Who is playing?"` is set in Fredoka and the Fredoka face is **`loaded`** (a face loads only when text on the page uses it); control (the `bot-garden-fonts` folder removed): **no Fredoka face at all**. 🔴 `document.fonts.check('16px Fredoka')` read `true` in BOTH arms — with no matching face it answers true — so it grades nothing; the face status is the reading. |
| AC7 | ✅ Built. `git ls-files templates \| grep -c "noodl_modules/.*/index.js"` **9 → 6** (counted at HEAD after the commit; one of the 9 is DBT's `index.js.map`, so kit `index.js` files 8 → 5). `templates/bot-garden` 438 → 414 files. |
| gates | `cg003Template`, `isl017ResolveKits`, `isl025Census`, `isl021DrivePage`, `isl021ShopParity`, `isl022WrappedRow`, `libraryTools`, `isl017LibraryProvenance` **213/213** (JSON fresh). `assemble` exit 0 with the four kits; 🔴 control (no resolve) **exit 1**, modules = the record and the preset font. 🔴 Generator control (no drop): `cg003` AC2's byte gate red, 149/150. **Deployed** (`assemble` + `nodegx deploy` exit 0): the shop drive `--quick` **28/28**, s14's reading. |

**Later s15 — AC3 and AC5; ✅ CLOSED.** The other templates (rocket-school, pixel-game, DBT) have no
records: their generators would have to install through the door first, as the garden's does since s13.

| AC | reading |
|---|---|
| AC3 | ✅ `isl017InstallOrder.test.ts` (`1fb213812`): two fresh projects, `install_prefab` for garden-kit, game-kit, garden-3d-kit from the repo's library in opposite orders (reproducible mode). The kits' rows in `list_node_types` (`include_hidden`) are equal and every kit contributes (the known-firing check — it caught the spec reading `name` where the row says `typeName`); every installed file is byte-identical **except `kit-provenance.json`, whose records follow install order** — asserted as such, equal as a set. 1/1. |
| AC5 | ✅ **Round 1.** Claude Code 2.1.251, `claude -p`, sonnet, `--strict-mcp-config`, the stdio server from the worktree's `dist` rebuilt at `1fb213812` (under Electron-as-Node, as peers run it), `--disallowedTools Bash Edit Write NotebookEdit Agent`, a git-tracked copy of `demo-app`. Told only: *"This NodeGX project is going to be a little garden game. It needs the garden kits and the Fredoka title font. Please add those to the project, then add a page called Garden that shows the garden. Use the nodegx tools."* **46 turns, $1.13.** Transcript: `find_tools` "kit" / "font" / "library" → `list_library` "garden", "font" → `get_library_entry` ×3 → **`install_prefab` garden-kit, garden-3d-kit, bot-garden-fonts** (it judged game-kit not needed for a Garden page) → `get_node_type garden-kit.Garden` → `create_component Pages/Garden` refused twice for its own mistakes (a Text `textAlign` port that does not exist; a child list naming a missing node) and **accepted the third time with the `garden-kit.Garden` node** — none of the refusals was about the kit. It also set the home through `set_project_settings` unprompted (the fixture has none) and added a `--font-title` token. On disk: the three folders + `kit-provenance.json`, `Pages/Garden` holding `garden-kit.Garden`. Filed [`P109-S15-RENDERPAGENAME`](../../bugs/p109-s15-renderpagename-render-report-refuses-a-page-by-the-path-create-component-took.md): `render_report({ page: "Garden" })` and `"Pages/Garden"` are refused for the start page (only `/` and `/Pages/Garden` resolve) — one turn lost, recovered from the message. |

