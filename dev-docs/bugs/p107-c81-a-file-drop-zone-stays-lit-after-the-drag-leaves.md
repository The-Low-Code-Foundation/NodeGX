---
id: P107-C81
title: A file drop zone stays lit (Is Dragging Over true) after the drag has left, when its element was replaced under the drag or Accept File Drops was switched off during it
status: fixed
commit: 52fdaf088
phase: P109
task: ISL-038
severity: medium
area: runtime / file drop on every visual node that has it (noodl-viewer-react/src/node-shared-port-definitions.ts `addFileDropPorts` :956-1137 — the `dragDepth` count, `onDragEnter` :1009-1019, `onDragLeave` :1030-1035, `fileDropArmed` :253-261) — Text, Group, Image, Circle, Video
found: P107 NSP-016 s50, 2026-10-06
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.11; the Text's file-drop scenarios in packages/nodegx-node-spec/scenarios/Text.json, identical on the interpreter and the runtime target
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Text.json "Mounted off and on under a drag, then the drag leaves: leaving the page turns Is Dragging Over off (C81), the new element's enter counts 1, and the leave turns it off" (and the seven renamed beside it, on the Text, Shape, Image, Group and Video)
---

**What a person sees.** Someone drags a file over a drop zone. The zone lights up, as Is Dragging Over says it should. They
drag the file away again without dropping it, and the zone stays lit. It stays lit until a file is dropped on it.

**Where.** The zone counts enters less leaves (`dragDepth`), so that a drag crossing into a child of the zone does not
switch it off. The count gets back to 0 only if every enter is matched by a leave. Two things break the matching, and the
Text's scenarios measure both on the runtime:
- **The element is replaced under the drag** (Mounted off and on, or a new Tag). The browser's leave goes to the old
  element, which is no longer on the page, so React never hears it. The new element is entered, so the count is now 2. The
  final leave brings it to 1, and Is Dragging Over stays true.
- **Accept File Drops is switched off during the drag.** `fileDropArmed` is asked at each event, so the leave is ignored
  and the count stays at 1.

**Not measured yet: a Group.** The same mechanism should catch a common pattern, a zone that swaps its "Drop files here"
label for "Release to upload" while a file hovers: the old label's leave never arrives. The Group's spec (NSP-016, after the
Text) is where that gets measured. Until then this bug stands on the Text's two cases.

**How to reproduce.** Play the scenario named in `regression:` on the runtime target
(`NSP_ONLY=Text npx jest test/node-spec/conformance.test.ts` in `packages/noodl-runtime`). The spec models what the runtime
does here, so both targets agree and the scenario passes. The scenario's trace shows Is Dragging Over true at the end.

**Proposed fix (small).** Clear the zone when the drag ends anywhere, not only when its own count reaches 0. A `drop` or
`dragend` listener on the window (and a `dragleave` whose `relatedTarget` is null, which means the drag left the window)
resets every armed zone's count and Is Dragging Over. Switching Accept File Drops off should clear both too. Once it is fixed,
the spec takes the same rule and these scenarios change with it.

**Ruled 2026-10-07 (P109 s29), as recommended: "Zone tracks itself".** The zone restarts its count when the drag enters a new element of its own, goes dark when Accept File Drops is switched off, and goes dark when it leaves the page. Asked because the proposed fix above (reset every zone when the drag ends anywhere) leans on the browser saying a drag left the window, which browsers do not do reliably, and the runtime target cannot measure that path: its leave from a replaced element is fired at the detached element and reaches no listener. Not chosen: "Reset when drag ends", and "Both". The question as asked: *"C81: a file drop zone stays lit after the file has been dragged away … How should it be fixed?"*

**Fixed 52fdaf088 (P109 ISL-038, 2026-10-08), as ruled.** node-shared-port-definitions.ts: the count belongs to one element (`dragElement`; an enter on a new one starts it again), Accept File Drops off clears it (`fileDropDark`: the count 0, Is Dragging Over false), and so does the element leaving the page (`_fileDropLeftPage`, from react-component-node.ts `componentWillUnmount`). The five specs say it (Text v7, Shape v3, Image v3, Group v5, Video v3), with write-always in `dragTo` so a clear does not split each act's branch by "0 over 0"; eight scenario names per node rewritten for what happens now, and one Text scenario added. Graded: the five conform on the runtime target at seeds 13 and 20732 (0 divergences, every unkilled mutant a declared equivalent) and on the interpreter (every mutant killed or declared); page model, catalog parity and schema green; viewer 1807 / 1807. Control: HEAD's node-shared-port-definitions.ts and react-component-node.ts under the new specs' file-drop scenarios are red on 11 (Text), 48 (Shape), 48 (Image) and 13 (Group); the Video conforms either way, because a `<video>` takes no file drop at all on the runtime (P107-C100, open). **Still true:** in the runtime target, a zone whose element is replaced under the drag and is left before the drag moves again stays lit until the next drag, because the target moves the drag's target only at an act; a browser's next `dragover` would enter the new element first.
