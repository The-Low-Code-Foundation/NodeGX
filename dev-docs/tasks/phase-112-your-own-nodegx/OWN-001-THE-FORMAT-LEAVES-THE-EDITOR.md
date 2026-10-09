# OWN-001 — The format leaves the editor

**Opened 2026-10-02.** **Depends on nothing.** P107 NSP-021 §5 names the home: *"The project file format is
`@nodegx/project-contract`'s; do not grow a second one here."*
**Status: 🟡 slice 1 built, s2 (2026-10-09): the format is in `@nodegx/project-contract/format` (schemas, validator, types, the store with the MCP's rules over memory or disk); AC2, AC3, AC4 met; AC1 waits on slice 2 (the MCP and `editor-deps.ts` onto the package). §6.**
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

### 6.2 Slice 2 — next (Fable, per the Model line)

1. The MCP's `ProjectStore` delegates its component reads and writes to `V2ProjectStore` over `diskFiles` (keep the
   clock, the pins and the project-level files on top; map `FormatRefusal` → `ToolError` with the same codes and the
   wording `mcpFrontDoor.js` mirrors). Its revision becomes the store's.
2. `editor-deps.ts` imports the format names from `@nodegx/project-contract/format` directly (AC1: no moved name left).
3. The two shapes: a `toDeployed(component)` beside the store, or a sentence in the page saying which one an editor writes
   and where the transform lives (`nodescope.ts` reads `sourceId`/`targetId`). NEEDS.md §3.
4. The editor's `test:ci` once, alone (`.webpack-cache` cleared, floor by name), then AC1 is graded.
