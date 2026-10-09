# OWN-001 — The format leaves the editor

**Opened 2026-10-02.** **Depends on nothing.** P107 NSP-021 §5 names the home: *"The project file format is
`@nodegx/project-contract`'s; do not grow a second one here."*
**Status: 📋 not started.**
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

*(empty)*
