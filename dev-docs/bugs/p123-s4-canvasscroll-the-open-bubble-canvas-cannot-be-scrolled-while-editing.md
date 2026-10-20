---
id: P123-S4-CANVASSCROLL
title: The Open Bubble canvas cannot be scrolled in Design mode — the overlay takes the wheel, the stage scrolls instead, the page snaps back
status: fixed
commit: (this session, P123 s4)
phase: P123
task: s4 (the template)
severity: high
area: Open Bubble editor (`dev-docs/tasks/phase-123-open-bubble/editor/open-bubble.html`, the `#overlay` over the app frame)
found: P123 s4, 2026-10-16, by Richard on the converted template ("I can't scroll in the editor preview, or I sort of can but it's blank below the fold when I scroll down and it jumps the preview back to the top")
evidence: headless, 1600×1000: six wheel events over the app in Design mode left the frame at scrollY 0 (the same wheel with "Use the app" on scrolled it to 2400); after the fix the same wheel scrolls it to 1200 and the selection box moves by the same 1200
regression: dev-docs/tasks/phase-123-open-bubble/editor/check.mjs "Design: a wheel over the app scrolls the page and the selection box follows"
---

`#overlay` is an absolutely positioned layer over the whole app frame (`z-index: 10`) that takes the editor's
pointer events: hover boxes, selection, drag, resize, placing. It also took the wheel, and did nothing with it.
With "Use the app" on, the overlay is `pointer-events: none` and the wheel reaches the frame, so the app scrolled
only in that mode. In Design mode the browser chained the unused wheel to the nearest scrollable ancestor,
`#stage` (`overflow: auto`): on a window short enough for `#appwrap`'s `min-height: 500px` to exceed the stage, the
stage scrolled, which shows the dotted background under the app box ("blank below the fold"), and the next redraw or
tree click (`scrollIntoView`) put it back ("jumps back to the top"). On a taller window nothing moved at all.

A page is one long column in every Bubble template; an editor whose canvas cannot scroll it shows the header and
nothing else, so the first sitting on any real page would have failed in the first minute.

**Fix.** The overlay forwards the wheel to the frame: `overlay.addEventListener('wheel', e => { e.preventDefault();
frame.contentWindow.scrollBy(e.deltaX, e.deltaY) }, { passive: false })`. `preventDefault` stops the chaining to
`#stage`; the frame's own `scroll` event already redraws the boxes (`hookFrame`), so the selection and hover boxes
follow. Gate 37/37 before and after; the new gate step is the regression.
