# Orbit — the prototype this phase was scoped from

**The prototype is [`real/orbit.html`](#real--the-prototype-now-a-home-made-editor-beside-the-real-app-own-004-s4s6)**: the editor, missions and stages on the real app. The original page it grew from was removed in s6 (below).

A focus timer (Pomodoro) built as a NodeGX graph, running in a browser page on `@nodegx/node-spec` with no editor and
no runtime. The page is also a small editor: the NodeGX canvas look, three stages (Graph, Lift, Orbit), add a node
from a picker, wire by dragging, set properties, delete, and three missions that a fresh copy of your graph checks on
the specs. Built by Claude Code in one conversation on 2026-10-02, five versions between 21:33 and 23:08, while Richard
watched and steered. Published while it was being built as a claude.ai artifact (`TsE5boknvv5UoLhvtCUUX5`).

It is evidence, not a product. [The phase README](../README.md) §1 says what it proves and what it does not. A second
prototype, built the day after and better at explaining what a NodeGX app is, sits beside it in
[`../prototype-under-the-lid/`](../prototype-under-the-lid/README.md); [NEEDS.md](../NEEDS.md) measures both.

## The original page (removed s6, 2026-10-10)

The first version was one file, `page.html` (1,546 lines), built by `build.sh` into `dist/orbit.html` with the spec
interpreter, every spec and a 139-line graph runner (`src/graphrun.ts`, wave-at-a-time, never graded) inlined; `src/app.ts`
held the timer's 18 spec nodes, `src/picker.json` the 36 specced nodes it could run, and the 8 visual nodes were
hand-declared stand-ins with a hand-drawn phone. `#selftest` failed all three missions; `#demo` passed them.
**Richard ruled on 2026-10-10 to remove it** once `real/orbit.html` did everything it did on the real app; the files are
in git at `d4f6fb637` (`git show d4f6fb637:dev-docs/tasks/phase-112-your-own-nodegx/prototype/page.html`), which is where
NEEDS.md's and OWN-000's line citations point. `tools/rough-census.ts` stays: retired already (it walked a nested
`nodes` field v2 nodes do not have; `scripts/own/census.js` replaced it on 2026-10-03).

## The four things it had to invent, which is the phase

1. **A graph runner.** The spec package runs one node; wiring is left to a target.
2. **The project.** An invented graph, not a v2 project: the format lives inside the editor's source.
3. **The screen.** Drawn by the page from the values the visual nodes' wires carry, because 0 of 19 visual nodes has
   a spec.
4. **The look.** Copied by reading `CanvasTheme.ts`, `NodeGraphEditorNode.ts` and `structureLane.ts`: a third copy
   of the canvas palette, which is exactly what memory says drifts.

## `real/` — the prototype now: a home-made editor beside the real app (OWN-004, s4–s6)

**`real/orbit.html` is the prototype.** The same timer as v2 files (`real/orbit/`), run by NodeGX's own runtime
through `@noodl/preview` in the page, with everything `page.html` did, on the real thing:

- **Three stages.** Graph (the editor's canvas, cards where the files put them, the structure lane), Lift (a
  staircase by data flow), Orbit (rings around the app). In Graph and Lift the app sits in a window; in Orbit one switch
  puts it inside the scene or keeps it in its window (Richard ruled *keep both*, R7).
- **Editing, every change a write through `V2ProjectStore`** (OWN-001) and the app rebuilt from the files: + Add node
  (the runtime's own node library: 118 types, every one the real node), drag a wire from a card's connector and
  pick the ports (each node's ports from its spec where it has one, `@nodegx/node-spec`, else the library), the Node
  panel (properties, the outputs' live values, the wires, delete), Try it (lengths, colours, the round line). Moving a
  card writes its position into the files and does not rebuild the app.
- **Three missions, checked in the real app.** Check plays the graph as it stands on a **copy** of the files in a
  second real app (shown small while it plays) and reads the screen by the part each node draws. Each fails on the
  graph as it starts, for its own reason; Show me builds the answer step by step through the store; then it passes.
- **Any project, any component, the structure too** (s6, OWN-006 AC2): a component switcher; a screen node added
  inside the selected one; Inside / Place in it to reparent and reorder; rename; delete a screen node with what is in it.
  `real/suite-adapter.mjs` runs the page through the editor suite (`@nodegx/project-contract/editor-suite`): it passes
  the small fixture, todo-list and planning.
- **Live values** on the cards and pulses on the wires come from the running app's trace; hover a screen node's card
  and its part of the app is outlined, point at the app and its card lights.

Nothing in it draws the screen or runs a node: the app is the app.

```sh
real/build.sh                       # bundles look.js (@nodegx/canvas-look) and specs.js (@nodegx/node-spec), both gitignored
node real/serve.mjs 47812           # then open http://127.0.0.1:47812/orbit.html
                                    #   ?stage=graph|lift|orbit  ?pose=scene|window  ?speed=1|60  ?demo plays the three missions, then lifts and orbits
node real/check.mjs                 # the gate: editing with real input, the three missions (fail, Show me, pass), both poses, 37 / 37 wires live
```

Needs the deploy runtime (`npm run build:editor:_viewer`) and the preview bundle (`npm --prefix
packages/noodl-preview run build`). `app.html` is the smallest host; `library.html` shows the runtime's ports for any
node type.

Orbit's graph differs from the original page's in one place, on purpose: *Phase over* is evaluated on each tick,
because the real engine showed the original wiring bounces a Skip back (OWN-004 §6.2); the original page's own runner
never did. The
files' positions were laid out once in s6 (columns by data flow, the screen's stack last), so Graph reads like the
editor.
