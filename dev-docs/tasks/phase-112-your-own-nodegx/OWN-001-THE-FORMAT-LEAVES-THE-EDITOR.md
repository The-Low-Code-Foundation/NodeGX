# OWN-001 — The format leaves the editor

**Opened 2026-10-02.** **Depends on nothing.** P107 NSP-021 §5 names the home: *"The project file format is
`@nodegx/project-contract`'s; do not grow a second one here."*
**Status: 🟢 BUILT — s5 (2026-10-10): slice 2, the MCP's `ProjectStore` writes through the package's `V2ProjectStore` and `editor-deps.ts` imports the format from the package; AC1 met once its gates read (§6.2). s2 (2026-10-09): slice 1, the format in `@nodegx/project-contract/format`; AC2, AC3, AC4 met. §6.**
**Model:** **Fable** for the slices that rewire the editor and the MCP and carry the two shapes of the format (three consumers, one wrong boundary is costly to undo). **Opus** for the slices whose shape is already fixed: the in-memory files, the write planner, the format page. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **Anything, a page, a script, another editor, can open a NodeGX project, change it and save it, through one
> package, with the same rules the official editor and the MCP use.**

## 2. Why

README §1 reading 4. The v2 format's schemas, validator and loader live in `noodl-editor/src/editor/src/schemas/` and
`validation/`; the MCP reaches them through `editor-deps.ts` (735 lines of relative imports). An editor outside the
repo cannot reach them at all, so the prototype invented its own graph shape and cannot open a real project.

`@nodegx/project-contract` already exists for exactly this reason: its README says each of its modules *"was owned by
a package that another package could not depend on"*. The format is the largest module of that kind left.

## 3. What to build

1. **Move, do not rewrite.** Into `@nodegx/project-contract`: the v2 file types (`ProjectV2File`, `ComponentV2File`,
   `NodesV2File`, `ConnectionsV2File`, `RegistryV2File`, `RoutesV2File`, `StylesV2File`), the eight JSON Schemas and
   `validator.ts`, `loadV2Project`, `normalizeV2Component` and the component-ref helpers, and `ProjectStore`'s read/write
   rules (snapshot stats, content revision, refuse on drift, temp file and atomic rename). The editor and the MCP import
   them from the package; the old files re-export for one release, as `logic-builder-io.ts` did.
2. **Two backends behind one interface.** Node's file system (what the MCP uses) and an in-memory map of path → text
   (a page, a test, a dropped zip). The revision rule works on both: in memory, the revision is the content hash.
3. **A page can use it.** No `fs`, `path` or Node `crypto` on the in-memory path (Web Crypto for hashing). Measured by
   bundling the in-memory entry for the browser, as the prototype bundled the spec.
4. **The semantic validator stays where it is** (11,710 lines that read the node catalog and the editor's models). The
   suite (OWN-006) runs it on what an editor saved; moving it is a later question, recorded in §6 if it bites.
5. **`dev-docs/reference/PROJECT-FORMAT-V2.md`.** The format in one page, generated in part from the schemas: a
   component folder, a node, a connection, the registry, routes, styles, with one real example from `templates/planning`.

## 4. Acceptance criteria

1. The editor and the MCP read and write v2 projects through `@nodegx/project-contract`; `editor-deps.ts` no longer
   imports any of the moved names; `test:main`, the MCP suite and the editor's `test:ci` floor are unchanged by name.
2. A browser bundle of the in-memory entry contains no `fs`, `path` or Node `crypto`, and round-trips every component
   of `templates/todo-list` byte-for-byte (read, write unchanged, compare).
3. Two writers on one in-memory project: the second write after a change it did not read is refused, exactly as
   `ProjectStore` refuses on disk.
4. `PROJECT-FORMAT-V2.md` exists and its example validates against the moved schemas in a test.

## 5. Watch for

- Memory: *a wholesale write over a shared file is an unperformed merge*, and *the editor's `test:ci` webpack
  type-checks a sibling package's tests*: moving files the editor imports can redden the editor suite from a package
  you did not think it read. Run the editor's `test:ci` once, alone (one heavy job).
- Memory: *two project formats*. Templates keep `textStyles` in a sidecar; the loader handles it today. Keep that.
- Every file's `$schema` names `https://opennoodl.dev/schemas/…`. Whether that URL serves anything is not this task's
  question; record what it returns in §6 and leave it.

## 6. Built

### 6.1 Slice 1, s2 (2026-10-09, on Opus)

**What moved (git mv, content unchanged):** the eight JSON Schemas → `packages/nodegx-project-contract/schemas/` (beside
P116's `world.schema.json`, where `world.ts` said they would go); `validator.ts` → `format/validator.ts`; the fifteen file
interfaces → `format/types.ts`. The editor's `schemas/index.ts` and `schemas/validator.ts` now re-export from
`@nodegx/project-contract/format` for one release, so all ~40 importers (editor, MCP `editor-deps.ts`, preview,
`deploy-from-disk`) are unchanged. Two tests read the schema files by path and were pointed at the new home
(`tests/io/schema-drift.test.ts`, `tests-unit/aaq-005/authoringVocabulary.test.ts`).

**What is new:**
- `format/files.ts`: `ProjectFiles` (`read`, `stamp`, `write`, `remove`) and `memoryFiles()`. `format-node.ts`
  (`@nodegx/project-contract/format-node`): `diskFiles()`, with stamp = mtime and size, writes by temp file and atomic rename.
- `format/store.ts`: `V2ProjectStore`, which is `ProjectStore`'s rules moved, not paraphrased: snapshot on read, refuse on
  drift or a stale `ifRevision`, write nothing unchanged (ISL-019), keep the registry and its stats true, delete. It
  refuses with `FormatRefusal` carrying the MCP's `ToolError` codes. `serializeV2File` keeps a replaced file's final newline.
- `hash.ts`: cyrb53, moved out of `world/write.ts` (which now imports it) so the format does not depend on `world/`.
- `dev-docs/reference/PROJECT-FORMAT-V2.md`, with `Week/Spark bar` from `templates/planning` as its example.

**What did NOT move, and why:** there is no `loadV2Project` function. The loader is `validation/loadV2Project.ts`'s
`loadV2Directory`, and it builds the *semantic validator's* normalized model (`NormProject`), so it stays with the
semantic validator (§3.4). The store reads the files themselves instead. The MCP keeps its clock (component ids), the
run-on-value-change pins, the project-level files and `ToolError` until slice 2.

**Gates (2026-10-09, tree at `b26dd85d5` plus this slice):**

| gate | reading |
|---|---|
| `packages/nodegx-project-contract` jest | **219 passed**, 0 failed (11 suites; 17 new in `format*.test.ts`) |
| package `tsc` and `tsc -p tsconfig.tests.json` | clean |
| AC2: every file of `templates/todo-list` and `templates/planning` validates | 0 failures (80 and 75 components) |
| AC2: `serializeV2File(parse(t), t) === t` | all 243 JSON files of todo-list |
| AC2: read every component, write back unchanged | 80 / 80 `unchanged`; the file map equals the original byte for byte |
| AC2: browser bundle of `format.ts` | no Node built-in in the metafile; **152,196 bytes minified** (Ajv and ajv-formats are most of it); runs in a `vm` context with no `require`, `process` or `Buffer`, and edits a project there |
| AC3: two writers, in memory and on disk | same outcome on both: second write `conflict`, stale revision `conflict`, write after re-read succeeds. **Mutant:** with the stamp check off, both tests fail (`secondWrite: "written"`) |
| AC3 browser mutant | adding `export { diskFiles }` to `format.ts` fails the bundle test (`Could not resolve "fs"`) |
| AC4: the page's examples validate and equal the template files; every schema's required fields named | pass |
| MCP jest, 8 format-touching suites (tools, roundtrip, createProject, isl019SameBytes, gateParity, operationsWritePath, starterWriter, vocabularyParity) | **96 passed** |
| MCP bundled with its own esbuild options to a scratch file | resolves `format.ts`, `format/store.ts` and the schemas; `--help` runs. `dist/` not rebuilt (peers' servers run it) |
| editor jest: 7 tests-unit suites + 4 `tests/` specs under plain jest (schema-validator, schema-drift, ProjectExporter, roundtrip-fidelity) | 87 + **165 passed** |
| `@noodl/preview` jest | 54 passed |
| `typecheck:editor`, `typecheck:preview` | clean |
| `typecheck:mcp` | 10 errors, the same ten before and after, all in template-generator tests (cg001–003, ig007, iw007, p108s8) |
| `typecheck:editor-tests` | 6 errors in P116's `world/`, not caused by this slice: bug **P112-S2-WORLDTYPECHECK** |
| editor `test:ci` | **not taken.** Slice 1 changes only re-exports and two test paths; the editor specs it touches ran under plain jest above. Run it once, alone, with slice 2 |

**Found:**
- **P112-S2-NEWLINE** (low): the editor's `ComponentSaver` and the MCP both rewrite a template file without its final
  newline. The store keeps it; slice 2 fixes the MCP by moving it onto the store.
- **P112-S2-WORLDTYPECHECK** (medium, P116's): above.
- P116's import gate (`tests/project.test.ts`, *"nothing in the package reaches an adapter"*) scanned the whole package
  and failed on the format's `ajv` and `format-node`'s `fs`/`path`. It now names those three imports (not a waiver: an
  adapter or a runtime still fails it). P116 had an open hunk elsewhere in that file; it was left out of this commit.
- `ajv` and `ajv-formats` are not declared in the package's `package.json`: they resolve from the root, and declaring them
  needs a root-lock change (how P112-S1-LOCKFILE broke CI). **R2's publish must declare them**, beside node-spec's
  `@noodl/backend-contract`.
- The revision differs from the MCP's: the store's is cyrb53 (pure, works in a page); the MCP's is SHA-1 via Node
  `crypto`. Both are opaque tokens. Slice 2 moves the MCP onto the store's.
- `https://opennoodl.dev/schemas/nodes-v2.json`: `curl` got no response from this machine (status 000) within 8 s. Not
  investigated; the validator never fetches it.

### 6.2 Slice 2, s5 (2026-10-10, on Fable)

**The MCP's `ProjectStore` is the format's store with the MCP's words on top.** `packages/noodl-mcp/src/project/ProjectStore.ts`
went from 701 lines to 533, half of them the project-level files it keeps: it constructs a `V2ProjectStore` over `diskFiles(projectDir)` (public as `store.format`), with its
write clock as the store's `now`, and every component read, resolution, write and delete goes through it. What it keeps:
the clock and `componentIdFor`, the project-level files (settings, tokens, cloud, `writeProjectFields`), `listComponents`,
`findUsages`, `buildNormProject` (the semantic validator's model), and the `ToolError`s. `computeRevision` is now the
package's `componentRevision` (cyrb53, 14 hex characters; two tests that pinned the SHA-1's 12 were updated); `sameComponentContent` is re-exported from the package.

Three seams were added to the package for a caller that keeps rules on top, each with a test in `format.test.ts`:
- **`FormatRefusal.reason`** (`drift`, `stale-revision`, `exists`, `missing`, `unregistered-files`, `unknown-component`,
  `legacy-project`, `not-a-project`, `read-failed`, `missing-registry`) beside `code`. The MCP maps each to the wording it has
  always used, naming the tool to call next (`get_component`, `update_component`, `create_component`) and the project-relative
  path; the two constructor messages `mcpFrontDoor.js` mirrors are unchanged, dir prefix included. A page says the same
  refusal in its own words from the same reason.
- **`writeComponent(…, { prepare })`**: a hook that runs once the write is admitted (exists as `expectNew` says, no drift, no
  stale revision) and before the unchanged check, with the stored files. The MCP's run-on-value-change pins (ISL-018) run
  there, so a rewrite of a pinned node is still a no-op (ISL-019) and a refused write never pins. Test: a prepare that edits
  the candidate back to the stored content yields `unchanged`; refused writes never call it; a create sees `undefined`.
- **`filesOf(key, entry)` and `storedFiles(entry)`**: a component's files with no snapshot taken, for a walk over the registry
  that is not a read-before-write (the MCP's usages, listing and validation model). Test: a walk after another writer's
  change does not refresh the drift snapshot.

**AC1's other half:** `editor-deps.ts` imports `SchemaValidator`, `SCHEMA_IDS`, `formatValidationErrors` and the thirteen file
types from `@nodegx/project-contract/format`; nothing in the MCP reaches the editor's `schemas/` any more
(`grep -rn "noodl-editor/src/editor/src/schemas" packages/noodl-mcp/src` is empty). `normalizeV2Component` and the
component-ref helpers stay imported from `validation/loadV2Project` (§6.1: they are the semantic validator's).

**The two shapes (item 3):** answered as *the transform is the editor's exporter, and the package carries no `toDeployed`
on purpose* — `PROJECT-FORMAT-V2.md` §"Two shapes, one project" now says where it lives and why a rename is wrong (OWN-004
s3 measured it: ports come from the node library); NEEDS.md §3's row records the answer.

**P112-S2-NEWLINE fixed on both writers.** The MCP's half came with the move (`serializeV2File` keeps the replaced file's
final newline). The editor's `ComponentSaver` now serializes every component file and the registry through the same
`serializeV2File`, reading the file it replaces when its filesystem can read text (`readFile` is optional on
`ProjectStructureFilesystem`; without it, or for a new file, the text has no newline as before). Regression in
`tests/services/ProjectStructure/ComponentSaver.test.ts`, red without the fix (measured: `git show HEAD:` version of the
saver → 1 failed, 11 passed; restored, `diff -q` clean).

**Gates (2026-10-10, tree at `991457d2d` plus this slice):**

| gate | reading |
|---|---|
| `packages/nodegx-project-contract` `format.test.ts` | **14 passed** (3 new) |
| MCP `store`, `tools`, `isl018DoorPins`, `isl019SameBytes` | **52 passed** (2 new in `store.test.ts`: the revision is the package's and a write through the package's store is refused by the MCP in its words; the newline kept) |
| `typecheck:mcp` | **0 errors** (the ten of s2 were fixed by P109 `fa1dc081c`) |
| `@noodl/preview` jest | 58 passed (7 suites) |
| editor `ComponentSaver.test.ts` under plain jest (`--testMatch` override: the editor's jest config does not match `tests/`) | 12 passed; mutant 1 failed |
| MCP suite, whole (`--testPathIgnorePatterns tpl011`, a peer's loose files), 264 s | **3,729 passed, 11 failed** in 8 suites, none of them this slice's (below) |
| `typecheck:editor` | **clean** |
| editor `test:ci`, `.webpack-cache` cleared, seed 17687, results file fresh (66 s of specs) | **3,006 specs, 1 failure**: `SUB-006 rules nonexistent-port errors on a missing static port and lists available alternatives` — *"Expected 'value' to be 'onClick'"* (`tests/validation/rules.test.ts:178`, the alternatives' order from the catalog; the webpack compiled the tree at `7c6182dc9`, P107 s77's two commits that landed during this session and changed every node's words). The floor memory's eight by name (3 SUB-006, 3 SUB-011, 2 NDA-017) read **0** — those fixtures were repaired — so this one is the whole floor now and it is P107's. **The first run died in the webpack after 67 s with no spec** (P112-S2-WORLDTYPECHECK, fixed above); the second is this reading |

**The eight red MCP suites, attributed (each read after the run, none reads the store):** `nodeIdAllocation` — the
semantic validator rejects the test's own wire `title.text → sub.text` with *"Text has no output named text"* (the catalog
the validator reads changed under P107's spec work; the store never sees it; the scratch call's full payload is in the
session log). `isl023TemplateGate` — eight TS errors in `packages/nodegx-project-contract/world/*` (`PathCompilation`,
`problems`), P116's, last touched `e105bb3d1`: **P112-S2-WORLDTYPECHECK, and it also killed the editor's `test:ci` in its
webpack before any spec ran (67 s, no Jasmine line). Fixed here** — eight narrowings written as `=== false` / `=== true`,
`typecheck:editor-tests` 8 → 0, the package's 197 world tests pass; the ISL-023 gate reads that program too. `def038SettledTemplates` — `templates/nightbook/` is an
UNTRACKED pile (a peer's), and `digital-bricks-training-demo` has 44 unpinned boxes (handoff finding 6). `cmp004Parts` and
`cmp004RoundTrip` — the shelf outside the repo gained `icon.png` and lost a text style; the shelf is a peer's output.
`fld013ExportReach` — ParseCSV now exports (`packages/nodegx-export` has a peer's open edits). `sbr009ThemeEditorDrive` and
`def018-def020-layout-drive` — red alone too (2 of 18), Chrome drives of built artefacts, neither names the store; not
re-measured at HEAD. All eight are for their owners; none is filed here because each has an owner session open.

**Not done, recorded:** the MCP's `dist/` is not rebuilt (peers' servers run it; P109-S36-STALEMCPDIST). `listComponents`,
`findUsages` and `buildNormProject` are still the MCP's, on the package's `filesOf`: a listing is something every editor
wants and could move with OWN-006's adapter. The editor's `ComponentSaver` still writes the project-level files
(`nodegx.project.json`, routes, styles) through its own `atomicWrite`, now with the newline rule; moving those onto the
store is a question for when the editor itself opens a project through the package (not this task's AC).
