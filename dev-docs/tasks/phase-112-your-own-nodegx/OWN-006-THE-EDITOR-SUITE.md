# OWN-006 — The editor suite

**Opened 2026-10-02.** **Depends on OWN-001** (the reference reader and writer) **and OWN-003** (the graph runner and
its scenarios).
**Status: 📋 not started.**
**Model:** **Fable.** The adapter, the edit vocabulary and the comparison rule are the design every later task and every stranger depends on. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **An agent building an editor runs one command, and it says PASS, or it names the file, the node and the field that
> differ from what the official editor would have saved.**

## 2. Why

README §2's fourth sentence. The prototype "worked" because it looked right and three hand-written missions passed. That
is not a definition an outsider's agent can aim at. NSP-006 showed what does work: hand a stranger a suite that grades
behaviour and they are green on the first run. This is that suite for editors.

## 3. What to build

1. **The adapter** an editor implements (TypeScript types and a JavaScript example):
   `open(files) → void`, `apply(edit) → void`, `save() → files`, and optionally `graphTarget() → GraphTarget` if the
   editor runs graphs itself. `files` is OWN-001's in-memory map. The adapter calls the editor's own code path, the one
   a person's click goes through, not a shortcut.
2. **The edit vocabulary**, small and closed: add a node (type, parent or root, parameters, position), remove a node,
   connect, disconnect, set a parameter, move, rename, add a child to a visual parent. Each edit is JSON. The list is
   the MCP authoring operations' intent, not their wire format.
3. **The reference.** The same edits applied through `@nodegx/project-contract`'s writer (OWN-001), which is what the
   MCP and the editor use. The comparison matches ids (an editor may mint its own), ignores `x`/`y` unless the edit
   was a move, and compares everything else.
4. **Fixtures**: `templates/todo-list`, `templates/planning`, and a small project made for the suite that touches every
   edit kind once. Each fixture comes with an edit script.
5. **Three more checks on what the editor saved:** the structural validator (OWN-001) reports nothing; the semantic
   validator (`noodl-editor/src/editor/src/validation`) reports nothing new compared with the fixture; the official
   loader opens it. If `graphTarget()` exists, the 76 graph scenarios run on it.
6. **One command** (`npx @nodegx/editor-suite ./my-editor-adapter.js`, or the repo script if R2 rules against
   publishing) that prints PASS or the first ten differences in plain words.

## 4. Acceptance criteria

1. The reference adapter (a thin wrapper round OWN-001's writer) passes; a deliberately broken adapter (drops a
   connection's `toProperty`, writes a parameter as a string) fails with a sentence naming the field. That is the
   control that makes PASS mean something.
2. The prototype, once it reads and writes v2 through OWN-001, passes on the suite's own small fixture.
3. NSP-021's round trip (MCP ↔ Electron) runs as two adapters in this suite, so it is built once.
4. The suite runs in under a minute on the todo template.

## 5. Watch for

- Memory: *`toContain` passes dead code* and *verify the consequence, not just the mechanism*. A suite that checks
  "the file was written" passes an editor that writes nothing useful. Compare content.
- Memory: *a rule reading zero in both arms grades nothing*. Every check needs a fixture that makes it fire.
- Memory: *opening a project now writes three files into it*. The official loader's own writes are not differences the
  editor made; diff against the fixture after the loader has opened it once.

## 6. Built

*(empty)*
