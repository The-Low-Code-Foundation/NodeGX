# OWN-004 — The real app beside it

**Opened 2026-10-02.** **Depends on OWN-001** (the in-memory project) **and R4** (README §8).
**Status: 📋 not started.**
**Model:** **Opus.** Embedding the preview and feeding it from memory is wiring with a clear finish line. Switch to Fable only if the preview's internals resist and the task turns into design. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **Beside my home-made editor is my real app, running, and when I change something in my editor the app changes; I
> can see the last value on any wire, from the real app, not a simulation.**

## 2. Why

README §1 reading 5. No visual node has a spec, so the prototype drew its screen by hand from the values the visual
nodes' wires carried, and said so on the page. Two things in the repo already do the real job:

- `@noodl/preview` renders a v2 project in a browser with no editor process and reloads when the files change. It is a
  command-line server today (`noodl-preview <project-dir>`).
- `nodegx-observe` reads a running app over the editor's local relay; its session dictionary ships every node's id,
  label, type and component and every connection, which is what a canvas needs to light up a wire.

## 3. What to build

1. **The preview as a library.** An entry that a page can call with an in-memory project (OWN-001's backend) and a
   container element, and that re-renders when the project changes. The CLI becomes a thin user of it. Measure size and
   first-render time on the todo template.
2. **Live values without the editor.** The observe protocol's frames delivered to a page in the same tab (no relay,
   no editor): the preview emits, the home-made editor subscribes. Each frame names a node id and a port, so an editor
   can light the wire and show the value on the card, as the prototype does from the spec runner.
3. **The prototype switches over.** Its hand-drawn Preview window and its phone in Orbit come from the real preview;
   its visual nodes stop being stand-ins (their cards keep the "no spec yet" tag, because that is still true).

## 4. Acceptance criteria

1. A page with no editor process shows the todo template's real app from in-memory files, and a change written through
   OWN-001 appears without a reload of the page.
2. The page receives live values for at least the wires the prototype draws, from the real app, and the prototype's
   cards show them.
3. The prototype's `page.html` no longer draws the screen itself.

## 5. Watch for

- The preview's README: its live reload is driven by the files, while the editor's own live preview is driven by its
  in-memory model over a WebSocket and *"cannot see anything written to disk from outside"*. Do not wire the library to
  the editor's socket; the point is that it does not need the editor.
- P111 SEE-003 (the picture follows the app) wants the same live values from an exported app. Use its trace format if
  it exists by then; if not, use the observe frames and note it in SEE-003.

## 6. Built

*(empty)*
