---
id: P101-INS003-SHIFTTAB
title: Shift+Tab from the canvas goes into the embedded preview and stays there
status: open
severity: medium
area: editor / keyboard focus (preview webview)
found: P101 INS-003 s3 (row 5), 2026-09-24
evidence: dev-docs/tasks/phase-101-the-inspector/INS-003-EVERYTHING-THAT-ASSUMED-THE-LEFT.md §5, row 5
---

A keyboard user on the node canvas presses Shift+Tab to go back toward the left panel. Focus goes into the
embedded preview, and every further Shift+Tab moves around inside the preview's own page. They cannot get back
to the editor with the keyboard.

**How it was found:** driven with real `Input.dispatchKeyEvent` Tabs on one CDP connection with focus
emulation, after a trusted click on a canvas node. Forward Tab is fine: the canvas overlay, the bottom bar, then
the inspector. It is not caused by P101. The preview has always sat between the canvas and the left panel in
DOM order.

**Where:** the preview `<webview>` in the editor document. Nothing in the editor handles Tab (`KeyCode.Tab` is
only defined), so the order is the DOM's.

**Not re-measured since 2026-09-24.**

**Proposed:** catch focus leaving the webview's first element on Shift+Tab (the guest page sends a message, or a
focus sentinel sits before and after the webview in the host) and move it to the previous host stop. Or take
the webview out of the Tab order unless the person clicks into it. Measure first. Small to medium.
