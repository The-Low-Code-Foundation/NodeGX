---
id: P125-CCN008-STAGESCROLL
title: a wheel over the mini editor's stage scrolls the app inside it: the button goes and a white page is left; the stage is a fixed box, not the part's size
status: fixed
severity: medium
area: mcp / mini editor panel (`layout2d`, `TARGET_CSS`, `mini-editor.css`)
found: P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21
evidence: Richard's words and screenshot 1 (dark left third, white page, the button at the top edge), P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21; dev-docs/tasks/phase-125-co-construction/tools-mini-editor-drive.mjs buttons 'STAGESCROLL'
kit: mcp
commit: 6ce8f171b
regression: dev-docs/tasks/phase-125-co-construction/tools-mini-editor-drive.mjs "buttons (Muddy Paws copy)"
---

Richard: *"if you accidentally scroll over where the button preview is, it scrolls away and you're left with a white
screen. I'm guessing the preview container is at a fixed height. It should be content height and fit snug to the
button"*.

The preview page stayed scrollable (only its scrollbars were hidden), and its `html`/`body` painted white around the
part, so the frame showed as a white slab offset by the centring.

**Fix:** inside the stage the page cannot scroll (`html`, `body` and every scroller above the part `overflow: hidden`),
the page is see-through and the stage paints what the part sits on in the app (read before the page is made
see-through), the frame element and its page share `color-scheme: normal` (a frame whose scheme differs from its
host is painted opaque), and the stage is the part's height plus 20 px each side.
