---
id: P107-C100
title: A Video playing a file fires no Click, Hover, Pointer Down, Pointer Up or Pointer Enter, and takes no file dropped from the desktop
status: fixed
severity: medium
area: runtime / Video (noodl-viewer-react/src/components/visual/Video/Video.tsx `CachedVideo.render` :103 — `PointerListeners(this.props)`; nodes/visual/video.ts `addPointerEventOutputs`, `addFileDropPorts`)
found: P107 NSP-016 s54, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.15; the s54 side-by-side probe — on a `<video>`, a hover, press, release, click and leave raise nothing on the runtime (the spec: Hover Start, Pointer Enter, Pointer Down, Pointer Up, Click, Hover End), and a PNG dragged from the desktop and let go raises nothing (the spec: the File Drop outputs and Files Dropped); on an embed both targets agree
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Video.json "row C100 — a hover, press, release, click and leave on a video file: Hover Start, Pointer Enter, Pointer Down, Pointer Up, Click, Hover End (the runtime: nothing)"
owner: Beta sweep s16
commit: 266777587
---

**What a person sees.** An app wires a Video's Click to open the video full screen, or its Hover Start to show a caption, or turns
on Accept File Drops so a person can drop a clip onto it. With a video file as the Source, none of it happens: no Click, no Hover
Start or End, no Pointer Down, Up or Enter, and a dropped file is ignored (the browser opens it instead). The same ports work on an
Image, a Text and a Group, and they work on the Video too while its Source is a YouTube or Vimeo link.

**Where.** The pointer outputs and the file-drop handlers live in the component's `pointer` prop (`propPath: 'pointer'`,
node-shared-port-definitions.ts :849-871). Video.tsx passes the `<video>`'s props to `CachedVideo` as `{...props.dom}` plus a class,
a style and three callbacks, so `CachedVideo`'s `PointerListeners(this.props)` (:103) finds no `pointer`, no `noodlNode`, no
`blockTouch` and no `clickBubbling`, and attaches nothing. The embed's `<iframe>` (:262) spreads `PointerListeners(this.props)` from
the Video itself, which has them. Drag Source and Drop Zone still work on the `<video>`: drag-drop.ts listens on the element itself.

**How to reproduce.** Play the `regression:` scenario on the runtime target.

**Proposed fix.** Pass the pointer props through to `CachedVideo` (`pointer`, `noodlNode`, `blockTouch`, `clickBubbling`), or
compute `PointerListeners(props)` in `Video.render` and hand the result down, as the embed path already does. When it is fixed,
remove the scenarios' `row` fields and the C100 entry from KNOWN_ROWS in the same commit. **The fix uncovers C79 on the Video**:
the five Video scenarios named "row C79 — …" agree with the runtime today only because no pointer reaches a video file at all; with
C100 fixed in memory (s54) they diverge as they do on the Image — an element at Opacity 0 takes the pointer once Pointer Events is
written. In the same commit, give those five `"row": "NSP-016 §6 C79"` and put the Image's C79 entry back in the Video's KNOWN_ROWS.

**Fixed (Beta sweep s16, 2026-10-27, 266777587).** The second shape proposed: `Video.render` works out
`PointerListeners(this.props)` and hands the result to `CachedVideo`, which no longer calls it on its own props. Runtime
conformance (`NSP_ONLY=Video`, seed 20753): CONFORMS, 0 divergences in 200 sequences, mutants 2783/2791; the 1,200
scenarios marked C100 passed, so the marks came out and the KNOWN_ROWS entry with its predicate went. **The predicted C79
did not come back**: the five "row C79" scenarios agree on the runtime with the fix (ISL-031's render, which gives the
opacity rule the last word, covers the Video), so no C79 entry was added.
