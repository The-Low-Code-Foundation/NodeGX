---
id: P125-CCN008-SCROLLJUMP
title: every change in a mini editor scrolls Claude Desktop's chat down about 100 px, so the panel's title and question go out of view
status: fixed
severity: medium
area: mcp / mini editor panel (`src/miniEditor/panel/mini-editor.js` `layout2d`)
found: P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21
evidence: Richard's words and screenshots, P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21; cause read in the code; dev-docs/tasks/phase-125-co-construction/tools-mini-editor-drive.mjs buttons 'SCROLLJUMP' (its instrument: scrollIntoView in the stage moves the host page)
kit: mcp
commit: 6ce8f171b
regression: dev-docs/tasks/phase-125-co-construction/tools-mini-editor-drive.mjs "buttons (Muddy Paws copy)"
---

Richard: *"When you click one of the options in the mini editor, the chat scroll jumps down every time (maybe 100px
down the editor, so you don't see the very top unless you scroll back up)"*.

`layout2d()` called `el.scrollIntoView({ block: 'start' })` on the part inside the stage's preview frame, after every
live change (`liveSet` → `relayout(150)`) and four times after each draw. `scrollIntoView` scrolls every scrollable
box above the element, the frames above it included, so Desktop's chat scrolled until the button's top met the top of
the chat.

**Fix:** `bringToTop()` moves only the preview page's own scrollers (and `window.scrollTo` of the frame's own window).
