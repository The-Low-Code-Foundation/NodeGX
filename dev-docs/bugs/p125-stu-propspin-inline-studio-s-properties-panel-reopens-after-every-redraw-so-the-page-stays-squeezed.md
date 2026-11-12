---
id: P125-STU-PROPSPIN
title: inline Studio's properties panel cannot be put away: it opens again on every redraw while something is picked, and the page stays squeezed to a phone's width
status: fixed
severity: medium
area: studio / hosted shell (`nodegx-studio/editor/hosted/hosted.js`, the inline side panels)
found: P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop, 2026-10-25
evidence: Richard's words; `hosted.js` MutationObserver on #right (childList) read against `studio.html` renderProps (it empties and refills #right on every redraw)
commit: nodegx-studio 2a5d280
regression: dev-docs/tasks/phase-125-co-construction/tools-mini-editor-drive.mjs "buttons (Muddy Paws copy): PROPSPIN"
---

Richard: *"We need to add something to be able to hide the props panel in the full Studio editor when it's inline in
the chat. When it's open, the page is squeezed to a mini-mobile width"*.

Inline, the Properties panel opened whenever `#right` changed while an element was picked. Studio refills `#right`
after every edit and every refresh, so a person who closed it with the strip's Properties button saw it come back.

**Fix:** Studio's `select()` announces the pick (`studio:select`); the panel opens on a pick of a different element
only, the strip's button reads "Hide properties" while it is open, and a tab on the panel's left edge puts it away.
