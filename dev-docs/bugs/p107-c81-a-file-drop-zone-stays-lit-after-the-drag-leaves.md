---
id: P107-C81
title: A file drop zone stays lit (Is Dragging Over true) after the drag has left, when its element was replaced under the drag or Accept File Drops was switched off during it
status: open
severity: medium
area: runtime / file drop on every visual node that has it (noodl-viewer-react/src/node-shared-port-definitions.ts `addFileDropPorts` :956-1137 — the `dragDepth` count, `onDragEnter` :1009-1019, `onDragLeave` :1030-1035, `fileDropArmed` :253-261) — Text, Group, Image, Circle, Video
found: P107 NSP-016 s50, 2026-10-06
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.11; the Text's file-drop scenarios in packages/nodegx-node-spec/scenarios/Text.json, identical on the interpreter and the runtime target
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Text.json "Mounted off and on under a drag, then the drag leaves: the count is still 1, so Is Dragging Over stays true with no drag over it"
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
