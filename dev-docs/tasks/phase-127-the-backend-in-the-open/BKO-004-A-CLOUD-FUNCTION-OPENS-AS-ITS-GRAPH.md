# BKO-004 — A cloud function opens as its graph

**Phase:** [127](README.md). **Depends on:** nothing in BKO-001 (functions are already files). **Repos:** nodegx-studio
(the Workflow tab), the map.

## Today

A cloud function is a node graph in the project (`__cloud__/…`, a `Request` node in, nodes, a `Response` out). Studio
draws a step that calls one as "Runs on the backend" (`studio.html:3588,3598`) and never opens it. `__` components are
left out of the reusables (`studio.html:1279`). The map draws a function as a box whose panel lists labelled nodes as
text (`project.mjs:190`, `app.js:1732-1745`).

## What it becomes

- "Runs on the backend" is a link. It opens the function on the Workflow tab, drawn as STU-026 draws a page's
  workflow: the dark canvas, coloured wires, steps as nodes, the inputs it takes and the answer it gives, and Bubble's
  landmarks ("When this function is called", "Return"). The records it reads and writes are named (`touches`, the
  map's word).
- Workflow gets a second list beside "Workflows on this page": **On the backend**, listing every cloud function (and,
  after BKO-005, the backend workflows and triggers).
- The map's function panel gets "Open its steps ↗" to the same view.
- The last run lit up, from `/executions` (STU-026 s22 does this for a page's last run).
- Read-only in this task. Changing a step is the existing Design / composer path (or the agent) for now.

## Acceptance

1. On the training copy's 27 functions and on a fresh agent-made function, each opens as a drawn graph. None is drawn
   empty or as a single box. Screens go in `look/`.
2. A function called by a button: from that button's workflow, one click reaches the function's graph, and Back
   returns.
3. Inside the conversation, it draws (it is Studio's own DOM, so expect yes; check it anyway).
4. `check:editor` gains the specs; the existing ones stay green.
