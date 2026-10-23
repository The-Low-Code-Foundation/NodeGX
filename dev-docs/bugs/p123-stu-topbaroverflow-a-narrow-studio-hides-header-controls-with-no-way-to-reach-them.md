---
id: P123-STU-TOPBAROVERFLOW
title: "NodeGX Studio: in a narrow window (the panel in a chat) header controls are hidden by the layout, with no menu to reach them"
status: open
severity: medium
area: nodegx-studio `editor/studio.html` (the header, `#topbar`)
found: P125, Richard's puppy run in Claude Desktop, 2026-10-23
evidence: "Scratchpad puppy/fresh-760.png: Studio at 760 px wide shows the page picker, '0 queries on open', Use the app and Record; the width buttons (Fill/1280/1024/768/Phone), the backend and agent items and the Import report are not on screen."
---

Richard: *"Some of the items on the top bar of the editor are hidden when the screen is too small, like when the
studio is in the chat and not fullscreened yet. Need to have a three dot menu hiding anything that's hidden because of
responsiveness."*

Fix: the header measures what does not fit and moves those controls into a "⋯" menu at its right end, in the same
order, each still working (the same element, moved, so its handlers come with it). Gate: at 760 px every header
control is either on screen or in the menu, and none is clipped.
